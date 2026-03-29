'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import styles from './Header.module.css';

// Map section IDs on home page to nav hrefs
const sectionToNav = {
  'home': '/',
  'heritage': '/heritage',
  'menus': '/menus',
  'reservation': '/reservation',
  'gallery': '/gallery',
  'contact': '/contact',
};

const navLinks = [
  { href: '/', label: 'HOME' },
  { href: '/heritage', label: 'HERITAGE' },
  { href: '/menus', label: 'MENUS' },
  { href: '/reservation', label: 'RESERVATION' },
  { href: '/gallery', label: 'GALLERY' },
  { href: '/contact', label: 'CONTACT' },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('/');
  const { lang, setLang } = useLanguage();

  // Hide header on admin pages
  const isAdmin = pathname?.startsWith('/admin');
  if (isAdmin) return null;

  const isHomePage = pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll spy — only on home page
  useEffect(() => {
    if (!isHomePage) return;

    const sectionIds = Object.keys(sectionToNav);
    const observers = [];

    // Track which sections are visible and how much
    const visibleSections = new Map();

    const handleIntersect = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          visibleSections.set(entry.target.id, entry.intersectionRatio);
        } else {
          visibleSections.delete(entry.target.id);
        }
      });

      // Find the section with highest visibility
      let maxRatio = 0;
      let topSection = 'home';

      visibleSections.forEach((ratio, id) => {
        if (ratio > maxRatio) {
          maxRatio = ratio;
          topSection = id;
        }
      });

      // If at very top of page, always show HOME
      if (window.scrollY < 100) {
        topSection = 'home';
      }

      const navHref = sectionToNav[topSection];
      if (navHref) {
        setActiveSection(navHref);
      }
    };

    // Create observer with multiple thresholds for precision
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '-80px 0px -40% 0px', // account for header height, focus on upper portion
      threshold: [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1],
    });

    // Observe all sections
    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        observers.push(el);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [isHomePage]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Determine which nav link is active
  const getActiveClass = (linkHref) => {
    if (isHomePage) {
      // On home page, use scroll spy
      return activeSection === linkHref ? styles.active : '';
    }
    // On other pages, use pathname
    return pathname === linkHref ? styles.active : '';
  };

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.cowSvg}>
              <path d="M15 25 Q10 5 5 2 Q12 8 20 15 Q25 5 35 3 Q30 12 28 20 Q35 18 42 22 Q45 28 47 35 Q48 40 50 42 Q52 40 53 35 Q55 28 58 22 Q65 18 72 20 Q70 12 65 3 Q75 5 80 15 Q88 8 95 2 Q90 5 85 25 Q88 32 85 40 Q82 48 75 52 Q70 55 65 55 Q60 55 57 52 Q55 50 53 48 Q51 47 50 47 Q49 47 47 48 Q45 50 43 52 Q40 55 35 55 Q30 55 25 52 Q18 48 15 40 Q12 32 15 25Z" stroke="currentColor" strokeWidth="2.5" fill="none"/>
              <circle cx="38" cy="32" r="2" fill="currentColor"/>
              <circle cx="62" cy="32" r="2" fill="currentColor"/>
              <path d="M44 42 Q47 45 50 46 Q53 45 56 42" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <path d="M46 48 Q48 50 50 50 Q52 50 54 48" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <span className={styles.logoText}>L&apos;Entrecôte</span>
        </Link>

        {/* Desktop Nav */}
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${getActiveClass(link.href)}`}
            >
              {link.label}
              <span className={styles.navUnderline}></span>
            </Link>
          ))}
        </nav>

        {/* Language Switcher */}
        <button
          className={styles.langToggle}
          onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
          aria-label="Switch language"
        >
          {lang === 'en' ? 'VI' : 'EN'}
        </button>

        {/* Mobile Toggle */}
        <button
          className={`${styles.hamburger} ${mobileOpen ? styles.open : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${mobileOpen ? styles.mobileOpen : ''}`}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.mobileLink} ${getActiveClass(link.href)}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
