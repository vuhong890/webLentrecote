'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [token, setToken] = useState('');

  const [editingRes, setEditingRes] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token);
    });
  }, []);

  useEffect(() => { 
    if (token) {
      loadReservations(); 
      const interval = setInterval(loadReservations, 10000); // Tự động load lại mỗi 10 giây
      return () => clearInterval(interval);
    }
  }, [token, filter, search, dateFilter]);

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
    const res = await fetch('/api/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert('Error: ' + (data.error || 'Failed to update'));
    }
    loadReservations();
  }

  function confirmDelete(id) {
    setDeleteConfirmId(id);
  }

  async function executeDelete() {
    if (!deleteConfirmId) return;
    const res = await fetch(`/api/reservations?id=${deleteConfirmId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json();
      alert('Error: ' + (data.error || 'Failed to delete'));
    }
    setDeleteConfirmId(null);
    loadReservations();
  }

  function openEdit(res = null) {
    if (res) {
      setEditingRes(res);
      setForm(res);
    } else {
      setEditingRes(null);
      setForm({
        full_name: '', phone: '', email: '', date: '', time: '19:00', guests: 2, branch: '', note: '', status: 'pending'
      });
    }
    setIsModalOpen(true);
  }

  async function handleSaveForm(e) {
    e.preventDefault();
    let res;
    if (editingRes) {
      res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: editingRes.id, ...form })
      });
    } else {
      res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
    }
    
    if (!res.ok) {
      const data = await res.json();
      alert('Error saving: ' + (data.error || 'Unknown error'));
    } else {
      setIsModalOpen(false);
      loadReservations();
    }
  }

  const statusColors = {
    pending: { bg: 'rgba(249,115,22,0.15)', color: '#f97316' },
    confirmed: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    arrived: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
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
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal: { background: '#111', border: '1px solid #333', padding: '2rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' },
    formGroup: { marginBottom: '1rem' },
    formLabel: { display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' },
    formInput: { width: '100%', padding: '0.6rem', background: '#222', border: '1px solid #333', color: '#fff', fontSize: '0.9rem' },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{...s.title, marginBottom: 0}}>Reservations</h1>
        <button style={{ ...s.filterBtn, background: '#F0C75E', color: '#000' }} onClick={() => openEdit(null)}>+ Add Reservation</button>
      </div>

      <div style={s.filters}>
        {['all', 'pending', 'confirmed', 'arrived', 'cancelled'].map(f => (
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
                  {r.status !== 'confirmed' && <button title="Confirm" style={s.btn('confirmed')} onClick={() => updateStatus(r.id, 'confirmed')}>✓</button>}
                  {r.status !== 'arrived' && <button title="Arrived" style={s.btn('arrived')} onClick={() => updateStatus(r.id, 'arrived')}>📍</button>}
                  {r.status !== 'cancelled' && <button title="Cancel" style={s.btn('cancelled')} onClick={() => updateStatus(r.id, 'cancelled')}>✕</button>}
                  {r.status !== 'pending' && <button title="Pending" style={s.btn('pending')} onClick={() => updateStatus(r.id, 'pending')}>↺</button>}
                  <button title="Edit" style={{...s.btn('pending'), background: '#333', color: '#fff', marginLeft: '0.5rem'}} onClick={() => openEdit(r)}>✎</button>
                  <button title="Delete" style={{...s.btn('cancelled'), background: '#333'}} onClick={() => confirmDelete(r.id)}>🗑</button>
                </div>
              </td>
            </tr>
          ))}
          {reservations.length === 0 && <tr><td colSpan={9} style={{ ...s.td, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '2rem' }}>No reservations found</td></tr>}
        </tbody>
      </table>

      {isModalOpen && (
        <div style={s.overlay} onClick={() => setIsModalOpen(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-headline)', color: '#fff', marginBottom: '1rem' }}>
              {editingRes ? 'Edit Reservation' : 'New Reservation'}
            </h2>
            <form onSubmit={handleSaveForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={s.formGroup}><label style={s.formLabel}>Name</label><input required style={s.formInput} value={form.full_name || ''} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
                <div style={s.formGroup}><label style={s.formLabel}>Phone</label><input required style={s.formInput} value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              </div>
              <div style={s.formGroup}><label style={s.formLabel}>Email</label><input type="email" style={s.formInput} value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div style={s.formGroup}><label style={s.formLabel}>Date</label><input type="date" required style={s.formInput} value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} /></div>
                <div style={s.formGroup}><label style={s.formLabel}>Time</label><input type="time" required style={s.formInput} value={form.time || ''} onChange={e => setForm({...form, time: e.target.value})} /></div>
                <div style={s.formGroup}><label style={s.formLabel}>Guests</label><input type="number" min="1" required style={s.formInput} value={form.guests || 2} onChange={e => setForm({...form, guests: e.target.value})} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={s.formGroup}><label style={s.formLabel}>Branch</label><input style={s.formInput} value={form.branch || ''} onChange={e => setForm({...form, branch: e.target.value})} /></div>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Status</label>
                  <select style={s.formInput} value={form.status || 'pending'} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="arrived">Arrived</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div style={s.formGroup}><label style={s.formLabel}>Special Notes</label><textarea rows="3" style={s.formInput} value={form.note || ''} onChange={e => setForm({...form, note: e.target.value})}></textarea></div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '0.75rem', background: '#333', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#F0C75E', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div style={s.overlay} onClick={() => setDeleteConfirmId(null)}>
          <div style={{ ...s.modal, maxWidth: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-headline)', color: '#fff', marginBottom: '1rem' }}>Delete Reservation?</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>This action cannot be undone. Are you sure you want to delete this reservation?</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '0.75rem', background: '#333', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={executeDelete} style={{ flex: 1, padding: '0.75rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
