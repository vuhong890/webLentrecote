'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SignatureCarousel from '@/components/SignatureCarousel';
import { useLanguage, useTranslation } from '@/lib/i18n';
import styles from './page.module.css';

// Tiny dark blur placeholder for hero/fill images
const BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMyYTFhMGEiLz48L3N2Zz4=';

function formatPrice(price) {
  if (!price || price === 0) return 'Complimentary';
  return `${Number(price).toLocaleString()}₫`;
}

export default function HomeClient({ initialHomeSections, initialHeritageSections, initialSignatureItems, initialGalleryPicks }) {
  const { lang } = useLanguage();
  const t = useTranslation();
  const [popupItem, setPopupItem] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  const homeSections = initialHomeSections || {};
  const heritageSections = initialHeritageSections || {};
  const signatureItems = initialSignatureItems || [];
  const galleryPicks = initialGalleryPicks || [];

  const tf = (obj, field) => obj ? obj[`${field}_${lang}`] || obj[`${field}_en`] || '' : '';
  const tm = (obj, key) => obj?.metadata ? obj.metadata[`${key}_${lang}`] || obj.metadata[`${key}_en`] || '' : '';

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
  const heritagePreview = homeSections.heritage_preview || {};
  const heritagePreviewMeta = heritagePreview.metadata || {};
  const timeline = heritageSections.timeline || {};

  // CTA data
  const ctaBanner = homeSections.cta_banner || {};
  const ctaMeta = ctaBanner.metadata || {};

  // Gallery preview
  const galleryPreview = homeSections.gallery_preview || {};
  const galleryPreviewMeta = galleryPreview.metadata || {};

  // Parse timeline items
  const defaultTimeline = [
    { year: '1959', text: "L'Entrecôte opens its doors in Paris." },
    { year: '1980', text: 'Expansion across France and Europe.' },
    { year: '2000', text: 'International presence grows worldwide.' },
    { year: '2024', text: "L'Entrecôte arrives in Saigon." },
  ];

  let timelineItems = defaultTimeline;
  const tContent = tf(timeline, 'content');
  if (tContent) {
    const parsed = tContent.match(/(\d{4}):\s*([^.]+\.)/g);
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
      >
        {hero.image_url && (
          <Image src={hero.image_url} alt="Hero" fill sizes="100vw" priority quality={80} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} style={{ objectFit: 'cover', objectPosition: 'center' }} />
        )}
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <p className={styles.heroLabel}>{tm(hero, 'label') || 'SINCE 1959 · PARIS'}</p>
          <h1 className={styles.heroTitle}>{tf(hero, 'title') || 'Le Seul Plat.'}</h1>
          <p className={styles.heroSubtitle}>
            {tf(hero, 'content') || 'The one and only dish — our legendary trimmed entrecôte steak, bathed in our secret sauce, served with crispy golden frites.'}
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

      {/* ==================== SECTION 2: MENUS (Signature Offerings) ==================== */}
      <section id="menus" className={styles.signatureSection}>
        <div className="container">
          <p className={styles.sectionLabel}>{tm(signature, 'label') || 'THE EXPERIENCE'}</p>
          <h2 className={styles.sectionTitle}>{tf(signature, 'title') || 'Signature Offerings'}</h2>
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

      {/* ==================== SECTION 3: HERITAGE ==================== */}
      <section id="heritage" className={styles.heritageSection}>
        <div className="container">
          <div className={styles.heritageGrid}>
            <div className={styles.heritageTextCol}>
              <p className={styles.sectionLabel}>{tm(heritagePreview, 'label') || 'OUR HERITAGE'}</p>
              <h2 className={styles.sectionTitle}>{tf(heritagePreview, 'title') || 'A Legacy of Timeless Flavour'}</h2>
              <div className={styles.goldDivider}></div>
              <p className={styles.heritageText}>
                {tf(heritagePreview, 'content')
                  ? tf(heritagePreview, 'content').split(/\n\n|\n/)[0]
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
              <div className={styles.heritageImageLarge}>
                {heritageStory.image_url || heritagePreview.image_url ? (
                  <Image src={heritagePreview.image_url || heritageStory.image_url} alt="Heritage" fill sizes="(max-width: 768px) 100vw, 50vw" quality={75} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} style={{ objectFit: 'cover', objectPosition: 'center' }} />
                ) : (
                  <div className={styles.imagePlaceholderText}>🏛️</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 4: RESERVATION CTA ==================== */}
      <section id="reservation" className={styles.reservationSection}>
        {ctaBanner.image_url && (
          <Image src={ctaBanner.image_url} alt="Reservation CTA" fill sizes="100vw" quality={70} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} style={{ objectFit: 'cover', objectPosition: 'center', zIndex: 0 }} />
        )}
        <div className={styles.reservationOverlay}></div>
        <div className={styles.reservationContent} style={{ zIndex: 1 }}>
          <p className={styles.sectionLabel} style={{ color: '#F0C75E' }}>{tm(ctaBanner, 'label') || 'RESERVATION'}</p>
          <h2 className={styles.reservationTitle}>{tf(ctaBanner, 'title') || 'An Evening of Timeless Elegance Awaits'}</h2>
          <p className={styles.reservationText}>
            {tf(ctaBanner, 'content') || "Join us for an unforgettable dining experience at L'Entrecôte Social Meating, Saigon."}
          </p>
          <div className={styles.reservationInfo}>
            <div className={styles.reservationInfoItem}>
              <span className={styles.reservationInfoIcon}>🕐</span>
              <div>
                <strong>{t('lunch')}</strong>
                <p>11:30 AM – 2:00 PM</p>
              </div>
            </div>
            <div className={styles.reservationInfoItem}>
              <span className={styles.reservationInfoIcon}>🌙</span>
              <div>
                <strong>{t('dinner')}</strong>
                <p>4:00 PM – 11:00 PM</p>
              </div>
            </div>
            <div className={styles.reservationInfoItem}>
              <span className={styles.reservationInfoIcon}>👔</span>
              <div>
                <strong>{t('dressCode')}</strong>
                <p>{t('smartCasual')}</p>
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
          <p className={styles.sectionLabel}>{tm(galleryPreview, 'label') || t('gallery').toUpperCase()}</p>
          <h2 className={styles.sectionTitle}>{tf(galleryPreview, 'title') || 'Visual Stories'}</h2>
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
                    <div className={styles.galleryItemInner}>
                      {img?.image_url ? (
                        <Image src={img.image_url} alt={tf(img, 'title') || 'Gallery'} fill sizes="(max-width: 768px) 50vw, 25vw" quality={70} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} style={{ objectFit: 'cover', objectPosition: 'center' }} />
                      ) : (
                        <span className={styles.galleryEmoji}>📸</span>
                      )}
                      <div className={styles.galleryOverlay}>
                        <p className={styles.galleryItemTitle}>{tf(img, 'title') || 'Untitled'}</p>
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




      {/* ==================== POPUP: Signature Item Detail ==================== */}
      {popupItem && (
        <div className={styles.popup} onClick={() => setPopupItem(null)}>
          <button className={styles.popupArrow} data-dir="left" onClick={(e) => { e.stopPropagation(); goPrevPopup(); }} aria-label="Previous">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>

          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupImage}>
              {popupItem.image_url ? (
                <Image src={popupItem.image_url} alt={tf(popupItem, 'name')} fill sizes="50vw" quality={80} style={{ objectFit: 'cover', objectPosition: 'center' }} />
              ) : (
                <span className={styles.popupEmoji}>🍽️</span>
              )}
              {popupItem.badge && (
                <span className={styles.popupBadge}>{popupItem.badge}</span>
              )}
            </div>
            <div className={styles.popupInfo}>
              <p className={styles.popupCategory}>{tf(signature, 'title') || 'SIGNATURE OFFERINGS'}</p>
              <h2 className={styles.popupName}>{tf(popupItem, 'name')}</h2>
              <div className={styles.popupDivider}></div>
              <p className={styles.popupDesc}>{tf(popupItem, 'description')}</p>
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
            <div className={styles.lightboxImageWrap}>
              {lightboxImage.image_url ? (
                <Image src={lightboxImage.image_url} alt={tf(lightboxImage, 'title') || ''} fill sizes="90vw" quality={85} style={{ objectFit: 'contain', objectPosition: 'center' }} />
              ) : (
                <span style={{ fontSize: '8rem' }}>📸</span>
              )}
            </div>
            <p className={styles.lightboxTitle}>{tf(lightboxImage, 'title') || 'Untitled'}</p>
          </div>
        </div>
      )}
    </>
  );
}
