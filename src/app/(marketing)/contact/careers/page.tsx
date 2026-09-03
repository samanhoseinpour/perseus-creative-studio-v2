import { Careers } from '@/components/Careers';
import { Metadata } from 'next';
import { OG_IMAGE, SITE_URL, PERSEUS_PUBLISHER_REF } from '@/constants';
import { buildBreadcrumbList } from '@/utils/breadcrumbSchema';
import type { Crumb } from '@/components/Breadcrumb';
import { dayKeyIn, STUDIO_TZ } from '@/lib/calendar';
import {
  composeHiringMeta,
  JOB_EMPLOYMENT_TYPE_LABELS,
  SCHEMA_EMPLOYMENT_TYPE,
} from '@/lib/careerFields';
import {
  getCareersSnapshot,
  getOpenRoles,
  type PublicOpening,
} from '@/lib/careersStore';

const CANONICAL = `${SITE_URL}/contact/careers`;
const TITLE = 'Open Positions at Perseus Creative Studio';

// The description names the roles that are open right now, composed from the
// same cached snapshot the listings render from — so the snippet can never
// advertise a role the page has since filled. No searchParams/headers reads:
// the route stays statically prerendered and regenerates on CAREERS_TAG.
export async function generateMetadata(): Promise<Metadata> {
  const open = await getOpenRoles();
  const description = composeHiringMeta(
    open.map((o) => o.title),
    open.every((o) => o.remote),
  );
  return {
    title: TITLE,
    description,
    keywords: [],

    alternates: {
      canonical: CANONICAL,
    },

    openGraph: {
      title: TITLE,
      description,
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
}

// Same trail the visible <Breadcrumb> inside <Careers> renders.
const CRUMBS: Crumb[] = [
  { label: 'Perseus', href: '/' },
  { label: 'Contact', href: '/contact' },
  { label: 'Careers' },
];

/**
 * One JobPosting per open, unexpired role. A Remote listing is TELECOMMUTE
 * with a Canada applicant requirement; any other location is a Place in BC,
 * Canada. `url` is this page (the only crawlable surface the postings appear
 * on — the `/contact?tab=careers&role=` prefill is deliberately crawl-silent
 * and canonicalises to /contact, so it must not enter machine-readable data).
 *
 * `baseSalary` is emitted from the opening's own pay figures, so the schema
 * and the visible chip can never quote different numbers. This is the one
 * place money appears on the public site: the no-prices rule governs what we
 * charge clients, not what a job pays, and BC's Pay Transparency Act requires
 * the latter on any publicly advertised posting. An open listing always has
 * one — src/lib/careersSchema.ts refuses to open a role without all three pay
 * fields — so the conditional below only guards the type, not a real gap.
 */
function buildJobPostings(openings: PublicOpening[], todayKey: string) {
  return openings
    .filter(
      (o) =>
        o.status === 'open' &&
        o.datePosted &&
        (!o.validThrough || o.validThrough >= todayKey),
    )
    .map((o) => ({
      '@type': 'JobPosting',
      '@id': `${CANONICAL}#${o.slug}`,
      title: o.title,
      description: `${o.summary} ${o.fit} ${o.level}, ${JOB_EMPLOYMENT_TYPE_LABELS[o.employmentType].toLowerCase()}, ${o.remote ? 'fully remote' : o.location}.`,
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
      employmentType: SCHEMA_EMPLOYMENT_TYPE[o.employmentType],
      hiringOrganization: PERSEUS_PUBLISHER_REF,
      ...(o.remote
        ? {
            jobLocationType: 'TELECOMMUTE',
            applicantLocationRequirements: {
              '@type': 'Country',
              name: 'Canada',
            },
          }
        : {
            jobLocation: {
              '@type': 'Place',
              address: {
                '@type': 'PostalAddress',
                addressLocality: o.location,
                addressRegion: 'BC',
                addressCountry: 'CA',
              },
            },
          }),
      directApply: true,
      url: CANONICAL,
    }));
}

const CareerPage = async () => {
  const snapshot = await getCareersSnapshot();
  // validThrough is a calendar KEY, and a posting is valid through the whole
  // of its last day in Vancouver — so "today" has to be the studio's day, not
  // toISOString()'s UTC one (which would drop the node at 17:00 Pacific the
  // evening before). This is a no-viewer surface (a crawler, not a signed-in
  // person), so the studio clock is the right one of the two.
  const todayKey = dayKeyIn(STUDIO_TZ, new Date());
  const openings = snapshot.categories.flatMap((c) => c.openings);
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
                name: TITLE,
                description: openings.every((o) => o.remote)
                  ? 'Remote openings at Perseus Creative Studio and how to apply through the contact page.'
                  : 'Openings at Perseus Creative Studio and how to apply through the contact page.',
                inLanguage: 'en-CA',
                isPartOf: { '@id': `${SITE_URL}/#website` },
                publisher: PERSEUS_PUBLISHER_REF,
                breadcrumb: { '@id': `${CANONICAL}#breadcrumb` },
              },
              buildBreadcrumbList(CRUMBS, CANONICAL),
              ...buildJobPostings(openings, todayKey),
            ],
            // Titles, summaries and fit lines are admin-typed DB text inside a
            // <script> block: escape `<` so a stray "</script>" can't close
            // it (the projects JSON-LD precedent).
          }).replace(/</g, '\\u003c'),
        }}
      />
      <Careers />
    </>
  );
};

export default CareerPage;
