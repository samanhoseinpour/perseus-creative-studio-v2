import { Metadata } from 'next';

import {
  AboutHero,
  AboutParallaxContent,
  IGFeed,
  GoogleReviews,
  Timeline,
  AboutCta,
  AboutProcess,
  Team,
} from '../components';

export const metadata: Metadata = {
  title: 'Vancouver Digital Marketing Agency - About Perseus Creative Studio',
  description:
    "Meet Perseus Creative Studio. We are the digital creators behind your brand's growth, experts in social media marketing, web design, and results-driven SEO",
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/about',
  },

  openGraph: {
    title: 'Vancouver Digital Marketing Agency - About Perseus Creative Studio',
    description:
      "Meet Perseus Creative Studio. We are the digital creators behind your brand's growth, experts in social media marketing, web design, and results-driven SEO",
    url: 'https://www.perseustudio.com/about',
    siteName: 'Perseus Creative Studio',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://ik.imagekit.io/perseus/navbar-about-2.jpeg',
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio About Page Preview',
      },
    ],
  },
};

const AboutPage = () => {
  return (
    <main className="">
      <AboutHero />
      <AboutParallaxContent />
      <Timeline />
      <Team />
      <AboutProcess />
      <IGFeed />
      <GoogleReviews />
      <AboutCta />
    </main>
  );
};

export default AboutPage;
