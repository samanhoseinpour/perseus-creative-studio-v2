import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import { ReactLenis } from './utils/lenis';

import { Navbar, Footer } from './components';

const interFont = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: '500',
});

export const metadata: Metadata = {
  title: 'Perseus Creative Studio',
  description: 'Generated by create next app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="Perseus" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/lenis@1.3.4/dist/lenis.css"
        />
      </head>
      <ReactLenis root>
        <body className={`${interFont.className} antialiased`}>
          <Navbar />
          {children}
          <Footer />
        </body>
      </ReactLenis>
    </html>
  );
}
