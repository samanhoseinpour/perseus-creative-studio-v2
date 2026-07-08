import { Metadata } from 'next';
import ContactDetails from '@/components/Contact/ContactDetails';
import ContactHubLazy from '@/components/Contact/ContactHubLazy';
import ContactIntro from '@/components/Contact/ContactIntro';
import Container from '@/components/ui/Container';
import type { ServiceGroup } from '@/components/Contact/ServicePicker';
import { OG_IMAGE, SITE_URL } from '@/constants';
import { GENERAL_APPLICATION, JOBS } from '@/constants/careers';
import { CATEGORIES } from '@/constants/services';

export const metadata: Metadata = {
  title: 'Book Free Consultation - Perseus Creative Studio Vancouver',
  description:
    'Get in touch with Perseus Creative Studio team in Vancouver for free consultation, project inquiries and custom marketing strategies.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/contact',
  },

  openGraph: {
    title: 'Book Free Consultation - Perseus Creative Studio Vancouver',
    description:
      'Get in touch with Perseus Creative Studio team in Vancouver for free consultation, project inquiries and custom marketing strategies.',
    url: 'https://www.perseustudio.com/contact',
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio — book a free consultation in Vancouver',
      },
    ],
  },
};

// ContactPage node, referencing the site-wide Organization/WebSite by @id
// (declared once in layout.tsx) rather than re-inlining them.
const contactPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  '@id': `${SITE_URL}/contact#contactpage`,
  url: `${SITE_URL}/contact`,
  name: 'Contact Perseus Creative Studio',
  description:
    'Get in touch with Perseus Creative Studio in Vancouver — start a project or apply to join the team.',
  inLanguage: 'en-CA',
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: { '@id': `${SITE_URL}/#organization` },
};

type ContactPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// Reading searchParams makes this page request-time rendered — the same
// deliberate trade as /blogs: ?tab=careers&role=… deep links (from the
// careers listings) must preselect the right tab and role in initial HTML.
const ContactPage = async ({ searchParams }: ContactPageProps) => {
  const params = await searchParams;

  // Slim projections only — the client form must never import the services
  // registry or careers data itself (they'd ship in the client chunk).
  const serviceGroups: ServiceGroup[] = Object.values(CATEGORIES).map(
    (category) => ({
      category: category.slug,
      title: category.title,
      services: category.services.map((s) => ({ slug: s.slug, title: s.title })),
    }),
  );
  const roles = [
    ...JOBS.flatMap((group) => group.openings)
      .filter((opening) => opening.availability === 'active')
      .map((opening) => ({ slug: opening.slug, title: opening.title })),
    GENERAL_APPLICATION,
  ];

  const initialTab = params?.tab === 'careers' ? ('career' as const) : ('project' as const);
  const roleParam = typeof params?.role === 'string' ? params.role : undefined;
  const initialRole =
    roleParam && roles.some((r) => r.slug === roleParam) ? roleParam : undefined;

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageJsonLd) }}
      />
      <section className="isolate py-24 sm:py-32">
        <Container>
          <div className="grid gap-y-14 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-x-16">
            {/* Desktop (lg+): this wrapper is a real block, so intro + details
                are ONE sticky rail in the left column — identical to the old
                ContactAside. Mobile/tablet: the wrapper collapses to
                `display:contents`, hoisting intro and details up as siblings of
                the form so `order` can interleave them into heading → form →
                details. DOM stays heading-first for a11y/SEO. */}
            <div className="contents lg:block lg:sticky lg:top-28 lg:self-start">
              <ContactIntro className="order-1" />
              <ContactDetails className="order-3 lg:mt-8" />
            </div>
            <div
              id="contact-form"
              className="order-2 min-w-0 scroll-mt-28 lg:col-start-2"
            >
              <ContactHubLazy
                initialTab={initialTab}
                initialRole={initialRole}
                serviceGroups={serviceGroups}
                roles={roles}
              />
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
};

export default ContactPage;
