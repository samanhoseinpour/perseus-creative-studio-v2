import { FaqList } from '@/components/FaqList';
import { faqItems } from '@/constants/faq';
import { SITE_URL, OG_IMAGE } from '@/constants';
import { PERSEUS_PUBLISHER_REF } from '@/constants/blogs';
import { buildBreadcrumbList } from '@/utils/breadcrumbSchema';
import Breadcrumb, { type Crumb } from '@/components/Breadcrumb';
import { Metadata } from 'next';

const CANONICAL = `${SITE_URL}/frequently-asked-questions`;

export const metadata: Metadata = {
  title: 'Frequently Asked Questions About Perseus Creative Studio',
  description:
    'Answers on Perseus Creative Studio: services, process, timelines, pricing, contracts, support, careers, privacy, and how we work worldwide from Vancouver.',
  keywords: [],

  alternates: {
    canonical: CANONICAL,
  },

  openGraph: {
    title: 'Frequently Asked Questions - Perseus Creative Studio',
    description:
      'Answers on Perseus Creative Studio: services, process, timelines, pricing, contracts, support, careers, privacy, and how we work worldwide from Vancouver.',
    url: CANONICAL,
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

// Same trail the visible <Breadcrumb> below renders.
const CRUMBS: Crumb[] = [{ label: 'Perseus', href: '/' }, { label: 'FAQ' }];

// FAQPage JSON-LD built from the full faqItems set — the canonical home for the
// studio's FAQ schema (embedded FAQ sections elsewhere emit their own
// context-specific FAQPage nodes). FAQPage is a WebPage subtype, so it carries
// the breadcrumb reference itself.
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'FAQPage',
      '@id': `${CANONICAL}#faqs`,
      url: CANONICAL,
      inLanguage: 'en-CA',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      publisher: PERSEUS_PUBLISHER_REF,
      breadcrumb: { '@id': `${CANONICAL}#breadcrumb` },
      mainEntity: faqItems.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    },
    buildBreadcrumbList(CRUMBS, CANONICAL),
  ],
};

const FAQPage = () => {
  return (
    <>
      <script
        id="ld-json-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqList items={faqItems} breadcrumb={<Breadcrumb crumbs={CRUMBS} />} />
    </>
  );
};

export default FAQPage;
