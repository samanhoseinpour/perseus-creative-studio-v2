import Link from "next/link";
import { VideoKit, CountUp, Button, AnimatedGroup } from "..";

const HeroProjects = () => {
  return (
    <section className="relative h-[100svh] flex flex-col justify-center">
      <div className="absolute inset-0 -z-10 w-full h-full">
        <VideoKit
          src="/production-hero.mp4/ik-video.mp4"
          alt="Perseus Creative Studio projects reel"
          loading="eager"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30 z-10 pointer-events-none" />
      </div>

      <div className="flex flex-col items-center">
        <AnimatedGroup className="flex flex-col items-center">
          <h1 className="text-4xl leading-4xl sm:text-5xl sm:leading-5xl font-bold mb-4">
            Video Production &amp; Web Design Projects
          </h1>
          <p className="mb-7">
            Selected work showcasing brand storytelling, film production, and
            high‑performance websites for clients worldwide.
          </p>

          <Link href="/projects/realestate">
            <Button size="medium" className="mb-16">
              View Case Studies
            </Button>
          </Link>
        </AnimatedGroup>
        <AnimatedGroup className="flex justify-between w-3/5 max-w-[900px]">
          <HighlightItem title="Countries Served" content={5} />
          <div className="h-full w-[1px] bg-[#fcfcfc]" />
          <HighlightItem title="Clients Partnered" content={25} />
          <div className="h-full w-[1px] bg-[#fcfcfc]" />
          <HighlightItem title="Videos Produced" content={3000} />
          <div className="h-full w-[1px] bg-[#fcfcfc]" />
          <HighlightItem title="Websites Launched" content={10} />
        </AnimatedGroup>
      </div>
    </section>
  );
};

const HighlightItem: React.FC<{ title: string; content: number }> = ({
  title,
  content,
}) => {
  return (
    <div className="flex flex-col items-center gap-4">
      <span className="uppercase text-sm">{title}</span>
      <p className="text-3xl font-bold">
        +
        <CountUp
          from={0}
          to={content}
          separator=","
          direction="up"
          duration={1}
          className="count-up-text"
        />
      </p>
    </div>
  );
};
export default HeroProjects;
