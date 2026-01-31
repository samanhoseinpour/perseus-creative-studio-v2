import { Metadata } from 'next';
import {
  WebsiteHero,
  WebsiteFeatures,
  WebsiteStats,
  WebsiteIntegrations,
  WebsiteClients,
  WebsiteServices,
  WebsiteServicesBento,
  WebsiteTestimonials,
  WebsiteCta,
  ThreeDMarquee,
  WebsiteBackground,
} from '@/app/components';

import { clientWebsiteImages } from '@/app/constants/website';

export const metadata: Metadata = {
  title: 'Website Design & Development - Perseus Creative Studio',
  description:
    'Perseus Creative Studio offers custom website design, development, and dedicated support for your digital presence to grow your business.',
  keywords: ['Vancouver Digital Marketing Agency'],

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
        url: 'https://ik.imagekit.io/perseus/logo-black.png',
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio Projects Page Preview',
      },
    ],
  },
};

const WebsitesPage = () => {
  return (
    <main className="relative min-h-svh">
      <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
        <WebsiteBackground mouseRepulsion={false} mouseInteraction={false} />
      </div>
      <div className="relative z-10">
        <WebsiteHero />
        <WebsiteFeatures />
        <WebsiteServices />
        <WebsiteServicesBento />
        <ThreeDMarquee images={clientWebsiteImages} />
        <WebsiteStats />
        <WebsiteIntegrations />
        <WebsiteTestimonials />
        <WebsiteClients />
        <WebsiteCta />
      </div>
    </main>
  );
};

export default WebsitesPage;
