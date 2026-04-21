'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './gallery.module.css';

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
  { id: 'all', label: 'ALL' },
  { id: 'food', label: 'FOOD & DRINKS' },
  { id: 'ambiance', label: 'AMBIANCE' },
  { id: 'events', label: 'EVENTS' },
];

export default function Gallery() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [lightbox, setLightbox] = useState(null);
  const [images, setImages] = useState([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [pageSections, setPageSections] = useState({});

  useEffect(() => {
    fetch('/api/gallery')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Assign aspect ratios cyclically for masonry
          const withAspects = data.map((img, i) => ({
            ...img,
            aspect: aspects[i % aspects.length],
          }));
          setImages(withAspects);
          setDbLoaded(true);
        } else {
          setImages(staticGallery);
        }
      })
      .catch(() => setImages(staticGallery));

    fetch('/api/page-sections?page=gallery').then(r => r.json()).then(data => {
      const ps = {};
      (Array.isArray(data) ? data : []).forEach(s => { ps[s.section_key] = s; });
      setPageSections(ps);
    }).catch(() => {});
  }, []);

  const filtered = activeFilter === 'all'
    ? images
    : images.filter(img => img.category === activeFilter);

  const getTitle = (img) => img.title_en || img.title || 'Untitled';

  const hero = pageSections.hero || {};
  const heroMeta = hero.metadata || {};

  return (
    <>
      {/* Hero */}
      <section 
        className={styles.hero}
      >
        {hero.image_url && (
          <Image src={hero.image_url} alt="Gallery" fill sizes="100vw" priority quality={80} style={{ objectFit: 'cover', objectPosition: 'center' }} />
        )}
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <p className={styles.label}>{heroMeta.label_en || 'GALLERY'}</p>
          <h1>{hero.title_en || 'Visual Stories'}</h1>
          <p className={styles.subtitle} dangerouslySetInnerHTML={{ __html: hero.content_en || 'A curated glimpse into the L\'Entrecôte experience' }}></p>
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
                {f.label}
              </button>
            ))}
          </div>

          {/* Masonry Grid */}
          <div className={styles.masonryGrid}>
            {filtered.map((img, i) => (
              <div
                key={img.id}
                className={`${styles.gridItem} ${styles[img.aspect]}`}
                onClick={() => setLightbox(img)}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={styles.gridItemInner}>
                  {img.image_url ? (
                    <Image src={img.image_url} alt={getTitle(img)} fill sizes="(max-width: 768px) 50vw, 33vw" quality={70} style={{ objectFit: 'cover', objectPosition: 'center' }} />
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
