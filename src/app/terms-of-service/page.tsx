import { Metadata } from 'next';
import Link from 'next/link';
import { Container, StickyToc } from '@/components';
import { SITE_URL, FULL_INDEX_ROBOTS, OG_IMAGE } from '@/constants';

const TITLE = 'Terms of Service — Perseus Creative Studio';
const DESCRIPTION =
  'Terms governing your use of perseustudio.com and informal engagement with Perseus Creative Studio — acceptable use, intellectual property, submissions, third-party links, disclaimers, liability, and governing law.';
const CANONICAL = `${SITE_URL}/terms-of-service`;
const CONTACT_EMAIL = 'info@perseustudio.com';

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
        url: OG_IMAGE,
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

const DOC_VERSION = 'v1.0';
const JURISDICTION = 'British Columbia';
const EFFECTIVE_DATE_ISO = '2026-05-21';
const EFFECTIVE_DATE_LABEL = 'May 21, 2026';

const SECTIONS = [
  { id: 'acceptance', label: 'Acceptance & scope' },
  { id: 'use', label: 'Use of the website' },
  { id: 'intellectual-property', label: 'Intellectual property' },
  { id: 'submissions', label: 'Submissions & inquiries' },
  { id: 'engagements', label: 'Services & engagements' },
  { id: 'third-party-links', label: 'Third-party links' },
  { id: 'disclaimers', label: 'Disclaimers & liability' },
  { id: 'termination', label: 'Termination' },
  { id: 'changes', label: 'Changes to these terms' },
  { id: 'governing-law', label: 'Governing law' },
  { id: 'contact', label: 'Contact' },
];

