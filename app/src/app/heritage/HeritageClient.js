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
  let timelineItems = timeline?.metadata?.items;
  if (!timelineItems || timelineItems.length === 0) {
    timelineItems = [
      { icon_url: '/globe.svg', title: 'BORN IN PARIS', text_en: "A timeless recipe is created in Paris, built on a simple idea: the finest cuts, a signature sauce, and a complete experience served with warmth and consistency.", text_vi: "Một công thức vượt thời gian ra đời tại Paris, dựa trên một ý tưởng đơn giản: những lát cắt hảo hạng nhất, nước sốt đặc trưng, và một trải nghiệm trọn vẹn phục vụ với sự ấm áp và nhất quán." },
      { icon_url: '/globe.svg', title: 'AN ICON IS BORN', text_en: "The Steak Frites ritual becomes a beloved tradition, welcoming locals and visitors alike to enjoy the same experience, every time.", text_vi: "Nghi thức Bít tết khoai tây chiên trở thành một truyền thống được yêu thích, chào đón người dân địa phương và du khách tận hưởng cùng một trải nghiệm, mỗi lần." },
      { icon_url: '/globe.svg', title: 'LOVED AROUND THE WORLD', text_en: "From Paris to major cities across the globe, the tradition travels, bringing people together around perfectly cooked steak, crispy fries and good company.", text_vi: "Từ Paris đến các thành phố lớn trên toàn cầu, truyền thống du ngoạn, gắn kết mọi người xung quanh món bít tết nấu hoàn hảo, khoai tây chiên giòn và những người bạn đồng hành tốt." },
      { icon_url: '/globe.svg', title: 'HERE IN SAIGON', text_en: "Today, we carry this heritage forward in the heart of Ho Chi Minh City — staying true to the original spirit while embracing the vibrant energy of Saigon.", text_vi: "Hôm nay, chúng tôi mang di sản này về trung tâm Thành phố Hồ Chí Minh — trung thành với tinh thần nguyên bản trong khi nắm bắt năng lượng sôi động của Sài Gòn." },
    ];
  }

  // Parse paragraphs
  const storyContent = tf(story, 'content');
  const storyFallback = lang === 'vi'
      ? ["L'Entrecôte ra đời từ một ý tưởng đơn giản nhưng cách mạng: chỉ phục vụ một món ăn, nhưng biến nó thành bữa ăn khó quên nhất trong đời bạn.",
         "Bí mật không chỉ nằm ở nước sốt bơ huyền thoại — công thức chỉ một vài người biết — mà còn ở triết lý rằng sự hoàn hảo đến từ sự tập trung tuyệt đối.",
         "Ngày nay, từ Paris đến Geneva, London đến Sài Gòn, L'Entrecôte tiếp tục chào đón hàng triệu thực khách mỗi năm."]
      : ["L'Entrecôte was born from a simple yet revolutionary idea: serve only one dish, but make it the most unforgettable meal of your life.",
         "The secret lies not just in our legendary butter sauce — a recipe known only to a select few — but in the philosophy that perfection comes from singular focus.",
         "Today, from Paris to Geneva, London to Saigon, L'Entrecôte continues to welcome millions of guests each year, all seeking the same timeless experience."];

  const philContent = tf(philosophy, 'content');
  const philFallback = lang === 'vi'
      ? ["Mỗi miếng entrecôte đến tay bạn đều được chọn lọc kỹ lưỡng từ những con bò ăn cỏ tự nhiên chất lượng cao nhất.",
         "Entrecôte — phần thịt giữa các xương sườn — được đánh giá cao nhờ vân mỡ đặc biệt."]
      : ["Every cut of entrecôte that reaches your plate has been carefully selected from the finest grass-fed cattle.",
         "The entrecôte — the \"cut between the ribs\" — is prized for its exceptional marbling."];

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

      {/* Our Story & Timeline */}
      <section className={styles.storySection}>
        <div className="container">
          <div className={styles.storyGrid}>
            <div className={styles.storyTextCol}>
              <p className={styles.label}>{tm(story, 'label', lang === 'vi' ? 'CÂU CHUYỆN CỦA CHÚNG TÔI' : 'OUR STORY')}</p>
              <h2>{tf(story, 'title', lang === 'vi' ? 'Khởi Nguồn Tại Paris, 1959' : 'Born in Paris, 1959')}</h2>
              <div className={styles.goldDivider}></div>
              {storyContent ? (
                <div className="richTextContent" dangerouslySetInnerHTML={{ __html: storyContent }} />
              ) : (
                storyFallback.map((p, i) => <p key={i}>{p}</p>)
              )}
              
              {/* Timeline Items directly below story text */}
              <div className={styles.miniTimeline}>
                {timelineItems.map((item, i) => (
                  <div key={i} className={styles.miniTimelineItem}>
                    <div className={styles.miniTimelineIconWrap}>
                      {item.icon_url && <Image src={item.icon_url} alt={item.title || "Timeline icon"} width={60} height={60} className={styles.miniTimelineIcon} />}
                    </div>
                    <div className={styles.miniTimelineContent}>
                      <span className={styles.miniTimelineTitle}>{item[`title_${lang}`] || item.title_en || item.title}</span>
                      <span className={styles.miniTimelineText}>{item[`text_${lang}`] || item.text_en || item.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={styles.storyImageCol}>
              <div className={styles.storyImageTop}>
                <Image src={story.metadata?.images?.[0] || story.image_url || "/placeholder1.jpg"} alt="Our Story Main" fill sizes="(max-width: 768px) 100vw, 50vw" quality={80} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} style={{ objectFit: 'cover', objectPosition: 'center' }} />
              </div>
              <div className={styles.storyImageBottomRow}>
                <div className={styles.storyImageSmall}>
                   <Image src={story.metadata?.images?.[1] || "/placeholder2.jpg"} alt="Story 1" fill sizes="(max-width: 768px) 33vw, 16vw" quality={75} style={{ objectFit: 'cover', objectPosition: 'center' }} />
                </div>
                <div className={styles.storyImageSmall}>
                   <Image src={story.metadata?.images?.[2] || "/placeholder3.jpg"} alt="Story 2" fill sizes="(max-width: 768px) 33vw, 16vw" quality={75} style={{ objectFit: 'cover', objectPosition: 'center' }} />
                </div>
                <div className={styles.storyImageSmall}>
                   <Image src={story.metadata?.images?.[3] || "/placeholder4.jpg"} alt="Story 3" fill sizes="(max-width: 768px) 33vw, 16vw" quality={75} style={{ objectFit: 'cover', objectPosition: 'center' }} />
                </div>
              </div>
            </div>
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
              {philContent ? (
                <div className="richTextContent" dangerouslySetInnerHTML={{ __html: philContent }} />
              ) : (
                philFallback.map((p, i) => <p key={i}>{p}</p>)
              )}
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
