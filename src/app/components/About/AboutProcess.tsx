import { Container, ImageKit, WobbleCard, Heading } from "..";

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
      title: "1) Discover",
      titleClass: "",
      body: "Every great project starts with understanding. We take the time to learn about your business, audience, and goals — what makes you different, what challenges you face, and what results matter most. This discovery phase shapes everything that follows and ensures every creative decision is built on purpose, not assumption.",
      bodyClass: "",
      wrapperClass: "max-w-sm",
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
      title: "2) Strategize",
      titleClass: "max-w-80",
      body: "Once we understand your vision, we turn insight into action. We build a clear strategy that connects creativity to real-world results — from defining your brand voice to mapping your content and marketing goals. Whether it’s a rebrand, a new website, or a full media campaign, every move we make has direction and intent.",
      bodyClass: "max-w-[26rem]",
    },
    {
      containerClassName: "col-span-1 min-h-[300px] bg-slate-900",
      title: "3) Create",
      titleClass: "max-w-80",
      body: "This is where ideas come alive. Our creative team designs, films, and crafts the visuals that tell your story — cinematic video, photography, brand identity, or social content that captures attention and builds connection. Every frame, every color, every word is crafted to reflect who you are and inspire your audience to act.",
      bodyClass: "max-w-[26rem]",
    },
    {
      containerClassName: "col-span-1 min-h-[300px] bg-cyan-900",
      title: "4) Develop",
      titleClass: "max-w-80",
      body: "Turning vision into reality means flawless execution. Our developers and editors build everything from scratch — custom WordPress or Next.js websites, high-end edits, and optimized content systems that perform beautifully on every screen. We merge aesthetics with functionality so your digital presence looks and works exactly how it should.",
      bodyClass: "max-w-[26rem]",
    },
    {
      containerClassName: "col-span-1 bg-slate-900 min-h-[300px]",
      title: "5) Refine",
      titleClass: "max-w-sm md:max-w-lg",
      body: "We believe the difference is in the details. After production, our team fine-tunes every element — from transitions and timing to color grading, copy, and code — ensuring the final output meets the highest creative and technical standards. We also review feedback and make revisions so you’re completely confident in the final result.",
      bodyClass: "max-w-[26rem]",
      wrapperClass: "max-w-sm",
    },
    {
      containerClassName:
        "col-span-1 lg:col-span-3 bg-blue-900 min-h-[500px] lg:min-h-[600px] xl:min-h-[300px]",
      title: "6) Deliver & Support",
      titleClass: "max-w-sm md:max-w-lg",
      body: "Once everything is complete, we deliver your final assets in the formats and platforms you need — fully optimized for performance, clarity, and quality. But our work doesn’t end at delivery. We stay connected to help you manage updates, track results, and keep your brand evolving long after launch.",
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
      <Heading
        titleTag="h3"
        title="How We Work"
        seperatorTitle="Our Process"
        description="Our operating rhythm is simple: align on outcomes fast, plan
        deliberately, build with focus, then launch and iterate based on
        signal—not noise."
      />
      <Container>
        <div
          id="how-we-work"
          aria-label="our process — how we work"
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full mt-6 sm:mt-8"
        >
          {cards.map((card, idx) => (
            <WobbleCard key={idx} containerClassName={card.containerClassName}>
              {card.wrapperClass ? (
                <div className={card.wrapperClass}>
                  <h4
                    className={`text-white text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold ${
                      card.titleClass ?? ""
                    }`}
                  >
                    {card.title}
                  </h4>
                  <p
                    className={`mt-4 text-left text-sm text-white/70 ${
                      card.bodyClass ?? ""
                    }`}
                  >
                    {card.body}
                  </p>
                </div>
              ) : (
                <>
                  <h4
                    className={`text-white text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold ${
                      card.titleClass ?? ""
                    }`}
                  >
                    {card.title}
                  </h4>
                  <p
                    className={`mt-4 text-left text-sm text-white/70 ${
                      card.bodyClass ?? ""
                    }`}
                  >
                    {card.body}
                  </p>
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
