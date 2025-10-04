import { Container, ImageKit, WobbleCard, TextEffect } from "..";

const AboutProcess = () => {
  return (
    <section className="bg-white">
      <Container>
        <TextEffect
          as="h3"
          className="font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl text-black"
        >
          How We Work
        </TextEffect>
        <TextEffect
          as="p"
          per="line"
          delay={0.5}
          className="text-sm font-semibold text-black/70 py-4"
        >
          Our operating rhythm is simple: align on outcomes fast, plan
          deliberately, build with focus, then launch and iterate based on
          signal—not noise. Clear owners, tight feedback loops, and measurable
          results at every step.
        </TextEffect>
        <div
          id="how-we-work"
          aria-label="Perseus Creative Studio — how we work"
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full mt-6 sm:mt-8"
        >
          <WobbleCard containerClassName="col-span-1 lg:col-span-2 h-full bg-pink-800 min-h-[500px] lg:min-h-[300px]">
            <div className="max-w-xs">
              <TextEffect
                as="h4"
                className="text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold "
              >
                1) Discover & Align
              </TextEffect>
              <TextEffect
                as="p"
                per="line"
                delay={0.5}
                className="mt-4 text-left text-sm text-white/70"
              >
                We begin with structured discovery. We clarify business
                objectives, ICPs, and positioning, audit channels and analytics,
                and map the buyer journey with success metrics. The output is a
                data‑driven growth strategy and a 90‑day plan across SEO,
                content, paid media, and creative.
              </TextEffect>
            </div>
            <ImageKit
              src="/website-hero.webp"
              width={500}
              height={500}
              alt="Perseus Creative Studio discovery workshop"
              className="absolute -right-4 lg:-right-[40%] grayscale filter -bottom-10 object-contain rounded-2xl"
            />
          </WobbleCard>
          <WobbleCard containerClassName="col-span-1 min-h-[300px]">
            <TextEffect
              as="h4"
              className="max-w-80 text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold "
            >
              2) Build & Integrate
            </TextEffect>
            <TextEffect
              as="p"
              per="line"
              delay={0.5}
              className="mt-4 max-w-[26rem] text-sm text-left text-white/70"
            >
              We translate strategy into production. On‑brand creative, landing
              pages, and SEO‑optimized content are built while GA4, pixels, and
              CRM integrations are configured for clean attribution. Work ships
              on clear timelines with collaborative reviews.
            </TextEffect>
          </WobbleCard>
          <WobbleCard containerClassName="col-span-1 min-h-[300px] bg-slate-900">
            <TextEffect
              as="h4"
              className="max-w-80 text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold "
            >
              3) Launch, Measure & Optimize
            </TextEffect>
            <TextEffect
              as="p"
              per="line"
              delay={0.5}
              className="mt-4 max-w-[26rem] text-sm text-left text-white/70"
            >
              We launch to production, validate tracking, and watch early
              signals closely. Weekly cycles optimize creatives, bids,
              audiences, and funnel steps to drive CAC/LTV efficiency.
            </TextEffect>
          </WobbleCard>

          <WobbleCard containerClassName="col-span-1 min-h-[300px] bg-cyan-900">
            <TextEffect
              as="h4"
              className="max-w-80 text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold "
            >
              4) Enable & Handover
            </TextEffect>
            <TextEffect
              as="p"
              per="line"
              delay={0.5}
              className="mt-4 max-w-[26rem] text-sm text-left text-white/70"
            >
              We document playbooks, create lightweight SOPs, and train your
              team on tools, workflows, and dashboards. Ownership is explicit
              and the operating cadence is set so momentum continues beyond
              launch.
            </TextEffect>
          </WobbleCard>

          <WobbleCard containerClassName="col-span-1 bg-slate-900 min-h-[300px]">
            <div className="max-w-sm">
              <TextEffect
                as="h4"
                className="max-w-sm md:max-w-lg text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold"
              >
                5) Scale & Experiment
              </TextEffect>
              <TextEffect
                as="p"
                delay={0.5}
                per="line"
                className="mt-4 max-w-[26rem] text-left text-sm text-white/70"
              >
                We scale what works, introduce new creative variants, and
                reallocate budget based on CAC/LTV signals. A prioritized test
                backlog drives weekly experiments across messaging, offers,
                channels, and funnel steps.
              </TextEffect>
            </div>
          </WobbleCard>
          <WobbleCard containerClassName="col-span-1 lg:col-span-3 bg-blue-900 min-h-[500px] lg:min-h-[600px] xl:min-h-[300px]">
            <div className="max-w-sm">
              <TextEffect
                as="h4"
                className="max-w-sm md:max-w-lg text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold "
              >
                6) Quarterly Review & Roadmap
              </TextEffect>
              <TextEffect
                as="p"
                delay={0.5}
                per="line"
                className="mt-4 max-w-[26rem] text-left text-sm text-white/70"
              >
                Once a quarter we step back for a business review—performance,
                insights, and ROI—then recalibrate the 90‑day roadmap. We lock
                priorities, budgets, owners, and KPIs so execution stays focused
                and measurable.
              </TextEffect>
            </div>
            <ImageKit
              src="/website-hero.webp"
              width={500}
              height={500}
              alt="Perseus Creative Studio growth analytics dashboard"
              className="absolute -right-10 md:-right-[40%] lg:-right-[20%] -bottom-10 object-contain rounded-2xl"
            />
          </WobbleCard>
        </div>
      </Container>
    </section>
  );
};

export default AboutProcess;
