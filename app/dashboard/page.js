'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { TRADES, statusForSpaceTrade } from '../../lib/constants';

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [spacesByProject, setSpacesByProject] = useState({});
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState('ALL');

  const loadAll = useCallback(async () => {
    const { data: proj } = await supabase.from('projects').select('*').order('created_at');
    const { data: allSpaces } = await supabase.from('spaces').select('*');
    const { data: allEntries } = await supabase.from('entries').select('*');

    const byProj = {};
    (proj || []).forEach((p) => { byProj[p.id] = (allSpaces || []).filter((s) => s.project_id === p.id); });

    setProjects(proj || []);
    setSpacesByProject(byProj);
    setEntries(allEntries || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) return <p style={{ color: '#6B6A63' }}>Loading...</p>;

  return (
    <div>
      <div className="topbar">
        <h1>Progress dashboard</h1>
        <p className="subtitle">Apartment / space completion across all projects</p>
      </div>

      <div className="field" style={{ marginBottom: 24, maxWidth: 280 }}>
        <label>View</label>
        <select className="select" value={viewId} onChange={(e) => setViewId(e.target.value)}>
          <option value="ALL">All projects (combined)</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {viewId === 'ALL' ? (
        <CombinedOverview
          projects={projects}
          spacesByProject={spacesByProject}
          entries={entries}
          onSelectProject={setViewId}
        />
      ) : (
        <ProjectDrilldown
          project={projects.find((p) => p.id === viewId)}
          spaces={spacesByProject[viewId] || []}
          entries={entries.filter((e) => e.project_id === viewId)}
          onBack={() => setViewId('ALL')}
        />
      )}
    </div>
  );
}

function CombinedOverview({ projects, spacesByProject, entries, onSelectProject }) {
  const mpByTrade = {};
  TRADES.forEach((t) => { mpByTrade[t] = 0; });
  entries.forEach((e) => { mpByTrade[e.trade] = (mpByTrade[e.trade] || 0) + e.manpower; });
  const activeTrades = TRADES.filter((t) => mpByTrade[t] > 0);
  const maxMp = activeTrades.length ? Math.max(...activeTrades.map((t) => mpByTrade[t])) : 1;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 32 }}>
        {projects.map((p) => {
          const spaces = spacesByProject[p.id] || [];
          const projEntries = entries.filter((e) => e.project_id === p.id);
          const totalMp = projEntries.reduce((s, e) => s + e.manpower, 0);
          const tradesUsed = TRADES.filter((t) => projEntries.some((e) => e.trade === t));
          let doneCount = 0, totalCells = 0;
          spaces.forEach((sp) => {
            tradesUsed.forEach((t) => {
              totalCells++;
              if (statusForSpaceTrade(projEntries, sp.id, t) === 'done') doneCount++;
            });
          });
          const pct = totalCells > 0 ? Math.round((doneCount / totalCells) * 100) : 0;
          return (
            <div key={p.id} className="metric-card">
              <p className="label">{p.name}</p>
              <p className="value">{pct}%</p>
              <p className="sub">{totalMp} manpower-entries &middot; {spaces.length} spaces</p>
              <div style={{ marginTop: 8, height: 4, background: '#E4E2D9', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#1E6B1A' }} />
              </div>
              <button className="btn" style={{ marginTop: 10, width: '100%', fontSize: 12, padding: 6 }} onClick={() => onSelectProject(p.id)}>
                View project &rarr;
              </button>
            </div>
          );
        })}
      </div>

      {activeTrades.length ? (
        <>
          <h3 style={{ marginBottom: 12 }}>Manpower logged by trade</h3>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
            {activeTrades.map((t) => {
              const pctw = Math.round((mpByTrade[t] / maxMp) * 100);
              return (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 100, fontSize: 13 }}>{t}</div>
                  <div style={{ flex: 1, background: '#F4F3EE', borderRadius: 4, height: 16 }}>
                    <div style={{ height: '100%', width: `${pctw}%`, background: '#2563EB', borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 36, fontSize: 12, textAlign: 'right', color: '#6B6A63' }}>{mpByTrade[t]}</div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p style={{ color: '#9A988E', fontSize: 14 }}>No entries logged yet across any project.</p>
      )}
    </div>
  );
}

function ProjectDrilldown({ project, spaces, entries, onBack }) {
  const [planTrade, setPlanTrade] = useState('');

  if (!project) return null;

  const tradesUsed = TRADES.filter((t) => entries.some((e) => e.trade === t));
  const activePlanTrade = planTrade && tradesUsed.includes(planTrade) ? planTrade : tradesUsed[0];

  return (
    <div>
      <button onClick={onBack} style={{ border: 'none', background: 'none', color: '#6B6A63', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 10 }}>
        &larr; All projects
      </button>
      <h2 style={{ marginBottom: 16 }}>{project.name}</h2>

      {spaces.length === 0 ? (
        <p style={{ color: '#9A988E', fontSize: 14 }}>No spaces set up for this project yet. Add them in Masters.</p>
      ) : tradesUsed.length === 0 ? (
        <p style={{ color: '#9A988E', fontSize: 14 }}>No entries logged yet for this project.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 20 }}>
            {tradesUsed.map((t) => {
              const done = spaces.filter((sp) => statusForSpaceTrade(entries, sp.id, t) === 'done').length;
              const pct = spaces.length ? Math.round((done / spaces.length) * 100) : 0;
              return (
                <div key={t} className="metric-card">
                  <p className="label">{t}</p>
                  <p className="value">{pct}%</p>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3>Floor plan view</h3>
            <select className="select" style={{ width: 180, height: 32, fontSize: 12 }} value={activePlanTrade} onChange={(e) => setPlanTrade(e.target.value)}>
              {tradesUsed.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 10, fontSize: 12, color: '#6B6A63' }}>
            <Legend color="#F0EFE9" text="Not started" />
            <Legend color="#FDF1D8" text="In progress" />
            <Legend color="#E3F3E1" text="Completed" />
          </div>
          <FloorPlan spaces={spaces} entries={entries} trade={activePlanTrade} />

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '24px 0 10px', fontSize: 12, color: '#6B6A63' }}>
            <h3 style={{ marginRight: 8 }}>Detail table</h3>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #E4E2D9', borderRadius: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Site area</th>
                  <th>Level</th>
                  <th>Zone</th>
                  <th>Space ID</th>
                  {tradesUsed.map((t) => <th key={t}>{t}</th>)}
                </tr>
              </thead>
              <tbody>
                {spaces.map((sp) => (
                  <tr key={sp.id}>
                    <td style={{ color: '#6B6A63' }}>{sp.site_area}</td>
                    <td style={{ color: '#6B6A63' }}>{sp.level}</td>
                    <td style={{ color: '#6B6A63' }}>{sp.zone}</td>
                    <td style={{ fontWeight: 600 }}>{sp.space_id}</td>
                    {tradesUsed.map((t) => {
                      const status = statusForSpaceTrade(entries, sp.id, t);
                      const cls = status === 'done' ? 'pill-done' : status === 'progress' ? 'pill-progress' : 'pill-none';
                      const txt = status === 'done' ? 'Done' : status === 'progress' ? 'In progress' : '-';
                      return (
                        <td key={t} style={{ textAlign: 'center' }}>
                          <span className={`pill ${cls}`}>{txt}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Legend({ color, text }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: color, display: 'inline-block' }} />
      {text}
    </span>
  );
}

function FloorPlan({ spaces, entries, trade }) {
  if (!trade) return null;

  const levelOrder = [];
  const byLevel = {};
  spaces.forEach((sp) => {
    if (!byLevel[sp.level]) { byLevel[sp.level] = []; levelOrder.push(sp.level); }
    byLevel[sp.level].push(sp);
  });

  return (
    <div style={{ border: '1px solid #E4E2D9', borderRadius: 12, padding: 16, background: '#FBFBF9', marginBottom: 8 }}>
      {levelOrder.map((level) => (
        <div key={level} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9A988E', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>
            {level}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {byLevel[level].map((sp) => {
              const status = statusForSpaceTrade(entries, sp.id, trade);
              const bg = status === 'done' ? '#E3F3E1' : status === 'progress' ? '#FDF1D8' : '#F0EFE9';
              const border = status === 'done' ? '#97C459' : status === 'progress' ? '#EF9F27' : '#D8D6CC';
              return (
                <div
                  key={sp.id}
                  title={`${sp.space_id} — ${sp.zone}`}
                  style={{
                    width: 86, height: 52, borderRadius: 6, background: bg, border: `1px solid ${border}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, padding: 4, textAlign: 'center', flexShrink: 0,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {sp.space_id}
                  </div>
                  <div style={{ color: '#6B6A63', fontSize: 9 }}>{sp.zone}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
