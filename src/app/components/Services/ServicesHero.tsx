import Link from "next/link";
import { Button, Container, YoutubePlayer, AuroraBackground } from "../";

const HeroSection = () => {
  return (
    <>
      <AuroraBackground>
        <div className="overflow-hidden ">
          <div className="pt-24 md:pt-36">
            <Container>
              <div className="mt-12 gap-4 sm:grid sm:grid-cols-2">
                <div className="sm:w-3/5 text-white">
                  <h1 className="text-4xl leading-4xl font-bold sm:text-5xl sm:leading-5xl">
                    All In One Solutions
                  </h1>
                </div>
                <div className="mt-6 sm:mt-0 text-white/70 text-sm font-semibold">
                  <p>
                    From brand identity and UI/UX to Webflow & Next.js
                    development, we design and launch conversion‑ready websites
                    that scale. Strategy, content, and technical SEO
                    included—delivered in focused sprints.
                  </p>
                  <p className="mt-4">
                    <strong className="text-white">Core services:</strong> Brand
                    identity, product strategy, UX research, interface design,
                    design systems, Webflow builds, Next.js apps, headless CMS
                    implementation, content design & copywriting, technical SEO,
                    performance optimization, and analytics.
                  </p>
                  <p className="mt-3">
                    We partner through focused sprints or retainers with clear
                    milestones, rapid feedback cycles, and measurable
                    outcomes—so you ship faster and scale confidently.
                  </p>

                  <div className="mt-8 flex items-center justify-start gap-4">
                    <Link href="/contact">
                      <Button size="medium">Get a proposal</Button>
                    </Link>

                    <Link href="/projects">
                      <Button size="medium">View work</Button>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="mask-b-from-45% relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <YoutubePlayer
                  videoId="T8FWp9bSkq4"
                  title="A Guide For How Use Our Services"
                />
              </div>
            </Container>
          </div>
        </div>
      </AuroraBackground>
    </>
  );
};

export default HeroSection;
