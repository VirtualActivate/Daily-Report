export const TRADES = ["Electrical", "Plumbing", "HVAC", "Fire", "Chilled Water", "Duct", "Ducting", "Store", "Other"];
export const STAGES = ["First Fix", "Second Fix", "Final / Testing"];
export const HHM_TRADES = ["Electrical", "Plumbing", "HVAC", "Store"];

export function fmtDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function statusForSpaceTrade(entries, spaceId, trade) {
  const rows = entries.filter((e) => e.space_id === spaceId && e.trade === trade);
  if (rows.length === 0) return "none";
  const doneFinal = rows.some((e) => e.stage === "Final / Testing" && e.completed === "Yes");
  if (doneFinal) return "done";
  return "progress";
}

// Computes, for every (trade, company) pair, the man-days spent and apartments
// fully completed (Final/Testing = Yes), then a normalized completion rate
// per 10 man-days. This is the only fair way to compare a 4-man crew against
// a 12-man crew, or HHM against a subcontractor: raw apartment counts reward
// whoever was given more men, not whoever works more efficiently.
export function computeProductivity(entries) {
  const byTradeCompany = {};
  entries.forEach((e) => {
    const key = `${e.trade}::${e.company_name}`;
    if (!byTradeCompany[key]) {
      byTradeCompany[key] = {
        trade: e.trade,
        companyName: e.company_name,
        companyType: e.company_type,
        manDays: 0,
        completedSpaceIds: new Set(),
        spaceIdsTouched: new Set(),
        entryCount: 0,
        dates: [],
      };
    }
    const g = byTradeCompany[key];
    g.manDays += e.manpower;
    g.spaceIdsTouched.add(e.space_id);
    g.entryCount += 1;
    g.dates.push(e.entry_date);
    if (e.stage === "Final / Testing" && e.completed === "Yes") {
      g.completedSpaceIds.add(e.space_id);
    }
  });

  const rows = Object.values(byTradeCompany).map((g) => {
    const completed = g.completedSpaceIds.size;
    const rate = g.manDays > 0 ? (completed / g.manDays) * 10 : 0;
    return {
      trade: g.trade,
      companyName: g.companyName,
      companyType: g.companyType,
      manDays: g.manDays,
      apartmentsTouched: g.spaceIdsTouched.size,
      apartmentsCompleted: completed,
      ratePerTenManDays: Math.round(rate * 10) / 10,
      entryCount: g.entryCount,
      firstDate: g.dates.sort()[0],
      lastDate: g.dates.sort().slice(-1)[0],
    };
  });

  // Group by trade, sorted by rate descending within each trade.
  const byTrade = {};
  rows.forEach((r) => {
    if (!byTrade[r.trade]) byTrade[r.trade] = [];
    byTrade[r.trade].push(r);
  });
  Object.keys(byTrade).forEach((t) => {
    byTrade[t].sort((a, b) => b.ratePerTenManDays - a.ratePerTenManDays);
  });

  return byTrade;
}

