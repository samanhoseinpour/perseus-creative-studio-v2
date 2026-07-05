import { FaqList } from '@/components/FaqList';
import { faqItems } from '@/constants/faq';
import { SITE_URL, OG_IMAGE } from '@/constants';
import { PERSEUS_PUBLISHER_REF } from '@/constants/blogs';
import { Metadata } from 'next';

const CANONICAL = `${SITE_URL}/frequently-asked-questions`;

export const metadata: Metadata = {
  title: 'Frequently Asked Questions About Perseus Creative Studio',
  description:
    'Questions & Answers about Perseus Creative Studio Services, Process, Timelines, Pricing, and how we work worldwide from Vancouver.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/frequently-asked-questions',
  },

  openGraph: {
    title: 'Frequently Asked Questions - Perseus Creative Studio',
    description:
      'Questions & Answers about Perseus Creative Studio services, process, timelines, pricing, and how we work worldwide from Vancouver.',
    url: 'https://www.perseustudio.com/frequently-asked-questions',
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio Logo',
      },
    ],
  },
};

// FAQPage JSON-LD built from the full faqItems set — the canonical home for the
// studio's FAQ schema (embedded FAQ sections elsewhere emit their own
// context-specific FAQPage nodes).
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${CANONICAL}#faqs`,
  url: CANONICAL,
  inLanguage: 'en-CA',
  isPartOf: { '@id': `${SITE_URL}/#website` },
  publisher: PERSEUS_PUBLISHER_REF,
  mainEntity: faqItems.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
};

const FAQPage = () => {
  return (
    <>
      <script
        id="ld-json-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqList items={faqItems} />
    </>
  );
};

export default FAQPage;
