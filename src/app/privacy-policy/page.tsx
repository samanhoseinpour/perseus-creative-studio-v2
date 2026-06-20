import { Metadata } from 'next';
import Link from 'next/link';
import { Container, StickyToc } from '@/components';
import { SITE_URL, FULL_INDEX_ROBOTS } from '@/constants';

const TITLE = 'Privacy Policy — Perseus Creative Studio';
const DESCRIPTION =
  'How Perseus Creative Studio collects, uses, and protects personal information on perseustudio.com — covering analytics, cookies, third-party processors, and your rights under PIPEDA, Quebec Law 25, and GDPR.';
const CANONICAL = `${SITE_URL}/privacy-policy`;
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

const DOC_VERSION = 'v1.0';
const JURISDICTION = 'British Columbia';
const EFFECTIVE_DATE_ISO = '2026-05-21';
const EFFECTIVE_DATE_LABEL = 'May 21, 2026';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'information-we-collect', label: 'Information we collect' },
  { id: 'how-we-use-it', label: 'How we use it' },
  { id: 'cookies-and-tracking', label: 'Cookies & tracking' },
  { id: 'third-party-processors', label: 'Third-party processors' },
  { id: 'international-transfers', label: 'International transfers' },
  { id: 'data-retention', label: 'Data retention' },
  { id: 'your-rights', label: 'Your rights' },
  { id: 'children', label: 'Children’s privacy' },
  { id: 'changes', label: 'Changes to this policy' },
  { id: 'contact', label: 'Contact' },
];

const PROCESSORS: {
  name: string;
  purpose: string;
  data: string;
  href: string;
}[] = [
  {
    name: 'Google Analytics & Tag Manager',
    purpose: 'Site usage analytics and tag orchestration.',
    data: 'Anonymized usage events, truncated IP, device, browser, referrer.',
    href: 'https://policies.google.com/privacy',
  },
  {
    name: 'Microsoft Clarity',
    purpose: 'Session replay and heatmaps with input masking enabled.',
    data: 'Clicks, scrolls, mouse movement, masked form input.',
    href: 'https://privacy.microsoft.com/privacystatement',
  },
  {
    name: 'Contentsquare',
    purpose: 'Behavioral analytics for UX measurement.',
    data: 'Clicks, scrolls, navigation events, masked form input.',
    href: 'https://contentsquare.com/privacy-and-security/',
  },
  {
    name: 'Vercel Analytics & Speed Insights',
    purpose: 'Page-traffic and performance measurement.',
    data: 'Anonymized request signals and timing data.',
    href: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'EmailJS',
    purpose: 'Delivers contact-form messages to our inbox.',
    data: 'The contents of your form submission (name, email, message).',
    href: 'https://www.emailjs.com/legal/privacy-policy/',
  },
  {
    name: 'Vercel (hosting)',
    purpose: 'Serves the site.',
    data: 'Server-side request logs, including IP and user-agent.',
    href: 'https://vercel.com/legal/privacy-policy',
  },
];

