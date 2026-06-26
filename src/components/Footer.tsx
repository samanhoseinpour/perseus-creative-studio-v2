import Link from 'next/link';
import { serviceGroups, projectsPanel, type NavLinkGroup } from '@/lib/navigation';
import { pad2 } from '@/components/Projects/utils';
import { Container, TextShimmer, Img } from './';
import {
  FooterAccordion,
  FooterClocks,
  FooterGroup,
  CookiePreferencesButton,
} from './FooterClient';
import WhatsAppChatButton from './WhatsAppChatButton';
import { SocialLinks } from '@/constants/socials';

// Footer directory links optionally carry a count: the Projects column prints
// it as a slate-style portfolio tally beside each discipline. A plain
// NavLinkGroup is assignable here since `count` is optional.
type FooterLink = { name: string; href: string; count?: number };
type FooterColumnGroup = { title: string; href?: string; links: FooterLink[] };

const companyGroup: NavLinkGroup = {
  title: 'Company',
  links: [
    { name: 'About', href: '/about' },
    { name: 'Careers', href: '/contact/careers' },
    { name: 'Contact', href: '/contact' },
  ],
};

const resourcesGroup: NavLinkGroup = {
  title: 'Resources',
  links: [
    { name: 'Blogs', href: '/blogs' },
    { name: 'Case Studies', href: '/blogs?category=case-studies' },
    { name: 'Authors', href: '/blogs/authors' },
    { name: "FAQ's", href: '/frequently-asked-questions' },
    { name: 'License', href: '/license' },
  ],
};

// Projects directory column: one row per discipline with a monospace count
// (portfolio depth), echoing the navbar reel's slate register. Derived from the
// same projectsPanel the navbar uses, so new work surfaces here for free.
const projectsGroup: FooterColumnGroup = {
  title: 'Projects',
  href: '/projects',
  links: projectsPanel.categories.map((cat) => ({
    name: cat.title,
    href: cat.href,
    count: cat.count,
  })),
};

// One array per visual column; groups in the same array stack vertically,
// Apple-footer style. Projects rides in its own column (slate-tally render
// below), between the disciplines and the Company/Resources stack.
const [production, websites, marketing, social, branding] = serviceGroups;
const directoryColumns: FooterColumnGroup[][] = [
  [production],
  [websites],
  [marketing],
  [social, branding],
  [projectsGroup],
  [companyGroup, resourcesGroup],
];

const contactChannels = [
  {
    label: 'Email',
    value: 'Send an E-mail',
    href: '/contact',
    external: false,
  },
  {
    label: 'Call',
    value: '+1 (778) 887-8363',
    href: 'tel:+17788878363',
    external: true,
  },
  {
    label: 'Instagram',
    value: '@perseustudio',
    href: 'https://www.instagram.com/perseustudio/',
    external: true,
  },
];

const socialIconClass =
  'flex size-8 cursor-pointer items-center justify-center rounded-full border border-black/10 text-black/60 transition-colors duration-200 hover:border-black hover:bg-black hover:text-white';

