import { Careers } from '@/components/Careers';
import { Metadata } from 'next';
import { OG_IMAGE, SITE_URL } from '@/constants';
import { PERSEUS_PUBLISHER_REF } from '@/constants/blogs';
import { JOBS, JOB_DETAILS } from '@/constants/careers';
import { buildBreadcrumbList } from '@/utils/breadcrumbSchema';
import type { Crumb } from '@/components/Breadcrumb';

const CANONICAL = `${SITE_URL}/contact/careers`;

export const metadata: Metadata = {
  title: 'Open Positions at Perseus Creative Studio',
  description:
    'Perseus Creative Studio is hiring an SEO Specialist, WordPress Developer, Video Editor, and Videographer — all remote. See every listing and apply through our contact page.',
  keywords: [],

  alternates: {
    canonical: CANONICAL,
  },

  openGraph: {
    title: 'Open Positions at Perseus Creative Studio',
    description:
      'Perseus Creative Studio is hiring an SEO Specialist, WordPress Developer, Video Editor, and Videographer — all remote. See every listing and apply through our contact page.',
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

// Same trail the visible <Breadcrumb> inside <Careers> renders.
const CRUMBS: Crumb[] = [
  { label: 'Perseus', href: '/' },
  { label: 'Contact', href: '/contact' },
  { label: 'Careers' },
];

/** Schema.org employmentType values for the repo's engagement labels. */
const EMPLOYMENT_TYPE: Record<string, string> = {
  'Full-time': 'FULL_TIME',
  'Part-time': 'PART_TIME',
  Subcontract: 'CONTRACTOR',
};

/**
 * One JobPosting per open, unexpired role. All active roles are remote, so
 * jobLocationType is TELECOMMUTE with a Canada applicant requirement. `url` is
 * this page (the only crawlable surface the postings appear on — the
 * `/contact?tab=careers&role=` prefill is deliberately crawl-silent and
 * canonicalises to /contact, so it must not enter machine-readable data).
 *
 * `baseSalary` is emitted from the opening's own `pay` figures, so the schema
 * and the visible chip can never quote different numbers. This is the one
 * place money appears on the public site: the no-prices rule governs what we
 * charge clients, not what a job pays, and BC's Pay Transparency Act requires
 * the latter on any publicly advertised posting. A role with no `pay` still
 * emits a valid posting, just without the recommended field — the dev-time
 * check in src/constants/careers.ts is what catches that.
 */
function buildJobPostings(todayIso: string) {
  return JOBS.flatMap((group) => group.openings)
    .filter(
      (o) =>
        o.availability === 'active' &&
        o.datePosted &&
        (!o.validThrough || o.validThrough >= todayIso),
    )
    .map((o) => ({
      '@type': 'JobPosting',
      '@id': `${CANONICAL}#${o.slug}`,
      title: o.title,
      description: `${JOB_DETAILS[o.title]?.summary ?? ''} ${o.fit} ${o.level}, ${o.type.toLowerCase()}, fully remote.`.trim(),
      datePosted: o.datePosted,
      ...(o.validThrough ? { validThrough: o.validThrough } : {}),
      ...(o.pay
        ? {
            baseSalary: {
              '@type': 'MonetaryAmount',
              currency: 'CAD',
              value: {
                '@type': 'QuantitativeValue',
                minValue: o.pay.min,
                maxValue: o.pay.max,
                unitText: o.pay.unit,
              },
            },
          }
        : {}),
      employmentType: EMPLOYMENT_TYPE[o.type] ?? 'OTHER',
      hiringOrganization: PERSEUS_PUBLISHER_REF,
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: { '@type': 'Country', name: 'Canada' },
      directApply: true,
      url: CANONICAL,
    }));
}

const CareerPage = () => {
  const todayIso = new Date().toISOString().slice(0, 10);
  return (
    <>
      <script
        id="ld-json-careers"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                '@id': `${CANONICAL}#webpage`,
                url: CANONICAL,
                name: 'Open Positions at Perseus Creative Studio',
                description:
                  'Remote openings at Perseus Creative Studio and how to apply through the contact page.',
                inLanguage: 'en-CA',
                isPartOf: { '@id': `${SITE_URL}/#website` },
                publisher: PERSEUS_PUBLISHER_REF,
                breadcrumb: { '@id': `${CANONICAL}#breadcrumb` },
              },
              buildBreadcrumbList(CRUMBS, CANONICAL),
              ...buildJobPostings(todayIso),
            ],
          }),
        }}
      />
      <Careers />
    </>
  );
};

export default CareerPage;
