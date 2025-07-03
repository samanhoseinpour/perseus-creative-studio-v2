import Link from 'next/link';
import { Container, ImageKit } from './';

import { footerLinks } from '../constants';

const FooterContent = () => {
  const updatedDate = new Date().getFullYear();

  return (
    <Container className="px-6 pt-16 pb-8 sm:pt-24 lg:px-8 lg:pt-32">
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
          <p className="text-sm/6 text-balance text-white">
            Making the world a better place through building elegant videos.
          </p>
          <div className="flex gap-x-6">
            {/* {footerLinks.social.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-white/30 hover:text-gray-300"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon aria-hidden="true" className="size-6" />
                </a>
              ))} */}
          </div>
        </div>
        <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
          <div className="md:grid md:grid-cols-2 md:gap-8">
            <div>
              <h3 className="text-sm/6 font-semibold text-white">Solutions</h3>
              <ul role="list" className="mt-6 space-y-4">
                {footerLinks.solutions.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-sm/6 text-white/30 hover:text-white"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-10 md:mt-0">
              <h3 className="text-sm/6 font-semibold text-white">Support</h3>
              <ul role="list" className="mt-6 space-y-4">
                {footerLinks.support.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-sm/6 text-white/30 hover:text-white"
                    >
                      {item.name}
                    </a>
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
                    <a
                      href={item.href}
                      className="text-sm/6 text-white/30 hover:text-white"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-10 md:mt-0">
              <h3 className="text-sm/6 font-semibold text-white">Legal</h3>
              <ul role="list" className="mt-6 space-y-4">
                {footerLinks.legal.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-sm/6 text-white/30 hover:text-white"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24">
        <p className="text-sm/6 text-white/30">
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
    <footer>
      <FooterContent />
    </footer>
  );
};

export default Footer;