const Footer = () => {
  const updatedDate = new Date().getFullYear();

  return (
    <footer className="overflow-hidden pt-8 sm:px-10 px-5 z-99">
      <Container>
        {/* Eyebrow rule */}
        <div className="flex items-center gap-4 py-5">
          <span className="eyebrow text-[11px] text-black/50 whitespace-nowrap">
            Perseus Creative Studio
          </span>
          <span className="h-px flex-1 bg-black/10" />
          <span className="eyebrow text-[11px] text-black/50 whitespace-nowrap max-sm:hidden">
            Vancouver, BC — Canada
          </span>
        </div>

        {/* Brand row */}
        <div className="flex flex-col gap-8 pb-8 pt-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-6">
            <Link
              href="/"
              aria-label="Perseus Creative Studio — home"
              className="w-fit"
            >
              {/* Self-hosted wordmark; dark:invert flips it on dark surfaces. */}
              <Img
                width={702}
                height={240}
                src="/images/perseus-logo-black.avif"
                alt="Perseus Creative Studio Logo"
                className="dark:invert h-8 w-auto"
              />
            </Link>
            {/* Two-tone statement, echoing Heading's title/titleAccent idiom */}
            <p className="max-w-xl text-xl sm:text-2xl font-medium tracking-tighter leading-snug">
              A trusted marketing agency in Vancouver.{' '}
              <span className="text-black/40">
                Branding, video and photography, websites, social media, and
                digital marketing — under one roof.
              </span>
            </p>
          </div>
          <ul className="flex flex-wrap items-center gap-2">
            {SocialLinks.map((social) => (
              <li key={social.label}>
                {social.label === 'WhatsApp' ? (
                  <WhatsAppChatButton className={socialIconClass}>
                    {social.icon}
                  </WhatsAppChatButton>
                ) : (
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={socialIconClass}
                  >
                    {social.icon}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-black/10 h-px w-full" />

        {/* Site directory: md+ columned grid, accordion rows below md */}
        <nav
          aria-label="Site directory"
          className="md:grid md:grid-cols-3 md:gap-x-6 md:gap-y-10 md:py-8 lg:grid-cols-6 lg:gap-x-12"
        >
          <FooterAccordion>
            {directoryColumns.map((groups, colIdx) => (
            <div key={colIdx} className="md:flex md:flex-col md:gap-10">
              {groups.map((group) => (
                <FooterGroup
                  key={group.title}
                  title={group.title}
                  href={group.href}
                >
                  <ul className="space-y-2.5 text-[13px] tracking-tighter text-black/60">
                    {/* Mobile-only: the collapsed heading isn't a link, so
                        surface the category landing page as the first item. */}
                    {group.href && (
                      <li className="md:hidden">
                        <Link
                          href={group.href}
                          className="font-medium text-black/80"
                        >
                          All {group.title}
                        </Link>
                      </li>
                    )}
                    {group.links.map((link) =>
                      link.count != null ? (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="group/foot flex items-baseline justify-between gap-3 transition-colors duration-200 hover:text-black"
                          >
                            <span className="transition-transform duration-200 group-hover/foot:translate-x-0.5">
                              {link.name}
                            </span>
                            <span
                              aria-hidden
                              className="font-mono text-[11px] tabular-nums text-black/35 transition-colors duration-200 group-hover/foot:text-black/60"
                            >
                              {pad2(link.count)}
                            </span>
                          </Link>
                        </li>
                      ) : (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="inline-block transition-all duration-200 hover:text-black hover:translate-x-0.5"
                          >
                            {link.name}
                          </Link>
                        </li>
                      ),
                    )}
                  </ul>
                </FooterGroup>
              ))}
            </div>
          ))}
          </FooterAccordion>
        </nav>

        <div className="bg-black/10 h-px w-full" />

        {/* Contact band */}
        <div className="grid py-2 sm:grid-cols-3 sm:divide-x sm:divide-black/10 sm:py-8 max-sm:divide-y max-sm:divide-black/10">
          {contactChannels.map((channel) => {
            const inner = (
              <>
                <span className="eyebrow text-[11px] text-black/50">
                  {channel.label}
                </span>
                <TextShimmer
                  as="span"
                  className="text-sm font-medium tracking-tighter"
                >
                  {channel.value}
                </TextShimmer>
              </>
            );
            const className =
              'flex flex-col gap-2 max-sm:py-5 sm:px-10 sm:first:pl-0 sm:last:pr-0';

            return channel.external ? (
              <a
                key={channel.label}
                href={channel.href}
                className={className}
                target="_blank"
              >
                {inner}
              </a>
            ) : (
              <Link
                key={channel.label}
                href={channel.href}
                className={className}
              >
                {inner}
              </Link>
            );
          })}
        </div>

        <div className="bg-black/10 h-px w-full" />

        {/* Utility bar */}
        <div className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-black/60">
            &copy; {updatedDate}{' '}
            <Link href="/" className="text-black">
              Perseus Creative Studio.
            </Link>{' '}
            All rights reserved.
            <span className="mx-2 text-black/30">·</span>
            <Link
              href="/privacy-policy"
              className="transition-colors duration-200 hover:text-black"
            >
              Privacy Policy
            </Link>
            <span className="mx-2 text-black/30">·</span>
            <Link
              href="/terms-of-service"
              className="transition-colors duration-200 hover:text-black"
            >
              Terms of Service
            </Link>
            <span className="mx-2 text-black/30">·</span>
            <CookiePreferencesButton />
          </p>

          <FooterClocks />
        </div>

        <div
          aria-hidden
          className="pointer-events-none select-none -mb-[0.16em] mt-2 text-center"
        >
          <span className="block whitespace-nowrap font-semibold leading-[0.8] tracking-tighter text-black/5 text-[clamp(4.5rem,18.5vw,17rem)]">
            PERSEUS
          </span>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
