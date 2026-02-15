import { Metadata } from 'next';
import {
  WebsiteHero,
  WebsiteFeatures,
  WebsiteStats,
  WebsiteIntegrations,
  WebsiteServices,
  WebsiteServicesBento,
  WebsiteCta,
} from '@/app/components';

export const metadata: Metadata = {
  title: 'Website Design & Development - Perseus Creative Studio',
  description:
    'Perseus Creative Studio offers custom website design, development, and dedicated support for your digital presence to grow your business.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/services/websites',
  },

  openGraph: {
    title: 'Website Design & Development - Perseus Creative Studio',
    description:
      'Perseus Creative Studio offers custom website design, development, and dedicated support for your digital presence to grow your business.',
    url: 'https://www.perseustudio.com/services/websites',
    siteName: 'Perseus Creative Studio',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://ik.imagekit.io/perseus/navbar-website.jpeg',
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio Projects Page Preview',
      },
    ],
  },
};

const WebsitesPage = () => {
  return (
    <main>
      <WebsiteHero />
      <WebsiteFeatures />
      <WebsiteServices />
      <WebsiteServicesBento />
      <WebsiteStats />
      <WebsiteIntegrations />
      <WebsiteCta />
    </main>
  );
};

export default WebsitesPage;
