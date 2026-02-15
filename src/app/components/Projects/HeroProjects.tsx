import Link from 'next/link';
import { Button, Container } from '..';

const HeroProjects = () => {
  return (
    <section className="relative h-svh flex flex-col justify-center items-center">
      <div className="absolute inset-0 -z-10 w-full h-full">
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-[56.25vw] min-w-[177.78vh] min-h-full"
            src="https://www.youtube.com/embed/Y9-V8-YECc4?autoplay=1&mute=1&loop=1&playlist=Y9-V8-YECc4&controls=0&modestbranding=1&playsinline=1&rel=0"
            title="Projects hero video"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ border: 0 }}
          />
        </div>
        <div className="absolute inset-0 bg-black/30 z-10 pointer-events-none" />
      </div>

      <Container className="flex flex-col justify-center items-center text-center">
        <div className="flex flex-col justify-center items-center text-white">
          <h1 className="text-4xl leading-4xl sm:text-5xl sm:leading-5xl font-bold mb-4">
            Feature Projects & Highlights
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
