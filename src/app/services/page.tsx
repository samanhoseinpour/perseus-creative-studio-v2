import { Metadata } from 'next';

import {
  ServicesProduction,
  ServicesSocial,
  ServicesEditting,
  ServicesAds,
  ServicesWebsites,
  ServicesBranding,
  ServicesHero,
  ServicesCategories,
  ServicesCta,
} from '@/components';

export const metadata: Metadata = {
  title: 'Vancouver Digital Marketing Services - Perseus Creative Studio',
  description:
    'Perseus Creative Studio in Vancouver offers web design and social media marketing services. We create digital strategies designed to scale your business.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/services',
  },

  openGraph: {
    title: 'Vancouver Digital Marketing Services - Perseus Creative Studio',
    description:
      'Perseus Creative Studio in Vancouver offers web design and social media marketing services. We create digital strategies designed to scale your business.',
    url: 'https://www.perseustudio.com/services',
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: 'https://ik.imagekit.io/perseus/navbar-contact.jpeg',
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio Services Page Preview',
      },
    ],
  },
};

const ServicesPage = () => {
  return (
    <main>
      <ServicesHero />
      <ServicesCategories />
      <ServicesWebsites />
      <ServicesAds />
      <ServicesProduction />
      <ServicesEditting />
      <ServicesBranding />
      <ServicesSocial />
      <ServicesCta />
    </main>
  );
};

export default ServicesPage;
