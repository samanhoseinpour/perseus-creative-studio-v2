import Link from 'next/link';
import { serviceGroups, type NavLinkGroup } from '@/lib/navigation';
import { Container, TextShimmer, ImageKit } from './';
import {
  FooterAccordion,
  FooterClocks,
  FooterGroup,
  CookiePreferencesButton,
} from './FooterClient';
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaMediumM,
  FaGoogle,
  FaWhatsapp,
} from 'react-icons/fa';
import { FaTiktok, FaXTwitter } from 'react-icons/fa6';

const companyGroup: NavLinkGroup = {
  title: 'Company',
  links: [
    { name: 'About', href: '/about' },
    { name: 'Projects', href: '/projects' },
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

// One array per visual column; groups in the same array stack vertically,
// Apple-footer style. When project detail routes ship, a registry-driven
// "Work" group slots in alongside Company/Resources here.
const [production, websites, marketing, social, branding] = serviceGroups;
const directoryColumns: NavLinkGroup[][] = [
  [production],
  [websites],
  [marketing],
  [social, branding],
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

const SocialLinks = [
  {
    icon: <FaInstagram className="size-4" />,
    href: 'https://www.instagram.com/perseustudio/',
    label: 'Instagram',
  },
  {
    icon: <FaFacebook className="size-4" />,
    href: 'https://www.facebook.com/p/Perseus-Creative-Studio-61559184362913/',
    label: 'Facebook',
  },
  {
    icon: <FaXTwitter className="size-4" />,
    href: 'https://x.com/Perseustudio1',
    label: 'Twitter',
  },
  {
    icon: <FaLinkedin className="size-4" />,
    href: 'https://linkedin.com/company/perseus-creative-studio',
    label: 'LinkedIn',
  },
  {
    icon: <FaYoutube className="size-4" />,
    href: 'https://www.youtube.com/@PerseusCreativeStudio',
    label: 'YouTube',
  },
  {
    icon: <FaTiktok className="size-4" />,
    href: 'https://www.tiktok.com/@perseustudio',
    label: 'TikTok',
  },
  {
    icon: <FaGoogle className="size-4" />,
    href: 'https://www.google.com/maps/search/?api=1&query=Perseus%20Creative%20Studio',
    label: 'Google Business Profile',
  },
  {
    icon: <FaWhatsapp className="size-4" />,
    href: 'https://wa.me/17788878363',
    label: 'WhatsApp',
  },
  {
    icon: <FaMediumM className="size-4" />,
    href: 'https://medium.com/@teamperseustudio',
    label: 'Medium',
  },
];

const Footer = () => {
  const updatedDate = new Date().getFullYear();

  return (
    <footer className="overflow-hidden pt-8 sm:px-10 px-5 z-99">
      <Container>
        {/* Eyebrow rule */}
        <div className="flex items-center gap-4 py-5">
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-black/50 whitespace-nowrap">
            Perseus Creative Studio
          </span>
          <span className="h-px flex-1 bg-black/10" />
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-black/50 whitespace-nowrap max-sm:hidden">
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
              <ImageKit
                width={82}
                height={100}
                src="logo-black.png"
                alt="Perseus Creative Studio Logo"
                className="dark:invert"
              />
            </Link>
            {/* Two-tone statement, echoing Heading's title/titleAccent idiom */}
            <p className="max-w-xl text-xl sm:text-2xl font-medium tracking-tighter leading-snug">
              A trusted digital marketing agency in Vancouver.{' '}
              <span className="text-black/40">
                Social media marketing, videography, photography, website
                design and search engine marketing — under one roof.
              </span>
            </p>
          </div>
          <ul className="flex flex-wrap items-center gap-2">
            {SocialLinks.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex size-8 items-center justify-center rounded-full border border-black/10 text-black/60 transition-colors duration-200 hover:border-black hover:bg-black hover:text-white"
                >
                  {social.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-black/10 h-px w-full" />

        {/* Site directory: md+ columned grid, accordion rows below md */}
        <nav
          aria-label="Site directory"
          className="md:grid md:grid-cols-3 md:gap-x-6 md:gap-y-10 md:py-8 lg:grid-cols-5 lg:gap-x-12"
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
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="inline-block transition-all duration-200 hover:text-black hover:translate-x-0.5"
                        >
                          {link.name}
                        </Link>
                      </li>
                    ))}
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
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-black/50">
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
