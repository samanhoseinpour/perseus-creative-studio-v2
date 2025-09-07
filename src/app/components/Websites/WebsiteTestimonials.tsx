import { Container, ImageKit, TextEffect, AnimatedGroup } from "../";
import { websiteTestimonials } from "@/app/constants/website";
import { Testimonial } from "@/app/types/website-types";

const chunkArray = (
  array: Testimonial[],
  chunkSize: number
): Testimonial[][] => {
  const result: Testimonial[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
};

const testimonialChunks = chunkArray(
  websiteTestimonials,
  Math.ceil(websiteTestimonials.length / 3)
);

const WebsiteTestimonials = () => {
  return (
    <section className="mb-32">
      <Container>
        <div className="text-center">
          <TextEffect as="h6" className="text-3xl leading-3xl font-semibold">
            Trusted by Perseus Clients
          </TextEffect>
          <TextEffect as="p" per="line" delay={0.5} className="mt-3">
            Hear from our clients who have experienced the value of
            Perseus&apos; creative and digital solutions.
          </TextEffect>
        </div>
        <AnimatedGroup className="mt-8 grid gap-3 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
          {testimonialChunks.map((chunk, chunkIndex) => (
            <div key={chunkIndex} className="space-y-3">
              {chunk.map(({ name, role, quote, image, id }) => (
                <div key={id}>
                  <div className="grid grid-cols-[auto_1fr] gap-3 pt-6 bg-background-contrast rounded-lg shadow-sm p-6">
                    <div className="size-9">
                      <ImageKit
                        alt={name}
                        src={image}
                        width={120}
                        height={120}
                      />
                    </div>

                    <div>
                      <TextEffect as="h6" delay={0.7} className="font-medium">
                        {name}
                      </TextEffect>

                      <TextEffect
                        as="span"
                        delay={0.7}
                        className="text-white/30 block text-sm"
                      >
                        {role}
                      </TextEffect>

                      <blockquote className="mt-3 text-sm">
                        <TextEffect as="p" per="line" delay={0.7}>
                          {quote}
                        </TextEffect>
                      </blockquote>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </AnimatedGroup>
      </Container>
    </section>
  );
};

export default WebsiteTestimonials;
