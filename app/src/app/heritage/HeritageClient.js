'use client';
import Image from 'next/image';
import styles from './heritage.module.css';
import { useLanguage, useTranslation } from '@/lib/i18n';

// Tiny blur placeholder for hero images
const BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMyYTFhMGEiLz48L3N2Zz4=';

export default function HeritageClient({ initialSections = {} }) {
  const { lang } = useLanguage();
  const t = useTranslation();

  // Language-aware helpers
  const tf = (section, field, fallback = '') => {
    if (!section) return fallback;
    const val = section[`${field}_${lang}`];
    if (val && val.trim()) return val;
    return section[`${field}_en`] || fallback;
  };
  const tm = (section, key, fallback = '') => {
    if (!section?.metadata) return fallback;
    const val = section.metadata[`${key}_${lang}`];
    if (val && val.trim()) return val;
    return section.metadata[`${key}_en`] || fallback;
  };

  const s = initialSections;
  const hero = s.hero || {};
  const story = s.our_story || {};
  const timeline = s.timeline || {};
  const philosophy = s.beef_philosophy || {};

  // Parse timeline items
  const defaultTimeline = [
    { year: '1959', text_en: "L'Entrecôte opens its doors in Paris, serving one perfect dish.", text_vi: "L'Entrecôte mở cửa tại Paris, phục vụ một món ăn hoàn hảo duy nhất." },
    { year: '1980', text_en: 'Expansion across France — Geneva, Bordeaux, and beyond.', text_vi: 'Mở rộng khắp nước Pháp — Geneva, Bordeaux, và nhiều nơi khác.' },
    { year: '2000', text_en: 'International presence grows with locations across Europe.', text_vi: 'Hiện diện quốc tế phát triển với các chi nhánh khắp châu Âu.' },
    { year: '2024', text_en: "L'Entrecôte Social Meating arrives in Saigon, Ho Chi Minh City.", text_vi: "L'Entrecôte Social Meating đến Sài Gòn, TP. Hồ Chí Minh." },
  ];

  let timelineItems = defaultTimeline;
  const timelineContent = tf(timeline, 'content');
  if (timelineContent) {
    const parsed = timelineContent.match(/(\d{4}):\s*([^.]+\.)/g);
    if (parsed && parsed.length > 0) {
      timelineItems = parsed.map(item => {
        const match = item.match(/(\d{4}):\s*(.+)/);
        return match ? { year: match[1], [`text_${lang}`]: match[2].trim() } : null;
      }).filter(Boolean);
    }
  }

  // Parse paragraphs
  const storyContent = tf(story, 'content');
  const storyParagraphs = storyContent
    ? storyContent.split(/\n\n|\n/).filter(p => p.trim())
    : lang === 'vi'
      ? ["L'Entrecôte ra đời từ một ý tưởng đơn giản nhưng cách mạng: chỉ phục vụ một món ăn, nhưng biến nó thành bữa ăn khó quên nhất trong đời bạn.",
         "Bí mật không chỉ nằm ở nước sốt bơ huyền thoại — công thức chỉ một vài người biết — mà còn ở triết lý rằng sự hoàn hảo đến từ sự tập trung tuyệt đối.",
         "Ngày nay, từ Paris đến Geneva, London đến Sài Gòn, L'Entrecôte tiếp tục chào đón hàng triệu thực khách mỗi năm."]
      : ["L'Entrecôte was born from a simple yet revolutionary idea: serve only one dish, but make it the most unforgettable meal of your life.",
         "The secret lies not just in our legendary butter sauce — a recipe known only to a select few — but in the philosophy that perfection comes from singular focus.",
         "Today, from Paris to Geneva, London to Saigon, L'Entrecôte continues to welcome millions of guests each year, all seeking the same timeless experience."];

  const philContent = tf(philosophy, 'content');
  const philosophyParagraphs = philContent
    ? philContent.split(/\n\n|\n/).filter(p => p.trim())
    : lang === 'vi'
      ? ["Mỗi miếng entrecôte đến tay bạn đều được chọn lọc kỹ lưỡng từ những con bò ăn cỏ tự nhiên chất lượng cao nhất.",
         "Entrecôte — phần thịt giữa các xương sườn — được đánh giá cao nhờ vân mỡ đặc biệt."]
      : ["Every cut of entrecôte that reaches your plate has been carefully selected from the finest grass-fed cattle.",
         "The entrecôte — the \"cut between the ribs\" — is prized for its exceptional marbling."];

  // Feature translations
  const features = [
    { icon: '🌿', title_en: 'Grass-Fed', title_vi: 'Bò Ăn Cỏ', desc_en: '100% grass-fed cattle from premium farms', desc_vi: '100% bò ăn cỏ tự nhiên từ trang trại cao cấp' },
    { icon: '⏳', title_en: 'Aged to Perfection', title_vi: 'Ủ Hoàn Hảo', desc_en: 'Optimal aging for maximum flavour and tenderness', desc_vi: 'Ủ tối ưu để đạt hương vị và độ mềm tuyệt hảo' },
    { icon: '👨‍🍳', title_en: "Chef's Precision", title_vi: 'Tay Nghề Đầu Bếp', desc_en: 'Cooked to your exact preference, every time', desc_vi: 'Nấu theo đúng sở thích của bạn, mọi lúc' },
  ];

  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        {hero.image_url && (
          <Image src={hero.image_url} alt="Heritage" fill sizes="100vw" priority quality={80} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} style={{ objectFit: 'cover', objectPosition: 'center' }} />
        )}
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <p className={styles.label}>{tm(hero, 'label', lang === 'vi' ? 'DI SẢN' : 'OUR HERITAGE')}</p>
          <h1>{tf(hero, 'title', lang === 'vi' ? 'Câu Chuyện Được Viết Bằng Hương Vị' : 'A Story Written in Flavour')}</h1>
          <p className={styles.subtitle}>{tm(hero, 'subtitle', lang === 'vi' ? 'Từ trái tim Paris đến tâm hồn Sài Gòn' : 'From the heart of Paris to the soul of Saigon')}</p>
        </div>
      </section>

      {/* Our Story */}
      <section className={styles.storySection}>
        <div className="container">
          <div className={styles.storyGrid}>
            <div className={styles.storyImageCol}>
              <div className={styles.storyImage}>
                {story.image_url ? (
                  <Image src={story.image_url} alt="Our Story" fill sizes="(max-width: 768px) 100vw, 50vw" quality={75} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} style={{ objectFit: 'cover', objectPosition: 'center' }} />
                ) : (
                  <div className={styles.placeholderEmoji}>🏰</div>
                )}
              </div>
            </div>
            <div className={styles.storyTextCol}>
              <p className={styles.label}>{tm(story, 'label', lang === 'vi' ? 'CÂU CHUYỆN CỦA CHÚNG TÔI' : 'OUR STORY')}</p>
              <h2>{tf(story, 'title', lang === 'vi' ? 'Khởi Nguồn Tại Paris, 1959' : 'Born in Paris, 1959')}</h2>
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
          <p className={styles.label} style={{ textAlign: 'center' }}>{tm(timeline, 'label', lang === 'vi' ? 'HÀNH TRÌNH' : 'THE JOURNEY')}</p>
          <h2 className={styles.timelineTitle}>{tf(timeline, 'title', lang === 'vi' ? 'Cột Mốc Qua Thời Gian' : 'Milestones Through Time')}</h2>
          <div className={styles.timeline}>
            {timelineItems.map((item, i) => (
              <div key={i} className={styles.timelineItem}>
                <div className={styles.timelineYear}>{item.year}</div>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineText}>{item[`text_${lang}`] || item.text_en || item.text}</div>
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
              <p className={styles.label}>{tm(philosophy, 'label', lang === 'vi' ? 'TRIẾT LÝ THỊ BÒ' : 'OUR BEEF PHILOSOPHY')}</p>
              <h2>{tf(philosophy, 'title', lang === 'vi' ? 'Nghệ Thuật Tuyển Chọn' : 'The Art of Selection')}</h2>
              <div className={styles.goldDivider}></div>
              {philosophyParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <div className={styles.philosophyFeatures}>
                {features.map((f, i) => (
                  <div key={i} className={styles.feature}>
                    <span className={styles.featureIcon}>{f.icon}</span>
                    <div>
                      <h4>{lang === 'vi' ? f.title_vi : f.title_en}</h4>
                      <p>{lang === 'vi' ? f.desc_vi : f.desc_en}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.philosophyImageCol}>
              <div className={styles.philosophyImage}>
                {philosophy.image_url ? (
                  <Image src={philosophy.image_url} alt="Beef Philosophy" fill sizes="(max-width: 768px) 100vw, 50vw" quality={75} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} style={{ objectFit: 'cover', objectPosition: 'center' }} />
                ) : (
                  <div className={styles.placeholderEmoji}>🥩</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
