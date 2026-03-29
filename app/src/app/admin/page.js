'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './dashboard.module.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ menus: 0, reservations: 0, pending: 0, gallery: 0 });
  const [recentReservations, setRecentReservations] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const token = session.access_token;
      const headers = { Authorization: `Bearer ${token}` };

      // Stats
      const [menuRes, resRes, galleryRes] = await Promise.all([
        fetch('/api/menu-items').then(r => r.json()),
        fetch('/api/reservations', { headers }).then(r => r.json()),
        fetch('/api/gallery').then(r => r.json()),
      ]);

      const reservations = Array.isArray(resRes) ? resRes : [];
      setStats({
        menus: Array.isArray(menuRes) ? menuRes.length : 0,
        reservations: reservations.length,
        pending: reservations.filter(r => r.status === 'pending').length,
        gallery: Array.isArray(galleryRes) ? galleryRes.length : 0,
      });
      setRecentReservations(reservations.slice(0, 5));
    }
    load();
  }, []);

  const statCards = [
    { label: 'Menu Items', value: stats.menus, icon: '🍽️', color: '#F0C75E' },
    { label: 'Total Bookings', value: stats.reservations, icon: '📋', color: '#60a5fa' },
    { label: 'Pending', value: stats.pending, icon: '⏳', color: '#f97316' },
    { label: 'Gallery Photos', value: stats.gallery, icon: '🖼️', color: '#a78bfa' },
  ];

  return (
    <div>
      <h1 className={styles.title}>Dashboard</h1>
      <p className={styles.subtitle}>Welcome back, Admin</p>

      <div className={styles.statsGrid}>
        {statCards.map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div>
              <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Reservations</h2>
        {recentReservations.length === 0 ? (
          <p className={styles.empty}>No reservations yet</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Time</th>
                <th>Guests</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentReservations.map(r => (
                <tr key={r.id}>
                  <td>{r.full_name}</td>
                  <td>{r.date}</td>
                  <td>{r.time}</td>
                  <td>{r.guests}</td>
                  <td><span className={`${styles.badge} ${styles[r.status]}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
