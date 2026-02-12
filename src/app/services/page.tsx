import { Metadata } from 'next';

import {
  ServicesScrollVideoHero,
  ServicesHero,
  ServicesSvgMask,
  ServicesList,
  WhyChooseUs,
  ServicesFeatures,
  Container,
  GlobalImpact,
} from '../components';
import ScrollRevealParagraph from '@/components/smoothui/scroll-reveal-paragraph';

import { whyPerseusServices } from '../constants/index';

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
  const servicesDesc = `We work with brands to build clear, modern visuals and marketing that actually represent who they are. Our services cover content creation, websites, and digital strategy, all designed to help brands stand out and connect with their audience.`;

  return (
    <main>
      <ServicesHero />
      <section className="bg-white">
        <Container>
          <ScrollRevealParagraph
            paragraph={servicesDesc}
            className="bg-white text-md! leading-md! md:text-4xl! md:leading-4xl! pt-16"
          />
        </Container>
      </section>
      <ServicesList style="bg-white pt-16 sm:pt-32" />
      <ServicesScrollVideoHero />
      <WhyChooseUs
        questions={whyPerseusServices}
        imgSrc="/about-perseus-6.jpg"
        imgAlt="why choose us"
        imgHeight={2432}
        imgWidth={1442}
      />
      <GlobalImpact />
      <ServicesSvgMask />
      <ServicesFeatures />
    </main>
  );
};

export default ServicesPage;
