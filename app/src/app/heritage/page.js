import styles from './heritage.module.css';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function getHeritageSections() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data } = await supabase
    .from('page_sections')
    .select('*')
    .eq('page', 'heritage')
    .order('sort_order');

  const sections = {};
  (data || []).forEach(s => { sections[s.section_key] = s; });
  return sections;
}

export const metadata = {
  title: "Heritage | L'Entrecôte",
  description: "Discover the rich heritage of L'Entrecôte — from Paris 1959 to Saigon's vibrant dining scene.",
};

export default async function Heritage() {
  const s = await getHeritageSections();

  const hero = s.hero || {};
  const heroMeta = hero.metadata || {};
  const story = s.our_story || {};
  const storyMeta = story.metadata || {};
  const timeline = s.timeline || {};
  const timelineMeta = timeline.metadata || {};
  const philosophy = s.beef_philosophy || {};
  const philosophyMeta = philosophy.metadata || {};

  // Parse timeline items from content_en (format: "YEAR: text. YEAR: text.")
  const defaultTimeline = [
    { year: '1959', text: "L'Entrecôte opens its doors in Paris, serving one perfect dish." },
    { year: '1980', text: 'Expansion across France — Geneva, Bordeaux, and beyond.' },
    { year: '2000', text: 'International presence grows with locations across Europe.' },
    { year: '2024', text: "L'Entrecôte Social Meating arrives in Saigon, Ho Chi Minh City." },
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

  // Parse story paragraphs
  const storyParagraphs = story.content_en
    ? story.content_en.split(/\n\n|\n/).filter(p => p.trim())
    : [
        "L'Entrecôte was born from a simple yet revolutionary idea: serve only one dish, but make it the most unforgettable meal of your life.",
        "The secret lies not just in our legendary butter sauce — a recipe known only to a select few — but in the philosophy that perfection comes from singular focus.",
        "Today, from Paris to Geneva, London to Saigon, L'Entrecôte continues to welcome millions of guests each year, all seeking the same timeless experience.",
      ];

  // Parse philosophy paragraphs
  const philosophyParagraphs = philosophy.content_en
    ? philosophy.content_en.split(/\n\n|\n/).filter(p => p.trim())
    : [
        "Every cut of entrecôte that reaches your plate has been carefully selected from the finest grass-fed cattle.",
        "The entrecôte — the \"cut between the ribs\" — is prized for its exceptional marbling.",
      ];

  return (
    <>
      {/* Hero */}
      <section
        className={styles.hero}
        style={hero.image_url ? { backgroundImage: `url(${hero.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <p className={styles.label}>{heroMeta.label_en || 'OUR HERITAGE'}</p>
          <h1>{hero.title_en || 'A Story Written in Flavour'}</h1>
          <p className={styles.subtitle}>{hero.content_en || heroMeta.subtitle_en || 'From the heart of Paris to the soul of Saigon'}</p>
        </div>
      </section>

      {/* Our Story */}
      <section className={styles.storySection}>
        <div className="container">
          <div className={styles.storyGrid}>
            <div className={styles.storyImageCol}>
              <div className={styles.storyImage} style={
                story.image_url
                  ? { backgroundImage: `url(${story.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: 'linear-gradient(135deg, #2a1a0a 0%, #4a2a1a 100%)' }
              }>
                {!story.image_url && <div className={styles.placeholderEmoji}>🏰</div>}
              </div>
            </div>
            <div className={styles.storyTextCol}>
              <p className={styles.label}>{storyMeta.label_en || 'OUR STORY'}</p>
              <h2>{story.title_en || 'Born in Paris, 1959'}</h2>
              <div className={styles.goldDivider}></div>
              {storyParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className={styles.timelineSection}>
        <div className="container">
          <p className={styles.label} style={{ textAlign: 'center' }}>{timelineMeta.label_en || 'THE JOURNEY'}</p>
          <h2 className={styles.timelineTitle}>{timeline.title_en || 'Milestones Through Time'}</h2>
          <div className={styles.timeline}>
            {timelineItems.map((item, i) => (
              <div key={i} className={styles.timelineItem}>
                <div className={styles.timelineYear}>{item.year}</div>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineText}>{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beef Philosophy */}
      <section className={styles.philosophySection}>
        <div className="container">
          <div className={styles.philosophyGrid}>
            <div className={styles.philosophyTextCol}>
              <p className={styles.label}>{philosophyMeta.label_en || 'OUR BEEF PHILOSOPHY'}</p>
              <h2>{philosophy.title_en || 'The Art of Selection'}</h2>
              <div className={styles.goldDivider}></div>
              {philosophyParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              <div className={styles.philosophyFeatures}>
                <div className={styles.feature}>
                  <span className={styles.featureIcon}>🌿</span>
                  <div>
                    <h4>Grass-Fed</h4>
                    <p>100% grass-fed cattle from premium farms</p>
                  </div>
                </div>
                <div className={styles.feature}>
                  <span className={styles.featureIcon}>⏳</span>
                  <div>
                    <h4>Aged to Perfection</h4>
                    <p>Optimal aging for maximum flavour and tenderness</p>
                  </div>
                </div>
                <div className={styles.feature}>
                  <span className={styles.featureIcon}>👨‍🍳</span>
                  <div>
                    <h4>Chef&apos;s Precision</h4>
                    <p>Cooked to your exact preference, every time</p>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.philosophyImageCol}>
              <div className={styles.philosophyImage} style={
                philosophy.image_url
                  ? { backgroundImage: `url(${philosophy.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: 'linear-gradient(135deg, #3a1a0a 0%, #5a2a1a 100%)' }
              }>
                {!philosophy.image_url && <div className={styles.placeholderEmoji}>🥩</div>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
