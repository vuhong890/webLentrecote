'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPages() {
  const [activePage, setActivePage] = useState('home');
  const [sections, setSections] = useState([]);
  const [token, setToken] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Signature items state
  const [sigMode, setSigMode] = useState(false);
  const [sigItems, setSigItems] = useState([]);
  const [sigSaving, setSigSaving] = useState(false);

  // Menu item picker for signatures
  const [showMenuPicker, setShowMenuPicker] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuActiveSlug, setMenuActiveSlug] = useState('');

  // Home Gallery state
  const [galleryMode, setGalleryMode] = useState(false);
  const [galleryPicks, setGalleryPicks] = useState([]);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [allGalleryImages, setAllGalleryImages] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setToken(session.access_token); });
  }, []);

  useEffect(() => { loadSections(); }, [activePage]);

  async function loadSections() {
    const res = await fetch(`/api/page-sections?page=${activePage}`);
    const data = await res.json();
    if (Array.isArray(data)) setSections(data);
  }

  function openEdit(section) {
    if (section.section_key === 'signature') {
      setSigMode(true);
      setEditing(section);
      setForm({ ...section });
      loadSigItems();
      return;
    }
    if (section.section_key === 'home_gallery') {
      setGalleryMode(true);
      setEditing(section);
      setForm({ ...section });
      loadGalleryPicks();
      return;
    }
    setEditing(section);
    setForm({ ...section });
  }

  async function handleSave() {
    setSaving(true);
    await fetch('/api/page-sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setEditing(null);
    setSigMode(false);
    setGalleryMode(false);
    loadSections();
  }

  async function uploadFile(file) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', 'page-assets');
    try {
      const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.url) setForm(prev => ({ ...prev, image_url: data.url }));
      else alert('Upload failed: ' + (data.error || 'Unknown error'));
    } catch (err) { alert('Upload error: ' + err.message); }
    setUploading(false);
  }

  function handleImageUpload(e) {
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

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleRemoveImage() {
    setForm(prev => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ---- Signature Items ----
  async function loadSigItems() {
    const res = await fetch('/api/signature-items?all=1');
    const data = await res.json();
    if (Array.isArray(data)) setSigItems(data);
  }

  async function openMenuPicker() {
    setShowMenuPicker(true);
    // Load categories
    const catRes = await fetch('/api/menu-categories');
    const cats = await catRes.json();
    if (Array.isArray(cats) && cats.length > 0) {
      setMenuCategories(cats);
      setMenuActiveSlug(cats[0].slug);
      // Load items for first category
      const itemRes = await fetch(`/api/menu-items?category_id=${cats[0].id}`);
      const items = await itemRes.json();
      setMenuItems(Array.isArray(items) ? items : []);
    }
  }

  async function handleMenuCategoryChange(cat) {
    setMenuActiveSlug(cat.slug);
    const itemRes = await fetch(`/api/menu-items?category_id=${cat.id}`);
    const items = await itemRes.json();
    setMenuItems(Array.isArray(items) ? items : []);
  }

  async function handleSelectMenuItem(menuItem) {
    setSigSaving(true);
    await fetch('/api/signature-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        menu_item_id: menuItem.id,
        name_en: menuItem.name_en,
        name_vi: menuItem.name_vi || '',
        description_en: menuItem.description_en,
        description_vi: menuItem.description_vi || '',
        image_url: menuItem.image_url || '',
        display_order: sigItems.length + 1,
        is_active: true,
      }),
    });
    setSigSaving(false);
    setShowMenuPicker(false);
    loadSigItems();
  }

  async function handleSigDelete(id) {
    if (!confirm('Remove this item from signature offerings?')) return;
    await fetch('/api/signature-items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    loadSigItems();
  }

  async function handleSigToggle(item) {
    await fetch('/api/signature-items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
    });
    loadSigItems();
  }

  // ---- Home Gallery Picks ----
  async function loadGalleryPicks() {
    const res = await fetch('/api/home-gallery');
    const data = await res.json();
    if (Array.isArray(data)) setGalleryPicks(data);
  }

  async function openGalleryPicker() {
    setShowGalleryPicker(true);
    const res = await fetch('/api/gallery');
    const data = await res.json();
    if (Array.isArray(data)) setAllGalleryImages(data);
  }

  async function handleSelectGalleryImage(image) {
    // Check if already picked
    if (galleryPicks.some(p => p.gallery_image_id === image.id)) {
      alert('This image is already selected for the home page.');
      return;
    }
    await fetch('/api/home-gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ gallery_image_id: image.id, display_order: galleryPicks.length + 1 }),
    });
    setShowGalleryPicker(false);
    loadGalleryPicks();
  }

  async function handleRemoveGalleryPick(pickId) {
    if (!confirm('Remove this image from home gallery?')) return;
    await fetch(`/api/home-gallery?id=${pickId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadGalleryPicks();
  }

  const st = {
    title: { fontFamily: 'var(--font-headline)', fontSize: '1.75rem', color: '#fff' },
    subtitle: { color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', marginBottom: '1.5rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
    tabs: { display: 'flex', gap: '0.5rem', marginBottom: '2rem' },
    tab: { padding: '0.6rem 1.25rem', background: '#1a1a1a', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' },
    tabActive: { background: '#F0C75E', color: '#1a1a1a', borderColor: '#F0C75E' },
    card: { background: '#1a1a1a', padding: '1.25rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'border-color 0.2s' },
    cardKey: { fontSize: '0.65rem', color: '#F0C75E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.35rem' },
    cardTitle: { fontSize: '1.1rem', fontFamily: 'var(--font-headline)', color: '#fff', marginBottom: '0.35rem' },
    cardPreview: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#1a1a1a', padding: '2rem', maxWidth: 700, width: '90vw', maxHeight: '85vh', overflowY: 'auto' },
    modalWide: { background: '#1a1a1a', padding: '2rem', maxWidth: 900, width: '95vw', maxHeight: '90vh', overflowY: 'auto' },
    field: { marginBottom: '1rem' },
    label: { display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' },
    input: { width: '100%', padding: '0.6rem 0.75rem', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '0.6rem 0.75rem', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none', minHeight: 150, resize: 'vertical', boxSizing: 'border-box' },
    row: { display: 'flex', gap: '0.75rem', marginTop: '1.5rem' },
    saveBtn: { flex: 1, padding: '0.75rem', background: '#F0C75E', color: '#1a1a1a', border: 'none', fontWeight: 700, cursor: 'pointer' },
    cancelBtn: { flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', cursor: 'pointer' },
    uploadArea: { border: '2px dashed rgba(255,255,255,0.15)', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s', background: '#0a0a0a' },
    imagePreview: { width: '100%', maxHeight: 200, objectFit: 'cover', marginTop: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' },
    removeBtn: { marginTop: '0.5rem', padding: '0.4rem 1rem', background: '#c0392b', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' },
    addItemBtn: { padding: '0.6rem 1.25rem', background: '#F0C75E', color: '#1a1a1a', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' },
    sigItem: { display: 'flex', alignItems: 'center', gap: '1rem', background: '#0a0a0a', padding: '0.75rem', marginBottom: '0.5rem', border: '1px solid rgba(255,255,255,0.06)' },
    sigThumb: { width: 60, height: 60, objectFit: 'cover', flexShrink: 0, background: '#2a2a2a' },
    sigInfo: { flex: 1, minWidth: 0 },
    sigName: { color: '#fff', fontSize: '0.95rem', fontWeight: 600 },
    sigDesc: { color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    sigActions: { display: 'flex', gap: '0.5rem', flexShrink: 0 },
    sigEditBtn: { padding: '0.35rem 0.75rem', background: '#2980b9', color: '#fff', border: 'none', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' },
    sigDelBtn: { padding: '0.35rem 0.75rem', background: '#c0392b', color: '#fff', border: 'none', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' },
    sigOrder: { width: 40, textAlign: 'center', padding: '0.3rem', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)', color: '#F0C75E', fontSize: '0.85rem', fontWeight: 700 },
    badge: { display: 'inline-block', padding: '0.15rem 0.5rem', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '0.5rem' },
    badgeActive: { background: 'rgba(46,204,113,0.2)', color: '#2ecc71' },
    badgeInactive: { background: 'rgba(231,76,60,0.2)', color: '#e74c3c' },
    // Picker styles
    pickerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto', padding: '0.25rem' },
    pickerCard: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.2s', overflow: 'hidden' },
    pickerImg: { width: '100%', height: 120, objectFit: 'cover' },
    pickerImgPlaceholder: { width: '100%', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', background: 'linear-gradient(135deg, #2a1a0a 0%, #4a2a1a 100%)' },
    pickerBody: { padding: '0.6rem' },
    pickerName: { fontSize: '0.85rem', color: '#fff', fontWeight: 600, marginBottom: '0.2rem' },
    pickerPrice: { fontSize: '0.75rem', color: '#F0C75E', fontWeight: 700 },
    pickerDesc: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    catBar: { display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' },
    catBtn: { padding: '0.4rem 0.8rem', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' },
    catBtnActive: { background: '#F0C75E', color: '#1a1a1a', borderColor: '#F0C75E' },
    // Gallery pick styles
    gpGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' },
    gpCard: { position: 'relative', background: '#0a0a0a', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' },
    gpImg: { width: '100%', height: 120, objectFit: 'cover' },
    gpRemove: { position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.8)', border: 'none', color: '#ef4444', fontSize: '0.85rem', cursor: 'pointer', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    gpTitle: { padding: '0.4rem 0.6rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' },
  };

  function closeAll() {
    setEditing(null);
    setSigMode(false);
    setGalleryMode(false);
    setShowMenuPicker(false);
    setShowGalleryPicker(false);
  }

  // Virtual section for Home Gallery (inject into sections list)
  const displaySections = activePage === 'home'
    ? [...sections, ...(sections.some(s => s.section_key === 'home_gallery') ? [] : [{ id: 'virtual_gallery', section_key: 'home_gallery', title_en: 'Home Gallery', content_en: 'Manage gallery images shown on the home page' }])]
    : sections;

  function formatPrice(price) {
    if (!price || price === 0) return 'Complimentary';
    return `${Number(price).toLocaleString()}₫`;
  }

  return (
    <div>
      <div style={st.header}>
        <div><h1 style={st.title}>Page Editor</h1><p style={st.subtitle}>Edit Home and Heritage page content</p></div>
      </div>

      <div style={st.tabs}>
        {['home', 'heritage', 'menus', 'reservation', 'gallery', 'contact'].map(p => (
          <button key={p} style={{ ...st.tab, ...(activePage === p ? st.tabActive : {}) }} onClick={() => setActivePage(p)}>
            {p}
          </button>
        ))}
      </div>

      {displaySections.length === 0 && <p style={{ color: 'rgba(255,255,255,0.4)' }}>No sections found.</p>}

      {displaySections.map(section => (
        <div key={section.id} style={st.card} onClick={() => openEdit(section)}>
          <div style={st.cardKey}>{section.section_key}</div>
          <div style={st.cardTitle}>{section.title_en || 'Untitled'}</div>
          <div style={st.cardPreview}>
            {section.section_key === 'signature'
              ? 'Manage signature carousel items →'
              : section.section_key === 'home_gallery'
              ? 'Manage gallery images for home page →'
              : (section.content_en ? section.content_en.replace(/<[^>]+>/g, '').slice(0, 200) : 'No content')
            }
          </div>
        </div>
      ))}

      {/* ====== SECTION EDIT MODAL (non-signature, non-gallery) ====== */}
      {editing && !sigMode && !galleryMode && (
        <div style={st.overlay} onClick={closeAll}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.25rem', marginBottom: '1.5rem', color: '#fff' }}>Edit Section: {editing.section_key}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={st.field}><label style={st.label}>Title (EN)</label><input style={st.input} value={form.title_en || ''} onChange={e => setForm({ ...form, title_en: e.target.value })} /></div>
              <div style={st.field}><label style={st.label}>Title (VI)</label><input style={st.input} value={form.title_vi || ''} onChange={e => setForm({ ...form, title_vi: e.target.value })} /></div>
            </div>

            <div style={st.field}>
              <label style={st.label}>Content (English) — supports HTML</label>
              <textarea style={st.textarea} value={form.content_en || ''} onChange={e => setForm({ ...form, content_en: e.target.value })} />
            </div>
            <div style={st.field}>
              <label style={st.label}>Content (Vietnamese) — supports HTML</label>
              <textarea style={st.textarea} value={form.content_vi || ''} onChange={e => setForm({ ...form, content_vi: e.target.value })} />
            </div>

            {/* Image Upload */}
            <div style={st.field}>
              <label style={st.label}>Section Image</label>
              {form.image_url ? (
                <div>
                  <img src={form.image_url} alt="Section" style={st.imagePreview} />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button style={st.removeBtn} onClick={handleRemoveImage}>Remove Image</button>
                    <label style={{ ...st.removeBtn, background: '#2980b9', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                      Change Image
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    ...st.uploadArea,
                    borderColor: dragOver ? '#F0C75E' : 'rgba(255,255,255,0.15)',
                    background: dragOver ? 'rgba(240,199,94,0.05)' : '#0a0a0a',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  {uploading ? (
                    <p style={{ color: '#F0C75E', margin: 0 }}>Uploading...</p>
                  ) : (
                    <>
                      <p style={{ color: dragOver ? '#F0C75E' : 'rgba(255,255,255,0.5)', margin: '0 0 0.5rem 0', fontSize: '2rem' }}>📁</p>
                      <p style={{ color: dragOver ? '#F0C75E' : 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.85rem' }}>
                        {dragOver ? 'Drop image here' : 'Click or drag & drop to upload an image'}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.25)', margin: '0.25rem 0 0 0', fontSize: '0.7rem' }}>JPG, PNG, WebP (max 5MB)</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={st.row}>
              <button style={st.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'SAVE'}</button>
              <button style={st.cancelBtn} onClick={closeAll}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== SIGNATURE ITEMS MANAGER MODAL ====== */}
      {editing && sigMode && !showMenuPicker && (
        <div style={st.overlay} onClick={closeAll}>
          <div style={st.modalWide} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.25rem', color: '#fff', margin: 0 }}>Signature Items</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>Select menu items to feature in the carousel</p>
              </div>
              <button style={st.addItemBtn} onClick={openMenuPicker}>+ ADD FROM MENU</button>
            </div>

            {/* Section title edit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={st.field}><label style={st.label}>Section Title (EN)</label><input style={st.input} value={form.title_en || ''} onChange={e => setForm({ ...form, title_en: e.target.value })} /></div>
              <div style={st.field}><label style={st.label}>Section Title (VI)</label><input style={st.input} value={form.title_vi || ''} onChange={e => setForm({ ...form, title_vi: e.target.value })} /></div>
            </div>

            {sigItems.length === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '2rem 0' }}>No items yet. Click &quot;+ ADD FROM MENU&quot; to select menu items.</p>}

            {sigItems.map(item => (
              <div key={item.id} style={st.sigItem}>
                <div style={st.sigOrder}>{item.display_order}</div>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name_en} style={st.sigThumb} />
                ) : (
                  <div style={{ ...st.sigThumb, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🍽️</div>
                )}
                <div style={st.sigInfo}>
                  <div style={st.sigName}>
                    {item.name_en}
                    {item.menu_item_id && <span style={{ ...st.badge, background: 'rgba(41,128,185,0.2)', color: '#3498db' }}>From Menu</span>}
                    <span style={{ ...st.badge, ...(item.is_active ? st.badgeActive : st.badgeInactive) }}>
                      {item.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <div style={st.sigDesc}>{item.description_en}</div>
                </div>
                <div style={st.sigActions}>
                  <button style={st.sigEditBtn} onClick={() => handleSigToggle(item)}>{item.is_active ? 'Hide' : 'Show'}</button>
                  <button style={st.sigDelBtn} onClick={() => handleSigDelete(item.id)}>Remove</button>
                </div>
              </div>
            ))}

            <div style={st.row}>
              <button style={st.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'SAVE SECTION TITLE'}</button>
              <button style={st.cancelBtn} onClick={closeAll}>CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MENU ITEM PICKER MODAL ====== */}
      {showMenuPicker && (
        <div style={st.overlay} onClick={() => setShowMenuPicker(false)}>
          <div style={st.modalWide} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.25rem', marginBottom: '1rem', color: '#fff' }}>
              Select a Menu Item
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Choose a dish from the menu to feature in the signature carousel
            </p>

            {/* Category filter */}
            <div style={st.catBar}>
              {menuCategories.map(cat => (
                <button
                  key={cat.slug}
                  style={{ ...st.catBtn, ...(menuActiveSlug === cat.slug ? st.catBtnActive : {}) }}
                  onClick={() => handleMenuCategoryChange(cat)}
                >
                  {cat.name_en}
                </button>
              ))}
            </div>

            {/* Items grid */}
            <div style={st.pickerGrid}>
              {menuItems.map(item => {
                const alreadyPicked = sigItems.some(si => si.menu_item_id === item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      ...st.pickerCard,
                      opacity: alreadyPicked ? 0.4 : 1,
                      pointerEvents: alreadyPicked ? 'none' : 'auto',
                    }}
                    onClick={() => !alreadyPicked && handleSelectMenuItem(item)}
                    onMouseEnter={e => { if (!alreadyPicked) { e.currentTarget.style.borderColor = '#F0C75E'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name_en} style={st.pickerImg} />
                    ) : (
                      <div style={st.pickerImgPlaceholder}>🍽️</div>
                    )}
                    <div style={st.pickerBody}>
                      <div style={st.pickerName}>{item.name_en}</div>
                      <div style={st.pickerPrice}>{formatPrice(item.price)}</div>
                      <div style={st.pickerDesc}>{item.description_en}</div>
                      {alreadyPicked && <div style={{ fontSize: '0.65rem', color: '#2ecc71', marginTop: '0.25rem', fontWeight: 700 }}>✓ Already added</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {sigSaving && <p style={{ color: '#F0C75E', textAlign: 'center', marginTop: '1rem' }}>Adding item...</p>}

            <div style={st.row}>
              <button style={st.cancelBtn} onClick={() => setShowMenuPicker(false)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== HOME GALLERY MANAGER MODAL ====== */}
      {editing && galleryMode && !showGalleryPicker && (
        <div style={st.overlay} onClick={closeAll}>
          <div style={st.modalWide} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.25rem', color: '#fff', margin: 0 }}>Home Gallery</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>Select images from the gallery to show on the home page</p>
              </div>
              <button style={st.addItemBtn} onClick={openGalleryPicker}>+ ADD IMAGE</button>
            </div>

            {galleryPicks.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '2rem 0' }}>
                No images selected. Click &quot;+ ADD IMAGE&quot; to choose from the gallery.
              </p>
            )}

            <div style={st.gpGrid}>
              {galleryPicks.map(pick => {
                const img = pick.gallery_images;
                return (
                  <div key={pick.id} style={st.gpCard}>
                    {img?.image_url ? (
                      <img src={img.image_url} alt={img.title_en || ''} style={st.gpImg} />
                    ) : (
                      <div style={{ ...st.gpImg, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2a2a2a', fontSize: '2rem' }}>🖼️</div>
                    )}
                    <div style={st.gpTitle}>{img?.title_en || 'Untitled'}</div>
                    <button style={st.gpRemove} onClick={() => handleRemoveGalleryPick(pick.id)}>✕</button>
                  </div>
                );
              })}
            </div>

            <div style={st.row}>
              <button style={st.cancelBtn} onClick={closeAll}>CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== GALLERY IMAGE PICKER MODAL ====== */}
      {showGalleryPicker && (
        <div style={st.overlay} onClick={() => setShowGalleryPicker(false)}>
          <div style={st.modalWide} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.25rem', marginBottom: '1rem', color: '#fff' }}>
              Select Gallery Image
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Choose an image from the gallery to display on the home page
            </p>

            <div style={st.pickerGrid}>
              {allGalleryImages.map(image => {
                const alreadyPicked = galleryPicks.some(p => p.gallery_image_id === image.id);
                return (
                  <div
                    key={image.id}
                    style={{
                      ...st.pickerCard,
                      opacity: alreadyPicked ? 0.4 : 1,
                      pointerEvents: alreadyPicked ? 'none' : 'auto',
                    }}
                    onClick={() => !alreadyPicked && handleSelectGalleryImage(image)}
                    onMouseEnter={e => { if (!alreadyPicked) { e.currentTarget.style.borderColor = '#F0C75E'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    {image.image_url ? (
                      <img src={image.image_url} alt={image.title_en || ''} style={st.pickerImg} />
                    ) : (
                      <div style={st.pickerImgPlaceholder}>📸</div>
                    )}
                    <div style={st.pickerBody}>
                      <div style={st.pickerName}>{image.title_en || 'Untitled'}</div>
                      <div style={st.pickerDesc}>{image.category}</div>
                      {alreadyPicked && <div style={{ fontSize: '0.65rem', color: '#2ecc71', marginTop: '0.25rem', fontWeight: 700 }}>✓ Already selected</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {allGalleryImages.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '2rem 0' }}>
                No gallery images found. Upload images in the Gallery section first.
              </p>
            )}

            <div style={st.row}>
              <button style={st.cancelBtn} onClick={() => setShowGalleryPicker(false)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
