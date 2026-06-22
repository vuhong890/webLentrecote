'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import styles from './SignatureCarousel.module.css';

export default function SignatureCarousel({ items, onItemClick }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [Autoplay({ delay: 5000, stopOnInteraction: true })]
  );
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const total = items?.length || 0;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  if (!items || total === 0) return null;

  return (
    <div className={styles.carousel}>
      <div className={styles.embla} ref={emblaRef}>
        <div className={styles.emblaContainer}>
          {items.map((item, i) => (
            <div
              key={item.id || i}
              className={styles.emblaSlide}
              onClick={() => onItemClick && onItemClick(item, i)}
            >
              <div className={styles.card}>
                <div className={styles.imageWrap}>
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name_en} className={styles.image} width={400} height={300} sizes="(max-width: 768px) 100vw, 33vw" quality={75} />
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      <span className={styles.placeholderEmoji}>
                        {['🥩', '🍷', '🥗', '🍮', '🦞'][i % 5]}
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <h3>{item.name_en}</h3>
                  {item.description_en && <p>{item.description_en}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {total > 1 && (
        <div className={styles.dots}>
          {items.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === selectedIndex ? styles.dotActive : ''}`}
              onClick={() => scrollTo(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
