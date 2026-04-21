'use client';
import { useState, useEffect } from 'react';
import styles from './menus.module.css';

// Static fallback data (used when DB is empty)
const staticMenuData = {
  'small-bites': [
    { name_en: 'Wagyu Beef Tartare', description_en: 'Hand-cut wagyu, quail egg yolk, cornichons, shallots, capers', price: 420000, badge: "Chef's Pick" },
    { name_en: 'Foie Gras Terrine', description_en: 'Duck liver terrine with brioche toast and fig compote', price: 380000 },
    { name_en: 'Tuna Crudo', description_en: 'Sashimi-grade tuna, yuzu dressing, micro herbs', price: 340000 },
    { name_en: 'Bone Marrow Crostini', description_en: 'Roasted bone marrow, parsley salad, sourdough', price: 290000 },
  ],
  'salads': [
    { name_en: 'Classic Walnut Salad', description_en: "L'Entrecôte's signature: fresh greens, walnuts, mustard vinaigrette", price: 220000, badge: 'Signature' },
    { name_en: 'Caesar Salad', description_en: 'Romaine hearts, aged parmesan, anchovy dressing, croutons', price: 200000 },
    { name_en: 'Burrata & Heirloom Tomato', description_en: 'Creamy burrata, vine tomatoes, basil oil, balsamic reduction', price: 280000 },
    { name_en: 'Salade Niçoise', description_en: 'Seared tuna, green beans, olives, soft egg, new potatoes', price: 260000 },
  ],
  'starters': [
    { name_en: 'French Onion Soup', description_en: 'Caramelised onions, rich beef broth, gruyère crouton', price: 180000, badge: 'Classic' },
    { name_en: 'Escargots de Bourgogne', description_en: 'Six Burgundy snails, garlic-parsley butter, crusty bread', price: 280000 },
    { name_en: 'Prawn Bisque', description_en: 'Velvety shellfish bisque, crème fraîche, chive oil', price: 240000 },
    { name_en: 'Mushroom Velouté', description_en: 'Wild mushroom soup, truffle oil, toasted brioche', price: 220000 },
  ],
  'mains': [
    { name_en: 'The Entrecôte Steak', description_en: 'Our legendary trimmed entrecôte, secret butter sauce, unlimited frites', price: 580000, badge: 'Signature' },
    { name_en: 'Grilled Sea Bass', description_en: 'Pan-seared Mediterranean sea bass, ratatouille, saffron beurre blanc', price: 460000 },
    { name_en: 'Duck Confit', description_en: 'Slow-cooked duck leg, Sarladaise potatoes, orange gastrique', price: 420000 },
    { name_en: 'Lamb Rack', description_en: 'Herb-crusted lamb rack, pomme purée, red wine jus', price: 520000 },
  ],
  'beef-selection': [
    { name_en: 'Wagyu Ribeye A5', description_en: 'Japanese A5 wagyu, 200g, cooked over charcoal — a symphony of marbling', price: 1800000, badge: 'Premium' },
    { name_en: 'Australian Black Angus', description_en: 'Grain-fed 300 days, 300g, with your choice of sauce', price: 680000 },
    { name_en: 'USDA Prime New York Strip', description_en: 'American prime beef, 350g, dry-aged 28 days', price: 920000 },
    { name_en: 'Chateaubriand for Two', description_en: 'Centre-cut tenderloin, 500g, carved tableside with béarnaise', price: 1400000, badge: 'For Two' },
  ],
  'sauces': [
    { name_en: 'The Secret Sauce', description_en: 'Our legendary house butter sauce — the recipe known only to three people', price: 0, badge: 'House' },
    { name_en: 'Béarnaise', description_en: 'Classic French tarragon and shallot butter sauce', price: 60000 },
    { name_en: 'Peppercorn', description_en: 'Green peppercorn cream sauce, a touch of cognac', price: 60000 },
    { name_en: 'Red Wine Jus', description_en: 'Rich Bordeaux reduction with bone marrow', price: 60000 },
    { name_en: 'Truffle Butter', description_en: 'Black winter truffle compound butter', price: 120000 },
  ],
  'side-dishes': [
    { name_en: 'Unlimited Golden Frites', description_en: 'Our signature thin-cut, twice-fried golden potatoes', price: 0, badge: 'Classic' },
    { name_en: 'Pomme Purée', description_en: 'Silky smooth mashed potatoes with French butter', price: 80000 },
    { name_en: 'Grilled Asparagus', description_en: 'Seasonal asparagus, hollandaise, toasted almonds', price: 120000 },
    { name_en: 'Truffle Mac & Cheese', description_en: 'Gruyère and comté cheese, black truffle shavings', price: 140000 },
    { name_en: 'Sautéed Spinach', description_en: 'Baby spinach, garlic, olive oil, lemon zest', price: 80000 },
  ],
  'drinks': [
    { name_en: 'Château de Saurs', description_en: 'Our exclusive house wine — Gaillac red, berry notes, velvety finish', price: 180000, badge: 'House Wine' },
    { name_en: 'French 75', description_en: 'Gin, champagne, lemon juice, sugar — the Parisian classic', price: 220000 },
    { name_en: 'Old Fashioned', description_en: 'Bourbon, Angostura bitters, orange peel, demerara sugar', price: 240000 },
    { name_en: 'Saigon Sunset Spritz', description_en: 'Aperol, prosecco, passion fruit, soda — our Saigon twist', price: 200000, badge: 'Signature' },
    { name_en: 'Espresso Martini', description_en: 'Vodka, Kahlua, freshly pulled espresso, vanilla', price: 220000 },
    { name_en: 'Mineral Water', description_en: 'San Pellegrino sparkling or Acqua Panna still', price: 80000 },
  ],
};

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

