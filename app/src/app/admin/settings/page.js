'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setToken(session.access_token); });
    loadSettings();
  }, []);

  async function loadSettings() {
    const res = await fetch('/api/site-settings');
    const data = await res.json();
    setSettings(data);
  }

  async function saveSetting(key) {
    setSaving(key);
    await fetch('/api/site-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key, value: settings[key] }),
    });
    setSaving('');
  }

  const settingFields = [
    { key: 'notification_email', label: 'Notification Email', desc: 'New reservation notifications will be sent to this email' },
    { key: 'restaurant_phone', label: 'Restaurant Phone' },
    { key: 'restaurant_email', label: 'Restaurant Email' },
    { key: 'facebook_url', label: 'Facebook URL' },
    { key: 'instagram_url', label: 'Instagram URL' },
    { key: 'tiktok_url', label: 'TikTok URL' },
  ];

  const s = {
    title: { fontFamily: 'var(--font-headline)', fontSize: '1.75rem', color: '#fff' },
    subtitle: { color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', marginBottom: '2rem' },
    card: { background: '#1a1a1a', padding: '1.5rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)' },
    label: { fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' },
    desc: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' },
    row: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
    input: { flex: 1, padding: '0.6rem 0.75rem', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none' },
    saveBtn: { padding: '0.6rem 1.25rem', background: '#F0C75E', color: '#1a1a1a', border: 'none', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  };

  return (
    <div>
      <h1 style={s.title}>Settings</h1>
      <p style={s.subtitle}>Configure site settings and social links</p>

      {settingFields.map(f => (
        <div key={f.key} style={s.card}>
          <div style={s.label}>{f.label}</div>
          {f.desc && <div style={s.desc}>{f.desc}</div>}
          <div style={s.row}>
            <input style={s.input} value={settings[f.key] || ''} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })} />
            <button style={s.saveBtn} onClick={() => saveSetting(f.key)} disabled={saving === f.key}>
              {saving === f.key ? '...' : 'SAVE'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
