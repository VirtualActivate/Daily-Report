'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { TRADES, HHM_TRADES } from '../../lib/constants';

export default function MastersPage() {
  const [section, setSection] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at');
    setProjects(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const SECTIONS = [
    ['projects', 'Projects'],
    ['spaces', 'Space master'],
    ['foremen', 'Foremen'],
    ['subs', 'Subcontractors'],
  ];

  return (
    <div>
      <div className="topbar">
        <h1>Masters</h1>
        <p className="subtitle">Projects, space lists, foremen and subcontractors</p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid #E4E2D9' }}>
        {SECTIONS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            style={{
              border: 'none', background: 'none', padding: '8px 4px', marginRight: 18,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: section === key ? '#1A1A1A' : '#9A988E',
              borderBottom: section === key ? '2px solid #2563EB' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#6B6A63' }}>Loading...</p>
      ) : section === 'projects' ? (
        <ProjectsSection projects={projects} reload={loadProjects} />
      ) : section === 'spaces' ? (
        <SpacesSection projects={projects} />
      ) : section === 'foremen' ? (
        <ForemenSection projects={projects} />
      ) : (
        <SubsSection projects={projects} />
      )}
    </div>
  );
}

function ProjectsSection({ projects, reload }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  async function addProject() {
    if (!name.trim()) return;
    await supabase.from('projects').insert({ name: name.trim(), code: code.trim() || 'PRJ' });
    setName(''); setCode('');
    reload();
  }

  async function removeProject(id) {
    if (!confirm("Remove this project and its space list? Entries already logged will remain but won't show on dashboards.")) return;
    await supabase.from('projects').delete().eq('id', id);
    reload();
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
        {projects.map((p) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #ECEAE2' }}>
            <span style={{ fontSize: 14 }}>{p.name} <span style={{ color: '#9A988E', fontSize: 12 }}>({p.code})</span></span>
            <button className="btn-danger-ghost" onClick={() => removeProject(p.id)}>Remove</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" style={{ flex: 2 }} placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" style={{ flex: 1 }} placeholder="Short code" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn" onClick={addProject}>Add project</button>
      </div>
    </div>
  );
}

function SpacesSection({ projects }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [spaces, setSpaces] = useState([]);
  const [siteArea, setSiteArea] = useState('');
  const [level, setLevel] = useState('');
  const [zone, setZone] = useState('');
  const [spaceId, setSpaceId] = useState('');

  const loadSpaces = useCallback(async (pid) => {
    if (!pid) { setSpaces([]); return; }
    const { data } = await supabase.from('spaces').select('*').eq('project_id', pid).order('site_area');
    setSpaces(data || []);
  }, []);

  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [projects, projectId]);

  useEffect(() => { loadSpaces(projectId); }, [projectId, loadSpaces]);

  async function addRow() {
    if (!spaceId.trim()) { alert('Enter a Space ID.'); return; }
    await supabase.from('spaces').insert({
      project_id: projectId,
      site_area: siteArea.trim() || '-',
      level: level.trim() || '-',
      zone: zone.trim() || '-',
      space_id: spaceId.trim(),
    });
    setSiteArea(''); setLevel(''); setZone(''); setSpaceId('');
    loadSpaces(projectId);
  }

  async function removeRow(id) {
    await supabase.from('spaces').delete().eq('id', id);
    loadSpaces(projectId);
  }

  if (projects.length === 0) {
    return <p style={{ color: '#9A988E', fontSize: 13 }}>Add a project first.</p>;
  }

  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <p style={{ fontSize: 12, color: '#6B6A63', marginBottom: 14 }}>
        Build the building breakup for each project once here. The Space dropdown on Daily Entry pulls directly from this list.
      </p>

      <div className="field" style={{ marginBottom: 14, maxWidth: 300 }}>
        <label>Project</label>
        <select className="select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 14, border: '1px solid #E4E2D9', borderRadius: 12 }}>
        <table className="data-table">
          <thead>
            <tr><th>Site area</th><th>Level</th><th>Zone</th><th>Space ID</th><th></th></tr>
          </thead>
          <tbody>
            {spaces.map((sp) => (
              <tr key={sp.id}>
                <td>{sp.site_area}</td>
                <td>{sp.level}</td>
                <td>{sp.zone}</td>
                <td style={{ fontWeight: 600 }}>{sp.space_id}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn-danger-ghost" onClick={() => removeRow(sp.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {spaces.length === 0 && <p style={{ fontSize: 13, color: '#9A988E', padding: 10 }}>No spaces added yet for this project.</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 8, borderTop: '1px solid #ECEAE2', paddingTop: 14 }}>
        <input className="input" placeholder="e.g. Main Tower" value={siteArea} onChange={(e) => setSiteArea(e.target.value)} />
        <input className="input" placeholder="e.g. Level 03" value={level} onChange={(e) => setLevel(e.target.value)} />
        <input className="input" placeholder="e.g. Zone-A" value={zone} onChange={(e) => setZone(e.target.value)} />
        <input className="input" placeholder="e.g. Room 301" value={spaceId} onChange={(e) => setSpaceId(e.target.value)} />
        <button className="btn" onClick={addRow}>Add row</button>
      </div>
      <p style={{ fontSize: 11, color: '#9A988E', marginTop: 10 }}>
        Tip: Site Area and Level usually repeat across many rows &mdash; the fields keep their layout so it is quick to work down a floor.
      </p>
    </div>
  );
}

function ForemenSection({ projects }) {
  const [foremen, setForemen] = useState([]);
  const [name, setName] = useState('');
  const [trades, setTrades] = useState([]);
  const [projIds, setProjIds] = useState([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('foremen').select('*');
    setForemen(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(arr, setArr, value) {
    setArr(arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]);
  }

  async function addForeman() {
    if (!name.trim()) { alert('Enter a name.'); return; }
    if (trades.length === 0) { alert('Select at least one trade.'); return; }
    if (projIds.length === 0) { alert('Select at least one project.'); return; }
    await supabase.from('foremen').insert({ name: name.trim(), trades, project_ids: projIds });
    setName(''); setTrades([]); setProjIds([]);
    load();
  }

  async function removeForeman(id) {
    await supabase.from('foremen').delete().eq('id', id);
    load();
  }

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <p style={{ fontSize: 12, color: '#6B6A63', marginBottom: 14 }}>
        Add each foreman once here. The timekeeper will then pick their name from a dropdown when logging HHM work for that trade and project.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
        {foremen.map((f) => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #ECEAE2' }}>
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{f.name}</div>
              <div style={{ color: '#6B6A63', marginTop: 2 }}>
                {f.trades.join(', ')} &middot; {f.project_ids.map((pid) => projects.find((p) => p.id === pid)?.name).filter(Boolean).join(', ')}
              </div>
            </div>
            <button className="btn-danger-ghost" onClick={() => removeForeman(f.id)}>Remove</button>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #ECEAE2', paddingTop: 14 }}>
        <input className="input" style={{ marginBottom: 10, width: '100%' }} placeholder="Foreman name" value={name} onChange={(e) => setName(e.target.value)} />

        <p style={{ fontSize: 12, color: '#6B6A63', marginBottom: 6 }}>Trades (select all that apply)</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {HHM_TRADES.map((t) => (
            <label key={t} className={`chip ${trades.includes(t) ? 'selected' : ''}`}>
              <input type="checkbox" style={{ width: 'auto', height: 'auto', margin: 0 }} checked={trades.includes(t)} onChange={() => toggle(trades, setTrades, t)} />
              {t}
            </label>
          ))}
        </div>

        <p style={{ fontSize: 12, color: '#6B6A63', marginBottom: 6 }}>Projects (select all that apply)</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {projects.map((p) => (
            <label key={p.id} className={`chip ${projIds.includes(p.id) ? 'selected' : ''}`}>
              <input type="checkbox" style={{ width: 'auto', height: 'auto', margin: 0 }} checked={projIds.includes(p.id)} onChange={() => toggle(projIds, setProjIds, p.id)} />
              {p.name}
            </label>
          ))}
        </div>

        <button className="btn" onClick={addForeman}>Add foreman</button>
      </div>
    </div>
  );
}

function SubsSection({ projects }) {
  const [subs, setSubs] = useState([]);
  const [name, setName] = useState('');
  const [trades, setTrades] = useState([]);
  const [projIds, setProjIds] = useState([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('subcontractors').select('*');
    setSubs(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(arr, setArr, value) {
    setArr(arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]);
  }

  async function addSub() {
    if (!name.trim()) { alert('Enter a company name.'); return; }
    if (trades.length === 0) { alert('Select at least one trade.'); return; }
    if (projIds.length === 0) { alert('Select at least one project.'); return; }
    await supabase.from('subcontractors').insert({ name: name.trim(), trades, project_ids: projIds });
    setName(''); setTrades([]); setProjIds([]);
    load();
  }

  async function removeSub(id) {
    await supabase.from('subcontractors').delete().eq('id', id);
    load();
  }

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <p style={{ fontSize: 12, color: '#6B6A63', marginBottom: 14 }}>
        Add each subcontractor company once. They will then appear as a Company option on Daily Entry for their assigned projects.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
        {subs.map((s) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #ECEAE2' }}>
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              <div style={{ color: '#6B6A63', marginTop: 2 }}>
                {s.trades.join(', ')} &middot; {s.project_ids.map((pid) => projects.find((p) => p.id === pid)?.name).filter(Boolean).join(', ')}
              </div>
            </div>
            <button className="btn-danger-ghost" onClick={() => removeSub(s.id)}>Remove</button>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #ECEAE2', paddingTop: 14 }}>
        <input className="input" style={{ marginBottom: 10, width: '100%' }} placeholder="Subcontractor company name" value={name} onChange={(e) => setName(e.target.value)} />

        <p style={{ fontSize: 12, color: '#6B6A63', marginBottom: 6 }}>Trades (select all that apply)</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {TRADES.map((t) => (
            <label key={t} className={`chip ${trades.includes(t) ? 'selected' : ''}`}>
              <input type="checkbox" style={{ width: 'auto', height: 'auto', margin: 0 }} checked={trades.includes(t)} onChange={() => toggle(trades, setTrades, t)} />
              {t}
            </label>
          ))}
        </div>

        <p style={{ fontSize: 12, color: '#6B6A63', marginBottom: 6 }}>Projects (select all that apply)</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {projects.map((p) => (
            <label key={p.id} className={`chip ${projIds.includes(p.id) ? 'selected' : ''}`}>
              <input type="checkbox" style={{ width: 'auto', height: 'auto', margin: 0 }} checked={projIds.includes(p.id)} onChange={() => toggle(projIds, setProjIds, p.id)} />
              {p.name}
            </label>
          ))}
        </div>

        <button className="btn" onClick={addSub}>Add subcontractor</button>
      </div>
    </div>
  );
}
