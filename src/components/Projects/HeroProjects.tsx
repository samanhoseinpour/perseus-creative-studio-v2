import Link from 'next/link';
import { Button, Container, Heading } from '..';

const HeroProjects = () => {
  return (
    <section className="relative h-svh flex flex-col justify-center items-center">
      <div className="absolute inset-0 -z-10 w-full h-full">
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-[56.25vw] min-w-[177.78vh] min-h-full"
            src="https://www.youtube.com/embed/pNBloFopGs8?autoplay=1&mute=1&loop=1&playlist=pNBloFopGs8&controls=0&modestbranding=1&playsinline=1&rel=0"
            title="Projects hero video"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ border: 0 }}
          />
        </div>
        <div className="absolute inset-0 bg-white/30 z-10 pointer-events-none" />
      </div>

      <Container className="relative flex flex-col justify-center items-center text-center">
        <Heading
          titleTag="h1"
          seperatorTitle="Projects"
          eyebrowRight="Featured Work"
          title="Feature Projects"
          titleAccent="& Highlights"
          description="Selected work showcasing brand storytelling, film production, and visual content for clients worldwide."
          containerStyle="px-0 md:px-0 w-full max-w-none items-center text-center"
          titleStyle="max-w-4xl text-center text-4xl md:text-5xl text-black"
          descStyle="max-w-2xl text-center text-black/70"
        />
        <div className="mt-8">
          <Link href="/contact">
            <Button size="medium">Discuss Your Next Production</Button>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export default HeroProjects;
