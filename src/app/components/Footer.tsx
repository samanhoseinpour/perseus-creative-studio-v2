import React from "react";
import Link from "next/link";
import { Instagram, Youtube, Facebook, Linkedin } from "lucide-react";
import {
  AnimatedGroup,
  Container,
  ImageKit,
  TextEffect,
  TextShimmer,
} from "./";

const footerLinks = {
  solutions: [
    { name: "Branding & Design", href: "/services" },
    { name: "Web Design & Development", href: "/services" },
    { name: "Social Media Management", href: "/services" },
  ],
  support: [
    { name: "Contact", href: "/contact" },
    { name: "FAQs", href: "/#faq" },
    { name: "Get a quote", href: "/contact" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Projects", href: "/projects" },
    { name: "Websites", href: "/services/websites" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    { name: "Terms of Service", href: "/" },
    { name: "Privacy Policy", href: "/" },
    { name: "Cookies Policy", href: "/" },
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
  "support",
  "legal",
];

const titleMap: Record<string, string> = {
  company: "Company",
  solutions: "Solutions",
  support: "Support",
  legal: "Legal",
};

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black/10 backdrop-blur-xl">
      <Container className="py-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
          {/* Brand / Intro */}
          <AnimatedGroup className="col-span-2">
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

            <h3 className="my-4 text-white">
              We are a marketing agency that pushes boundaries and explores new
              possibilities.
            </h3>

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
          </AnimatedGroup>

          {/* Link Sections */}
          {sectionOrder.map((sectionKey) => (
            <div key={sectionKey} className="lg:mx-auto">
              <TextEffect
                as="h2"
                className="mb-6 text-sm font-semibold uppercase text-white"
              >
                {titleMap[sectionKey]}
              </TextEffect>
              <ul className="text-white/70">
                {footerLinks[sectionKey].map((item) => (
                  <AnimatedGroup key={item.name} className="w-fit">
                    <li className="mb-4">
                      <Link
                        href={item.href}
                        className="hover:text-white transition-colors duration-500 text-sm"
                      >
                        {item.name}
                      </Link>
                    </li>
                  </AnimatedGroup>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <AnimatedGroup>
          <hr className="my-6 border-white/30 sm:mx-auto lg:my-8" />
        </AnimatedGroup>

        <div className="block text-center text-sm text-white/70">
          <AnimatedGroup className="flex justify-center">
            © {year}&nbsp;
            <Link href="/" className="text-black">
              <TextShimmer>Perseus Creative Studio</TextShimmer>
            </Link>
            . All rights reserved.
          </AnimatedGroup>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
