import { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components';
import { SITE_URL } from '@/constants';

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
  robots: { index: true, follow: true },
};

const LICENSE_YEAR_START = 2024;

export default function LicensePage() {
  const currentYear = new Date().getUTCFullYear();
  const copyrightRange =
    currentYear > LICENSE_YEAR_START
      ? `${LICENSE_YEAR_START}–${currentYear}`
      : `${LICENSE_YEAR_START}`;

  return (
    <main className="py-20 sm:py-28">
      <Container>
        <article className="mx-auto max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-black/50">
            Legal
          </p>
          <h1 className="mt-3 text-3xl leading-tight font-bold text-black sm:text-4xl">
            Image &amp; Content License
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-black/70">
            Last updated{' '}
            <time dateTime={`${currentYear}-05-21`}>May 21, {currentYear}</time>
            . These terms apply to all photographs, videos, infographics,
            illustrations, written articles, and other creative works published
            on perseustudio.com.
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-black">Ownership</h2>
            <p className="text-sm leading-relaxed text-black/80">
              All photographs, videos, infographics, illustrations, and written
              articles published on this site are © {copyrightRange} Perseus
              Creative Studio unless otherwise credited inline. Images sourced
              from clients or partners remain the property of their respective
              owners and are used here with permission.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-black">Permitted use</h2>
            <ul className="ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
              <li>Personal viewing and non-commercial reference.</li>
              <li>
                Short quotation and commentary under fair-use principles, with a
                visible credit to “Perseus Creative Studio” and a link back to
                the original article URL.
              </li>
              <li>
                Embedding a single article hero image in editorial coverage that
                links back to the source article on perseustudio.com.
              </li>
            </ul>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-black">Restricted use</h2>
            <ul className="ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
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

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-black">
              How to acquire a license
            </h2>
            <p className="text-sm leading-relaxed text-black/80">
              For any use beyond the permitted scope above — including
              commercial use, full republishing, syndication, or AI training —
              please email{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-black underline underline-offset-4 hover:opacity-80"
              >
                {CONTACT_EMAIL}
              </a>{' '}
              with:
            </p>
            <ul className="ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
              <li>The exact URL or filename of the asset.</li>
              <li>The intended use (publication, campaign, platform).</li>
              <li>Distribution scope (geography, audience, channels).</li>
              <li>Timeframe (single use vs. ongoing).</li>
            </ul>
            <p className="text-sm leading-relaxed text-black/80">
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

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-black">Reservation</h2>
            <p className="text-sm leading-relaxed text-black/80">
              All rights not expressly granted above are reserved by Perseus
              Creative Studio. Unauthorized use may result in a takedown
              request, license invoicing at our standard commercial rates, or
              legal action where applicable.
            </p>
          </section>
        </article>
      </Container>
    </main>
  );
}