// Generates plain-language findings from the productivity table: top
// performer per trade, HHM-vs-subcontractor gaps, and low-sample-size
// caveats. Deterministic and rule-based — not a model call — so every
// number quoted traces directly back to logged entries.
export function generateProductivityFindings(byTrade) {
  const findings = [];
  const MIN_MANDAYS_FOR_CONFIDENCE = 10;

  Object.entries(byTrade).forEach(([trade, rows]) => {
    if (rows.length === 0) return;
    const confident = rows.filter((r) => r.manDays >= MIN_MANDAYS_FOR_CONFIDENCE);
    if (confident.length === 0) {
      findings.push({
        type: "low-data",
        trade,
        text: `${trade}: not enough logged man-days yet for a reliable comparison. Keep logging daily entries.`,
      });
      return;
    }

    const sorted = [...confident].sort((a, b) => b.ratePerTenManDays - a.ratePerTenManDays);
    const top = sorted[0];
    const rest = sorted.slice(1);

    if (rest.length > 0) {
      const second = rest[0];
      const gap = top.ratePerTenManDays - second.ratePerTenManDays;
      const gapPct = second.ratePerTenManDays > 0 ? Math.round((gap / second.ratePerTenManDays) * 100) : null;
      findings.push({
        type: "top-performer",
        trade,
        text: gapPct !== null
          ? `${trade}: ${top.companyName} is the most productive (${top.ratePerTenManDays} apartments completed per 10 man-days), ${gapPct}% ahead of ${second.companyName} (${second.ratePerTenManDays}).`
          : `${trade}: ${top.companyName} is the most productive so far at ${top.ratePerTenManDays} apartments completed per 10 man-days; no comparable data yet for other crews.`,
      });
    } else {
      findings.push({
        type: "single-crew",
        trade,
        text: `${trade}: only ${top.companyName} has logged enough data (${top.manDays} man-days) for this trade so far — ${top.ratePerTenManDays} apartments completed per 10 man-days.`,
      });
    }

    const hhmRow = confident.find((r) => r.companyType === "HHM");
    const subRows = confident.filter((r) => r.companyType !== "HHM");
    if (hhmRow && subRows.length > 0) {
      const bestSub = subRows.reduce((a, b) => (b.ratePerTenManDays > a.ratePerTenManDays ? b : a));
      if (bestSub.ratePerTenManDays > hhmRow.ratePerTenManDays) {
        const diff = bestSub.ratePerTenManDays - hhmRow.ratePerTenManDays;
        const pct = hhmRow.ratePerTenManDays > 0 ? Math.round((diff / hhmRow.ratePerTenManDays) * 100) : null;
        findings.push({
          type: "sub-beats-hhm",
          trade,
          text: pct !== null
            ? `${trade}: subcontractor ${bestSub.companyName} outperforms HHM in-house by ${pct}% (${bestSub.ratePerTenManDays} vs ${hhmRow.ratePerTenManDays} per 10 man-days).`
            : `${trade}: subcontractor ${bestSub.companyName} is outperforming HHM in-house.`,
        });
      } else if (hhmRow.ratePerTenManDays > bestSub.ratePerTenManDays) {
        const diff = hhmRow.ratePerTenManDays - bestSub.ratePerTenManDays;
        const pct = bestSub.ratePerTenManDays > 0 ? Math.round((diff / bestSub.ratePerTenManDays) * 100) : null;
        findings.push({
          type: "hhm-beats-sub",
          trade,
          text: pct !== null
            ? `${trade}: HHM in-house outperforms its best subcontractor (${bestSub.companyName}) by ${pct}% (${hhmRow.ratePerTenManDays} vs ${bestSub.ratePerTenManDays} per 10 man-days).`
            : `${trade}: HHM in-house is outperforming subcontractors.`,
        });
      }
    }

    const lowConfidence = rows.filter((r) => r.manDays < MIN_MANDAYS_FOR_CONFIDENCE);
    lowConfidence.forEach((r) => {
      findings.push({
        type: "low-sample",
        trade,
        text: `${trade}: ${r.companyName} only has ${r.manDays} man-days logged so far — too early to rank reliably.`,
      });
    });
  });

  return findings;
}

// Finds every (space, trade) combination that has been logged by more than
// one distinct company, at any time, regardless of date or stage. This is
// intentionally broad: it will also surface legitimate handovers (Crew A did
// First Fix, Crew B did Second Fix) alongside genuine duplicate-assignment
// cases, by design — better to flag and let a human dismiss the normal ones
// than to miss a real overlap by trying to be clever about distinguishing them.
export function findCrewOverlaps(entries) {
  const groups = {};
  entries.forEach((e) => {
    const key = `${e.space_id}::${e.trade}`;
    if (!groups[key]) groups[key] = { spaceId: e.space_id, spaceLabel: e.space_label, trade: e.trade, projectId: e.project_id, companies: new Map(), rows: [] };
    groups[key].rows.push(e);
    if (!groups[key].companies.has(e.company_name)) {
      groups[key].companies.set(e.company_name, []);
    }
    groups[key].companies.get(e.company_name).push(e);
  });

  return Object.values(groups)
    .filter((g) => g.companies.size > 1)
    .map((g) => ({
      projectId: g.projectId,
      spaceId: g.spaceId,
      spaceLabel: g.spaceLabel,
      trade: g.trade,
      companies: Array.from(g.companies.entries()).map(([name, rows]) => ({
        name,
        entryCount: rows.length,
        totalManpower: rows.reduce((s, r) => s + r.manpower, 0),
        firstDate: rows.map((r) => r.entry_date).sort()[0],
        lastDate: rows.map((r) => r.entry_date).sort().slice(-1)[0],
        stages: Array.from(new Set(rows.map((r) => r.stage))),
      })),
    }))
    .sort((a, b) => b.companies.length - a.companies.length);
}
