'use client';
import { useState, useEffect } from 'react';
import styles from './reservation.module.css';

export default function Reservation() {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', date: '', time: '', guests: '2', requests: '', branch: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetch('/api/site-settings').then(r => r.json()).then(data => {
      // We don't have a branches API yet, but can set a default
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.name,
          phone: formData.phone,
          email: formData.email,
          guests: Number(formData.guests),
          date: formData.date,
          time: formData.time,
          branch: formData.branch || "L'Entrecôte Saigon - Đồng Du",
          note: formData.requests,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <p className={styles.label}>RESERVATION</p>
          <h1>Secure Your Table</h1>
          <p className={styles.subtitle}>An unforgettable evening begins with a single step</p>
        </div>
      </section>

      {/* Booking Section */}
      <section className={styles.bookingSection}>
        <div className="container">
          <div className={styles.bookingGrid}>
            {/* Form */}
            <div className={styles.formCol}>
              <h2>Book a Table</h2>
              <div className={styles.goldDivider}></div>
              <p className={styles.formIntro}>
                Reserve your spot for a curated dining experience. For parties over 8,
                please call us directly at <a href="tel:+84327157002">(+84) 32 7157 002</a>.
              </p>

              {submitted ? (
                <div className={styles.successMessage}>
                  <span className={styles.successIcon}>✓</span>
                  <h3>Reservation Confirmed</h3>
                  <p>We look forward to welcoming you. A confirmation has been sent to your email.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className={styles.form}>
                  {error && <div style={{ background: 'rgba(220,50,50,0.15)', color: '#ef4444', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem', border: '1px solid rgba(220,50,50,0.3)' }}>{error}</div>}
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Full Name</label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} className={styles.formInput} required placeholder="Your name" />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Phone</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={styles.formInput} required placeholder="+84 ..." />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className={styles.formInput} required placeholder="your@email.com" />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Date</label>
                      <input type="date" name="date" value={formData.date} onChange={handleChange} className={styles.formInput} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Time</label>
                      <select name="time" value={formData.time} onChange={handleChange} className={styles.formInput} required>
                        <option value="">Select time</option>
                        <option value="11:30">11:30 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="12:30">12:30 PM</option>
                        <option value="13:00">1:00 PM</option>
                        <option value="13:30">1:30 PM</option>
                        <option value="16:00">4:00 PM</option>
                        <option value="17:00">5:00 PM</option>
                        <option value="18:00">6:00 PM</option>
                        <option value="18:30">6:30 PM</option>
                        <option value="19:00">7:00 PM</option>
                        <option value="19:30">7:30 PM</option>
                        <option value="20:00">8:00 PM</option>
                        <option value="20:30">8:30 PM</option>
                        <option value="21:00">9:00 PM</option>
                        <option value="21:30">9:30 PM</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Guests</label>
                      <select name="guests" value={formData.guests} onChange={handleChange} className={styles.formInput}>
                        {[1,2,3,4,5,6,7,8].map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Special Requests</label>
                    <textarea name="requests" value={formData.requests} onChange={handleChange} className={styles.formInput} rows="3" placeholder="Allergies, celebrations, seating preferences..."></textarea>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                    {loading ? 'SUBMITTING...' : 'CONFIRM RESERVATION'}
                  </button>
                </form>
              )}
            </div>

            {/* Info Side */}
            <div className={styles.infoCol}>
              <div className={styles.infoCard}>
                <div className={styles.infoImagePlaceholder} style={{
                  background: 'linear-gradient(135deg, #2a1a0a 0%, #3a2a1a 100%)'
                }}>
                  <span style={{fontSize: '4rem'}}>🕯️</span>
                </div>
                <div className={styles.infoCardBody}>
                  <h3>The Bistro Experience</h3>
                  <div className={styles.goldDivider}></div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>LUNCH</span>
                    <span>11:30 AM – 2:00 PM</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>DINNER</span>
                    <span>4:00 PM – 11:00 PM</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>LAST ORDER</span>
                    <span>10:00 PM</span>
                  </div>
                  <div className={styles.infoDivider}></div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>DRESS CODE</span>
                    <span>Smart Casual</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>LOCATION</span>
                    <span>Level 2, Dong Du,<br/>Saigon Ward, HCMC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
