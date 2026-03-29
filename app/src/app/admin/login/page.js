'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './login.module.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email, password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/admin');
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.logo}>
          <svg viewBox="0 0 40 35" width="40" height="35" fill="#F0C75E">
            <ellipse cx="10" cy="8" rx="5" ry="8" />
            <ellipse cx="30" cy="8" rx="5" ry="8" />
            <ellipse cx="20" cy="22" rx="14" ry="13" />
            <circle cx="14" cy="20" r="2.5" fill="#1A1A1A" />
            <circle cx="26" cy="20" r="2.5" fill="#1A1A1A" />
            <ellipse cx="20" cy="27" rx="4" ry="2.5" fill="#1A1A1A" />
          </svg>
        </div>
        <h1>Admin Panel</h1>
        <p className={styles.subtitle}>L'Entrecôte Management System</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@lentrecotevietnam.com" />
          </div>
          <div className={styles.formGroup}>
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••" />
          </div>
          <button type="submit" disabled={loading} className={styles.loginBtn}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
