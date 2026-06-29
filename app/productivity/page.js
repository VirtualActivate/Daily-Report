'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { computeProductivity, generateProductivityFindings } from '../../lib/constants';
import { IconTrophy, IconTrendingUp, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';

export default function ProductivityPage() {
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

  const filtered = projectFilter === 'ALL' ? entries : entries.filter((e) => e.project_id === projectFilter);
  const byTrade = computeProductivity(filtered);
  const findings = generateProductivityFindings(byTrade);
  const trades = Object.keys(byTrade);

  return (
    <div>
      <div className="topbar">
        <h1>Productivity</h1>
        <p className="subtitle">In-house vs subcontractor output, normalized by man-days, per trade</p>
      </div>

      <div className="field" style={{ marginBottom: 24, maxWidth: 280 }}>
        <label>Project</label>
        <select className="select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="ALL">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {findings.length > 0 && (
        <div className="card" style={{ marginBottom: 28, maxWidth: 760, background: '#F4F3EE' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3>Smart findings</h3>
            <span style={{ fontSize: 11, color: '#9A988E' }}>rule-based, calculated directly from logged entries</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {findings.map((f, i) => (
              <FindingRow key={i} finding={f} />
            ))}
          </div>
        </div>
      )}

      {trades.length === 0 ? (
        <p style={{ color: '#9A988E', fontSize: 14 }}>No entries logged yet — productivity comparisons will appear once Daily entry has data.</p>
      ) : (
        trades.map((trade) => (
          <div key={trade} style={{ marginBottom: 28 }}>
            <h3 style={{ marginBottom: 10 }}>{trade}</h3>
            <div style={{ overflowX: 'auto', border: '1px solid #E4E2D9', borderRadius: 12, maxWidth: 760 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Type</th>
                    <th>Man-days</th>
                    <th>Apartments touched</th>
                    <th>Apartments completed</th>
                    <th>Rate / 10 man-days</th>
                  </tr>
                </thead>
                <tbody>
                  {byTrade[trade].map((row, idx) => (
                    <tr key={row.companyName}>
                      <td style={{ fontWeight: 600 }}>
                        {idx === 0 && row.manDays >= 10 && (
                          <span style={{ marginRight: 6, fontSize: 10, background: '#E3F3E1', color: '#1E6B1A', borderRadius: 6, padding: '1px 6px' }}>Top</span>
                        )}
                        {row.companyName}
                      </td>
                      <td>{row.companyType === 'HHM' ? 'In-house' : 'Subcontractor'}</td>
                      <td style={{ textAlign: 'center' }}>{row.manDays}</td>
                      <td style={{ textAlign: 'center' }}>{row.apartmentsTouched}</td>
                      <td style={{ textAlign: 'center' }}>{row.apartmentsCompleted}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {row.ratePerTenManDays}
                        {row.manDays < 10 && <span style={{ fontWeight: 400, color: '#9A988E', fontSize: 11 }}> (low data)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function FindingRow({ finding }) {
  const iconByType = {
    'top-performer': IconTrophy,
    'sub-beats-hhm': IconTrendingUp,
    'hhm-beats-sub': IconTrendingUp,
    'single-crew': IconInfoCircle,
    'low-sample': IconAlertTriangle,
    'low-data': IconAlertTriangle,
  };
  const colorByType = {
    'top-performer': '#1E6B1A',
    'sub-beats-hhm': '#1D4ED8',
    'hhm-beats-sub': '#1D4ED8',
    'single-crew': '#6B6A63',
    'low-sample': '#92600A',
    'low-data': '#92600A',
  };
  const Icon = iconByType[finding.type] || IconInfoCircle;
  const color = colorByType[finding.type] || '#6B6A63';
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
      <Icon size={16} color={color} style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
      <span>{finding.text}</span>
    </div>
  );
}
