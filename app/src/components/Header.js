'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup to ensure we don't accidentally leave scroll locked
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileOpen]);

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
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''} ${mobileOpen ? styles.mobileMenuActive : ''}`}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <Image
            src="/logo_text.png"
            alt="L'Entrecôte Social Meating"
            width={200}
            height={50}
            className={styles.logoText}
            priority
          />
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
