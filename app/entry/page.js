'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { TRADES, STAGES, fmtDate, todayStr } from '../../lib/constants';

export default function EntryPage() {
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [foremen, setForemen] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [todaysEntries, setTodaysEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [companyType, setCompanyType] = useState('');
  const [subId, setSubId] = useState('');
  const [trade, setTrade] = useState('');
  const [foremanId, setForemanId] = useState('');
  const [selectedSpaceIds, setSelectedSpaceIds] = useState([]);
  const [perSpace, setPerSpace] = useState({});
  const [activity, setActivity] = useState('');
  const [remarks, setRemarks] = useState('');

  const loadBaseData = useCallback(async () => {
    const [{ data: proj }, { data: subs }, { data: frm }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at'),
      supabase.from('subcontractors').select('*'),
      supabase.from('foremen').select('*'),
    ]);
    setProjects(proj || []);
    setSubcontractors(subs || []);
    setForemen(frm || []);
    if (proj && proj.length && !projectId) setProjectId(proj[0].id);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadBaseData(); }, [loadBaseData]);

  const loadSpaces = useCallback(async (pid) => {
    if (!pid) { setSpaces([]); return; }
    const { data } = await supabase.from('spaces').select('*').eq('project_id', pid).order('site_area');
    setSpaces(data || []);
  }, []);

  const loadTodaysEntries = useCallback(async (pid, d) => {
    if (!pid || !d) { setTodaysEntries([]); return; }
    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('project_id', pid)
      .eq('entry_date', d)
      .order('created_at', { ascending: false });
    setTodaysEntries(data || []);
  }, []);

  useEffect(() => { loadSpaces(projectId); }, [projectId, loadSpaces]);
  useEffect(() => { loadTodaysEntries(projectId, date); }, [projectId, date, loadTodaysEntries]);

  function ensurePerSpace(spaceId) {
    setPerSpace((prev) => {
      if (prev[spaceId]) return prev;
      return { ...prev, [spaceId]: { stage: '', manpower: '', completed: 'No' } };
    });
  }

  function toggleSpace(spaceId) {
    setSelectedSpaceIds((prev) => {
      if (prev.includes(spaceId)) {
        const next = prev.filter((x) => x !== spaceId);
        setPerSpace((p) => { const cp = { ...p }; delete cp[spaceId]; return cp; });
        return next;
      }
      ensurePerSpace(spaceId);
      return [...prev, spaceId];
    });
  }

  function updatePerSpace(spaceId, field, value) {
    setPerSpace((prev) => ({ ...prev, [spaceId]: { ...prev[spaceId], [field]: value } }));
  }

  const foremenForTrade = foremen.filter(
    (f) => f.trades.includes(trade) && f.project_ids.includes(projectId)
  );

  async function handleSave() {
    if (!trade || selectedSpaceIds.length === 0) {
      alert('Please select a Trade and at least one apartment / space.');
      return;
    }
    if (companyType === 'HHM' && foremenForTrade.length > 0 && !foremanId) {
      alert('Please select the foreman responsible.');
      return;
    }
    if (!companyType) {
      alert('Please select a Company.');
      return;
    }
    for (const sid of selectedSpaceIds) {
      const ps = perSpace[sid];
      if (!ps || !ps.stage || ps.manpower === '') {
        const sp = spaces.find((s) => s.id === sid);
        alert(`Please fill Stage and Manpower for ${sp ? sp.space_id : 'the selected apartment'}.`);
        return;
      }
    }

    setSaving(true);
    let companyName, companyIdValue;
    if (companyType === 'HHM') {
      companyName = 'HHM';
      companyIdValue = 'HHM';
    } else {
      const sub = subcontractors.find((s) => s.id === subId);
      companyName = sub ? sub.name : 'Unknown';
      companyIdValue = subId;
    }
    const foreman = foremen.find((f) => f.id === foremanId);

    const rows = selectedSpaceIds.map((sid) => {
      const ps = perSpace[sid];
      const sp = spaces.find((s) => s.id === sid);
      return {
        project_id: projectId,
        entry_date: date,
        company_type: companyType,
        company_id: companyIdValue,
        company_name: companyName,
        foreman_name: foreman ? foreman.name : '',
        trade,
        space_id: sid,
        space_label: sp ? sp.space_id : '',
        stage: ps.stage,
        manpower: parseInt(ps.manpower, 10) || 0,
        completed: ps.completed,
        activity,
        remarks,
      };
    });

    const { error } = await supabase.from('entries').insert(rows);
    setSaving(false);
    if (error) {
      alert('Could not save: ' + error.message);
      return;
    }
    setSelectedSpaceIds([]);
    setPerSpace({});
    setActivity('');
    setRemarks('');
    loadTodaysEntries(projectId, date);
  }

  if (loading) return <p style={{ color: '#6B6A63' }}>Loading...</p>;

  const currentProject = projects.find((p) => p.id === projectId);

  return (
    <div>
      <div className="topbar">
        <h1>Daily entry</h1>
        <p className="subtitle">Log manpower, foreman assignment and stage progress per space</p>
      </div>

      {projects.length === 0 ? (
        <p style={{ color: '#6B6A63' }}>No projects yet. Add one in Masters first.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, maxWidth: 560 }}>
            <div className="field">
              <label>Project</label>
              <select
                className="select"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setSelectedSpaceIds([]);
                  setPerSpace({});
                  setForemanId('');
                  setSubId('');
                  setCompanyType('');
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {spaces.length === 0 && (
            <div className="warning-box" style={{ marginBottom: 20 }}>
              <span>No spaces set up yet for this project. Go to <b>Masters</b> and add the Site Area / Level / Zone / Space ID list for this project first.</span>
            </div>
          )}

          <div className="card" style={{ maxWidth: 680, marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div className="field">
                <label>Company</label>
                <select
                  className="select"
                  value={companyType === 'HHM' ? 'HHM' : subId ? `SUB:${subId}` : ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'HHM') { setCompanyType('HHM'); setSubId(''); }
                    else { setCompanyType('SUB'); setSubId(v.split(':')[1]); }
                    setForemanId('');
                  }}
                >
                  <option value="">Select company</option>
                  <option value="HHM">HHM (in-house)</option>
                  {subcontractors.filter((s) => s.project_ids.includes(projectId)).map((s) => (
                    <option key={s.id} value={`SUB:${s.id}`}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Trade</label>
                <select className="select" value={trade} onChange={(e) => { setTrade(e.target.value); setForemanId(''); }}>
                  <option value="">Select trade</option>
                  {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {companyType === 'HHM' && trade && (
              <div style={{ marginBottom: 14, maxWidth: 264 }}>
                {foremenForTrade.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#92600A' }}>No foremen set up for {trade} on this project yet. Add one in Masters.</p>
                ) : (
                  <div className="field">
                    <label>Foreman responsible</label>
                    <select className="select" value={foremanId} onChange={(e) => setForemanId(e.target.value)}>
                      <option value="">Select foreman</option>
                      {foremenForTrade.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#6B6A63', display: 'block', marginBottom: 6 }}>
                Apartments / spaces assigned today
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {spaces.map((sp) => (
                  <label key={sp.id} className={`chip ${selectedSpaceIds.includes(sp.id) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto', height: 'auto', margin: 0 }}
                      checked={selectedSpaceIds.includes(sp.id)}
                      onChange={() => toggleSpace(sp.id)}
                    />
                    {sp.space_id}
                  </label>
                ))}
              </div>
            </div>

            {selectedSpaceIds.length > 0 && (
              <>
                <div className="entry-row-head">
                  <span>Space</span><span>Stage</span><span>Manpower</span><span>Status</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {selectedSpaceIds.map((sid) => {
                    const sp = spaces.find((x) => x.id === sid);
                    const ps = perSpace[sid] || { stage: '', manpower: '', completed: 'No' };
                    if (!sp) return null;
                    return (
                      <div key={sid} className="entry-row-grid">
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{sp.space_id}</div>
                        <select className="select" value={ps.stage} onChange={(e) => updatePerSpace(sid, 'stage', e.target.value)}>
                          <option value="">Stage</option>
                          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          max="500"
                          placeholder="0"
                          value={ps.manpower}
                          onChange={(e) => updatePerSpace(sid, 'manpower', e.target.value)}
                        />
                        <select className="select" value={ps.completed} onChange={(e) => updatePerSpace(sid, 'completed', e.target.value)}>
                          <option value="No">Not completed</option>
                          <option value="Yes">Completed</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
              <div className="field">
                <label>Activity / task</label>
                <input className="input" type="text" placeholder="e.g. Wire pulling first fix" value={activity} onChange={(e) => setActivity(e.target.value)} />
              </div>
              <div className="field">
                <label>Remarks</label>
                <input className="input" type="text" placeholder="optional" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
            </div>

            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save entries'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, maxWidth: 680 }}>
            <h3>Logged today</h3>
            <span style={{ fontSize: 12, color: '#9A988E' }}>
              {fmtDate(date)} &middot; {currentProject?.name} &middot; {todaysEntries.length} entries
            </span>
          </div>

          {todaysEntries.length === 0 ? (
            <p style={{ color: '#9A988E', fontSize: 14, maxWidth: 680 }}>No entries logged yet for this date.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 680 }}>
              {todaysEntries.map((e) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E4E2D9', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{e.space_label} &mdash; {e.trade} &middot; {e.stage}</div>
                    <div style={{ color: '#6B6A63', marginTop: 2 }}>
                      {e.company_name}{e.foreman_name ? ` · ${e.foreman_name}` : ''} &middot; {e.manpower} workers
                      {e.activity ? ` &middot; ${e.activity}` : ''}
                    </div>
                  </div>
                  <span className={`pill ${e.completed === 'Yes' ? 'pill-done' : 'pill-progress'}`}>
                    {e.completed === 'Yes' ? 'Completed' : 'In progress'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
