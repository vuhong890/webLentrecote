'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLanguage, useTranslation } from '@/lib/i18n';
import styles from './Header.module.css';

// Map section IDs on home page to nav hrefs
const sectionToNav = {
  'home': '/',
  'menus': '/menus',
  'heritage': '/heritage',
  'reservation': '/reservation',
  'gallery': '/gallery',
  'contact': '/contact',
};

const navLinks = [
  { href: '/', tKey: 'home' },
  { href: '/menus', tKey: 'menus' },
  { href: '/heritage', tKey: 'heritage' },
  { href: '/reservation', tKey: 'reservation' },
  { href: '/gallery', tKey: 'gallery' },
  { href: '/contact', tKey: 'contact' },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('/');
  const { lang, setLang } = useLanguage();
  const t = useTranslation();

  // Hide header on admin pages
  const isAdmin = pathname?.startsWith('/admin');
  if (isAdmin) return null;

  const isHomePage = pathname === '/';

  // Basic scrolled state for header background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Robust Scroll Spy for Home Page
  useEffect(() => {
    if (!isHomePage) return;

    const handleScrollSpy = () => {
      const sectionIds = ['home', 'menus', 'heritage', 'reservation', 'gallery', 'contact'];
      let currentSection = 'home';

      // If at very top, force home
      if (window.scrollY < 100) {
        setActiveSection('/');
        return;
      }

      // Find the section that is currently in view
      // We check in reverse so the lowest section on the page that crossed the threshold wins
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // If the top of the section is above the middle of the screen
          if (rect.top <= window.innerHeight * 0.5) {
            currentSection = id;
            break;
          }
        }
      }

      // Check if user has scrolled to the absolute bottom of the page
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50) {
        currentSection = 'contact';
      }

      if (sectionToNav[currentSection]) {
        setActiveSection(sectionToNav[currentSection]);
      }
    };

    // Run once after a short delay to ensure DOM is ready when returning from another page
    const timeoutId = setTimeout(handleScrollSpy, 100);
    
    window.addEventListener('scroll', handleScrollSpy, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScrollSpy);
    };
  }, [isHomePage, pathname]);

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
      // On home page, use our scroll spy state
      return activeSection === linkHref ? styles.active : '';
    }
    // Simple exact match logic for other pages
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
              {t(link.tKey).toUpperCase()}
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
            onClick={() => setMobileOpen(false)}
          >
            {t(link.tKey).toUpperCase()}
          </Link>
        ))}
      </div>
    </header>
  );
}
