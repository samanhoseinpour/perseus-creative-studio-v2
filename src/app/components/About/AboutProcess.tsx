import { Container, ImageKit, WobbleCard, TextEffect } from "..";

type Card = {
  containerClassName: string;
  title: string;
  titleClass?: string;
  body: string;
  bodyClass?: string;
  wrapperClass?: string;
  image?: {
    src: string;
    width: number;
    height: number;
    alt: string;
    className?: string;
  };
};

const AboutProcess = () => {
  const cards: Card[] = [
    {
      containerClassName:
        "col-span-1 lg:col-span-2 h-full bg-pink-800 min-h-[500px] lg:min-h-[300px]",
      title: "1) Discover & Align",
      titleClass: "",
      body: "We begin with structured discovery. We clarify business objectives, ICPs, and positioning, audit channels and analytics, and map the buyer journey with success metrics. The output is a data‑driven growth strategy and a 90‑day plan across SEO, content, paid media, and creative.",
      bodyClass: "",
      wrapperClass: "max-w-xs",
      image: {
        src: "/website-hero.webp",
        width: 500,
        height: 500,
        alt: "Perseus Creative Studio discovery workshop",
        className:
          "absolute -right-4 lg:-right-[40%] grayscale filter -bottom-10 object-contain rounded-2xl",
      },
    },
    {
      containerClassName: "col-span-1 min-h-[300px]",
      title: "2) Build & Integrate",
      titleClass: "max-w-80",
      body: "We translate strategy into production. On‑brand creative, landing pages, and SEO‑optimized content are built while GA4, pixels, and CRM integrations are configured for clean attribution. Work ships on clear timelines with collaborative reviews.",
      bodyClass: "max-w-[26rem]",
    },
    {
      containerClassName: "col-span-1 min-h-[300px] bg-slate-900",
      title: "3) Launch, Measure & Optimize",
      titleClass: "max-w-80",
      body: "We launch to production, validate tracking, and watch early signals closely. Weekly cycles optimize creatives, bids, audiences, and funnel steps to drive CAC/LTV efficiency.",
      bodyClass: "max-w-[26rem]",
    },
    {
      containerClassName: "col-span-1 min-h-[300px] bg-cyan-900",
      title: "4) Enable & Handover",
      titleClass: "max-w-80",
      body: "We document playbooks, create lightweight SOPs, and train your team on tools, workflows, and dashboards. Ownership is explicit and the operating cadence is set so momentum continues beyond launch.",
      bodyClass: "max-w-[26rem]",
    },
    {
      containerClassName: "col-span-1 bg-slate-900 min-h-[300px]",
      title: "5) Scale & Experiment",
      titleClass: "max-w-sm md:max-w-lg",
      body: "We scale what works, introduce new creative variants, and reallocate budget based on CAC/LTV signals. A prioritized test backlog drives weekly experiments across messaging, offers, channels, and funnel steps.",
      bodyClass: "max-w-[26rem]",
      wrapperClass: "max-w-sm",
    },
    {
      containerClassName:
        "col-span-1 lg:col-span-3 bg-blue-900 min-h-[500px] lg:min-h-[600px] xl:min-h-[300px]",
      title: "6) Quarterly Review & Roadmap",
      titleClass: "max-w-sm md:max-w-lg",
      body: "Once a quarter we step back for a business review—performance, insights, and ROI—then recalibrate the 90‑day roadmap. We lock priorities, budgets, owners, and KPIs so execution stays focused and measurable.",
      bodyClass: "max-w-[26rem]",
      wrapperClass: "max-w-sm",
      image: {
        src: "/website-hero.webp",
        width: 500,
        height: 500,
        alt: "Perseus Creative Studio growth analytics dashboard",
        className:
          "absolute -right-10 md:-right-[40%] lg:-right-[20%] -bottom-10 object-contain rounded-2xl",
      },
    },
  ];

  return (
    <section className="bg-white text-black pb-16 sm:pb-32">
      <Container className="border-t">
        <TextEffect
          as="span"
          className="-ml-6 -mt-3.5 block w-max bg-gray-50 px-6 dark:bg-gray-950"
        >
          How We Work
        </TextEffect>
        <TextEffect
          as="h3"
          className="mt-12 sm:mt-24 font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl "
        >
          How We Work
        </TextEffect>
        <TextEffect
          as="p"
          per="line"
          delay={0.5}
          className="text-sm font-semibold text-black/70 pb-4"
        >
          Our operating rhythm is simple: align on outcomes fast, plan
          deliberately, build with focus, then launch and iterate based on
          signal—not noise.
        </TextEffect>
        <div
          id="how-we-work"
          aria-label="Perseus Creative Studio — how we work"
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full mt-6 sm:mt-8"
        >
          {cards.map((card, idx) => (
            <WobbleCard key={idx} containerClassName={card.containerClassName}>
              {card.wrapperClass ? (
                <div className={card.wrapperClass}>
                  <TextEffect
                    as="h4"
                    className={`text-white text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold ${
                      card.titleClass ?? ""
                    }`}
                  >
                    {card.title}
                  </TextEffect>
                  <TextEffect
                    as="p"
                    per="line"
                    delay={0.5}
                    className={`mt-4 text-left text-sm text-white/70 ${
                      card.bodyClass ?? ""
                    }`}
                  >
                    {card.body}
                  </TextEffect>
                </div>
              ) : (
                <>
                  <TextEffect
                    as="h4"
                    className={`text-white text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold ${
                      card.titleClass ?? ""
                    }`}
                  >
                    {card.title}
                  </TextEffect>
                  <TextEffect
                    as="p"
                    per="line"
                    delay={0.5}
                    className={`mt-4 text-left text-sm text-white/70 ${
                      card.bodyClass ?? ""
                    }`}
                  >
                    {card.body}
                  </TextEffect>
                </>
              )}

              {card.image && (
                <ImageKit
                  src={card.image.src}
                  width={card.image.width}
                  height={card.image.height}
                  alt={card.image.alt}
                  className={card.image.className}
                />
              )}
            </WobbleCard>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default AboutProcess;
