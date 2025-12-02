import Link from "next/link";
import { menuLinks } from "../constants";
import { Container, TextShimmer } from "./";

const Footer = () => {
  const updatedDate = new Date().getFullYear();

  return (
    <footer className="py-8 sm:px-10 px-5 z-99">
      <Container className="">
        <div>
          <div className="font-semibold text-xs leading-xs">
            More ways to contact us:{" "}
            <Link href="/contact">
              <TextShimmer>By sending an E-mail</TextShimmer>{" "}
            </Link>
            or{" "}
            <a href="https://www.instagram.com/perseustudio/" target="_blank">
              <TextShimmer>Instagram</TextShimmer>
            </a>{" "}
            for collabration,
          </div>
          <span className="font-semibold text-xs leading-xs">
            Or call{" "}
            <a href="tel:+1 (778) 887-8363" target="_blank">
              <TextShimmer>+1 (778) 887-8363</TextShimmer>
            </a>
          </span>
        </div>

        <div className="bg-neutral-700 my-5 h-px w-full" />

        <div className="flex md:flex-row flex-col md:items-center justify-between">
          <p className="font-semibold text-xs">
            Copyright &copy; {updatedDate}{" "}
            <Link href="/">Perseus Creative Studio Inc.</Link> All rights
            reserved.
          </p>
          <div className="flex max-sm:hidden">
            {menuLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="font-semibold text-xs"
              >
                {link.title}
                {link.id !== menuLinks.length && (
                  <span className="mx-2"> | </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
