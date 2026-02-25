import Link from 'next/link';
import { menuLinks } from '../constants';
import { Container, TextShimmer, ImageKit } from './';
import { FaFacebook, FaInstagram, FaLinkedin, FaTwitter } from 'react-icons/fa';

const sections = [
  {
    title: 'Services',
    links: [
      { name: 'Videography', href: '' },
      { name: 'Web Design', href: '' },
      { name: 'SEO', href: '' },
      { name: 'Google Ads', href: '' },
      { name: 'Social Media', href: '' },
    ],
  },
  {
    title: 'Work',
    links: [
      { name: 'Projects', href: '/projects' },
      { name: 'Case Studies', href: '/blogs?category=case-studies' },
      { name: 'Testimonials', href: '' },
      { name: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About', href: '/about' },
      { name: 'Team', href: '' },
      { name: 'Careers', href: '/contact/careers' },
      { name: 'FAQ', href: '/frequently-asked-questions' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Blogs', href: '/blogs' },
      { name: 'Free Audit', href: '/contact' },
    ],
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
    icon: <FaTwitter className="size-4" />,
    href: 'https://x.com/Perseustudio1',
    label: 'Twitter',
  },
  {
    icon: <FaLinkedin className="size-4" />,
    href: 'https://linkedin.com/company/perseus-creative-studio',
    label: 'LinkedIn',
  },
];

const officeLocations = [
  { city: 'Vancouver', tz: 'America/Vancouver' },
  { city: 'Toronto', tz: 'America/Toronto' },
  { city: 'Los Angeles', tz: 'America/Los_Angeles' },
];

const Footer = () => {
  const now = new Date();
  const updatedDate = now.getFullYear();

  const formatCityTime = (timeZone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

  return (
    <footer className="py-8 sm:px-10 px-5 z-99">
      <Container>
        <div className="bg-background-contrast-black/10 my-5 h-px w-full" />
        <div className="flex w-full flex-col justify-between gap-10 lg:flex-row lg:items-center lg:text-left">
          <div className="flex w-full flex-col justify-between gap-6 lg:items-start">
            {/* Logo */}
            <div className="flex items-center gap-2 lg:justify-center">
              <Link href="/">
                <ImageKit
                  width={100}
                  height={100}
                  src="logo-black.png"
                  alt="Perseus Creative Studio Logo"
                />
              </Link>
              <Link href="/" className="text-sm font-semibold uppercase">
                Perseustudio.com
              </Link>
            </div>
            <h3 className="max-w-[80%] tracking-tighter text-sm text-semibold">
              <span className="font-semibold">Perseus Creative Studio</span> is
              a trusted digital marketing agency in Vancouver experts in social
              media marketing, videography, photography, website design and
              search engine marketing.
            </h3>
            <ul className="flex items-center space-x-2 text-background-contrast-black">
              {SocialLinks.map((social, idx) => (
                <li key={idx} className="font-medium hover:text-primary">
                  <a
                    href={social.href}
                    target="_blank"
                    aria-label={social.label}
                  >
                    {social.icon}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 w-full gap-6 md:grid-cols-4 lg:gap-20">
            {sections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3 className="mb-4 font-bold">{section.title}</h3>
                <ul className="tracking-tighter text-black/70 text-sm">
                  {section.links.map((link, linkIdx) => (
                    <li
                      key={linkIdx}
                      className="font-medium hover:text-primary"
                    >
                      <Link href={link.href}>{link.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background-contrast-black/10 my-5 h-px w-full" />

        <div className="flex justify-between items-center">
          <div className="text-xs max-w-md">
            More ways to contact us:{' '}
            <Link href="/contact">
              <TextShimmer>By sending an E-mail</TextShimmer>{' '}
            </Link>
            or{' '}
            <a href="https://www.instagram.com/perseustudio/" target="_blank">
              <TextShimmer>Instagram</TextShimmer>
            </a>{' '}
            for collabration,{' '}
            <span className="text-xs">
              Or call{' '}
              <a href="tel:+1 (778) 887-8363" target="_blank">
                <TextShimmer>+1 (778) 887-8363</TextShimmer>
              </a>
            </span>
          </div>
          <div className="flex max-sm:hidden">
            {menuLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="text-xs leading-xs"
              >
                {link.title}
                {link.id !== menuLinks.length && (
                  <span className="mx-2">~</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-background-contrast-black/10 my-5 h-px w-full" />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs leading-xs">
            Copyright &copy; {updatedDate}{' '}
            <Link href="/">Perseus Creative Studio.</Link> All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] tracking-tighter text-black/70">
            {officeLocations.map((loc, idx) => (
              <span key={loc.city} className="whitespace-nowrap">
                {loc.city}: {formatCityTime(loc.tz)}
                {idx !== officeLocations.length - 1 && (
                  <span className="mx-2">•</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
