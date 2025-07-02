import Link from 'next/link';
import { footerLinks } from '../constants';
import { Container } from './';

const FooterContent = () => {
  const updatedDate = new Date().getFullYear();

  return (
    <footer className="bg-background-contrast text-white" role="contentinfo">
      {/* Navigation Sections */}
      <Container className="flex flex-col">
        <nav
          aria-label="Footer Navigation"
          className="flex justify-between border-b border-white"
        >
          {footerLinks.map((section) => (
            <section
              key={section.title}
              className="flex flex-col gap-2"
              aria-labelledby={`footer-heading-${section.title}`}
            >
              <h3
                id={`footer-heading-${section.title}`}
                className="mb-2 uppercase text-[#ffffff80]"
              >
                {section.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link
                        href={link.href}
                        className="relative inline-block text-white group"
                      >
                        <span className="cursor-pointer flex items-center gap-1">
                          {link.label}
                        </span>
                        <span className="absolute left-0 bottom-0 h-[1px] w-0 bg-white transition-all duration-700 group-hover:w-full" />
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative inline-block text-white group"
                      >
                        <span className="flex items-center gap-1">
                          {link.label}
                        </span>
                        <span className="absolute left-0 bottom-0 h-[1px] w-0 bg-white transition-all duration-700 group-hover:w-full" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>

        {/* Brand Philosophy */}
        <section
          className="border-b border-white py-8"
          aria-labelledby="footer-about-heading"
        >
          <h3
            id="footer-about-heading"
            className="text-4xl uppercase font-bold"
          >
            Beyond the boundaries
          </h3>
          <p className="mt-2">
            Beyond Boundaries captures the essence of Perseus—an identity rooted
            in resilience, transformation, and relentless forward motion. Like
            its mythological namesake, Perseus represents the ability to
            confront the impossible and emerge stronger, not by following paths
            already taken, but by forging new ones...
          </p>
        </section>

        {/* Branding and Copyright */}
        <section className="flex justify-between items-end border-b border-white pb-5">
          <h2 className="text-[10vw] leading-[0.8] mt-10 uppercase tracking-tight">
            PERSEUS
          </h2>
          <address className="not-italic flex flex-col gap-1">
            <span>
              © {updatedDate} Perseus Creative Studio - All rights reserved.
            </span>

            <a
              href="https://perseustudio.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Powered By Perseus Creative Studio
            </a>
          </address>
        </section>
      </Container>
    </footer>
  );
};

const Footer = () => {
  return (
    <footer
      className="relative h-[800px]"
      style={{ clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)' }}
    >
      <div className="relative h-[calc(100dvh+800px)] -top-[100dvh]">
        <div className="h-[800px] sticky top-[calc(100dvh-800px)]">
          <FooterContent />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
