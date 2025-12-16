import Link from "next/link";
import { VideoKit, Button, Container } from "..";

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
            Perseus Visual Production Highlights
          </h1>
          <p className="mb-7 text-sm leading-sm">
            Selected work showcasing brand storytelling, film production, and
            visual content for clients worldwide.
          </p>

          <Link href="/contact">
            <Button size="medium" className="mb-16">
              Discuss Your Next Production
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export default HeroProjects;
