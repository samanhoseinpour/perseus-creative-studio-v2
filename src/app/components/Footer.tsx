import React from "react";
import Link from "next/link";
import { Container, ImageKit } from "./";

const footerLinks = {
  solutions: [
    { name: "Branding & Design", href: "/services" },
    { name: "Web Design & Development", href: "/services" },
    { name: "Social Media Management", href: "/services" },
    { name: "Content Creation", href: "/services" },
    { name: "Paid Media / Advertising", href: "/services" },
    { name: "SEO / SEM", href: "/services" },
    { name: "PR / Communications", href: "/services" },
    { name: "Video Production", href: "/services" },
  ],
  support: [
    { name: "Contact", href: "/contact" },
    { name: "FAQs", href: "/#faq" },
    { name: "Get a quote", href: "/contact" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blogs" },
    { name: "Projects", href: "/projects" },
    { name: "Websites", href: "/websites" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    { name: "Terms of Service", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Cookies Policy", href: "/privacy#cookies" },
  ],
  social: [
    {
      name: "Instagram",
      href: "https://www.instagram.com/perseustudio/",
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: "YouTube",
      href: "https://www.youtube.com/@PerseusCreativeStudio",
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ],
};

const FooterContent = () => {
  const updatedDate = new Date().getFullYear();

  return (
    <Container className="px-6 pt-8 pb-8 sm:pt-12 lg:px-8">
      <div className="xl:grid xl:grid-cols-3 xl:gap-8">
        <div className="space-y-8">
          <Link href="/">
            <ImageKit
              alt="Website Logo"
              src="logo-white.png"
              height={72}
              width={72}
              loading="lazy"
            />
          </Link>
          <p className="text-sm text-balance text-white">
            Perseus Creative Studio is a digital agency focused on delivering
            exceptional web design and development services. We create
            innovative solutions that help businesses thrive online.
          </p>
          <div className="flex gap-x-6">
            {footerLinks.social.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-white/30 hover:text-white transition-all duration-750"
                target="_blank"
              >
                <span className="sr-only">{item.name}</span>
                <item.icon aria-hidden="true" className="size-6" />
              </a>
            ))}
          </div>
        </div>
        <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
          <div className="md:grid md:grid-cols-2 md:gap-8">
            <div>
              <h3 className="text-sm/6 font-semibold text-white">Solutions</h3>
              <ul role="list" className="mt-6 space-y-4">
                {footerLinks.solutions.map((item) => (
                  <li key={item.name} className="">
                    {item.href.startsWith("/") ? (
                      <Link
                        href={item.href}
                        className="text-sm/6 text-white/30 hover:text-white transition-all duration-750"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="text-sm/6 text-white/30 hover:text-white transition-all duration-750"
                      >
                        {item.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-10 md:mt-0">
              <h3 className="text-sm/6 font-semibold text-white">Support</h3>
              <ul role="list" className="mt-6 space-y-4">
                {footerLinks.support.map((item) => (
                  <li key={item.name}>
                    {item.href.startsWith("/") ? (
                      <Link
                        href={item.href}
                        className="text-sm/6 text-white/30 hover:text-white transition-all duration-750"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="text-sm/6 text-white/30 hover:text-white transition-all duration-750"
                      >
                        {item.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="md:grid md:grid-cols-2 md:gap-8">
            <div>
              <h3 className="text-sm/6 font-semibold text-white">Company</h3>
              <ul role="list" className="mt-6 space-y-4">
                {footerLinks.company.map((item) => (
                  <li key={item.name}>
                    {item.href.startsWith("/") ? (
                      <Link
                        href={item.href}
                        className="text-sm/6 text-white/30 hover:text-white transition-all duration-750"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="text-sm/6 text-white/30 hover:text-white transition-all duration-750"
                      >
                        {item.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-10 md:mt-0">
              <h3 className="text-sm/6 font-semibold text-white">Legal</h3>
              <ul role="list" className="mt-6 space-y-4">
                {footerLinks.legal.map((item) => (
                  <li key={item.name}>
                    {item.href.startsWith("/") ? (
                      <Link
                        href={item.href}
                        className="text-sm/6 text-white/30 hover:text-white transition-all duration-750"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="text-sm/6 text-white/30 hover:text-white transition-all duration-750"
                      >
                        {item.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-16 border-t border-white/10 pt-8 sm:mt-12">
        <p className="text-sm/6 text-white/30 text-center">
          &copy;{updatedDate}
          <span className="text-white"> Perseus Creative Studio.</span> All
          rights reserved.
        </p>
      </div>
    </Container>
  );
};

const Footer = () => {
  return (
    <footer className="bg-background">
      <FooterContent />
    </footer>
  );
};

export default Footer;
