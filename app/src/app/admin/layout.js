'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import styles from './admin.module.css';

export default function AdminLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Skip auth check on login page
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) { setLoading(false); return; }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin/login');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isLoginPage) router.push('/admin/login');
      else setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, [router, isLoginPage]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (isLoginPage) return children;
  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!user) return null;

  const navItems = [
    { href: '/admin', icon: '📊', label: 'Dashboard' },
    { href: '/admin/menus', icon: '🍽️', label: 'Menus' },
    { href: '/admin/reservations', icon: '📋', label: 'Reservations' },
    { href: '/admin/gallery', icon: '🖼️', label: 'Gallery' },
    { href: '/admin/pages', icon: '📝', label: 'Pages' },
    { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.brand}>
            <svg viewBox="0 0 40 35" width="28" height="24" fill="#F0C75E">
              <ellipse cx="10" cy="8" rx="5" ry="8" />
              <ellipse cx="30" cy="8" rx="5" ry="8" />
              <ellipse cx="20" cy="22" rx="14" ry="13" />
              <circle cx="14" cy="20" r="2.5" fill="#1A1A1A" />
              <circle cx="26" cy="20" r="2.5" fill="#1A1A1A" />
              <ellipse cx="20" cy="27" rx="4" ry="2.5" fill="#1A1A1A" />
            </svg>
            <span>Admin</span>
          </Link>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.navActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <span className={styles.userEmail}>{user.email}</span>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
        </div>
      </aside>

      {/* Mobile toggle */}
      <button className={styles.menuToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
        ☰
      </button>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
