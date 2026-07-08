import { Metadata } from 'next';

import {
  AboutHero,
  AboutParallaxContent,
  IGFeed,
  GoogleReviews,
  Timeline,
  AboutCta,
  AboutServices,
  AboutWhyUs,
  Team,
  DeferredPartners,
  ProjectShowcase,
} from '@/components';
import {
  ABOUT_PARTNERS_HEADING,
  ABOUT_REVIEWS_HEADING,
  ABOUT_TIMELINE,
} from '@/constants/about';
import { OG_IMAGE } from '@/constants';
import { getLatestAcrossCategories } from '@/constants/projects';
import { blurFor } from '@/lib/imageBlur';

export const metadata: Metadata = {
  title: 'Vancouver Marketing Agency - About Perseus Creative Studio',
  description:
    "Meet Perseus Creative Studio. We are the digital creators behind your brand's growth, experts in social media marketing, web design, and results-driven SEO",
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/about',
  },

  openGraph: {
    title: 'Vancouver Marketing Agency - About Perseus Creative Studio',
    description:
      "Meet Perseus Creative Studio. We are the digital creators behind your brand's growth, experts in social media marketing, web design, and results-driven SEO",
    url: 'https://www.perseustudio.com/about',
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio About Page Preview',
      },
    ],
  },
};

// Timeline entries with each image's blur-up placeholder attached server-side,
// so the client timeline neither bundles the records nor the blur map.
const timelineEntries = ABOUT_TIMELINE.map((entry) => ({
  ...entry,
  images: entry.images.map((image) => ({
    ...image,
    blur: blurFor(image.src),
  })),
}));

const AboutPage = () => {
  return (
    <main>
      <AboutHero />
      <AboutParallaxContent />
      <Timeline entries={timelineEntries} />
      <Team />
      <AboutServices />
      <ProjectShowcase
        entries={getLatestAcrossCategories(4)}
        title="The latest from the studio."
        titleAccent="Recent work across every discipline."
        description="A rolling look at what we’ve shipped lately — films, sites, campaigns, social, and brand systems, straight from the project archive."
        viewAllHref="/projects"
        showDiscipline
      />
      <AboutWhyUs />
      <IGFeed />
      <DeferredPartners heading={ABOUT_PARTNERS_HEADING} />
      <GoogleReviews heading={ABOUT_REVIEWS_HEADING} />
      <AboutCta />
    </main>
  );
};

export default AboutPage;
