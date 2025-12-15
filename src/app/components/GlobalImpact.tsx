import Link from "next/link";
import { Container, Button } from "./";

type TextBlock = {
  title: string;
  body: string;
};

interface PrimaryColumnProps {
  blocks: [TextBlock, TextBlock];
  videoSrc: string;
  videoAlt?: string;
}

interface CardProps {
  title: string;
  body: string;
  imageSrc: string;
  imageAlt?: string;
}

interface CardsColumnProps {
  top: CardProps;
  middle: CardProps;
}

interface RightColumnProps {
  heading: string;
  body: string;
  sections: TextBlock[];
}

export interface GlobalImpactProps {
  primaryColumn?: PrimaryColumnProps;
  cardsColumn?: CardsColumnProps;
  rightColumn?: RightColumnProps;
}

const defaultPrimaryColumn: PrimaryColumnProps = {
  blocks: [
    {
      title: "Global Reach and Expertise",
      body: "At Perseus Creative Studio, we push creative boundaries to deliver impactful projects worldwide. Our work spans Asia, the Middle East, and North America, including filming the world’s largest soccer tournament in North Carolina.",
    },
    {
      title: "Innovative Solutions for Every Challenge",
      body: "At Perseus Creative Studio, we believe that every project presents a unique challenge. We specialize in crafting innovative and tailored solutions to overcome those challenges and bring your vision to life. Our team works across various industries, offering expertise in digital design, web development, and creative strategy. Whether you're looking to design immersive websites, develop cutting-edge mobile apps, or create unique visual content, we approach each task with a combination of creativity, precision, and deep technical knowledge.",
    },
  ],
  videoSrc: "../../assets/videos/vertical/timeline-1.mp4",
  videoAlt: "global reach and expertise video",
};

const defaultCardsColumn: CardsColumnProps = {
  top: {
    title: "Versatile Expertise",
    body: "From producing high-quality content for local businesses in British Columbia and Ontario to collaborating with international petroleum companies, we have proven our adaptability and expertise across various industries and projects.",
    imageSrc: "/navbar-services.jpg",
    imageAlt: "Versatile expertise visual",
  },
  middle: {
    title: "Diverse Portfolio and Industry Collaboration",
    body: "Our project experience ranges from focused local shoots to large-scale, multi-city and international campaigns. We work with clients across Canada, the United States, and the UAE, operating from our bases in Vancouver and Los Angeles. Every project is approached with flexibility and care, allowing us to tailor our process to each client’s specific goals and requirements.",
    imageSrc: "/navbar-home.jpg",
    imageAlt: "Diverse portfolio visual",
  },
};

const defaultRightColumn: RightColumnProps = {
  heading: "Turning Ideas Into Reality",
  body: "Whether working on personal branding for small businesses or spearheading major campaigns for development companies, our dedicated team excels in transforming ideas into compelling content. With creativity, precision, and an unwavering commitment to excellence, we ensure that each project leaves an unforgettable impression.",
  sections: [
    {
      title: "Shaping Your Vision",
      body: "We specialize in crafting innovative and tailored solutions to bring your unique ideas to life. Whether it’s design, development, or creative strategy, our goal is to turn your vision into impactful realities that exceed expectations.",
    },
    {
      title: "Bringing Ideas Alive",
      body: "Transforming creative concepts into functional, tangible designs is our expertise. From initial brainstorming to final execution, we ensure every detail inspires and delivers exceptional value to your project.",
    },
  ],
};

const GlobalImpact = ({
  primaryColumn = defaultPrimaryColumn,
  cardsColumn = defaultCardsColumn,
  rightColumn = defaultRightColumn,
}: GlobalImpactProps) => {
  const [primaryBlockOne, primaryBlockTwo] = primaryColumn.blocks;

  return (
    <section className="pb-16 sm:pb-32">
      <Container>
        <div className="grid gap-4 lg:grid-cols-3 lg:grid-rows-2">
          <div className="relative lg:row-span-2 bg-black rounded-lg">
            <div className="relative flex h-full flex-col overflow-hidden">
              <div className="p-8">
                <h4 className="mt-2 text-xl leading-xl font-semibold text-white">
                  {primaryBlockOne.title}
                </h4>
                <p className="mt-2 text-sm leading-sm text-white/70">
                  {primaryBlockOne.body}
                </p>
              </div>
              <div className="p-8 text-white">
                <h4 className="mt-2 text-xl leading-xl font-semibold">
                  {primaryBlockTwo.title}
                </h4>
                <p className="mt-4 text-sm leading-sm text-white/70">
                  {primaryBlockTwo.body}
                </p>
              </div>
              <div className="p-8">
                <Link href="/contact">
                  <Button className="w-full">Discuss Your Project</Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="relative max-lg:row-start-1">
            <div className="absolute inset-px rounded-lg bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden">
              <div className="p-8">
                <h4 className="mt-2 text-xl leading-xl font-semibold text-black">
                  {cardsColumn.top.title}
                </h4>
                <p className="mt-4 text-black/70 text-sm leading-sm">
                  {cardsColumn.top.body}
                </p>
                <div className="pt-8">
                  <Link href="/contact">
                    <Button className="w-full">Request a Consultation</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="relative max-lg:row-start-3 lg:col-start-2 lg:row-start-2">
            <div className="relative flex h-full flex-col overflow-hidden bg-black rounded-lg">
              <div className="p-8">
                <h4 className="mt-2 text-xl leading-xl font-semibold text-white">
                  {cardsColumn.middle.title}
                </h4>
                <p className="mt-4 text-sm leading-sm text-white/70">
                  {cardsColumn.middle.body}
                </p>
              </div>
            </div>
          </div>

          <div className="relative lg:row-span-2">
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl bg-white">
              <div className="px-8 pb-3 pt-8 sm:px-10 sm:pb-0 sm:pt-10 ">
                <h4 className="mt-2 text-xl leading-xl font-semibold text-black">
                  {rightColumn.heading}
                </h4>
                <p className="mt-4 text-sm leading-sm text-black/70">
                  {rightColumn.body}
                </p>
              </div>
              <div className="relative min-h-120 w-full grow">
                <div className="absolute bottom-0 left-10 right-0 top-10 overflow-hidden rounded-tl-xl shadow-2xl">
                  <div className="flex ring-1 ring-black/5">
                    <div className="-mb-px flex">
                      <div className="border-b border-r border-b-black/5 bg-black/5 px-4 py-2 text-black text-sm leading-sm">
                        {rightColumn.sections[0]?.title}
                      </div>
                      <div className="px-4 py-2 text-black opacity-40 text-sm leading-sm">
                        {rightColumn.sections[1]?.title}
                      </div>
                    </div>
                  </div>
                  <div className="p-8">
                    <div>
                      {rightColumn.sections.map((section) => (
                        <div className="mb-8" key={section.title}>
                          <h5 className="text-black text-md leading-md mb-4">
                            {section.title}
                          </h5>
                          <p className="text-xs leading-xs text-black/70">
                            {section.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default GlobalImpact;
