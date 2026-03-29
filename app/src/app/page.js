'use client';
import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import Link from 'next/link';
import SignatureCarousel from '@/components/SignatureCarousel';

function formatPrice(price) {
  if (!price || price === 0) return 'Complimentary';
  return `${Number(price).toLocaleString()}₫`;
}

export default function Home() {
  const [homeSections, setHomeSections] = useState({});
  const [heritageSections, setHeritageSections] = useState({});
  const [signatureItems, setSignatureItems] = useState([]);
  const [galleryPicks, setGalleryPicks] = useState([]);
  const [popupItem, setPopupItem] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    // Fetch all data in parallel
    Promise.all([
      fetch('/api/page-sections?page=home').then(r => r.json()),
      fetch('/api/page-sections?page=heritage').then(r => r.json()),
      fetch('/api/signature-items').then(r => r.json()),
      fetch('/api/home-gallery').then(r => r.json()),
    ]).then(([homeData, heritageData, sigData, galleryData]) => {
      // Map home sections
      const hs = {};
      (Array.isArray(homeData) ? homeData : []).forEach(s => { hs[s.section_key] = s; });
      setHomeSections(hs);

      // Map heritage sections
      const hrs = {};
      (Array.isArray(heritageData) ? heritageData : []).forEach(s => { hrs[s.section_key] = s; });
      setHeritageSections(hrs);

      setSignatureItems(Array.isArray(sigData) ? sigData : []);
      setGalleryPicks(Array.isArray(galleryData) ? galleryData : []);
    }).catch(() => {});
  }, []);

  // Close popup on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setPopupItem(null);
        setLightboxImage(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Lock body scroll when popup/lightbox open
  useEffect(() => {
    if (popupItem || lightboxImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [popupItem, lightboxImage]);

  // Navigate popup items
  const goNextPopup = useCallback(() => {
    if (!popupItem) return;
    const idx = signatureItems.findIndex(i => i.id === popupItem.id);
    if (idx >= 0) setPopupItem(signatureItems[(idx + 1) % signatureItems.length]);
  }, [popupItem, signatureItems]);

  const goPrevPopup = useCallback(() => {
    if (!popupItem) return;
    const idx = signatureItems.findIndex(i => i.id === popupItem.id);
    if (idx >= 0) setPopupItem(signatureItems[(idx - 1 + signatureItems.length) % signatureItems.length]);
  }, [popupItem, signatureItems]);

  useEffect(() => {
    if (!popupItem) return;
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') goNextPopup();
      if (e.key === 'ArrowLeft') goPrevPopup();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [popupItem, goNextPopup, goPrevPopup]);

  // Sections data
  const hero = homeSections.hero || {};
  const heroMeta = hero.metadata || {};
  const signature = homeSections.signature || {};
  const sigMeta = signature.metadata || {};

  // Heritage data
  const heritageStory = heritageSections.our_story || {};
  const heritageStoryMeta = heritageStory.metadata || {};
  const timeline = heritageSections.timeline || {};

  // Parse timeline items
  const defaultTimeline = [
    { year: '1959', text: "L'Entrecôte opens its doors in Paris." },
    { year: '1980', text: 'Expansion across France and Europe.' },
    { year: '2000', text: 'International presence grows worldwide.' },
    { year: '2024', text: "L'Entrecôte arrives in Saigon." },
  ];

  let timelineItems = defaultTimeline;
  if (timeline.content_en) {
    const parsed = timeline.content_en.match(/(\d{4}):\s*([^.]+\.)/g);
    if (parsed && parsed.length > 0) {
      timelineItems = parsed.map(item => {
        const match = item.match(/(\d{4}):\s*(.+)/);
        return match ? { year: match[1], text: match[2].trim() } : null;
      }).filter(Boolean);
    }
  }

  return (
    <>
      {/* ==================== SECTION 1: HERO ==================== */}
      <section
        id="home"
        className={styles.hero}
        style={hero.image_url ? { backgroundImage: `url(${hero.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <p className={styles.heroLabel}>{heroMeta.label_en || 'SINCE 1959 · PARIS'}</p>
          <h1 className={styles.heroTitle}>{hero.title_en || 'Le Seul Plat.'}</h1>
          <p className={styles.heroSubtitle}>
            {hero.content_en || 'The one and only dish — our legendary trimmed entrecôte steak, bathed in our secret sauce, served with crispy golden frites.'}
          </p>
          <div className={styles.heroCta}>
            <Link href="/reservation" className="btn btn-primary">
              BOOK A TABLE
            </Link>
            <Link href="/menus" className="btn btn-outline">
              EXPLORE MENU
            </Link>
          </div>
        </div>
        <div className={styles.heroScrollIndicator}>
          <span></span>
        </div>
      </section>

      {/* ==================== SECTION 2: HERITAGE ==================== */}
      <section id="heritage" className={styles.heritageSection}>
        <div className="container">
          <div className={styles.heritageGrid}>
            <div className={styles.heritageTextCol}>
              <p className={styles.sectionLabel}>{heritageStoryMeta.label_en || 'OUR HERITAGE'}</p>
              <h2 className={styles.sectionTitle}>{heritageStory.title_en || 'A Legacy of Timeless Flavour'}</h2>
              <div className={styles.goldDivider}></div>
              <p className={styles.heritageText}>
                {heritageStory.content_en
                  ? heritageStory.content_en.split(/\n\n|\n/)[0]
                  : "Born in Paris in 1959, L'Entrecôte has captivated diners with a singular vision: one perfect dish, executed to perfection."
                }
              </p>

              {/* Mini Timeline */}
              <div className={styles.miniTimeline}>
                {timelineItems.slice(0, 4).map((item, i) => (
                  <div key={i} className={styles.miniTimelineItem}>
                    <span className={styles.miniTimelineYear}>{item.year}</span>
                    <span className={styles.miniTimelineDot}></span>
                    <span className={styles.miniTimelineText}>{item.text}</span>
                  </div>
                ))}
              </div>

              <Link href="/heritage" className="btn btn-dark" style={{ marginTop: '1.5rem' }}>
                DISCOVER OUR STORY
              </Link>
            </div>
            <div className={styles.heritageImageCol}>
              <div className={styles.heritageImageLarge} style={
                heritageStory.image_url
                  ? { backgroundImage: `url(${heritageStory.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: 'linear-gradient(135deg, #2a1a0a 0%, #4a2a1a 100%)' }
              }>
                {!heritageStory.image_url && <div className={styles.imagePlaceholderText}>🏛️</div>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 3: MENUS (Signature Offerings) ==================== */}
      <section id="menus" className={styles.signatureSection}>
        <div className="container">
          <p className={styles.sectionLabel}>{sigMeta.label_en || 'THE EXPERIENCE'}</p>
          <h2 className={styles.sectionTitle}>{signature.title_en || 'Signature Offerings'}</h2>
          <SignatureCarousel
            items={signatureItems}
            onItemClick={(item) => setPopupItem(item)}
          />
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/menus" className="btn btn-dark">
              EXPLORE FULL MENU
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 4: RESERVATION CTA ==================== */}
      <section id="reservation" className={styles.reservationSection}>
        <div className={styles.reservationOverlay}></div>
        <div className={styles.reservationContent}>
          <p className={styles.sectionLabel} style={{ color: '#F0C75E' }}>RESERVATION</p>
          <h2 className={styles.reservationTitle}>An Evening of Timeless Elegance Awaits</h2>
          <p className={styles.reservationText}>
            Join us for an unforgettable dining experience at L&apos;Entrecôte Social Meating, Saigon.
          </p>
          <div className={styles.reservationInfo}>
            <div className={styles.reservationInfoItem}>
              <span className={styles.reservationInfoIcon}>🕐</span>
              <div>
                <strong>Lunch</strong>
                <p>11:30 AM – 2:00 PM</p>
              </div>
            </div>
            <div className={styles.reservationInfoItem}>
              <span className={styles.reservationInfoIcon}>🌙</span>
              <div>
                <strong>Dinner</strong>
                <p>4:00 PM – 11:00 PM</p>
              </div>
            </div>
            <div className={styles.reservationInfoItem}>
              <span className={styles.reservationInfoIcon}>👔</span>
              <div>
                <strong>Dress Code</strong>
                <p>Smart Casual</p>
              </div>
            </div>
          </div>
          <Link href="/reservation" className="btn btn-primary" style={{ marginTop: '2rem' }}>
            RESERVE YOUR TABLE
          </Link>
        </div>
      </section>

      {/* ==================== SECTION 5: GALLERY PREVIEW ==================== */}
      <section id="gallery" className={styles.gallerySection}>
        <div className="container">
          <p className={styles.sectionLabel}>GALLERY</p>
          <h2 className={styles.sectionTitle}>Visual Stories</h2>
          {galleryPicks.length > 0 ? (
            <div className={styles.galleryGrid}>
              {galleryPicks.map((pick, i) => {
                const img = pick.gallery_images;
                return (
                  <div
                    key={pick.id}
                    className={styles.galleryItem}
                    style={{ animationDelay: `${i * 0.08}s` }}
                    onClick={() => setLightboxImage(img)}
                  >
                    <div className={styles.galleryItemInner} style={
                      img?.image_url
                        ? { backgroundImage: `url(${img.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: `linear-gradient(${120 + i * 25}deg, #2a1a0a 0%, #4a2a1a 100%)` }
                    }>
                      {!img?.image_url && <span className={styles.galleryEmoji}>📸</span>}
                      <div className={styles.galleryOverlay}>
                        <p className={styles.galleryItemTitle}>{img?.title_en || 'Untitled'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '2rem 0' }}>
              Gallery images coming soon...
            </p>
          )}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/gallery" className="btn btn-dark">
              VIEW FULL GALLERY
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 6: CONTACT / FIND US ==================== */}
      <section id="contact" className={styles.contactSection}>
        <div className="container">
          <div className={styles.contactGrid}>
            <div className={styles.contactInfoCol}>
              <p className={styles.sectionLabel}>FIND US</p>
              <h2 className={styles.sectionTitle}>Visit L&apos;Entrecôte</h2>
              <div className={styles.goldDivider}></div>

              <div className={styles.contactBlock}>
                <h4>📍 Address</h4>
                <p>L&apos;Entrecôte Social Meating</p>
                <p>Level 2, Dong Du</p>
                <p>Saigon Ward, Ho Chi Minh City</p>
              </div>

              <div className={styles.contactBlock}>
                <h4>📞 Hotline</h4>
                <p><a href="tel:+84327157002">(+84) 32 7157 002</a></p>
              </div>

              <div className={styles.contactBlock}>
                <h4>📧 Email</h4>
                <p><a href="mailto:bonjour@lentrecote.vn">bonjour@lentrecote.vn</a></p>
              </div>

              <div className={styles.contactSocial}>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                </a>
              </div>

              <Link href="/contact" className="btn btn-dark" style={{ marginTop: '1rem' }}>
                SEND A MESSAGE
              </Link>
            </div>

            <div className={styles.contactMapCol}>
              <div className={styles.contactMapWrap}>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.5!2d106.7041782!3d10.7754419!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752fbba5c3008f%3A0x6f4e96e3aff8d93!2sL%E2%80%99Entrecote%20-%20Social%20Meating!5e0!3m2!1sen!2s"
                  width="100%"
                  height="350"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="L'Entrecôte Location"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== POPUP: Signature Item Detail ==================== */}
      {popupItem && (
        <div className={styles.popup} onClick={() => setPopupItem(null)}>
          <button className={styles.popupArrow} data-dir="left" onClick={(e) => { e.stopPropagation(); goPrevPopup(); }} aria-label="Previous">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>

          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupImage} style={
              popupItem.image_url
                ? { backgroundImage: `url(${popupItem.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: 'linear-gradient(135deg, #2a1a0a 0%, #4a2a1a 50%, #3a1a0a 100%)' }
            }>
              {!popupItem.image_url && (
                <span className={styles.popupEmoji}>🍽️</span>
              )}
              {popupItem.badge && (
                <span className={styles.popupBadge}>{popupItem.badge}</span>
              )}
            </div>
            <div className={styles.popupInfo}>
              <p className={styles.popupCategory}>SIGNATURE OFFERINGS</p>
              <h2 className={styles.popupName}>{popupItem.name_en}</h2>
              <div className={styles.popupDivider}></div>
              <p className={styles.popupDesc}>{popupItem.description_en}</p>
              {popupItem.price > 0 && (
                <p className={styles.popupPrice}>{formatPrice(popupItem.price)}</p>
              )}
            </div>
          </div>

          <button className={styles.popupArrow} data-dir="right" onClick={(e) => { e.stopPropagation(); goNextPopup(); }} aria-label="Next">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <button className={styles.popupClose} onClick={() => setPopupItem(null)}>✕</button>
        </div>
      )}

      {/* ==================== LIGHTBOX: Gallery Image ==================== */}
      {lightboxImage && (
        <div className={styles.lightbox} onClick={() => setLightboxImage(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightboxImage(null)}>✕</button>
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <div className={styles.lightboxImageWrap} style={
              lightboxImage.image_url
                ? { backgroundImage: `url(${lightboxImage.image_url})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }
                : { background: 'linear-gradient(135deg, #2a1a0a 0%, #4a2a1a 100%)' }
            }>
              {!lightboxImage.image_url && <span style={{ fontSize: '8rem' }}>📸</span>}
            </div>
            <p className={styles.lightboxTitle}>{lightboxImage.title_en || 'Untitled'}</p>
          </div>
        </div>
      )}
    </>
  );
}
