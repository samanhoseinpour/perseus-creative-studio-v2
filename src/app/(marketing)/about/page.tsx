import { Metadata } from 'next';

import {
  AboutHero,
  AboutParallaxContent,
  IGFeed,
  GoogleReviews,
  Timeline,
  AboutCta,
  AboutServices,
  AboutWhyUs,
  Team,
  DeferredPartners,
  ProjectShowcase,
} from '@/components';
import {
  ABOUT_PARTNERS_HEADING,
  ABOUT_REVIEWS_HEADING,
  ABOUT_TIMELINE,
  TEAM_MEMBERS,
} from '@/constants/about';
import { OG_IMAGE, SITE_URL } from '@/constants';
import { getLatestAcrossCategories, getPartnerLogos } from '@/lib/projectsStore';
import { blurFor } from '@/lib/imageBlur';
import { buildBreadcrumbList } from '@/utils/breadcrumbSchema';

export const metadata: Metadata = {
  title: 'Vancouver Marketing Agency - About Perseus Creative Studio',
  description:
    "Meet Perseus Creative Studio. We are the digital creators behind your brand's growth, experts in social media marketing, web design, and results-driven SEO",
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/about',
  },

  openGraph: {
    title: 'Vancouver Marketing Agency - About Perseus Creative Studio',
    description:
      "Meet Perseus Creative Studio. We are the digital creators behind your brand's growth, experts in social media marketing, web design, and results-driven SEO",
    url: 'https://www.perseustudio.com/about',
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio About Page Preview',
      },
    ],
  },
};

// Timeline entries with each image's blur-up placeholder attached server-side,
// so the client timeline neither bundles the records nor the blur map.
const timelineEntries = ABOUT_TIMELINE.map((entry) => ({
  ...entry,
  images: entry.images.map((image) => ({
    ...image,
    blur: blurFor(image.src),
  })),
}));

// AboutPage node referencing the site-wide Organization by @id, plus the
// breadcrumb trail (no visible trail here — the page opens on a visual hero).
const aboutJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'AboutPage',
      '@id': `${SITE_URL}/about#webpage`,
      url: `${SITE_URL}/about`,
      name: 'About Perseus Creative Studio',
      description:
        'The team, story, and disciplines behind Perseus Creative Studio — a Vancouver marketing agency.',
      inLanguage: 'en-CA',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#organization` },
      breadcrumb: { '@id': `${SITE_URL}/about#breadcrumb` },
    },
    buildBreadcrumbList(
      [{ label: 'Perseus', href: '/' }, { label: 'About' }],
      `${SITE_URL}/about`,
    ),
    // One Person node per team member — the only machine-readable surface the
    // non-author members have. Members with an author profile reuse that
    // page's `#person` @id, so the about listing and the profile merge into
    // one entity for crawlers. Only fields backed by visible page content
    // (name, role, photo) plus opt-in `bio`/`sameAs` from the data module.
    ...TEAM_MEMBERS.map((member) => ({
      '@type': 'Person',
      '@id': member.link
        ? `${SITE_URL}${member.link}#person`
        : `${SITE_URL}/about#${member.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: member.name,
      jobTitle: member.role,
      image: `${SITE_URL}${member.avatar}`,
      worksFor: { '@id': `${SITE_URL}/#organization` },
      ...(member.link ? { url: `${SITE_URL}${member.link}` } : {}),
      ...(member.bio ? { description: member.bio } : {}),
      ...(member.sameAs?.length ? { sameAs: member.sameAs } : {}),
    })),
  ],
};

const AboutPage = async () => {
  const latestEntries = await getLatestAcrossCategories(4);
  // The full logo wall (every marquee member, not just the home-featured
  // subset) — DB-driven, so /admin client edits land without a redeploy.
  const partnerLogos = await getPartnerLogos('all');
  return (
    <main>
      <script
        id="ld-json-about"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <AboutHero />
      <AboutParallaxContent />
      <Timeline entries={timelineEntries} />
      <Team />
      <AboutServices />
      <ProjectShowcase
        entries={latestEntries}
        title="The latest from the studio."
        titleAccent="Recent work across every discipline."
        description="A rolling look at what we’ve shipped lately — films, sites, campaigns, social, and brand systems, straight from the project archive."
        viewAllHref="/projects"
        showDiscipline
      />
      <AboutWhyUs />
      <IGFeed />
      {(partnerLogos.rail1.length > 0 || partnerLogos.rail2.length > 0) && (
        <DeferredPartners
          heading={ABOUT_PARTNERS_HEADING}
          logos={partnerLogos}
        />
      )}
      <GoogleReviews heading={ABOUT_REVIEWS_HEADING} />
      <AboutCta />
    </main>
  );
};

export default AboutPage;
