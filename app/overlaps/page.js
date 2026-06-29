'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { findCrewOverlaps, fmtDate } from '../../lib/constants';

export default function OverlapsPage() {
  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('ALL');

  const loadAll = useCallback(async () => {
    const { data: proj } = await supabase.from('projects').select('*').order('created_at');
    const { data: allEntries } = await supabase.from('entries').select('*');
    setProjects(proj || []);
    setEntries(allEntries || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) return <p style={{ color: '#6B6A63' }}>Loading...</p>;

  const filteredEntries = projectFilter === 'ALL' ? entries : entries.filter((e) => e.project_id === projectFilter);
  const overlaps = findCrewOverlaps(filteredEntries);

  function projectName(id) {
    return projects.find((p) => p.id === id)?.name || '';
  }

  return (
    <div>
      <div className="topbar">
        <h1>Overlaps</h1>
        <p className="subtitle">Apartments where more than one company has logged the same trade, at any time</p>
      </div>

      <div className="field" style={{ marginBottom: 20, maxWidth: 280 }}>
        <label>Project</label>
        <select className="select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="ALL">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="warning-box" style={{ marginBottom: 24, maxWidth: 760 }}>
        <span>
          This list is intentionally broad. It includes normal handovers (one crew did First Fix, another
          legitimately did Second Fix) alongside genuine duplicate or conflicting assignments. Review each
          row &mdash; a flag here is a reason to check, not proof of a problem.
        </span>
      </div>

      {overlaps.length === 0 ? (
        <p style={{ color: '#9A988E', fontSize: 14 }}>No overlaps found. Every apartment + trade combination has been worked by a single company so far.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 760 }}>
          {overlaps.map((ov, idx) => (
            <div key={idx} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{ov.spaceLabel}</span>
                  <span style={{ fontSize: 13, color: '#6B6A63', marginLeft: 8 }}>{ov.trade}</span>
                </div>
                <span style={{ fontSize: 11, color: '#9A988E' }}>{projectName(ov.projectId)}</span>
              </div>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Stages logged</th>
                    <th>Entries</th>
                    <th>Manpower total</th>
                    <th>First date</th>
                    <th>Last date</th>
                  </tr>
                </thead>
                <tbody>
                  {ov.companies.map((c) => (
                    <tr key={c.name}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.stages.join(', ')}</td>
                      <td style={{ textAlign: 'center' }}>{c.entryCount}</td>
                      <td style={{ textAlign: 'center' }}>{c.totalManpower}</td>
                      <td>{fmtDate(c.firstDate)}</td>
                      <td>{fmtDate(c.lastDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
