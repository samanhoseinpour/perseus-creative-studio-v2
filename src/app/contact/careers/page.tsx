import { Careers } from '@/components/Careers';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Opening Positions at Perseus Creative Studio',
  description:
    'Explore open roles at Perseus Creative Studio. We’re hiring across social, performance marketing, design, SEO, video, and web. Apply via our contact page.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/contact/careers',
  },

  openGraph: {
    title: 'Careers | Perseus Creative Studio',
    description:
      'Explore open roles at Perseus Creative Studio. We’re hiring across social, performance marketing, design, SEO, video, and web. Apply via our contact page.',
    url: 'https://www.perseustudio.com/contact/careers',
    siteName: 'Perseus Creative Studio',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://ik.imagekit.io/perseus/logo-white.png',
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio Logo',
      },
    ],
  },
};

const CareerPage = () => {
  return <Careers />;
};

export default CareerPage;
