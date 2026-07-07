import { Metadata } from 'next';
import { ContactInfo } from '@/components';
import ContactHubLazy from '@/components/Contact/ContactHubLazy';
import type { ServiceGroup } from '@/components/Contact/ServicePicker';
import { OG_IMAGE } from '@/constants';
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
      <ContactHubLazy
        initialTab={initialTab}
        initialRole={initialRole}
        serviceGroups={serviceGroups}
        roles={roles}
      />
      <ContactInfo />
    </main>
  );
};

export default ContactPage;
