import { VideoKit, CountUp, Button } from "..";

const HeroProjects = () => {
  return (
    <section className="relative h-[100svh] flex flex-col justify-center">
      <div className="absolute inset-0 -z-10 w-full h-full">
        <VideoKit
          src="/production-hero.mp4/ik-video.mp4"
          alt="Real Estate Video"
          loading="eager"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30 z-10 pointer-events-none" />
      </div>

      <div className="flex flex-col items-center">
        <div className="flex flex-col items-center">
          <h1 className="text-5xl leading-5xl font-bold mb-4">
            Creativity Without Border
          </h1>
          <p className="mb-7">Behind Every Iconic Brand Is a Visionary Team.</p>

          <Button size="medium" className="mb-16">
            Let’s Create Something Extraordinary
          </Button>
        </div>
        <div className="flex justify-between w-3/5 max-w-[900px]">
          <HighlightItem title="Countries" content={5} />
          <div className="h-full w-[1px] bg-[#fcfcfc]" />
          <HighlightItem title="Clients" content={25} />
          <div className="h-full w-[1px] bg-[#fcfcfc]" />
          <HighlightItem title="Videos Produced" content={3000} />
          <div className="h-full w-[1px] bg-[#fcfcfc]" />
          <HighlightItem title="Websites Developed" content={10} />
        </div>
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
