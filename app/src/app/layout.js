import './globals.css';
import localFont from 'next/font/local';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';

const aptos = localFont({
  src: '../../public/fonts/Aptos.ttf',
  variable: '--font-aptos',
  display: 'swap',
});

const baskerville = localFont({
  src: [
    { path: '../../public/fonts/Baskerville.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Baskerville_Italic.ttf', weight: '400', style: 'italic' },
    { path: '../../public/fonts/Baskerville_SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../../public/fonts/Baskerville_SemiBold_Italic.ttf', weight: '600', style: 'italic' },
    { path: '../../public/fonts/Baskerville_Bold.ttf', weight: '700', style: 'normal' },
    { path: '../../public/fonts/Baskerville_Bold_Italic.ttf', weight: '700', style: 'italic' },
  ],
  variable: '--font-baskerville',
  display: 'swap',
});

export const metadata = {
  title: "L'Entrecôte | Social Meating",
  description: "L'Entrecôte Social Meating - Premium steak frites experience in Ho Chi Minh City. Open daily for lunch and dinner.",
  keywords: "L'Entrecôte, steak, frites, restaurant, Ho Chi Minh City, Saigon, French bistro",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${aptos.variable} ${baskerville.variable}`}>
      <body>
        <Providers>
          <Header />
          <main style={{ paddingTop: 'var(--nav-height)' }}>
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
