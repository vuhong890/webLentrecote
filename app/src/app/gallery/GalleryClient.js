'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './gallery.module.css';
import { useLanguage } from '@/lib/i18n';

const BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMyYTFhMGEiLz48L3N2Zz4=';

// Static fallback
const staticGallery = [
  { id: 1, category: 'food', emoji: '🥩', title_en: 'The Signature Entrecôte', aspect: 'tall' },
  { id: 2, category: 'ambiance', emoji: '🕯️', title_en: 'Evening Ambiance', aspect: 'wide' },
  { id: 3, category: 'food', emoji: '🥗', title_en: 'Fresh Walnut Salad', aspect: 'square' },
  { id: 4, category: 'ambiance', emoji: '🍽️', title_en: 'Table Setting', aspect: 'square' },
  { id: 5, category: 'food', emoji: '🍷', title_en: 'Wine Selection', aspect: 'tall' },
  { id: 6, category: 'ambiance', emoji: '✨', title_en: 'The Dining Room', aspect: 'wide' },
  { id: 7, category: 'food', emoji: '🍟', title_en: 'Golden Frites', aspect: 'square' },
  { id: 8, category: 'food', emoji: '🧁', title_en: 'Dessert Collection', aspect: 'wide' },
  { id: 9, category: 'ambiance', emoji: '🌃', title_en: 'Saigon Nights', aspect: 'tall' },
  { id: 10, category: 'food', emoji: '🥂', title_en: 'Celebration Moments', aspect: 'square' },
  { id: 11, category: 'ambiance', emoji: '🪑', title_en: 'Interior Design', aspect: 'wide' },
  { id: 12, category: 'food', emoji: '🫕', title_en: 'The Secret Sauce', aspect: 'square' },
];

const aspects = ['square', 'tall', 'wide', 'square', 'tall', 'wide'];

const filters = [
  { id: 'all', label_en: 'ALL', label_vi: 'TẤT CẢ' },
  { id: 'food', label_en: 'FOOD & DRINKS', label_vi: 'ĐỒ ĂN & THỨC UỐNG' },
  { id: 'ambiance', label_en: 'AMBIANCE', label_vi: 'KHÔNG GIAN' },
  { id: 'events', label_en: 'EVENTS', label_vi: 'SỰ KIỆN' },
];

export default function GalleryClient({ initialImages = [], initialPageSections = {} }) {
  const { lang } = useLanguage();
  const [activeFilter, setActiveFilter] = useState('all');
  const [lightbox, setLightbox] = useState(null);
  const [visibleCount, setVisibleCount] = useState(12);

  let images = staticGallery;
  if (initialImages && initialImages.length > 0) {
    images = initialImages.map((img, i) => ({
      ...img,
      aspect: aspects[i % aspects.length],
    }));
  }

  const pageSections = initialPageSections;

  const filtered = activeFilter === 'all'
    ? images
    : images.filter(img => img.category === activeFilter);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(12);
  }, [activeFilter]);

  const visibleImages = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const tf = (obj, field) => obj ? obj[`${field}_${lang}`] || obj[`${field}_en`] || '' : '';
  const tm = (obj, key) => obj?.metadata ? obj.metadata[`${key}_${lang}`] || obj.metadata[`${key}_en`] || '' : '';

  const getTitle = (img) => tf(img, 'title') || img.title || 'Untitled';

  const hero = pageSections.hero || {};
  const heroMeta = hero.metadata || {};

  return (
    <>
      {/* Hero */}
      <section 
        className={styles.hero}
      >
        {hero.image_url && (
          <Image src={hero.image_url} alt="Gallery" fill sizes="100vw" priority quality={80} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} style={{ objectFit: 'cover', objectPosition: 'center' }} />
        )}
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <p className={styles.label}>{tm(hero, 'label') || 'GALLERY'}</p>
          <h1>{tf(hero, 'title') || 'Visual Stories'}</h1>
          <div className={`${styles.subtitle} richTextSubtitle`} dangerouslySetInnerHTML={{ __html: tf(hero, 'content') || 'A curated glimpse into the L\'Entrecôte experience' }}></div>
        </div>
      </section>

      {/* Gallery */}
      <section className={styles.gallerySection}>
        <div className="container">
          {/* Filters */}
          <div className={styles.filterBar}>
            {filters.map(f => (
              <button
                key={f.id}
                className={`${styles.filterBtn} ${activeFilter === f.id ? styles.filterActive : ''}`}
                onClick={() => setActiveFilter(f.id)}
              >
                {lang === 'vi' && f.label_vi ? f.label_vi : f.label_en}
              </button>
            ))}
          </div>

          {/* Masonry Grid */}
          <div className={styles.masonryGrid}>
            {visibleImages.map((img, i) => (
              <div
                key={img.id}
                className={`${styles.gridItem} ${styles[img.aspect]}`}
                onClick={() => setLightbox(img)}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={styles.gridItemInner}>
                  {img.image_url ? (
                    <Image src={img.image_url} alt={getTitle(img)} fill sizes="(max-width: 768px) 50vw, 33vw" quality={70} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} style={{ objectFit: 'cover', objectPosition: 'center' }} />
                  ) : (
                    <span className={styles.gridEmoji}>{img.emoji || '📸'}</span>
                  )}
                  <div className={styles.gridOverlay}>
                    <p className={styles.gridTitle}>{getTitle(img)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <button
                className="btn btn-dark"
                onClick={() => setVisibleCount(prev => prev + 8)}
              >
                {lang === 'vi' ? 'TẢI THÊM' : 'LOAD MORE'} ({filtered.length - visibleCount})
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <div className={styles.lightboxImage}>
              {lightbox.image_url ? (
                <Image src={lightbox.image_url} alt={getTitle(lightbox)} fill sizes="90vw" quality={85} style={{ objectFit: 'cover', objectPosition: 'center' }} />
              ) : (
                <span style={{ fontSize: '8rem' }}>{lightbox.emoji || '📸'}</span>
              )}
            </div>
            <p className={styles.lightboxTitle}>{getTitle(lightbox)}</p>
          </div>
        </div>
      )}
    </>
  );
}
