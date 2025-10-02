import { Container, ImageKit, WobbleCard, TextEffect } from "..";

const AboutProcess = () => {
  return (
    <section className="bg-white text-center pt-16 sm:pt-32">
      <Container>
        <TextEffect
          as="h3"
          className="font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl text-black"
        >
          After You Reach Out
        </TextEffect>
        <TextEffect
          as="p"
          per="line"
          delay={0.5}
          className="text-sm font-semibold text-black/70 py-4"
        >
          Here’s what happens next: a structured kickoff to align on goals and
          audiences, a focused build phase with analytics wired in, then launch,
          measurement, and ongoing optimization to scale what works.
        </TextEffect>
        <div
          id="process"
          aria-label="Perseus Creative Studio marketing agency process"
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full mt-6 sm:mt-8"
        >
          <WobbleCard
            containerClassName="col-span-1 lg:col-span-2 h-full bg-pink-800 min-h-[500px] lg:min-h-[300px]"
            className=""
          >
            <div className="max-w-xs">
              <TextEffect
                as="h4"
                className="text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold "
              >
                1) Kickoff & Strategy
              </TextEffect>
              <TextEffect
                as="p"
                per="line"
                delay={0.5}
                className="mt-4 text-left text-sm text-white/70"
              >
                Once you select Perseus Creative Studio as your marketing
                agency, we begin with a structured kickoff. We clarify business
                goals, ideal customer profiles, and positioning, audit your
                channels and analytics, and map the buyer journey. The outcome
                is a data‑driven growth strategy and a 90‑day roadmap across
                SEO, content, paid media, and creative.
              </TextEffect>
            </div>
            <ImageKit
              src="/website-hero.webp"
              width={500}
              height={500}
              alt="Perseus Creative Studio strategy workshop"
              className="absolute -right-4 lg:-right-[40%] grayscale filter -bottom-10 object-contain rounded-2xl"
            />
          </WobbleCard>
          <WobbleCard containerClassName="col-span-1 min-h-[300px]">
            <TextEffect
              as="h4"
              className="max-w-80 text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold "
            >
              2) Build & Create
            </TextEffect>
            <TextEffect
              as="p"
              per="line"
              delay={0.5}
              className="mt-4 max-w-[26rem] text-sm text-left text-white/70"
            >
              We translate strategy into production. Our team delivers on‑brand
              creative, landing pages, and SEO‑optimized content, while
              configuring GA4, pixels, and CRM integrations for clean
              attribution. Assets are shipped with clear timelines and
              collaborative review cycles.
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
              Every quarter we align on results, insights, and ROI, then refresh
              the 90‑day plan. We lock priorities, owners, and metrics so
              execution stays focused and measurable.
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
              We document playbooks, build lightweight SOPs, and train your team
              on tools, workflows, and dashboards. Ownership is clear, with a
              cadence for standups and reviews so momentum continues beyond
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
                We expand winning channels, introduce new creative variants, and
                reallocate budget based on CAC/LTV signals. A structured test
                backlog drives weekly experiments across messaging, offers, and
                funnel steps.
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
                Every quarter we align on results, insights, and ROI, then
                refresh the 90‑day plan. We lock priorities, owners, and metrics
                so execution stays focused and measurable. x
              </TextEffect>
            </div>
            <ImageKit
              src="/website-hero.webp"
              width={500}
              height={500}
              alt="Perseus Creative Studio marketing analytics dashboard"
              className="absolute -right-10 md:-right-[40%] lg:-right-[20%] -bottom-10 object-contain rounded-2xl"
            />
          </WobbleCard>
        </div>
      </Container>
    </section>
  );
};

export default AboutProcess;
