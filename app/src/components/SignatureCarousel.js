'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './SignatureCarousel.module.css';

function formatPrice(price) {
  if (!price || price === 0) return '';
  return `${Number(price).toLocaleString()}₫`;
}

export default function SignatureCarousel({ items, onItemClick }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const total = items.length;

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % total);
  }, [total]);

  // Autoplay every 5 seconds
  useEffect(() => {
    if (isPaused || total <= 3) return;
    timerRef.current = setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, [isPaused, next, total]);

  const goTo = (idx) => setCurrent(idx);

  if (!items || items.length === 0) return null;

  // Get 3 visible items (circular)
  const visibleItems = [];
  for (let i = 0; i < Math.min(3, total); i++) {
    visibleItems.push({ ...items[(current + i) % total], _index: (current + i) % total });
  }

  // Number of "positions" for dots = total items
  const dotCount = total;

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.grid}>
        {visibleItems.map((item, i) => (
          <div
            key={`${current}-${i}`}
            className={styles.card}
            style={{ animationDelay: `${i * 0.08}s`, cursor: onItemClick ? 'pointer' : 'default' }}
            onClick={() => onItemClick && onItemClick(item, item._index)}
          >
            <div className={styles.imageWrap}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.name_en} className={styles.image} />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <span className={styles.placeholderEmoji}>
                    {['🥩', '🍷', '🥗', '🍮', '🦞'][((current + i) % total) % 5]}
                  </span>
                </div>
              )}
            </div>
            <div className={styles.cardBody}>
              <h3>{item.name_en}</h3>
              <p>{item.description_en}</p>
              {item.price > 0 && (
                <span className={styles.price}>{formatPrice(item.price)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      {total > 3 && (
        <div className={styles.dots}>
          {Array.from({ length: dotCount }).map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Go to position ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
