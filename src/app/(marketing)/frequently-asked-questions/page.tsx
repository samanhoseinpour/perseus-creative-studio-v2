import { FaqList } from '@/components/FaqList';
import {
  faqItems,
  HIRING_FAQ_QUESTION,
  REMOTE_FAQ_QUESTION,
} from '@/constants/faq';
import { composeHiringFaq, composeRemoteFaq } from '@/lib/careerFields';
import { allListedRemote, getOpenRoles } from '@/lib/careersStore';
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

const FAQPage = async () => {
  // The two Careers answers are composed from the live listings (the cached
  // careers snapshot, invalidated by every /admin/careers write) so the FAQ —
  // and the FAQPage schema built from it — can never name a role the careers
  // page has since filled. The stored answers in faq.ts are the fallbacks.
  const [open, remote] = await Promise.all([getOpenRoles(), allListedRemote()]);
  const items = faqItems.map((f) =>
    f.question === HIRING_FAQ_QUESTION
      ? {
          ...f,
          answer: composeHiringFaq(
            open.map((o) => o.title),
            open.every((o) => o.remote),
          ),
        }
      : f.question === REMOTE_FAQ_QUESTION
        ? { ...f, answer: composeRemoteFaq(remote) }
        : f,
  );

  // FAQPage JSON-LD built from the full item set — the canonical home for the
  // studio's FAQ schema (embedded FAQ sections elsewhere emit their own
  // context-specific FAQPage nodes). FAQPage is a WebPage subtype, so it
  // carries the breadcrumb reference itself.
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
        mainEntity: items.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
      buildBreadcrumbList(CRUMBS, CANONICAL),
    ],
  };

  return (
    <>
      <script
        id="ld-json-faq"
        type="application/ld+json"
        // The two hiring answers carry admin-typed role titles: escape `<`
        // so a stray "</script>" can't close the block (the projects
        // JSON-LD precedent).
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <FaqList items={items} breadcrumb={<Breadcrumb crumbs={CRUMBS} />} />
    </>
  );
};

export default FAQPage;
