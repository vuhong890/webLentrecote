'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token);
    });
  }, []);

  useEffect(() => { if (token) loadReservations(); }, [token, filter, search, dateFilter]);

  async function loadReservations() {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    if (search) params.set('search', search);
    if (dateFilter) params.set('date', dateFilter);

    const res = await fetch(`/api/reservations?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) setReservations(data);
  }

  async function updateStatus(id, status) {
    await fetch('/api/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    });
    loadReservations();
  }

  const statusColors = {
    pending: { bg: 'rgba(249,115,22,0.15)', color: '#f97316' },
    confirmed: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  };

  const s = {
    title: { fontFamily: 'var(--font-headline)', fontSize: '1.75rem', color: '#fff', marginBottom: '1.5rem' },
    filters: { display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' },
    input: { padding: '0.5rem 0.75rem', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem', fontFamily: 'var(--font-body)', outline: 'none', minWidth: 180 },
    filterBtn: { padding: '0.5rem 1rem', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' },
    filterActive: { background: '#F0C75E', color: '#1a1a1a', borderColor: '#F0C75E' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '0.75rem', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    td: { padding: '0.75rem', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#fff' },
    actions: { display: 'flex', gap: '0.4rem' },
    btn: (status) => ({ padding: '0.25rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: statusColors[status]?.bg, color: statusColors[status]?.color }),
    badge: (status) => ({ padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', background: statusColors[status]?.bg, color: statusColors[status]?.color }),
  };

  return (
    <div>
      <h1 style={s.title}>Reservations</h1>

      <div style={s.filters}>
        {['all', 'pending', 'confirmed', 'cancelled'].map(f => (
          <button key={f} style={{ ...s.filterBtn, ...(filter === f ? s.filterActive : {}) }} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
        <input style={s.input} type="text" placeholder="Search name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} />
        <input style={s.input} type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Name</th>
            <th style={s.th}>Phone</th>
            <th style={s.th}>Email</th>
            <th style={s.th}>Date</th>
            <th style={s.th}>Time</th>
            <th style={s.th}>Guests</th>
            <th style={s.th}>Branch</th>
            <th style={s.th}>Status</th>
            <th style={s.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map(r => (
            <tr key={r.id}>
              <td style={s.td}>{r.full_name}</td>
              <td style={s.td}>{r.phone}</td>
              <td style={s.td}>{r.email}</td>
              <td style={s.td}>{r.date}</td>
              <td style={s.td}>{r.time}</td>
              <td style={s.td}>{r.guests}</td>
              <td style={s.td}>{r.branch || '—'}</td>
              <td style={s.td}><span style={s.badge(r.status)}>{r.status}</span></td>
              <td style={s.td}>
                <div style={s.actions}>
                  {r.status !== 'confirmed' && <button style={s.btn('confirmed')} onClick={() => updateStatus(r.id, 'confirmed')}>✓</button>}
                  {r.status !== 'cancelled' && <button style={s.btn('cancelled')} onClick={() => updateStatus(r.id, 'cancelled')}>✕</button>}
                  {r.status !== 'pending' && <button style={s.btn('pending')} onClick={() => updateStatus(r.id, 'pending')}>↺</button>}
                </div>
              </td>
            </tr>
          ))}
          {reservations.length === 0 && <tr><td colSpan={9} style={{ ...s.td, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '2rem' }}>No reservations found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
