import { ImageKit, Container, TextShimmer } from "./";
import type { FC, SVGProps } from "react";

interface WhyChooseUsFeature {
  id: string | number;
  name: string;
  description: string;
  icon: FC<SVGProps<SVGSVGElement>>;
}

interface WhyChooseUsProps {
  questions: WhyChooseUsFeature[];
  imgSrc: string;
  imgAlt: string;
  imgWidth: number;
  imgHeight: number;
}

const WhyChooseUs: FC<WhyChooseUsProps> = ({
  questions,
  imgSrc,
  imgAlt,
  imgWidth,
  imgHeight,
}) => {
  return (
    <section className="pt-16 sm:pt-32 bg-white">
      <Container>
        <div className="sm:text-center">
          <TextShimmer
            as="h3"
            className="text-sm leading-sm font-semibold text-black/70"
          >
            Our experience across industries helps us move efficiently and
            deliver work built to last.
          </TextShimmer>
          <h2 className="text-black mt-2 text-4xl leading-4xl font-semibold sm:text-5xl sm:leading-5xl">
            Why Choose Perseus?
          </h2>
          <p className="mt-4 text-sm leading-sm text-black/70">
            We don’t just deliver assets. We act as a long-term creative
            partner. We take the time to understand your brand, your goals, and
            your audience, then build work that feels aligned, intentional, and
            true to who you are. The result is creative that doesn’t just look
            good, but actually fits your business.
          </p>
        </div>
      </Container>
      <div className="relative overflow-hidden pt-16">
        <div className="container mx-auto px-6 lg:px-8">
          <ImageKit
            alt={imgAlt}
            src={imgSrc}
            width={imgWidth}
            height={imgHeight}
            className="mb-[-12%] rounded-xl ring-1 shadow-2xl ring-gray-900/10 object-cover"
          />
          <div aria-hidden="true" className="relative">
            <div className="absolute -inset-x-20 bottom-0 bg-linear-to-t from-white pt-[15%]" />
          </div>
        </div>
      </div>
      <div className="mx-auto mt-16 max-w-7xl px-6 sm:mt-20 md:mt-24 lg:px-8">
        <dl className="text-sm leading-sm mx-auto grid max-w-2xl grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
          {questions.map((feature) => (
            <div key={feature.id} className="relative pl-9">
              <dt className="inline text-black">
                <feature.icon
                  aria-hidden="true"
                  className="absolute top-1 left-1 size-5"
                />
                {feature.name}
              </dt>{" "}
              <dd className="inline text-black/70">{feature.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default WhyChooseUs;