export default function PrivacyPolicyPage() {
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
          Privacy
          <br />
          Policy.
        </h1>
        <p className="mt-8 max-w-2xl text-base leading-relaxed text-black/70">
          What we collect when you visit perseustudio.com or engage our
          services, how we use it, and the rights you have over it.
        </p>

        <div className="mt-20 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-16">
          <article className="max-w-2xl">
            <section id={SECTIONS[0].id}>
              <SectionHeader number={1} label={SECTIONS[0].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                Perseus Creative Studio (“Perseus”, “we”, “our”) is a digital
                marketing and creative studio based in Vancouver, British
                Columbia, Canada. This policy applies to all visitors and
                customers of perseustudio.com, worldwide.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-black/80">
                Where applicable, we work to meet the requirements of the
                Personal Information Protection and Electronic Documents Act
                (PIPEDA), Quebec’s Law 25, the European Union General Data
                Protection Regulation (GDPR), and the United Kingdom GDPR.
              </p>
            </section>

            <section id={SECTIONS[1].id} className="mt-16">
              <SectionHeader number={2} label={SECTIONS[1].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                <span className="font-medium text-black">
                  Information you provide.
                </span>{' '}
                When you contact us, submit our forms, or engage our services
                we receive:
              </p>
              <ul className="mt-4 ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
                <li>
                  Contact-form fields — name, email, phone (optional), and
                  message content. Delivered via EmailJS.
                </li>
                <li>
                  Careers-form fields — name, email, role of interest, and
                  anything you attach.
                </li>
                <li>
                  Anything you share by email or in service correspondence.
                </li>
                <li>
                  Service-engagement details necessary to deliver photography,
                  video, web, or marketing work — for example brand assets,
                  business addresses, or temporary credentials.
                </li>
              </ul>

              <p className="mt-6 text-sm leading-relaxed text-black/80">
                <span className="font-medium text-black">
                  Information collected automatically.
                </span>{' '}
                When you load a page, our analytics providers receive:
              </p>
              <ul className="mt-4 ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
                <li>
                  IP address (often anonymized or truncated by the analytics
                  tools).
                </li>
                <li>Browser type, language, and operating system.</li>
                <li>Device characteristics like screen resolution.</li>
                <li>Referring URL and the pages you view on the site.</li>
                <li>Date, time, and duration of your visit.</li>
                <li>
                  Interaction events — clicks, scrolls, and navigation — used
                  to understand what visitors find useful.
                </li>
              </ul>
            </section>

            <section id={SECTIONS[2].id} className="mt-16">
              <SectionHeader number={3} label={SECTIONS[2].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                We use the information described above to:
              </p>
              <ul className="mt-4 ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
                <li>Respond to inquiries and prepare quotes.</li>
                <li>Deliver the services you’ve engaged us for.</li>
                <li>Improve the site through usage analytics.</li>
                <li>Detect and prevent fraud, abuse, or technical issues.</li>
                <li>Comply with our legal and regulatory obligations.</li>
                <li>
                  Send you information related to projects you’ve engaged us
                  on. We do not send unsolicited marketing.
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-black/80">
                We do not sell or rent personal information to anyone.
              </p>
            </section>

            <section id={SECTIONS[3].id} className="mt-16">
              <SectionHeader number={4} label={SECTIONS[3].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                A cookie is a small file stored on your device that lets a
                site remember information about your visit. We and our
                third-party providers use cookies and similar technologies —
                local storage, pixels, session-replay scripts — for the
                purposes below.
              </p>
              <ul className="mt-4 ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
                <li>
                  <span className="font-medium text-black">Essential.</span>{' '}
                  Needed for the site to function and to remember your
                  preferences.
                </li>
                <li>
                  <span className="font-medium text-black">Analytics.</span>{' '}
                  Measure traffic and usage patterns so we can improve the
                  site.
                </li>
                <li>
                  <span className="font-medium text-black">Performance.</span>{' '}
                  Monitor page-load speed and uptime.
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-black/80">
                On your first visit you’ll see a consent banner asking
                whether to enable analytics cookies (Google Analytics,
                Microsoft Clarity, Contentsquare). Declining keeps those
                scripts from loading. You can change your choice at any
                time from the “Cookie preferences” link in the site
                footer.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-black/80">
                You can also disable or delete cookies through your
                browser settings; doing so may affect site functionality.
                Most providers in §5 also offer a dedicated opt-out
                page.
              </p>
            </section>

            <section id={SECTIONS[4].id} className="mt-16">
              <SectionHeader number={5} label={SECTIONS[4].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                We rely on the following processors to operate the site. Each
                handles personal information under the terms of their own
                privacy policies and only for the purposes listed:
              </p>
              <ul className="mt-6 space-y-5 text-sm leading-relaxed text-black/80">
                {PROCESSORS.map((p) => (
                  <li key={p.name}>
                    <p className="font-medium text-black">{p.name}</p>
                    <p className="mt-1">{p.purpose}</p>
                    <p className="mt-1 text-black/70">Data: {p.data}</p>
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-black underline underline-offset-4 hover:opacity-80"
                    >
                      Privacy policy ↗
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section id={SECTIONS[5].id} className="mt-16">
              <SectionHeader number={6} label={SECTIONS[5].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                Perseus is located in British Columbia, Canada. Some of our
                processors are located in the United States and the European
                Union. When personal information moves across borders we rely
                on the receiving party’s commitment to comparable protection
                — through adequacy decisions, Standard Contractual Clauses,
                or equivalent contractual safeguards.
              </p>
            </section>

            <section id={SECTIONS[6].id} className="mt-16">
              <SectionHeader number={7} label={SECTIONS[6].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                We retain personal information only as long as needed for the
                purpose it was collected for:
              </p>
              <ul className="mt-4 ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
                <li>
                  Contact-form submissions — kept until we’ve responded and
                  for a reasonable follow-up window, then deleted on request.
                </li>
                <li>
                  Service-engagement records — for the duration of our
                  relationship plus what tax, accounting, and legal-records
                  obligations require.
                </li>
                <li>
                  Analytics data — retained per each provider’s default
                  (typically 14 months for Google Analytics; shorter for
                  Vercel Analytics).
                </li>
                <li>
                  Cookies — per each cookie’s expiration; deletable in your
                  browser at any time.
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-black/80">
                You can request earlier deletion of any information that
                identifies you. See §8 below.
              </p>
            </section>

            <section id={SECTIONS[7].id} className="mt-16">
              <SectionHeader number={8} label={SECTIONS[7].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                Subject to the law that applies to you, you have the right
                to:
              </p>
              <ul className="mt-4 ml-5 list-disc space-y-2 text-sm leading-relaxed text-black/80">
                <li>Access the personal information we hold about you.</li>
                <li>Correct inaccurate or incomplete information.</li>
                <li>Delete information (right to be forgotten).</li>
                <li>Withdraw any consent you’ve previously given.</li>
                <li>Restrict or object to certain processing.</li>
                <li>
                  Receive your information in a portable, machine-readable
                  format.
                </li>
                <li>
                  Lodge a complaint with your data-protection authority — the
                  Office of the Privacy Commissioner of Canada (OPC), the
                  Commission d’accès à l’information du Québec (CAI), the
                  Information Commissioner’s Office (ICO) in the UK, or your
                  local EU supervisory authority.
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-black/80">
                To exercise any of these rights, email{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-black underline underline-offset-4 hover:opacity-80"
                >
                  {CONTACT_EMAIL}
                </a>
                . We respond within thirty days under most regimes and may
                ask you to verify your identity before releasing or deleting
                records.
              </p>
            </section>

            <section id={SECTIONS[8].id} className="mt-16">
              <SectionHeader number={9} label={SECTIONS[8].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                Our services are intended for businesses and adult
                professionals. We do not knowingly collect personal
                information from children under thirteen. If you believe a
                child has provided us information, please contact us and we
                will delete it.
              </p>
            </section>

            <section id={SECTIONS[9].id} className="mt-16">
              <SectionHeader number={10} label={SECTIONS[9].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                We may update this policy from time to time to reflect
                changes in our practices, the services we use, or applicable
                law. The “Effective” date at the top of this page reflects
                the most recent version. Material changes will be flagged in
                the document or via a notice on the site.
              </p>
            </section>

            <section id={SECTIONS[10].id} className="mt-16">
              <SectionHeader number={11} label={SECTIONS[10].label} />
              <p className="mt-6 text-sm leading-relaxed text-black/80">
                Questions about this policy or about how we handle your
                information can go to{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-black underline underline-offset-4 hover:opacity-80"
                >
                  {CONTACT_EMAIL}
                </a>
                . You can also reach us through our{' '}
                <Link
                  href="/contact"
                  className="text-black underline underline-offset-4 hover:opacity-80"
                >
                  contact page
                </Link>
                .
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