export default function Menus() {
  const [categories, setCategories] = useState([]);
  const [activeSlug, setActiveSlug] = useState('small-bites');
  const [items, setItems] = useState([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [pageSections, setPageSections] = useState({});

  // Load page sections
  useEffect(() => {
    fetch('/api/page-sections?page=menus')
      .then(r => r.json())
      .then(data => {
        const ps = {};
        (Array.isArray(data) ? data : []).forEach(s => { ps[s.section_key] = s; });
        setPageSections(ps);
      })
      .catch(() => {});
  }, []);

  // Load categories from API
  useEffect(() => {
    fetch('/api/menu-categories')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch(() => {});
  }, []);

  // Load items when category changes (skip for drinks — uses static image)
  useEffect(() => {
    if (activeSlug === 'drinks') {
      setItems([]);
      return;
    }
    const cat = categories.find(c => c.slug === activeSlug);
    if (cat) {
      fetch(`/api/menu-items?category_id=${cat.id}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setItems(data);
            setDbLoaded(true);
          } else {
            // Fallback to static
            setItems(staticMenuData[activeSlug] || []);
            setDbLoaded(false);
          }
        })
        .catch(() => {
          setItems(staticMenuData[activeSlug] || []);
          setDbLoaded(false);
        });
    } else {
      setItems(staticMenuData[activeSlug] || []);
      setDbLoaded(false);
    }
  }, [activeSlug, categories]);

  const displayCategories = categories.length > 0 ? categories : [
    { slug: 'small-bites', name_en: 'SMALL BITES' },
    { slug: 'salads', name_en: 'SALADS' },
    { slug: 'starters', name_en: 'STARTERS' },
    { slug: 'mains', name_en: 'MAINS' },
    { slug: 'beef-selection', name_en: 'BEEF SELECTION' },
    { slug: 'sauces', name_en: 'SAUCES' },
    { slug: 'side-dishes', name_en: 'SIDE DISHES' },
    { slug: 'drinks', name_en: 'DRINK MENU & WINE LIST' },
  ];





  // Get display name/desc/price for item (works for both DB and static data)
  const getName = (item) => item.name_en || item.name || '';
  const getDesc = (item) => item.description_en || item.description || '';
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
        style={hero.image_url ? { backgroundImage: `url(${hero.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <p className={styles.label}>{heroMeta.label_en || 'THE MENU'}</p>
          <h1>{hero.title_en || 'Signature Selection'}</h1>
          {hero.content_en && <p className={styles.subtitle} dangerouslySetInnerHTML={{ __html: hero.content_en }}></p>}
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
                {cat.name_en}
              </button>
            ))}
          </div>

          {/* Drink Menu — show static image */}
          {activeSlug === 'drinks' ? (
            <div className={styles.drinkMenuImage}>
              <img
                src="/drink_menu_wine_list.png"
                alt="Drink Menu & Wine List"
                className={styles.drinkMenuImg}
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
