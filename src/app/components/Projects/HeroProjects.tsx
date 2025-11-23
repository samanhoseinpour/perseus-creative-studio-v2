import Link from "next/link";
import { VideoKit, CountUp, Button, Container } from "..";

const HeroProjects = () => {
  return (
    <section className="relative h-svh flex flex-col justify-center items-center">
      <div className="absolute inset-0 -z-10 w-full h-full">
        <VideoKit
          src="projects-hero.mp4"
          alt="Perseus Creative Studio projects reel"
          loading="eager"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30 z-10 pointer-events-none" />
      </div>

      <Container className="flex flex-col justify-center items-center text-center">
        <div className="flex flex-col justify-center items-center">
          <h1 className="text-4xl leading-4xl sm:text-5xl sm:leading-5xl font-bold mb-4">
            Perseus Visual Production Highlights.
          </h1>
          <p className="mb-7">
            Selected work showcasing brand storytelling, film production, and
            visual content for clients worldwide.
          </p>

          <Link href="/contact">
            <Button size="medium" className="mb-16">
              Discuss Your Next Production
            </Button>
          </Link>
        </div>
        <div className="flex justify-between items-center w-3/5">
          <HighlightItem title="Countries Served" content={5} />
          <div className="h-full w-px bg-white" />
          <HighlightItem title="Clients Partnered" content={70} />
          <div className="h-full w-px bg-white" />
          <HighlightItem title="Videos Produced" content={3000} />
          <div className="h-full w-px bg-white" />
          <HighlightItem title="Campaigns Delivered" content={48} />
        </div>
      </Container>
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
      <p className="text-2xl leading-2xl font-semibold">
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
