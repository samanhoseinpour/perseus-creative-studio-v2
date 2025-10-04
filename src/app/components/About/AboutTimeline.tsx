"use client";
import { useScroll, useTransform, motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";

import { ImageKit, TextEffect, Container, AnimatedGroup } from "../";
import { ArrowUpRight } from "lucide-react";

interface TimelineEntry {
  title: string;
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
      <Container className="border-t text-black">
        <TextEffect
          as="span"
          className="-ml-6 -mt-3.5 block w-max bg-gray-50 px-6 dark:bg-gray-950"
        >
          From Launch to Scale
        </TextEffect>
        <TextEffect
          as="h3"
          className="mt-12 sm:mt-24 font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl"
        >
          From Launch to Scale
        </TextEffect>
        <TextEffect
          as="p"
          per="line"
          delay={0.5}
          className="text-black/70 text-sm max-w-lg"
        >
          Founded in Jan 2024, Perseus delivered a 40-day Asia content program,
          tournament coverage in North Carolina, and BC property microsites. In
          2025, we expanded platforms and recurring content.
        </TextEffect>
      </Container>

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
              <TextEffect className="hidden md:block text-xl md:pl-20 sm:text-5xl font-bold text-black/40">
                {item.title}
              </TextEffect>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <TextEffect
                as="h3"
                className="md:hidden block text-2xl mb-4 text-left font-bold text-neutral-500 dark:text-neutral-500"
              >
                {item.title}
              </TextEffect>
              {item.content}{" "}
            </div>
          </div>
        ))}
        <div
          style={{
            height: height + "px",
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-neutral-200 dark:via-neutral-700 to-transparent to-[99%]  [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] "
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0  w-[2px] bg-gradient-to-t from-purple-500 via-blue-500 to-transparent from-[0%] via-[10%] rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

const Timeline = () => {
  const data = [
    {
      title: "2025",
      content: (
        <div>
          <TextEffect
            as="p"
            per="line"
            delay={0.5}
            className="mb-8 text-xs text-background-contrast md:text-sm"
          >
            Year two focused on scale and polish: shipped larger custom web
            platforms, expanded international shoots, and formalized ongoing
            content programs for real estate, retail, and hospitality—pairing
            multi-camera production with faster post and performance reviews.
          </TextEffect>
          <AnimatedGroup className="grid grid-cols-2 gap-4">
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
          </AnimatedGroup>
        </div>
      ),
    },
    {
      title: "2024",
      content: (
        <div>
          <TextEffect
            as="p"
            per="line"
            delay={0.5}
            className="mb-8 text-xs font-normal text-neutral-800 md:text-sm dark:text-neutral-200"
          >
            Launched Perseus in January 2024. Produced a 40-day content program
            across Asia for an international petroleum client, delivered
            multi-camera coverage at a major North Carolina soccer tournament,
            and shipped custom-coded web platforms and brand systems for real
            estate, retail, and hospitality partners.
          </TextEffect>
          <AnimatedGroup className="grid grid-cols-2 gap-4">
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
          </AnimatedGroup>
        </div>
      ),
    },
    {
      title: "Early 2024",
      content: (
        <div>
          <TextEffect
            as="p"
            per="line"
            delay={0.5}
            className="mb-8 text-xs text-neutral-800 sm:text-sm "
          >
            Perseus launched in North Vancouver with a simple standard: no
            templates, fast accessible code, calibrated visuals, and brand
            systems that hold up in the real world.
          </TextEffect>
          <TextEffect
            as="p"
            per="line"
            delay={0.5}
            className="mb-8 text-xs text-neutral-800 sm:text-sm "
          >
            The first wave of work included real estate showcases, retail and
            showroom shoots, and content-rich websites—built with a portable
            production pipeline (multi-camera + drone) and an in-house post
            workflow for web, social, and display.
          </TextEffect>
          <AnimatedGroup className="grid grid-cols-2 gap-4">
            <ImageKit
              src="/homeServices-2.JPG"
              alt="hero template"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
            <ImageKit
              src="/homeServices-4.JPG"
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
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] md:h-44 lg:h-60"
            />
          </AnimatedGroup>
        </div>
      ),
    },
    {
      title: "Studio Updates",
      content: (
        <div>
          <TextEffect
            as="p"
            per="line"
            delay={0.5}
            className="mb-4 text-xs text-background-contrast sm:text-sm"
          >
            Shipped recent work across web, media, and brand—focused on speed,
            clarity, and measurable outcomes.
          </TextEffect>
          <AnimatedGroup className="mb-8">
            <ul className="text-xs text-black/70 sm:text-sm">
              <li className="flex items-center gap-2">
                <ArrowUpRight
                  className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  BC property microsite with in-house CMS and fast mobile
                  inquiries
                </span>
              </li>
            </ul>
            <ul className="text-xs text-black/70 sm:text-sm">
              <li className="flex items-center gap-2">
                <ArrowUpRight
                  className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Retail e-commerce build (Shopify) with custom theme and
                  product media
                </span>
              </li>
            </ul>
            <ul className="text-xs text-black/70 sm:text-sm">
              <li className="flex items-center gap-2">
                <ArrowUpRight
                  className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Tournament recap reel: multi-camera capture, color-managed
                  edit, sound mix
                </span>
              </li>
            </ul>
            <ul className="text-xs text-black/70 sm:text-sm">
              <li className="flex items-center gap-2">
                <ArrowUpRight
                  className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Brand identity system: logo set, type, collateral, usage
                  guidelines
                </span>
              </li>
            </ul>
            <ul className="text-xs text-black/70 sm:text-sm">
              <li className="flex items-center gap-2">
                <ArrowUpRight
                  className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Drone ops &amp; safety SOP v2 for on-site productions
                </span>
              </li>
            </ul>
          </AnimatedGroup>
          <AnimatedGroup className="grid grid-cols-2 gap-4">
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
          </AnimatedGroup>
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
