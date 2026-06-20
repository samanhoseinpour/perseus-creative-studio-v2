import { Metadata } from 'next';
import Link from 'next/link';
import { Container, StickyToc } from '@/components';
import { SITE_URL, FULL_INDEX_ROBOTS } from '@/constants';

const TITLE = 'Image & Content License — Perseus Creative Studio';
const DESCRIPTION =
  'Image and content licensing terms for Perseus Creative Studio — what is permitted, what is restricted, and how to acquire a written license for commercial use.';
const CANONICAL = `${SITE_URL}/license`;
const CONTACT_EMAIL = 'teamperseustudio@gmail.com';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: 'https://ik.imagekit.io/perseus/logo-black.png',
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: FULL_INDEX_ROBOTS,
};

const LICENSE_YEAR_START = 2024;
const DOC_VERSION = 'v1.0';
const JURISDICTION = 'British Columbia';
const EFFECTIVE_DATE_ISO = '2026-05-21';
const EFFECTIVE_DATE_LABEL = 'May 21, 2026';

const SECTIONS = [
  { id: 'ownership', label: 'Ownership' },
  { id: 'permitted-use', label: 'Permitted use' },
  { id: 'restricted-use', label: 'Restricted use' },
  { id: 'how-to-acquire', label: 'How to acquire a license' },
  { id: 'reservation', label: 'Reservation' },
];

export default function LicensePage() {
  const currentYear = new Date().getUTCFullYear();
  const copyrightRange =
    currentYear > LICENSE_YEAR_START
      ? `${LICENSE_YEAR_START}–${currentYear}`
      : `${LICENSE_YEAR_START}`;

  return (
    <main className="py-20 sm:py-28">
      <Container>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.18em] text-black/50">
          <span>Legal</span>
          <Dot />
          <span>{DOC_VERSION}</span>
          <Dot />
          <span>
            Effective{' '}
            <time dateTime={EFFECTIVE_DATE_ISO}>{EFFECTIVE_DATE_LABEL}</time>
          </span>
          <Dot />
          <span>{JURISDICTION}</span>
        </div>
        <div className="mt-6 h-px w-full bg-black/10" />

        <h1 className="mt-12 max-w-4xl text-4xl font-bold leading-[0.95] tracking-[-0.02em] text-black sm:text-5xl lg:text-6xl">
          Image &amp; Content
          <br />
          License.
        </h1>
        <p className="mt-8 max-w-2xl text-base leading-relaxed text-black/70">
          These terms apply to all photographs, videos, infographics,
          illustrations, and written articles published on perseustudio.com.
        </p>

        <div className="mt-20 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-16">
          <article className="max-w-2xl">
            <section id={SECTIONS[0].id}>
              <SectionHeader number={1} label={SECTIONS[0].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                All photographs, videos, infographics, illustrations, and
                written articles published on this site are ©{' '}
                {copyrightRange} Perseus Creative Studio unless otherwise
                credited inline. Images sourced from clients or partners remain
                the property of their respective owners and are used here with
                permission.
              </p>
            </section>

            <section id={SECTIONS[1].id} className="mt-16">
              <SectionHeader number={2} label={SECTIONS[1].label} />
              <ul className="mt-6 ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
                <li>Personal viewing and non-commercial reference.</li>
                <li>
                  Short quotation and commentary under fair-use principles,
                  with a visible credit to “Perseus Creative Studio” and a link
                  back to the original article URL.
                </li>
                <li>
                  Embedding a single article hero image in editorial coverage
                  that links back to the source article on perseustudio.com.
                </li>
              </ul>
            </section>

            <section id={SECTIONS[2].id} className="mt-16">
              <SectionHeader number={3} label={SECTIONS[2].label} />
              <ul className="mt-6 ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
                <li>
                  Republishing full articles, full photo sets, or substantial
                  excerpts without a written license.
                </li>
                <li>
                  Commercial use of any image or video — including marketing,
                  advertising, paid social media, product listings, and stock
                  resale.
                </li>
                <li>
                  Modification, derivative works, or removal of watermarks and
                  credit lines.
                </li>
                <li>
                  Inclusion of any asset in datasets used to train machine
                  learning or generative AI models.
                </li>
                <li>
                  Use in a manner that misrepresents the original context or
                  Perseus Creative Studio’s endorsement of a third party.
                </li>
              </ul>
            </section>

            <section id={SECTIONS[3].id} className="mt-16">
              <SectionHeader number={4} label={SECTIONS[3].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                For any use beyond the permitted scope above — including
                commercial use, full republishing, syndication, or AI training
                — please email{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-black underline underline-offset-4 hover:opacity-80"
                >
                  {CONTACT_EMAIL}
                </a>{' '}
                with:
              </p>
              <ul className="mt-4 ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
                <li>The exact URL or filename of the asset.</li>
                <li>The intended use (publication, campaign, platform).</li>
                <li>Distribution scope (geography, audience, channels).</li>
                <li>Timeframe (single use vs. ongoing).</li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-black/80">
                We typically respond with terms within five business days. For
                press inquiries or general questions, our{' '}
                <Link
                  href="/contact"
                  className="text-black underline underline-offset-4 hover:opacity-80"
                >
                  contact page
                </Link>{' '}
                is the fastest route.
              </p>
            </section>

            <section id={SECTIONS[4].id} className="mt-16">
              <SectionHeader number={5} label={SECTIONS[4].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                All rights not expressly granted above are reserved by Perseus
                Creative Studio. Unauthorized use may result in a takedown
                request, license invoicing at our standard commercial rates,
                or legal action where applicable.
              </p>
            </section>
          </article>

          <StickyToc sections={SECTIONS} />
        </div>
      </Container>
    </main>
  );
}

function Dot() {
  return <span className="text-black/20">·</span>;
}

function SectionHeader({
  number,
  label,
}: {
  number: number;
  label: string;
}) {
  return (
    <>
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-xs text-black/40">§{number}</span>
        <h2 className="text-2xl font-semibold tracking-tight text-black">
          {label}
        </h2>
      </div>
      <div className="mt-3 h-px w-full bg-black/10" />
    </>
  );
}
