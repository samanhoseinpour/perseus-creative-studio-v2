import { Careers } from '@/components/Careers';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions About Perseus Creative Studio',
  description:
    'Questions & Answers about Perseus Creative Studio Services, Process, Timelines, Pricing, and how we work worldwide from Vancouver.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/frequently-asked-questions',
  },

  openGraph: {
    title: 'Frequently Asked Questions - Perseus Creative Studio',
    description:
      'Questions & Answers about Perseus Creative Studio services, process, timelines, pricing, and how we work worldwide from Vancouver.',
    url: 'https://www.perseustudio.com/frequently-asked-questions',
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
