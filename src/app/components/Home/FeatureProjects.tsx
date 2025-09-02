import Link from "next/link";
import { Container, Button, ImageKit, TextEffect, AnimatedGroup } from "../";

const FeatureProjects = () => {
  return (
    <section className="mb-16">
      <Container>
        <div className="flex flex-col gap-2 mb-8">
          <TextEffect
            as="h3"
            className="text-4xl leading-4xl font-bold text-black dark:text-white"
          >
            Feature Projects
          </TextEffect>
          <TextEffect
            as="p"
            per="line"
            delay={0.5}
            className="text-black/30 dark:text-white/30 text-lg leading-lg"
          >
            Creative built for clarity, content designed for impact, and
            strategy that turns bold ideas into measurable results.
          </TextEffect>
        </div>

        <div className="flex flex-col justify-center">
          <div className="flex-center flex-col">
            <div className="feature-video-container mb-4">
              <AnimatedGroup className="overflow-hidden flex-1 h-[65vh] rounded-lg">
                <ImageKit
                  src="/homeServices-4.JPG"
                  alt="aerial construction photo"
                  className="feature-video"
                  loading="lazy"
                  width={800}
                  height={500}
                />
              </AnimatedGroup>
            </div>

            <div className="flex flex-col w-full relative">
              <div className="feature-video-container">
                <AnimatedGroup className="overflow-hidden flex-1 h-[35vh] rounded-lg">
                  <ImageKit
                    src="/homeServices-1.JPG"
                    alt="nani - soccer photo"
                    className="feature-video"
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </AnimatedGroup>
                <AnimatedGroup className="overflow-hidden flex-1 h-[35vh] rounded-lg">
                  <ImageKit
                    src="/homeServices-3.JPG"
                    alt="gym commercial photo"
                    className="feature-video"
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </AnimatedGroup>
              </div>

              <div className="text-black w-full flex-center flex mt-10 gap-5">
                <div className="flex-1 flex-start">
                  <TextEffect as="p" per="line" className="text-lg leading-lg">
                    We’re more than a service provider, we’re dedicated partners
                    in your journey. Immersing ourselves in your vision, we
                    build strategies that grow with your brand. Through every
                    campaign, platform, and creative choice, we’re here to
                    support, adapt, and celebrate each success together.
                  </TextEffect>
                  <div className="flex flex-col">
                    <Link href="/projects" className="mt-5">
                      <Button size="small">Deep Dive into Our Projects</Button>
                    </Link>
                  </div>
                </div>

                <div className="flex-1 flex-start">
                  <TextEffect as="p" per="line" className="text-lg leading-lg">
                    In a world of predictable media, staying relevant means
                    breaking the mold. We fuse creativity with strategy to craft
                    experiences that captivate and inspire. Every project is
                    designed to be fresh, memorable, and anything but ordinary.
                    In a world of predictable media, staying relevant means
                    breaking the mold. We fuse creativity with strategy to craft
                    experiences that captivate and inspire. Every project is
                    designed to be fresh, memorable, and anything but ordinary.
                  </TextEffect>
                </div>
              </div>

              <div className="feature-video-container mt-12">
                <AnimatedGroup className="overflow-hidden flex-1 h-[35vh] rounded-lg">
                  <ImageKit
                    src="/homeServices-2.JPG"
                    alt="excavator machine in construction"
                    className="feature-video "
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </AnimatedGroup>
                <AnimatedGroup className="overflow-hidden flex-1 h-[35vh] rounded-lg">
                  <ImageKit
                    src="/homeServices-1.JPG"
                    alt="drone image of a real estate"
                    className="feature-video"
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </AnimatedGroup>
              </div>

              <div className="feature-video-container mt-4 mb-8">
                <AnimatedGroup className="overflow-hidden flex-1 h-[65vh] rounded-lg">
                  <ImageKit
                    src="/homeServices-3.JPG"
                    alt="real estate image"
                    className="feature-video"
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </AnimatedGroup>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default FeatureProjects;
