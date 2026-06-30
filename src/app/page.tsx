import type { Metadata } from 'next';

import {
  Hero,
  FeatureProjects,
  Faqs,
  HomeTestimonials,
  FromTheBlog,
  HomeWelcome,
  Stats,
  ServicesList,
  Partners,
  GoogleReviews,
} from '@/components';
import { SITE_URL, PERSEUS_LOGO } from '@/constants';

// The site-wide OG image (layout.tsx) is the production photo used as the
// shared social-card fallback for pages without their own. The home page
// overrides it so the Perseus wordmark is what surfaces when the root URL is
// shared. Setting `openGraph` here replaces the layout block, so the title/
// description/url are restated rather than inherited.
export const metadata: Metadata = {
  openGraph: {
    title: 'Build a Brand People Love - Perseus Creative Studio',
    description:
      'Perseus Creative Studio is a trusted marketing agency in Vancouver — experts in branding, video and photography, websites, social media, and digital marketing.',
    url: SITE_URL,
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}${PERSEUS_LOGO}`,
        width: 702,
        height: 240,
        alt: 'Perseus Creative Studio logo',
      },
    ],
  },
};

export default function Home() {
  return (
    <main className="flex flex-col">
      <Hero />
      <HomeWelcome />
      <Stats />
      <ServicesList />
      <FeatureProjects />
      <HomeTestimonials />
      <Partners variant="home" />
      <GoogleReviews />
      <Faqs />
      <FromTheBlog />
    </main>
  );
}
