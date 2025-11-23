import React from "react";
import Link from "next/link";
import { Instagram, Youtube, Facebook, Linkedin } from "lucide-react";
import { Container, ImageKit, TextShimmer } from "./";

const footerLinks = {
  solutions: [
    { name: "Branding", href: "/services" },
    { name: "Website Design", href: "/services" },
    { name: "Video & Photos", href: "/services" },
    { name: "Social Media Management", href: "/services" },
  ],
  resources: [
    { name: "Blogs", href: "/blog" },
    { name: "Case Studies", href: "/projects" },
    { name: "Portfolio", href: "/projects" },
  ],
  support: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms & Conditions", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" },
  ],
  contact: [
    { name: "Get In Touch With Us", href: "/contact" },
    { name: "Join Our Team", href: "/careers" },
    { name: "Collaboration & Partnerships", href: "/partners" },
  ],
  company: [
    { name: "About Us", href: "/about" },
    { name: "What We Do", href: "/services" },
    { name: "Our Team", href: "/team" },
  ],
  social: [
    {
      name: "Instagram",
      href: "https://www.instagram.com/perseustudio/",
      Icon: Instagram,
    },
    {
      name: "YouTube",
      href: "https://www.youtube.com/@PerseusCreativeStudio",
      Icon: Youtube,
    },
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/company/104123252",
      Icon: Linkedin,
    },
    { name: "Facebook", href: "https://facebook.com", Icon: Facebook },
  ],
} as const;

const sectionOrder: Array<keyof Omit<typeof footerLinks, "social">> = [
  "company",
  "solutions",
  "resources",
  "support",
  "contact",
];

const titleMap: Record<string, string> = {
  company: "Company",
  solutions: "Solutions",
  resources: "Resources",
  support: "Support & Legal",
  contact: "Contact",
};

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black/10 backdrop-blur-xl">
      <Container className="py-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-7">
          {/* Brand / Intro */}
          <div className="col-span-2">
            <Link
              href="/"
              className="mb-2 flex items-center text-sm gap-4 font-bold sm:mb-0"
            >
              <ImageKit
                src="/logo-white.png"
                alt="website logo"
                width={75}
                height={75}
              />
            </Link>

            <TextShimmer className="my-4 text-sm leading-sm">
              We help you build a brand people love.
            </TextShimmer>

            {/* Social */}
            <ul className="mt-5 flex space-x-6">
              {footerLinks.social.map(({ name, href, Icon }) => (
                <li key={name}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={name}
                    className="text-white hover:opacity-80  rounded"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link Sections */}
          {sectionOrder.map((sectionKey) => (
            <div key={sectionKey} className="lg:mx-auto">
              <h2 className="mb-6 text-sm leading-sm font-semibold uppercase text-white">
                {titleMap[sectionKey]}
              </h2>
              <ul className="text-white/70 text-xs leading-xs">
                {footerLinks[sectionKey].map((item) => (
                  <div key={item.name} className="w-fit">
                    <li className="mb-2">
                      <Link
                        href={item.href}
                        className="hover:text-white transition-colors duration-500 text-sm"
                      >
                        {item.name}
                      </Link>
                    </li>
                  </div>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <hr className="my-6 border-white/30 sm:mx-auto lg:my-8" />

        <div className="block text-center text-sm text-white/70">
          <div className="flex justify-center">
            © {year}&nbsp;
            <Link href="/" className="text-black">
              <TextShimmer>Perseus Creative Studio</TextShimmer>
            </Link>
            . All rights reserved.
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
