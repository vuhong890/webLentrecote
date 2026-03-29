import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';

export const metadata = {
  title: "L'Entrecôte | Social Meating",
  description: "L'Entrecôte Social Meating - Premium steak frites experience in Ho Chi Minh City. Open daily for lunch and dinner.",
  keywords: "L'Entrecôte, steak, frites, restaurant, Ho Chi Minh City, Saigon, French bistro",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
