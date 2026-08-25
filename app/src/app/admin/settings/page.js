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

  const testFields = [
    { key: 'is_test_mode', label: 'Bật Chế Độ Test (Test Mode)', desc: 'Nhập "true" để bật, "false" để tắt. Khi bật, mail sẽ không gửi cho khách.', type: 'toggle' },
    { key: 'test_email', label: 'Test Email', desc: 'Email nhận thư xác nhận/từ chối khi bật Test Mode' },
    { key: 'google_sheet_url', label: 'Real Google Sheet URL', desc: 'Link Webhook của file Google Sheet THẬT' },
    { key: 'test_google_sheet_url', label: 'Test Google Sheet URL', desc: 'Link Webhook của file Google Sheet TEST (dùng khi bật Test Mode)' },
  ];

  const s = {
    title: { fontFamily: 'var(--font-headline)', fontSize: '1.75rem', color: '#fff' },
    subtitle: { color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', marginBottom: '2rem' },
    sectionTitle: { fontFamily: 'var(--font-headline)', fontSize: '1.3rem', color: '#F0C75E', marginTop: '2.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(240, 199, 94, 0.2)', paddingBottom: '0.5rem' },
    card: { background: '#1a1a1a', padding: '1.5rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)' },
    cardTest: { background: '#1f1604', padding: '1.5rem', marginBottom: '1rem', border: '1px solid rgba(240, 199, 94, 0.2)' },
    label: { fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' },
    desc: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' },
    row: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
    input: { flex: 1, padding: '0.6rem 0.75rem', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none' },
    saveBtn: { padding: '0.6rem 1.25rem', background: '#F0C75E', color: '#1a1a1a', border: 'none', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  };

  const renderField = (f, isTest) => (
    <div key={f.key} style={isTest ? s.cardTest : s.card}>
      <div style={s.label}>{f.label}</div>
      {f.desc && <div style={s.desc}>{f.desc}</div>}
      <div style={s.row}>
        {f.type === 'toggle' ? (
          <select style={s.input} value={settings[f.key] || 'false'} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })}>
            <option value="true">Bật (True)</option>
            <option value="false">Tắt (False)</option>
          </select>
        ) : (
          <input style={s.input} value={settings[f.key] || ''} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })} />
        )}
        <button style={s.saveBtn} onClick={() => saveSetting(f.key)} disabled={saving === f.key}>
          {saving === f.key ? '...' : 'SAVE'}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <h1 style={s.title}>Settings</h1>
      <p style={s.subtitle}>Configure site settings and social links</p>

      <h2 style={s.sectionTitle}>General Settings</h2>
      {settingFields.map(f => renderField(f, false))}

      <h2 style={{...s.sectionTitle, color: '#ff4d4f', borderBottomColor: 'rgba(255, 77, 79, 0.2)'}}>Test Mode Configurations</h2>
      <p style={{...s.desc, marginBottom: '1.5rem', color: '#ff4d4f'}}>
        Dùng cho việc thử nghiệm hệ thống. Khi bật Test Mode, dữ liệu sẽ được gửi vào Test Email và Test Google Sheet thay vì hệ thống thật.
      </p>
      {testFields.map(f => renderField(f, true))}
    </div>
  );
}
