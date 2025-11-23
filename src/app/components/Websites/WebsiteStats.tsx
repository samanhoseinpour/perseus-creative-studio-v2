import Link from "next/link";
import { ImageKit, Container, CountUp } from "..";

const WebsiteStats = () => {
  return (
    <section className="mb-32">
      <Container className="space-y-8 md:space-y-12">
        <div className="relative z-10 max-w-2xl space-y-6">
          <h2 className="text-4xl font-semibold">
            Results from our website &amp; automation projects
          </h2>
          <p>
            We measure our work in faster sites, clearer funnels, and less
            manual work for your team&mdash;not just in how a page looks on
            launch day.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:gap-12 lg:gap-24">
          <div>
            <p>
              When design, development, and automation work together, your
              website shifts from a static brochure to a 24/7 growth channel and
              operations assistant.
            </p>
            <div className="mb-12 mt-12 grid grid-cols-2 gap-2 md:mb-0">
              <div className="space-y-4">
                <div className="bg-linear-to-r from-white to-zinc-800 bg-clip-text text-5xl font-bold text-transparent ">
                  +
                  <CountUp
                    from={0}
                    to={38}
                    separator=","
                    direction="up"
                    duration={1}
                    className="count-up-text"
                  />
                </div>
                <p>Average lift in key conversion rates</p>
              </div>
              <div className="space-y-4">
                <div className="bg-linear-to-r from-white to-zinc-800 bg-clip-text text-5xl font-bold text-transparent ">
                  +
                  <CountUp
                    from={0}
                    to={120}
                    separator=","
                    direction="up"
                    duration={1}
                    className="count-up-text"
                  />
                </div>
                <p>Hours saved per month through automation</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <blockquote className="border-l-2 pl-4">
              <p>
                When we align strategy, design, development, and automation,
                websites stop being static brochures. They become living systems
                that capture demand, qualify leads, and route work to the right
                people automatically.
              </p>

              <div className="mt-6 space-y-3">
                <cite className="block font-medium not-italic">
                  <Link href="/">Perseus Creative Studio</Link>
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
          </div>
        </div>
      </Container>
    </section>
  );
};

export default WebsiteStats;