export default function TermsOfServicePage() {
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
          Terms of
          <br />
          Service.
        </h1>
        <p className="mt-8 max-w-2xl text-base leading-relaxed text-black/70">
          The framework governing your use of perseustudio.com and any
          informal engagement with Perseus Creative Studio.
        </p>

        <div className="mt-20 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-16">
          <article className="max-w-2xl">
            <section id={SECTIONS[0].id}>
              <SectionHeader number={1} label={SECTIONS[0].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                By accessing or using perseustudio.com you agree to these
                terms. They apply to the website itself and to any informal
                engagement with Perseus Creative Studio (“Perseus”, “we”,
                “our”). For paid services, a separate Statement of Work,
                proposal, or master services agreement governs the specifics
                of that engagement and takes precedence over these terms
                where they conflict.
              </p>
            </section>

            <section id={SECTIONS[1].id} className="mt-16">
              <SectionHeader number={2} label={SECTIONS[1].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                You may use the site for personal or business research, to
                learn about our work, and to contact us. You may not:
              </p>
              <ul className="mt-4 ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
                <li>
                  Use the site in any way that breaks the law or infringes
                  someone else’s rights.
                </li>
                <li>
                  Attempt to gain unauthorized access to any part of the
                  site or its hosting infrastructure.
                </li>
                <li>
                  Scrape or harvest content for use beyond what our{' '}
                  <Link
                    href="/license"
                    className="text-black underline underline-offset-4 hover:opacity-80"
                  >
                    License
                  </Link>{' '}
                  page permits.
                </li>
                <li>
                  Interfere with the site’s normal operation — denial-of-
                  service, automated stress tests, or aggressive crawling
                  without prior permission.
                </li>
                <li>
                  Misrepresent yourself, your affiliation, or the nature of
                  our relationship in any communication initiated through
                  the site.
                </li>
              </ul>
            </section>

            <section id={SECTIONS[2].id} className="mt-16">
              <SectionHeader number={3} label={SECTIONS[2].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                All content on the site — photographs, videos, illustrations,
                written articles, and code — is owned by Perseus Creative
                Studio or licensed for our use, unless otherwise credited
                inline. Copying, quoting, embedding, and commercial use are
                governed by the terms on our{' '}
                <Link
                  href="/license"
                  className="text-black underline underline-offset-4 hover:opacity-80"
                >
                  License
                </Link>{' '}
                page. Trademarks, logos, and brand assets shown on the site
                remain the property of their respective owners.
              </p>
            </section>

            <section id={SECTIONS[3].id} className="mt-16">
              <SectionHeader number={4} label={SECTIONS[3].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                When you submit our contact or careers forms, email us, or
                otherwise share project information, you confirm that:
              </p>
              <ul className="mt-4 ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
                <li>You’re authorized to share the information.</li>
                <li>
                  Sharing it doesn’t violate someone else’s confidentiality,
                  intellectual property, or privacy.
                </li>
                <li>
                  We may store and process it as described in our{' '}
                  <Link
                    href="/privacy-policy"
                    className="text-black underline underline-offset-4 hover:opacity-80"
                  >
                    Privacy Policy
                  </Link>{' '}
                  and use it to respond, prepare quotes, or perform requested
                  services.
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-black/80">
                We handle unsolicited creative ideas with reasonable care,
                but cannot guarantee that an idea isn’t already in
                development on our side. If you’d like a non-disclosure
                arrangement before sharing sensitive material, ask before
                sending.
              </p>
            </section>

            <section id={SECTIONS[4].id} className="mt-16">
              <SectionHeader number={5} label={SECTIONS[4].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                Specific services we provide — photography, video, web,
                marketing — are governed by a written engagement document,
                typically a Statement of Work, proposal, or master services
                agreement, covering deliverables, schedule, fees, intellectual
                property transfer, and revisions. Where that document
                conflicts with these terms, the engagement document
                controls.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-black/80">
                Until a written engagement is in place, conversations,
                proposals, and informal estimates are non-binding for both
                sides.
              </p>
            </section>

            <section id={SECTIONS[5].id} className="mt-16">
              <SectionHeader number={6} label={SECTIONS[5].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                The site may link to or embed content hosted by third
                parties — YouTube, Instagram, partner websites, and others.
                We don’t control those services, aren’t responsible for
                their content, and link to them only as context. Your use of
                a third-party service is governed by that service’s own
                terms.
              </p>
            </section>

            <section id={SECTIONS[6].id} className="mt-16">
              <SectionHeader number={7} label={SECTIONS[6].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                The website is provided “as is” and “as available.” We make
                no warranty that the site will be uninterrupted, error-free,
                secure against every threat, or that the information on it is
                complete or current at any moment in time.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-black/80">
                To the maximum extent permitted by law, Perseus Creative
                Studio’s total liability arising from your use of the site
                is limited to the amount you’ve paid us (if any) in the
                twelve months before the claim. We aren’t liable for
                indirect, incidental, or consequential damages — including
                lost profits, lost data, or lost business opportunity — even
                if we’ve been advised of the possibility.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-black/80">
                Nothing in these terms limits liability that can’t be
                limited under applicable consumer-protection law.
              </p>
            </section>

            <section id={SECTIONS[7].id} className="mt-16">
              <SectionHeader number={8} label={SECTIONS[7].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                We may suspend or terminate your access to the site at any
                time, without notice, if you breach these terms or use the
                site in a way that creates risk for us or for other
                visitors. The sections covering intellectual property,
                disclaimers, liability, and governing law survive any
                termination.
              </p>
            </section>

            <section id={SECTIONS[8].id} className="mt-16">
              <SectionHeader number={9} label={SECTIONS[8].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                We may update these terms from time to time. Material
                changes will be flagged on this page and the “Effective”
                date at the top will reflect the most recent version.
                Continuing to use the site after a change means you accept
                the updated terms.
              </p>
            </section>

            <section id={SECTIONS[9].id} className="mt-16">
              <SectionHeader number={10} label={SECTIONS[9].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                These terms are governed by the laws of the Province of
                British Columbia and the federal laws of Canada that apply
                in it. Any dispute arising under or in connection with them
                will be resolved by the courts located in Vancouver, British
                Columbia, and you submit to their exclusive jurisdiction.
              </p>
            </section>

            <section id={SECTIONS[10].id} className="mt-16">
              <SectionHeader number={11} label={SECTIONS[10].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                Questions about these terms can go to{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-black underline underline-offset-4 hover:opacity-80"
                >
                  {CONTACT_EMAIL}
                </a>
                . For everything else, our{' '}
                <Link
                  href="/contact"
                  className="text-black underline underline-offset-4 hover:opacity-80"
                >
                  contact page
                </Link>{' '}
                is the fastest route.
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
