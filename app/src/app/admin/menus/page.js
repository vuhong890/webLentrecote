'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminMenus() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name_en: '', name_vi: '', description_en: '', description_vi: '', price: '', image_url: '', badge: '', category_id: '', is_available: true });
  const [uploading, setUploading] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token);
    });
    loadCategories();
  }, []);

  useEffect(() => { loadItems(); }, [activeCat]);

  async function loadCategories() {
    const res = await fetch('/api/menu-categories');
    const data = await res.json();
    if (Array.isArray(data)) {
      setCategories(data);
      if (data.length > 0 && !activeCat) setActiveCat(data[0].id);
    }
  }

  async function loadItems() {
    const url = activeCat ? `/api/menu-items?category_id=${activeCat}` : '/api/menu-items';
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) setItems(data);
  }

  function openNew() {
    setEditItem(null);
    setForm({ name_en: '', name_vi: '', description_en: '', description_vi: '', price: '', image_url: '', badge: '', category_id: activeCat || '', is_available: true });
    setShowForm(true);
  }

  function openEdit(item) {
    setEditItem(item);
    setForm({
      name_en: item.name_en, name_vi: item.name_vi,
      description_en: item.description_en, description_vi: item.description_vi,
      price: item.price, image_url: item.image_url, badge: item.badge || '',
      category_id: item.category_id, is_available: item.is_available,
    });
    setShowForm(true);
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', 'menu-images');
    const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    if (data.url) setForm(prev => ({ ...prev, image_url: data.url }));
    setUploading(false);
  }

  async function handleSave() {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    if (editItem) {
      await fetch('/api/menu-items', { method: 'PUT', headers, body: JSON.stringify({ id: editItem.id, ...form, price: Number(form.price) }) });
    } else {
      await fetch('/api/menu-items', { method: 'POST', headers, body: JSON.stringify({ ...form, price: Number(form.price) }) });
    }
    setShowForm(false);
    loadItems();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this item?')) return;
    await fetch(`/api/menu-items?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadItems();
  }

  const s = {
    page: { color: '#fff' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
    title: { fontFamily: 'var(--font-headline)', fontSize: '1.75rem' },
    addBtn: { padding: '0.6rem 1.25rem', background: '#F0C75E', color: '#1a1a1a', border: 'none', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.1em', cursor: 'pointer' },
    catBar: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
    catBtn: { padding: '0.5rem 1rem', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' },
    catActive: { background: '#F0C75E', color: '#1a1a1a', borderColor: '#F0C75E' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '0.75rem', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    td: { padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    img: { width: 50, height: 50, objectFit: 'cover', background: '#2a1a0a' },
    actions: { display: 'flex', gap: '0.5rem' },
    editBtn: { padding: '0.3rem 0.75rem', background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: 'none', fontSize: '0.75rem', cursor: 'pointer' },
    delBtn: { padding: '0.3rem 0.75rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', fontSize: '0.75rem', cursor: 'pointer' },
    price: { color: '#F0C75E', fontWeight: 700 },
    badge: { padding: '0.15rem 0.5rem', background: 'rgba(240,199,94,0.15)', color: '#F0C75E', fontSize: '0.7rem', fontWeight: 700 },
    avail: { color: '#22c55e' }, unavail: { color: '#ef4444' },
    // Modal
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#1a1a1a', padding: '2rem', maxWidth: 600, width: '90vw', maxHeight: '85vh', overflowY: 'auto' },
    formTitle: { fontSize: '1.25rem', fontFamily: 'var(--font-headline)', marginBottom: '1.5rem' },
    field: { marginBottom: '1rem' },
    label: { display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' },
    input: { width: '100%', padding: '0.6rem 0.75rem', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none' },
    textarea: { width: '100%', padding: '0.6rem 0.75rem', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none', minHeight: 80, resize: 'vertical' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
    imgPrev: { width: 80, height: 80, objectFit: 'cover', marginTop: '0.5rem', background: '#2a1a0a' },
    formActions: { display: 'flex', gap: '0.75rem', marginTop: '1.5rem' },
    saveBtn: { flex: 1, padding: '0.75rem', background: '#F0C75E', color: '#1a1a1a', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' },
    cancelBtn: { flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', fontSize: '0.8rem', cursor: 'pointer' },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Menu Management</h1>
        <button style={s.addBtn} onClick={openNew}>+ ADD ITEM</button>
      </div>

      {/* Category filter */}
      <div style={s.catBar}>
        {categories.map(cat => (
          <button key={cat.id} style={{ ...s.catBtn, ...(activeCat === cat.id ? s.catActive : {}) }} onClick={() => setActiveCat(cat.id)}>
            {cat.name_en}
          </button>
        ))}
      </div>

      {/* Items table */}
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Image</th>
            <th style={s.th}>Name (EN)</th>
            <th style={s.th}>Name (VI)</th>
            <th style={s.th}>Price</th>
            <th style={s.th}>Badge</th>
            <th style={s.th}>Status</th>
            <th style={s.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td style={s.td}>{item.image_url ? <img src={item.image_url} style={s.img} alt="" /> : <div style={{ ...s.img, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🥩</div>}</td>
              <td style={s.td}>{item.name_en}</td>
              <td style={s.td}>{item.name_vi}</td>
              <td style={{ ...s.td, ...s.price }}>{Number(item.price).toLocaleString()}₫</td>
              <td style={s.td}>{item.badge && <span style={s.badge}>{item.badge}</span>}</td>
              <td style={s.td}><span style={item.is_available ? s.avail : s.unavail}>{item.is_available ? '● Active' : '● Hidden'}</span></td>
              <td style={s.td}>
                <div style={s.actions}>
                  <button style={s.editBtn} onClick={() => openEdit(item)}>Edit</button>
                  <button style={s.delBtn} onClick={() => handleDelete(item.id)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={7} style={{ ...s.td, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No items in this category</td></tr>}
        </tbody>
      </table>

      {/* Form modal */}
      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.formTitle}>{editItem ? 'Edit Item' : 'Add New Item'}</h2>

            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>Name (English)</label>
                <input style={s.input} value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Name (Vietnamese)</label>
                <input style={s.input} value={form.name_vi} onChange={e => setForm({ ...form, name_vi: e.target.value })} />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Description (English)</label>
              <textarea style={s.textarea} value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Description (Vietnamese)</label>
              <textarea style={s.textarea} value={form.description_vi} onChange={e => setForm({ ...form, description_vi: e.target.value })} />
            </div>

            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>Price (VND)</label>
                <input style={s.input} type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Badge</label>
                <input style={s.input} value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="e.g. Signature, Chef's Pick" />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Category</label>
              <select style={s.input} value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>Image</label>
              <input type="file" accept="image/*" onChange={handleUpload} style={{ color: '#fff', fontSize: '0.85rem' }} />
              {uploading && <p style={{ color: '#F0C75E', fontSize: '0.8rem' }}>Uploading...</p>}
              {form.image_url && <img src={form.image_url} style={s.imgPrev} alt="" />}
            </div>

            <div style={s.field}>
              <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })} />
                Available on menu
              </label>
            </div>

            <div style={s.formActions}>
              <button style={s.saveBtn} onClick={handleSave}>SAVE</button>
              <button style={s.cancelBtn} onClick={() => setShowForm(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
