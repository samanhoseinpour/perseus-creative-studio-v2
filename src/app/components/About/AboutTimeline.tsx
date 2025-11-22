"use client";
import { useScroll, useTransform, motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";

import { ImageKit, Heading } from "../";

interface TimelineEntry {
  title: string;
  subheading: string;
  content: React.ReactNode;
}

const AboutTimeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div className="w-full bg-white py-16 sm:py-32" ref={containerRef}>
      <Heading
        seperatorTitle="From Launch to Scale"
        title="From Launch to Scale"
        titleTag="h3"
        description="Founded in January 2024, Perseus Creative Studio began with one mission — to help small businesses and personal brands stand out through creativity, strategy, and storytelling. What started as a handful of design and media projects quickly grew into a full-service creative agency working across industries and borders."
        descStyle="max-w-lg text-xs"
      />

      <div ref={ref} className="container mx-auto px-6 relative">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-16 sm:pt-32 md:gap-10"
          >
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-white flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-neutral-200 border-neutral-300 p-2" />
              </div>
              <div className="hidden md:block md:pl-20 text-black/40">
                <h3 className="text-xl leading-xl sm:text-4xl sm:leading-4xl font-bold">
                  {item.title}
                </h3>
                <h4 className="text-sm leading-sm sm:text-xl sm:leading-xl font-semibold">
                  {item.subheading}
                </h4>
              </div>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-neutral-500 dark:text-neutral-500">
                {item.title}
              </h3>
              {item.content}{" "}
            </div>
          </div>
        ))}
        <div
          style={{
            height: height + "px",
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-0.5 bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-0% via-neutral-200 dark:via-neutral-700 to-transparent to-99%  [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] "
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0  w-0.5 bg-linear-to-t from-purple-500 via-blue-500 to-transparent from-0% via-10% rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

const Timeline = () => {
  const data = [
    {
      title: "2024",
      subheading: "Launch & Momentum",
      content: (
        <div>
          <p className="mb-2 text-md leading-md text-black">
            Our first year was defined by bold projects and nonstop creativity.
          </p>
          <div className="mb-8 text-sm leading-sm text-black/70 flex flex-col gap-4">
            <p>
              In mid-2024, we traveled across Toronto, Ontario, and Raleigh,
              North Carolina, partnering with FitBodega Soccer Team to document
              their journey at the TST 7v7 $1 Million Soccer Tournament. Over a
              45-day span, our team produced multiple videos daily, capturing
              every moment of competition, travel, and team spirit.
            </p>
            <p>
              Later that year, we joined an international oil and gas company
              for a 40-day production across Asia and the Middle East, leading
              their rebrand and developing a global content library focused on
              storytelling, brand image, and consistency across platforms.
            </p>
            <p>
              By the end of 2024, Perseus had evolved from helping personal
              brands and small businesses to managing high-scale productions,
              website design, and marketing strategy for corporate clients
              worldwide.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ImageKit
              src="/homeServices-1.JPG"
              alt="startup template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <ImageKit
              src="/homeServices-2.JPG"
              alt="startup template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <ImageKit
              src="/homeServices-2.JPG"
              alt="startup template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <ImageKit
              src="/homeServices-4.JPG"
              alt="startup template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
          </div>
        </div>
      ),
    },
    {
      title: "2025",
      subheading: "Growth & Scale",
      content: (
        <div>
          <p className="mb-2 text-md leading-md text-black">
            Expanding Creative Impact Through Precision, Speed, and Global
            Reach.
          </p>
          <div className="mb-8 text-sm leading-sm text-black/70 flex flex-col gap-4">
            <p>
              Year two has been all about scale, structure, and polish. We
              expanded our custom website and content programs across real
              estate, retail, and hospitality, integrating faster
              post-production and performance tracking to help clients see
              measurable results.
            </p>
            <p>
              Our team also continued documenting architectural and construction
              projects, following full home builds from concept to completion —
              creating cinematic stories that show every stage of progress.
            </p>
            <p>
              With new systems, deeper collaboration, and a growing
              international presence, Perseus has entered a new phase: creative
              at scale, built to move fast and deliver lasting results.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ImageKit
              src="/homeServices-2.JPG"
              alt="startup template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <ImageKit
              src="/homeServices-2.JPG"
              alt="startup template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <ImageKit
              src="/homeServices-2.JPG"
              alt="startup template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <ImageKit
              src="/homeServices-4.JPG"
              alt="startup template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Studio Updates",
      subheading: "October 2025",
      content: (
        <div>
          <p className="mb-2 text-md leading-md text-black">
            Expanding Our Team & Locations
          </p>
          <div className="mb-4 text-sm leading-sm text-black/70">
            <p>
              Our studio is growing. With creative hubs now operating in
              Vancouver, Los Angeles, and Dubai, we’re expanding both our team
              and our reach.
            </p>
            <p>
              This growth lets us take on larger productions, faster timelines,
              and global clients — while staying true to our core: creativity,
              flexibility, and exceptional service.
            </p>
          </div>
          <p className="mb-2 text-md leading-md text-black">
            New Real Estate Project: Ultra-Luxury Mega Mansion
          </p>
          <div className="mb-8 text-sm leading-sm text-black/70">
            <p>
              We’re currently producing one of our most ambitious real estate
              projects to date — an ultra-luxury 10,000+ sq. ft. mega mansion in
              Vancouver.
            </p>
            <p>
              Our team is capturing every detail through high-end photography,
              drone cinematography, and architectural storytelling. From design
              phases to the final reveal, this project represents the next level
              of creative media and real estate marketing.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ImageKit
              src="/homeServices-1.JPG"
              alt="hero template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <ImageKit
              src="/homeServices-2.JPG"
              alt="feature template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <ImageKit
              src="/homeServices-2.JPG"
              alt="bento template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <ImageKit
              src="/homeServices-4.JPG"
              alt="cards template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgra(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="relative w-full overflow-clip">
      <AboutTimeline data={data} />
    </div>
  );
};

export default Timeline;
