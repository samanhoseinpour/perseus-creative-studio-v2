'use client';
import { useScroll, useTransform, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import Button from '@/components/Button';
import Img from '@/components/Img';
import Heading from '@/components/Heading';
import Container from '@/components/ui/Container';
import Link from 'next/link';
import {
  ABOUT_TIMELINE,
  ABOUT_TIMELINE_HEADING,
  ABOUT_TIMELINE_CTAS,
  type AboutTimelineEntry,
} from '@/constants/about';

// Shared elevation for every timeline thumbnail — presentation only.
const TIMELINE_IMAGE_CLASS =
  'h-20 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(34,42,53,0.06),0_1px_1px_rgba(0,0,0,0.05),0_0_0_1px_rgba(34,42,53,0.04),0_0_4px_rgba(34,42,53,0.08),0_16px_68px_rgba(47,48,55,0.05),0_1px_0_rgba(255,255,255,0.1)_inset] md:h-44 lg:h-60';

const TimelineContent = ({ entry }: { entry: AboutTimelineEntry }) => (
  <div>
    {entry.blocks.map((block, i) => (
      <div key={i}>
        <h3 className="mb-2 text-md leading-md font-semibold text-black">
          {block.heading}
        </h3>
        <div className="mb-8 text-sm leading-sm text-black/70 flex flex-col gap-4">
          {block.paragraphs.map((paragraph, p) => (
            <p key={p}>{paragraph}</p>
          ))}
        </div>
      </div>
    ))}

    <div className="grid grid-cols-2 gap-4">
      {entry.images.map((image) => (
        <Img
          key={image.src}
          src={image.src}
          alt={image.alt}
          width={500}
          height={500}
          className={TIMELINE_IMAGE_CLASS}
        />
      ))}
    </div>
  </div>
);

const AboutTimeline = ({ data }: { data: AboutTimelineEntry[] }) => {
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
    offset: ['start 10%', 'end 50%'],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div className="w-full bg-white py-16" ref={containerRef}>
      <Heading
        titleTag="h2"
        {...ABOUT_TIMELINE_HEADING}
        containerStyle="mb-4"
        titleStyle="max-w-4xl"
        descStyle="max-w-3xl"
      />

      <Container className="mt-8 flex flex-col items-center justify-start gap-3 sm:flex-row">
        {ABOUT_TIMELINE_CTAS.map((cta) => (
          <Link key={cta.href} href={cta.href}>
            <Button variant={cta.variant} icon={cta.icon}>
              {cta.label}
            </Button>
          </Link>
        ))}
      </Container>

      <div ref={ref} className="container mx-auto px-6 relative">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-16 sm:pt-32 md:gap-10"
          >
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-white flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-black/20 p-2" />
              </div>
              <div className="hidden md:block md:pl-20 text-black/40">
                <Heading
                  titleTag="h3"
                  title={item.title}
                  description={item.subheading}
                  containerStyle="px-0 md:px-0 w-full max-w-none [&>div:first-child]:hidden"
                  titleStyle="!mt-0 text-xl leading-xl sm:text-4xl sm:leading-4xl font-semibold text-black/40"
                  descStyle="mt-1 text-sm leading-sm sm:text-xl sm:leading-xl text-black/40"
                />
              </div>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <Heading
                titleTag="h3"
                title={item.title}
                description={item.subheading}
                containerStyle="md:hidden px-0 md:px-0 mb-4 w-full max-w-none [&>div:first-child]:hidden"
                titleStyle="!mt-0 text-2xl text-left font-bold text-black/60"
                descStyle="mt-1 text-sm text-left text-black/50"
              />
              <TimelineContent entry={item} />{' '}
            </div>
          </div>
        ))}
        <div
          style={{
            height: height + 'px',
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-0.5 bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-0% via-neutral-200 dark:via-neutral-700 to-transparent to-99%  mask-[linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] "
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
  return (
    <div className="relative w-full overflow-clip">
      <AboutTimeline data={ABOUT_TIMELINE} />
    </div>
  );
};

export default Timeline;
