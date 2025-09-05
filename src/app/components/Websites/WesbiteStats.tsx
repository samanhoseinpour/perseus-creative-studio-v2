import Link from "next/link";
import { TextEffect, AnimatedGroup, ImageKit, Container, CountUp } from "../";

const WebsiteStats = () => {
  return (
    <section className="mb-32">
      <Container className="space-y-8 md:space-y-12">
        <div className="relative z-10 max-w-2xl space-y-6">
          <TextEffect as="h2" className="text-4xl">
            The Perseus ecosystem brings together our creative solutions.
          </TextEffect>
          <TextEffect as="p" per="line" delay={0.5}>
            Perseus is evolving to be more than just a studio. It supports an
            entire ecosystem from design to development, empowering innovation.
          </TextEffect>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:gap-12 lg:gap-24">
          <div>
            <TextEffect as="p" per="line" delay={0.5}>
              It supports an entire ecosystem, from creative products to digital
              platforms, helping brands and businesses innovate.
            </TextEffect>
            <AnimatedGroup className="mb-12 mt-12 grid grid-cols-2 gap-2 md:mb-0">
              <div className="space-y-4">
                <div className="bg-linear-to-r from-white to-zinc-800 bg-clip-text text-5xl font-bold text-transparent ">
                  +
                  <CountUp
                    from={0}
                    to={1200}
                    separator=","
                    direction="up"
                    duration={1}
                    className="count-up-text"
                  />
                </div>
                <TextEffect as="p">Stars on GitHub</TextEffect>
              </div>
              <div className="space-y-4">
                <div className="bg-linear-to-r from-white to-zinc-800 bg-clip-text text-5xl font-bold text-transparent ">
                  +
                  <CountUp
                    from={0}
                    to={500}
                    separator=","
                    direction="up"
                    duration={1}
                    className="count-up-text"
                  />
                </div>
                <TextEffect as="p">Powered Websites</TextEffect>
              </div>
            </AnimatedGroup>
          </div>
          <AnimatedGroup className="relative">
            <blockquote className="border-l-2 pl-4">
              <TextEffect as="p" per="line" delay={0.5}>
                Partnering with Perseus has been like unlocking a new dimension
                of creativity. It&apos;s the perfect fusion of innovation and
                execution, enabling us to craft digital experiences that are as
                impactful as they are intuitive.
              </TextEffect>

              <div className="mt-6 space-y-3">
                <cite className="block font-medium not-italic">
                  Aryan Ghasemi - CEO {""}
                  <Link href="/">of Perseus Creative Studio</Link>
                </cite>
                <Link href="/">
                  <ImageKit
                    className="w-fit dark:invert"
                    src="/logo-white.png"
                    alt="Perseus Creative Studio Logo"
                    height={50}
                    width={50}
                  />
                </Link>
              </div>
            </blockquote>
          </AnimatedGroup>
        </div>
      </Container>
    </section>
  );
};

export default WebsiteStats;
