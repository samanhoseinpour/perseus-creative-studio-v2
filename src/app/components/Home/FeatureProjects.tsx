import Link from "next/link";
import { Container, Button, ImageKit } from "../";

const FeatureProjects = () => {
  return (
    <section className="mb-16">
      <Container>
        <div className="flex flex-col gap-2 mb-8">
          <h3 className="text-4xl leading-4xl font-bold text-black dark:text-white">
            Feature Projects
          </h3>
          <p className="text-black/30 dark:text-white/30 text-lg leading-lg">
            Creative built for clarity, content designed for impact, and
            strategy that turns bold ideas into measurable results.
          </p>
        </div>

        <div className="flex flex-col justify-center">
          <div className="flex-center flex-col">
            <div className="feature-video-container mb-4">
              <div className="overflow-hidden flex-1 h-[65vh] rounded-lg">
                <ImageKit
                  src="/homeServices-4.JPG"
                  alt="aerial construction photo"
                  className="feature-video"
                  loading="lazy"
                  width={800}
                  height={500}
                />
              </div>
            </div>

            <div className="flex flex-col w-full relative">
              <div className="feature-video-container">
                <div className="overflow-hidden flex-1 h-[55vh] rounded-lg">
                  <ImageKit
                    src="/homeServices-1.JPG"
                    alt="nani - soccer photo"
                    className="feature-video"
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </div>
                <div className="overflow-hidden flex-1 h-[55vh] rounded-lg">
                  <ImageKit
                    src="/homeServices-3.JPG"
                    alt="gym commercial photo"
                    className="feature-video"
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </div>
              </div>

              <div className="text-black w-full flex-center flex mt-10 md:mt-16 gap-5">
                <div className="flex-1 flex-start">
                  <p className="text-lg leading-lg">
                    We’re more than a{" "}
                    <span className="font-semibold">service provider</span>,
                    we’re dedicated partners in your journey. Immersing
                    ourselves{" "}
                    <span className="font-semibold">in your vision, </span>
                    we build strategies that grow with your brand.
                    <br />
                    <br />
                    Through every campaign, platform, and creative choice,{" "}
                    <span className="font-semibold">we’re here to</span>{" "}
                    support, adapt, and celebrate each success together.
                  </p>
                </div>

                <div className="flex-1 flex-start">
                  <p className="text-lg leading-lg">
                    In a world of predictable media, staying relevant means
                    breaking the mold. <br /> We fuse{" "}
                    <span className="font-semibold">
                      creativity with strategy
                    </span>{" "}
                    to craft experiences that captivate and inspire.
                    <br />
                    <br />
                    Every project is designed to be fresh, memorable, and
                    anything but ordinary.
                  </p>
                </div>
              </div>

              <div className="feature-video-container mt-12">
                <div className="overflow-hidden flex-1 h-[55vh] rounded-lg">
                  <ImageKit
                    src="/homeServices-2.JPG"
                    alt="excavator machine in construction"
                    className="feature-video "
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </div>
                <div className="overflow-hidden flex-1 h-[55vh] rounded-lg">
                  <ImageKit
                    src="/homeServices-1.JPG"
                    alt="drone image of a real estate"
                    className="feature-video"
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </div>
              </div>

              <div className="feature-video-container mt-4 mb-8">
                <div className="overflow-hidden flex-1 h-[65vh] rounded-lg">
                  <ImageKit
                    src="/homeServices-3.JPG"
                    alt="real estate image"
                    className="feature-video"
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-col justify-center items-center text-center">
          <Link href="/projects">
            <Button size="medium" className="mb-4">
              Deep Dive into Our Projects
            </Button>
          </Link>
          <p className="text-black dark:text-white">
            Explore Our Portfolio and Discover the Art of Visual Storytelling.
          </p>
        </div>
      </Container>
    </section>
  );
};

export default FeatureProjects;
