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
  Partners,
  ProjectShowcase,
} from '@/components';
import { ABOUT_PARTNERS_HEADING, ABOUT_REVIEWS_HEADING } from '@/constants/about';
import { OG_IMAGE } from '@/constants';
import { getLatestAcrossCategories } from '@/constants/projects';

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

const AboutPage = () => {
  return (
    <main>
      <AboutHero />
      <AboutParallaxContent />
      <Timeline />
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
      <Partners heading={ABOUT_PARTNERS_HEADING} />
      <GoogleReviews heading={ABOUT_REVIEWS_HEADING} />
      <AboutCta />
    </main>
  );
};

export default AboutPage;
