import Link from 'next/link';

import { Button, ImageKit, BorderBeam, Container } from '../';

export default function HeroSection() {
  return (
    <>
      <section className="overflow-hidden">
        <div className="relative py-24 md:py-36">
          <Container>
            <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
              <h1 className="font-bold mx-auto mt-8 text-4xl leading-4xl sm:text-5xl sm:leading-5xl lg:mt-8">
                Website Design, Development
              </h1>
              <p className="mx-auto mt-4 text-sm leading-sm font-semibold">
                We design, build, and automate websites that feel on‑brand, load
                fast, and connect seamlessly to the way your business actually
                runs.
              </p>

              <div className="mt-8 flex flex-row items-center justify-center gap-6">
                <Link href="/contact">
                  <Button size="medium">Discuss a Website Project</Button>
                </Link>
              </div>
            </div>
          </Container>

          <div>
            <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12">
              <div className="inset-shadow-2xs bg-background relative mx-auto max-w-6xl overflow-hidden rounded-lg shadow-lg shadow-zinc-950/15">
                <div
                  aria-hidden
                  className="bg-linear-to-b to-background absolute inset-0 z-10 from-transparent from-35%"
                />
                <ImageKit
                  className="bg-background aspect-15/8 relative rounded-lg"
                  src="/website-hero.webp"
                  alt="code snippet"
                  width="2700"
                  height="1440"
                />
                <BorderBeam
                  duration={12}
                  size={200}
                  className="from-transparent via-blue-700 to-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
