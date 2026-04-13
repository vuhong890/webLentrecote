'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminGallery() {
  const [images, setImages] = useState([]);
  const [token, setToken] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title_en: '', title_vi: '', category: 'food', image_url: '' });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token);
        console.log('[Gallery] Auth token set successfully');
      } else {
        console.log('[Gallery] No session found');
      }
    });
    loadImages();
  }, []);

  async function loadImages() {
    const res = await fetch('/api/gallery');
    const data = await res.json();
    if (Array.isArray(data)) setImages(data);
  }

  async function uploadFile(file) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', 'gallery');
    try {
      const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.url) setForm(prev => ({ ...prev, image_url: data.url }));
      else alert('Upload failed: ' + (data.error || 'Unknown error'));
    } catch (err) { alert('Upload error: ' + err.message); }
    setUploading(false);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadFile(file);
    } else {
      alert('Please drop an image file (JPG, PNG, WebP)');
    }
  }

  function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); setDragOver(true); }
  function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); setDragOver(false); }

  function openAdd() {
    setEditing(null);
    setForm({ title_en: '', title_vi: '', category: 'food', image_url: '' });
    setShowForm(true);
  }

  function openEdit(img) {
    setEditing(img);
    setForm({
      title_en: img.title_en || '',
      title_vi: img.title_vi || '',
      category: img.category || 'food',
      image_url: img.image_url || ''
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSave() {
    console.log('[Gallery] handleSave called, editing:', !!editing, 'token:', token ? 'SET' : 'EMPTY');
    if (editing) {
      fetch('/api/gallery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: editing.id, ...form }),
      })
        .then(res => res.json())
        .then(data => {
          console.log('[Gallery] Update response:', data);
          if (data.error) {
            alert('Update failed: ' + data.error);
          } else {
            closeForm();
            loadImages();
          }
        })
        .catch(err => {
          console.error('[Gallery] Update error:', err);
          alert('Update error: ' + err.message);
        });
    } else {
      fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
        .then(res => res.json())
        .then(data => {
          console.log('[Gallery] Create response:', data);
          if (data.error) {
            alert('Create failed: ' + data.error);
          } else {
            closeForm();
            loadImages();
          }
        })
        .catch(err => {
          console.error('[Gallery] Create error:', err);
          alert('Create error: ' + err.message);
        });
    }
  }

  function handleDeleteFromCard(e, id) {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Gallery] handleDeleteFromCard called, id:', id);
    const yes = window.confirm('Delete this image?');
    if (!yes) return;
    fetch('/api/gallery?id=' + id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        console.log('[Gallery] Delete response:', data);
        if (data.error) {
          alert('Delete failed: ' + data.error);
        } else {
          loadImages();
        }
      })
      .catch(function(err) {
        console.error('[Gallery] Delete error:', err);
        alert('Delete error: ' + err.message);
      });
  }

  function handleDeleteFromModal() {
    console.log('[Gallery] handleDeleteFromModal called, editing:', editing?.id);
    if (!editing) return;
    const yes = window.confirm('Delete this image permanently?');
    if (!yes) return;
    fetch('/api/gallery?id=' + editing.id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        console.log('[Gallery] Delete modal response:', data);
        if (data.error) {
          alert('Delete failed: ' + data.error);
        } else {
          closeForm();
          loadImages();
        }
      })
      .catch(function(err) {
        console.error('[Gallery] Delete modal error:', err);
        alert('Delete error: ' + err.message);
      });
  }

  function handleRemoveImage() {
    setForm(prev => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const s = {
    title: { fontFamily: 'var(--font-headline)', fontSize: '1.75rem', color: '#fff', marginBottom: '0.25rem' },
    subtitle: { color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', marginBottom: '1.5rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
    addBtn: { padding: '0.6rem 1.25rem', background: '#F0C75E', color: '#1a1a1a', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' },
    card: { position: 'relative', background: '#1a1a1a', overflow: 'visible', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)' },
    cardImg: { width: '100%', height: 180, objectFit: 'cover', display: 'block' },
    cardBody: { padding: '0.75rem' },
    cardTitle: { fontSize: '0.85rem', color: '#fff', marginBottom: '0.25rem' },
    cardCat: { fontSize: '0.65rem', color: '#F0C75E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' },
    delBtn: { position: 'absolute', top: -8, right: -8, background: '#c0392b', border: '2px solid #1a1a1a', color: '#fff', fontSize: '0.9rem', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, borderRadius: '50%', padding: 0, lineHeight: 1 },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#1a1a1a', padding: '2rem', maxWidth: 500, width: '90vw', maxHeight: '85vh', overflowY: 'auto' },
    field: { marginBottom: '1rem' },
    label: { display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' },
    input: { width: '100%', padding: '0.6rem 0.75rem', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
    row: { display: 'flex', gap: '0.75rem', marginTop: '1.5rem' },
    saveBtn: { flex: 1, padding: '0.75rem', background: '#F0C75E', color: '#1a1a1a', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' },
    cancelBtn: { flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.85rem' },
    uploadArea: { border: '2px dashed rgba(255,255,255,0.15)', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: '#0a0a0a' },
    imagePreview: { width: '100%', maxHeight: 200, objectFit: 'cover', marginTop: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' },
    removeBtn: { marginTop: '0.5rem', padding: '0.4rem 1rem', background: '#c0392b', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' },
    deleteModalBtn: { width: '100%', padding: '0.6rem', background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1rem' },
  };

  return (
    <div>
      <div style={s.header}>
        <div><h1 style={s.title}>Gallery</h1><p style={s.subtitle}>Manage restaurant photos</p></div>
        <button type="button" style={s.addBtn} onClick={openAdd}>+ ADD IMAGE</button>
      </div>

      <div style={s.grid}>
        {images.map(img => (
          <div key={img.id} style={s.card} onClick={() => openEdit(img)}>
            {img.image_url ? (
              <img src={img.image_url} style={s.cardImg} alt={img.title_en || ''} />
            ) : (
              <div style={{ ...s.cardImg, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2a2a2a', color: '#666', fontSize: '0.8rem' }}>No image</div>
            )}
            <div style={s.cardBody}>
              <div style={s.cardCat}>{img.category}</div>
              <div style={s.cardTitle}>{img.title_en || 'Untitled'}</div>
            </div>
            <button
              type="button"
              style={s.delBtn}
              onClick={function(e) { handleDeleteFromCard(e, img.id); }}
              title="Delete"
            >✕</button>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={s.overlay} onClick={closeForm}>
          <div style={s.modal} onClick={function(e) { e.stopPropagation(); }}>
            <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.25rem', marginBottom: '1.5rem', color: '#fff' }}>
              {editing ? 'Edit Gallery Image' : 'Add Gallery Image'}
            </h2>

            <div style={s.field}>
              <label style={s.label}>Title (EN)</label>
              <input style={s.input} value={form.title_en} onChange={function(e) { setForm({ ...form, title_en: e.target.value }); }} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Title (VI)</label>
              <input style={s.input} value={form.title_vi} onChange={function(e) { setForm({ ...form, title_vi: e.target.value }); }} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Category</label>
              <select style={s.input} value={form.category} onChange={function(e) { setForm({ ...form, category: e.target.value }); }}>
                <option value="food">Food</option>
                <option value="ambiance">Ambiance</option>
                <option value="events">Events</option>
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>Image</label>
              {form.image_url ? (
                <div>
                  <img src={form.image_url} alt="Preview" style={s.imagePreview} />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button type="button" style={s.removeBtn} onClick={handleRemoveImage}>Remove</button>
                    <label style={{ ...s.removeBtn, background: '#2980b9', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                      Change
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    ...s.uploadArea,
                    borderColor: dragOver ? '#F0C75E' : 'rgba(255,255,255,0.15)',
                    background: dragOver ? 'rgba(240,199,94,0.05)' : '#0a0a0a',
                  }}
                  onClick={function(e) { e.stopPropagation(); fileInputRef.current?.click(); }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  {uploading ? (
                    <p style={{ color: '#F0C75E', margin: 0 }}>Uploading...</p>
                  ) : (
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 0.5rem 0', fontSize: '2rem' }}>📁</p>
                      <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.85rem' }}>Click or drag and drop to upload</p>
                      <p style={{ color: 'rgba(255,255,255,0.25)', margin: '0.25rem 0 0 0', fontSize: '0.7rem' }}>JPG, PNG, WebP (max 5MB)</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={s.row}>
              <button type="button" style={s.saveBtn} onClick={handleSave}>{editing ? 'UPDATE' : 'SAVE'}</button>
              <button type="button" style={s.cancelBtn} onClick={closeForm}>CANCEL</button>
            </div>

            {editing ? (
              <button type="button" style={s.deleteModalBtn} onClick={handleDeleteFromModal}>
                🗑️ DELETE THIS IMAGE
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
