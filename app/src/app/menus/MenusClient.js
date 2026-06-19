'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './menus.module.css';
import { useLanguage } from '@/lib/i18n';


function formatPrice(price) {
  if (!price || price === 0) return 'Complimentary';
  return `${Number(price).toLocaleString()}₫`;
}

function getEmoji(slug) {
  if (slug === 'drinks') return '🍷';
  if (slug === 'sauces') return '🫕';
  if (slug === 'salads') return '🥗';
  if (slug === 'side-dishes') return '🍟';
  return '🥩';
}

export default function MenusClient({ initialCategories = [], allMenuItems = [], pageSections = {} }) {
  const [activeSlug, setActiveSlug] = useState('small-bites');
  const [items, setItems] = useState([]);
  const [dbLoaded, setDbLoaded] = useState(true);

  const { lang } = useLanguage();
  const categories = initialCategories;

  const tf = (obj, field) => obj ? obj[`${field}_${lang}`] || obj[`${field}_en`] || '' : '';
  const tm = (obj, key) => obj?.metadata ? obj.metadata[`${key}_${lang}`] || obj.metadata[`${key}_en`] || '' : '';

  // Load items when category changes (skip for drinks — uses static image)
  useEffect(() => {
    if (activeSlug === 'drinks') {
      setItems([]);
      return;
    }
    const cat = categories.find(c => c.slug === activeSlug);
    if (cat) {
      const catItems = allMenuItems.filter(item => item.category_id === cat.id);
      setItems(catItems);
      setDbLoaded(true);
    } else {
      setItems([]);
      setDbLoaded(true);
    }
  }, [activeSlug, categories, allMenuItems]);

  const displayCategories = categories.length > 0 ? categories : [
    { slug: 'small-bites', name_en: 'SMALL BITES', name_vi: 'KHAI VỊ NHỎ' },
    { slug: 'salads', name_en: 'SALADS', name_vi: 'SALAD' },
    { slug: 'starters', name_en: 'STARTERS', name_vi: 'MÓN KHAI VỊ' },
    { slug: 'mains', name_en: 'MAINS', name_vi: 'MÓN CHÍNH' },
    { slug: 'beef-selection', name_en: 'BEEF SELECTION', name_vi: 'BÒ TUYỂN CHỌN' },
    { slug: 'sauces', name_en: 'SAUCES', name_vi: 'NƯỚC SỐT' },
    { slug: 'side-dishes', name_en: 'SIDE DISHES', name_vi: 'MÓN ĂN KÈM' },
    { slug: 'drinks', name_en: 'DRINK MENU & WINE LIST', name_vi: 'THỨC UỐNG & RƯỢU VANG' },
  ];





  // Get display name/desc/price for item (works for both DB and static data)
  const getName = (item) => tf(item, 'name') || item.name || '';
  const getDesc = (item) => tf(item, 'description') || item.description || '';
  const getPrice = (item) => {
    if (dbLoaded) return formatPrice(item.price);
    if (item.price === 0) return 'Complimentary';
    return formatPrice(item.price);
  };
  const getImage = (item) => item.image_url || '';

  const hero = pageSections.hero || {};
  const heroMeta = hero.metadata || {};

  return (
    <>
      {/* Hero */}
      <section 
        className={styles.hero}
      >
        {hero.image_url && (
          <Image src={hero.image_url} alt="Menu" fill sizes="100vw" priority quality={80} style={{ objectFit: 'cover', objectPosition: 'center' }} />
        )}
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <p className={styles.label}>{tm(hero, 'label') || 'THE MENU'}</p>
          <h1>{tf(hero, 'title') || 'Signature Selection'}</h1>
          {tf(hero, 'content') && <div className={`${styles.subtitle} richTextSubtitle`} dangerouslySetInnerHTML={{ __html: tf(hero, 'content') }}></div>}
        </div>
      </section>

      {/* Menu Content */}
      <section className={styles.menuSection}>
        <div className="container">
          {/* Category Buttons */}
          <div className={styles.categoryBar}>
            {displayCategories.map((cat) => (
              <button
                key={cat.slug}
                className={`${styles.categoryBtn} ${activeSlug === cat.slug ? styles.categoryActive : ''}`}
                onClick={() => setActiveSlug(cat.slug)}
              >
                {tf(cat, 'name')}
              </button>
            ))}
          </div>

          {/* Drink Menu — show static image */}
          {activeSlug === 'drinks' ? (
            <div className={styles.drinkMenuImage}>
              <Image
                src={lang === 'vi' ? '/drink_vn.png' : '/drink_en.png'}
                alt="Drink Menu & Wine List"
                width={1035}
                height={1300}
                className={styles.drinkMenuImg}
                sizes="(max-width: 768px) 100vw, 1035px"
                quality={80}
              />
            </div>
          ) : (
            /* Menu Items Grid */
            <div className={styles.menuGrid}>
              {items.map((item, i) => (
                <div key={`${activeSlug}-${i}`} className={styles.menuCard} style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className={styles.menuCardImage} style={
                    getImage(item) 
                      ? { backgroundImage: `url(${getImage(item)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: `linear-gradient(${135 + i * 20}deg, #2a1a0a 0%, #4a2a1a 50%, #3a1a0a 100%)` }
                  }>
                    {!getImage(item) && (
                      <div className={styles.menuEmoji}>{getEmoji(activeSlug)}</div>
                    )}
                    {item.badge && (
                      <span className={styles.menuBadge}>{item.badge}</span>
                    )}
                  </div>
                  <div className={styles.menuCardBody}>
                    <div className={styles.menuCardHeader}>
                      <h3>{getName(item)}</h3>
                      <span className={styles.menuPrice}>{getPrice(item)}</span>
                    </div>
                    <p className={styles.menuDesc}>{getDesc(item)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

    </>
  );
}
