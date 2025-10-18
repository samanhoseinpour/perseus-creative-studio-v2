import Link from "next/link";
import { Button, Container, YoutubePlayer } from "../";

const HeroSection = () => {
  return (
    <Container className="flex flex-col">
      <div className="mt-24 sm:mt-32 gap-4 sm:grid sm:grid-cols-2">
        <div className="sm:w-3/5 text-white">
          <h1 className="text-4xl leading-4xl font-bold sm:text-5xl sm:leading-5xl">
            All-in-One Creative Solutions
          </h1>
        </div>
        <div className="mt-6 sm:mt-0 text-white/70 text-sm font-semibold">
          <p>
            We bring everything your brand needs under one roof — strategy,
            design, video, web, and marketing that work together seamlessly. Our
            team combines creativity with structure, building clear strategies
            that connect visuals, messaging, and technology. From concept to
            launch, we keep everything aligned so your brand looks, feels, and
            performs consistently across every platform.
          </p>
          <p className="mt-4">
            Every project starts with understanding your goals and ends with
            delivering results. We focus on what matters most — helping your
            business stand out, attract the right audience, and grow. Whether
            it’s a cinematic brand story, a high-performing website, or a social
            campaign, we make sure every piece serves a purpose.
          </p>
          <p className="mt-3">
            Built for brands of every size and industry, our process is fast,
            flexible, and focused on results. We specialize in brand strategy,
            website design, video production, photography, social media, and
            advertising — all connected through one creative process that drives
            measurable growth and lasting impact.
          </p>

          <div className="mt-8 flex items-center justify-start gap-4">
            <Link href="/contact">
              <Button size="medium">Get a proposal</Button>
            </Link>

            <Link href="/projects">
              <Button size="medium">View work</Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-12">
        <YoutubePlayer
          videoId="T8FWp9bSkq4"
          title="A Guide For How Use Our Services"
        />
      </div>
    </Container>
  );
};

export default HeroSection;
