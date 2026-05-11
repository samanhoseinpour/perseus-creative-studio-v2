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
  Partners,
} from '@/components';

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
    <main>
      <AboutHero />
      <AboutParallaxContent />
      <Timeline />
      <Team />
      <AboutProcess />
      <IGFeed />
      <Partners
        heading={{
          seperatorTitle: '09 - Client Network',
          eyebrowRight: 'Studio Proof',
          title: 'Clients and collaborators',
          titleAccent: 'A broader look at the brands connected to our work.',
          description:
            'A wider view of clients, collaborators, and project partners across creative, marketing, web, production, and digital work.',
        }}
      />
      <GoogleReviews
        heading={{
          seperatorTitle: '10 - Client Reviews',
          eyebrowRight: 'Google Proof',
          title: 'What clients say',
          titleAccent: 'Verified feedback from real partnerships.',
          description:
            'A closer look at client feedback from real projects across creative, marketing, web, media, and digital work.',
        }}
      />
      <AboutCta />
    </main>
  );
};

export default AboutPage;
