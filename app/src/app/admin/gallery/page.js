'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminGallery() {
  const [images, setImages] = useState([]);
  const [token, setToken] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title_en: '', title_vi: '', category: 'food', image_url: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setToken(session.access_token); });
    loadImages();
  }, []);

  async function loadImages() {
    const res = await fetch('/api/gallery');
    const data = await res.json();
    if (Array.isArray(data)) setImages(data);
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', 'gallery');
    const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    if (data.url) setForm(prev => ({ ...prev, image_url: data.url }));
    setUploading(false);
  }

  async function handleSave() {
    await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ title_en: '', title_vi: '', category: 'food', image_url: '' });
    loadImages();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this image?')) return;
    await fetch(`/api/gallery?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadImages();
  }

  const s = {
    title: { fontFamily: 'var(--font-headline)', fontSize: '1.75rem', color: '#fff', marginBottom: '0.25rem' },
    subtitle: { color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', marginBottom: '1.5rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
    addBtn: { padding: '0.6rem 1.25rem', background: '#F0C75E', color: '#1a1a1a', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' },
    card: { position: 'relative', background: '#1a1a1a', overflow: 'hidden' },
    cardImg: { width: '100%', height: 180, objectFit: 'cover' },
    cardBody: { padding: '0.75rem' },
    cardTitle: { fontSize: '0.85rem', color: '#fff', marginBottom: '0.25rem' },
    cardCat: { fontSize: '0.65rem', color: '#F0C75E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' },
    delBtn: { position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ef4444', fontSize: '1rem', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#1a1a1a', padding: '2rem', maxWidth: 500, width: '90vw' },
    field: { marginBottom: '1rem' },
    label: { display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' },
    input: { width: '100%', padding: '0.6rem 0.75rem', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem', outline: 'none' },
    row: { display: 'flex', gap: '0.75rem', marginTop: '1.5rem' },
    saveBtn: { flex: 1, padding: '0.75rem', background: '#F0C75E', color: '#1a1a1a', border: 'none', fontWeight: 700, cursor: 'pointer' },
    cancelBtn: { flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', cursor: 'pointer' },
  };

  return (
    <div>
      <div style={s.header}>
        <div><h1 style={s.title}>Gallery</h1><p style={s.subtitle}>Manage restaurant photos</p></div>
        <button style={s.addBtn} onClick={() => setShowForm(true)}>+ ADD IMAGE</button>
      </div>

      <div style={s.grid}>
        {images.map(img => (
          <div key={img.id} style={s.card}>
            <img src={img.image_url} style={s.cardImg} alt={img.title_en} />
            <div style={s.cardBody}>
              <div style={s.cardCat}>{img.category}</div>
              <div style={s.cardTitle}>{img.title_en || 'Untitled'}</div>
            </div>
            <button style={s.delBtn} onClick={() => handleDelete(img.id)}>✕</button>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.25rem', marginBottom: '1.5rem', color: '#fff' }}>Add Gallery Image</h2>
            <div style={s.field}><label style={s.label}>Title (EN)</label><input style={s.input} value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} /></div>
            <div style={s.field}><label style={s.label}>Title (VI)</label><input style={s.input} value={form.title_vi} onChange={e => setForm({ ...form, title_vi: e.target.value })} /></div>
            <div style={s.field}>
              <label style={s.label}>Category</label>
              <select style={s.input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="food">Food</option>
                <option value="ambiance">Ambiance</option>
                <option value="events">Events</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Image</label>
              <input type="file" accept="image/*" onChange={handleUpload} style={{ color: '#fff' }} />
              {uploading && <p style={{ color: '#F0C75E', fontSize: '0.8rem', marginTop: '0.3rem' }}>Uploading...</p>}
              {form.image_url && <img src={form.image_url} style={{ width: 100, height: 100, objectFit: 'cover', marginTop: '0.5rem' }} alt="" />}
            </div>
            <div style={s.row}><button style={s.saveBtn} onClick={handleSave}>SAVE</button><button style={s.cancelBtn} onClick={() => setShowForm(false)}>CANCEL</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
