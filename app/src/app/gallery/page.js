'use client';
import { useState, useEffect } from 'react';
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
  }, []);

  const filtered = activeFilter === 'all'
    ? images
    : images.filter(img => img.category === activeFilter);

  const getTitle = (img) => img.title_en || img.title || 'Untitled';

  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <p className={styles.label}>GALLERY</p>
          <h1>Visual Stories</h1>
          <p className={styles.subtitle}>A curated glimpse into the L'Entrecôte experience</p>
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
                <div className={styles.gridItemInner} style={
                  img.image_url
                    ? { backgroundImage: `url(${img.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { background: `linear-gradient(${120 + i * 25}deg, #2a1a0a 0%, #${img.category === 'food' ? '4a2a1a' : '1a2a3a'} 100%)` }
                }>
                  {!img.image_url && <span className={styles.gridEmoji}>{img.emoji || '📸'}</span>}
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
            <div className={styles.lightboxImage} style={
              lightbox.image_url
                ? { backgroundImage: `url(${lightbox.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: `linear-gradient(135deg, #2a1a0a 0%, #4a2a1a 100%)` }
            }>
              {!lightbox.image_url && <span style={{ fontSize: '8rem' }}>{lightbox.emoji || '📸'}</span>}
            </div>
            <p className={styles.lightboxTitle}>{getTitle(lightbox)}</p>
          </div>
        </div>
      )}
    </>
  );
}
