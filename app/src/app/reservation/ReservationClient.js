'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './reservation.module.css';
import { useLanguage, useTranslation } from '@/lib/i18n';

// Tiny blur placeholder for hero images
const BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMyYTFhMGEiLz48L3N2Zz4=';

export default function ReservationClient({ initialPageSections = {} }) {
  const { lang } = useLanguage();
  const t = useTranslation();
  
  const tf = (obj, field) => obj ? obj[`${field}_${lang}`] || obj[`${field}_en`] || '' : '';
  const tm = (obj, key) => obj?.metadata ? obj.metadata[`${key}_${lang}`] || obj.metadata[`${key}_en`] || '' : '';
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', date: '', time: '', guests: '', requests: '', branch: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState('success');
  const [popupMessage, setPopupMessage] = useState('');

  const pageSections = initialPageSections;

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
      
      setPopupType('success');
      setPopupMessage(lang === 'vi' ? 'Đặt bàn thành công! Chúng tôi sẽ liên hệ lại với bạn sớm nhất.' : 'Reservation successful! We will contact you shortly.');
      setShowPopup(true);
      
      // Reset form
      setFormData({
        name: '', phone: '', email: '', date: '', time: '', guests: 2, note: ''
      });
    } catch (err) {
      setError(err.message);
      setPopupType('error');
      setPopupMessage(lang === 'vi' ? 'Lỗi: Không thể gửi yêu cầu đặt bàn lúc này. Vui lòng thử lại.' : 'Error: Failed to submit reservation. Please try again.');
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const hero = pageSections.hero || {};
  const heroMeta = hero.metadata || {};
  const bookingInfo = pageSections.booking_info || {};

  return (
    <>
      {/* Hero */}
      <section 
        className={styles.hero}
      >
        {hero.image_url && (
          <Image src={hero.image_url} alt="Reservation" fill sizes="100vw" priority quality={80} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} style={{ objectFit: 'cover', objectPosition: 'center' }} />
        )}
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <p className={styles.label}>{tm(hero, 'label') || 'RESERVATION'}</p>
          <h1>{tf(hero, 'title') || 'Secure Your Table'}</h1>
          <div className={`${styles.subtitle} richTextSubtitle`} dangerouslySetInnerHTML={{ __html: tf(hero, 'content') || 'An unforgettable evening begins with a single step' }}></div>
        </div>
      </section>

      {/* Booking Section */}
      <section className={styles.bookingSection}>
        <div className="container">
          <div className={styles.bookingGrid}>
            {/* Form */}
            <div className={styles.formCol}>
              <h2>{t('bookATable')}</h2>
              <div className={styles.goldDivider}></div>
              <p className={styles.formIntro}>
                {t('reservationFormIntro')} <a href="tel:+84327157002">(+84) 32 7157 002</a>.
              </p>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t('name')}</label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} className={styles.formInput} required placeholder={t('fullNamePlaceholder') || "Your name"} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('phone')}</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={styles.formInput} required placeholder="+84 ..." />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t('email')}</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className={styles.formInput} required placeholder={t('emailPlaceholder') || "your@email.com"} />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('date')}</label>
                      <input type="date" name="date" value={formData.date} onChange={handleChange} className={styles.formInput} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('time')}</label>
                      <select name="time" value={formData.time} onChange={handleChange} className={styles.formInput} required>
                        <option value="">{t('selectTime')}</option>
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
                      <label className={styles.formLabel}>{t('guestsLabel')}</label>
                      <select name="guests" value={formData.guests} onChange={handleChange} className={styles.formInput} required>
                        <option value="">{lang === 'vi' ? 'Chọn số khách' : 'Select guests'}</option>
                        {[1,2,3,4,5,6,7,8].map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? t('guest') : t('guests')}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t('specialRequests')}</label>
                    <textarea name="requests" value={formData.requests} onChange={handleChange} className={styles.formInput} rows="3" placeholder={t('allergiesPlaceholder')}></textarea>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                    {loading ? t('submitting') : t('confirmReservation')}
                  </button>
                </form>
            </div>

            {/* Info Side */}
            <div className={styles.infoCol}>
              <div className={styles.infoCard}>
                <div className={styles.infoImagePlaceholder}>
                  {bookingInfo.image_url ? (
                    <Image src={bookingInfo.image_url} alt="Booking" fill sizes="(max-width: 768px) 100vw, 400px" quality={75} style={{ objectFit: 'cover', objectPosition: 'center' }} />
                  ) : (
                    <span style={{fontSize: '4rem'}}>🕯️</span>
                  )}
                </div>
                <div className={styles.infoCardBody}>
                  <h3>{tf(bookingInfo, 'title') || 'The Bistro Experience'}</h3>
                  <div className={styles.goldDivider}></div>
                  {tf(bookingInfo, 'content') ? (
                    <div className={`${styles.bistroRichText} richTextContent`} dangerouslySetInnerHTML={{ __html: tf(bookingInfo, 'content') }} />
                  ) : (
                    <>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>{t('lunch').toUpperCase()}</span>
                        <span>11:30 AM – 2:00 PM</span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>{t('dinner').toUpperCase()}</span>
                        <span>4:00 PM – 11:00 PM</span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>{t('lastOrder').toUpperCase()}</span>
                        <span>10:00 PM</span>
                      </div>
                      <div className={styles.infoDivider}></div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>{t('dressCode').toUpperCase()}</span>
                        <span>{t('smartCasual')}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>{t('location').toUpperCase()}</span>
                        <span>Level 2, Dong Du,<br/>Saigon Ward, HCMC</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POPUP MODAL */}
      {showPopup && (
        <div className={styles.popupOverlay}>
          <div className={`${styles.popupBox} ${popupType === 'success' ? styles.popupSuccess : styles.popupError}`}>
            <button className={styles.popupClose} onClick={() => setShowPopup(false)}>×</button>
            <div className={styles.popupIcon}>
              {popupType === 'success' ? '✓' : '✕'}
            </div>
            <h3>{popupType === 'success' ? (lang === 'vi' ? 'Thành công' : 'Success') : (lang === 'vi' ? 'Đã xảy ra lỗi' : 'Error')}</h3>
            <p>{popupMessage}</p>
            <button type="button" className={`btn btn-primary ${styles.popupBtn}`} onClick={() => setShowPopup(false)}>
              {lang === 'vi' ? 'Đóng' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
