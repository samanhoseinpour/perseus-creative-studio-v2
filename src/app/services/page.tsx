import { Metadata } from 'next';

import { ServicesProduction } from '@/components/ui/services/ServicesProduction';
import { ServicesSocial } from '@/components/ui/services/ServicesSocial';
import { ServicesEditting } from '@/components/ui/services/ServicesEditting';
import { ServicesAds } from '@/components/ui/services/ServicesAds';
import { ServicesWebsites } from '@/components/ui/services/ServicesWebsites';
import { ServicesBranding } from '@/components/ui/services/ServicesBranding';
import { ServicesHero } from '@/components/ui/services/ServicesHero';

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
    locale: 'en_US',
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
      <ServicesWebsites />
      <ServicesAds />
      <ServicesProduction />
      <ServicesEditting />
      <ServicesBranding />
      <ServicesSocial />
    </main>
  );
};

export default ServicesPage;
