'use client';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import { Container, ImageKit } from '@/app/components';

import { cn } from '@/lib/utils';
import Link from 'next/link';

const features = [
  {
    subheading: 'Fast, secure builds on modern stacks.',
    title: 'Website Development',
    description:
      'We build responsive websites that load quickly, scale cleanly, and are easy to update—so customers can find you and take action. Strong performance matters for user experience and search visibility.',
    image:
      'https://cdn.cosmos.so/d66daca0-a142-45f4-80be-49da55112194?format=jpeg',
    imageOrder: 'order-1',
    contentOrder: 'order-2',
  },
  {
    subheading: 'UX that turns visits into leads.',
    title: 'Website Design',
    description:
      'We design clear page layouts and flows that highlight your services, build trust, and drive calls, bookings, and quote requests without clutter.',
    image:
      'https://cdn.cosmos.so/8b4526f6-a353-466e-ada2-ecedb14f50df?format=jpeg',
    imageOrder: 'order-2',
    contentOrder: 'order-1',
  },
  {
    subheading: 'Updates, monitoring, and improvements.',
    title: 'Website Maintenance',
    description:
      'Ongoing maintenance, backups, security updates, speed checks, and small optimizations, so your site stays reliable after launch.',
    image:
      'https://cdn.cosmos.so/e0498168-c914-45c1-a692-2ad41ddcbfee?format=jpeg',
    imageOrder: 'order-1',
    contentOrder: 'order-2',
  },
];

const ServicesWebsites = () => {
  return (
    <section className="h-full w-screen overflow-hidden py-16">
      <Container className="relative container">
        <div className="w-full space-y-5">
          <h2 className="mb-6 w-full text-left text-5xl font-semibold tracking-tighter">
            Web <span className="text-gradient">Design</span> &{' '}
            <span className="text-gradient">Development</span>
          </h2>
          <h3 className="flex max-w-3xl items-center gap-4 text-black/70 tracking-tighter text-md">
            Design and development that looks premium and performs. We create
            modern, conversion-focused websites and landing pages that align
            with your brand and support your growth strategy.
          </h3>
        </div>
        <div className="relative grid h-380 items-center justify-between gap-3 md:h-272 md:grid-cols-2 lg:h-128 lg:grid-cols-3">
          {features.map((feature, index) => (
            <PinContainer
              key={index}
              title={`Explore Our ${feature.title}`}
              href="/contact"
              className="w-full rounded-3xl bg-background-contrast p-4"
            >
              <div className="flex flex-col">
                <div className={feature.imageOrder}>
                  <ImageKit
                    src={feature.image}
                    height={300}
                    width={300}
                    className="h-70 w-full rounded-3xl object-cover group-hover/card:shadow-xl"
                    alt="thumbnail"
                  />
                </div>
                <div className={`mt-4 w-full p-3 ${feature.contentOrder}`}>
                  <h3 className="text-sm tracking-tighter text-black/40 capitalize">
                    {feature.subheading}
                  </h3>
                  <h3 className="my-3 text-3xl leading-none font-semibold tracking-tighter">
                    {feature.title}
                  </h3>
                  <h3 className="text-sm text-black/70">
                    {feature.description}
                  </h3>
                </div>
              </div>
            </PinContainer>
          ))}
        </div>
      </Container>
    </section>
  );
};

export { ServicesWebsites };

export const PinContainer = ({
  children,
  title,
  href,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  title?: string;
  href?: string;
  className?: string;
  containerClassName?: string;
}) => {
  const [transform, setTransform] = useState(
    'translate(-50%,-50%) rotateX(0deg)',
  );

  const onMouseEnter = () => {
    setTransform('translate(-50%,-50%) rotateX(40deg) scale(0.8)');
  };
  const onMouseLeave = () => {
    setTransform('translate(-50%,-50%) rotateX(0deg) scale(1)');
  };

  return (
    <Link
      className={cn(
        'group/pin relative z-50 cursor-pointer',
        containerClassName,
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      href={href || '/'}
    >
      <div
        style={{
          perspective: '1000px',
          transform: 'rotateX(70deg) translateZ(0deg)',
        }}
        className="absolute top-1/2 left-1/2 mt-4 ml-[0.09375rem] w-full -translate-x-1/2 -translate-y-1/2"
      >
        <div
          style={{
            transform: transform,
          }}
          className="absolute top-1/2 left-1/2 flex w-full items-start justify-start overflow-hidden rounded-2xl transition duration-700"
        >
          <div className={cn('relative z-50', className)}>{children}</div>
        </div>
      </div>
      <PinPerspective title={title} />
    </Link>
  );
};

export const PinPerspective = ({
  title,
}: {
  title?: string;
  href?: string;
}) => {
  return (
    <motion.div className="pointer-events-none z-60 flex h-80 w-96 items-center justify-center opacity-0 transition duration-500 group-hover/pin:opacity-100">
      <div className="inset-0 -mt-7 h-full w-full flex-none">
        <div className="absolute inset-x-0 top-0 flex justify-center">
          <span className="relative z-10 flex items-center space-x-2 rounded-full bg-black px-4 py-1 ring-1 ring-white/10">
            <span className="relative z-20 inline-block py-0.5 text-xs font-bold text-white">
              {title}
            </span>

            <span className="absolute bottom-0 left-4.5 h-2 w-[calc(100%-2.25rem)] bg-linear-to-r from-blue-900/0 via-blue-800/90 to-blue-700/0 transition-opacity duration-500 group-hover/btn:opacity-40"></span>
          </span>
        </div>

        <div
          style={{
            perspective: '1000px',
            transform: 'rotateX(70deg) translateZ(0)',
          }}
          className="absolute top-1/2 left-1/2 mt-4 ml-[0.09375rem] -translate-x-1/2 -translate-y-1/2"
        >
          <>
            <motion.div
              initial={{
                opacity: 0,
                scale: 0,
                x: '-50%',
                y: '-50%',
              }}
              animate={{
                opacity: [0, 1, 0.5, 0],
                scale: 1,

                z: 0,
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: 0,
              }}
              className="absolute top-1/2 left-1/2 h-45 w-45 rounded-[50%] bg-sky-500/8 shadow-[0_8px_16px_rgb(0_0_0/0.4)]"
            ></motion.div>
            <motion.div
              initial={{
                opacity: 0,
                scale: 0,
                x: '-50%',
                y: '-50%',
              }}
              animate={{
                opacity: [0, 1, 0.5, 0],
                scale: 1,

                z: 0,
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: 2,
              }}
              className="absolute top-1/2 left-1/2 h-45 w-45 rounded-[50%] bg-sky-500/8 shadow-[0_8px_16px_rgb(0_0_0/0.4)]"
            ></motion.div>
            <motion.div
              initial={{
                opacity: 0,
                scale: 0,
                x: '-50%',
                y: '-50%',
              }}
              animate={{
                opacity: [0, 1, 0.5, 0],
                scale: 1,

                z: 0,
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: 4,
              }}
              className="absolute top-1/2 left-1/2 h-45 w-45 rounded-[50%] bg-sky-500/8 shadow-[0_8px_16px_rgb(0_0_0/0.4)]"
            ></motion.div>
          </>
        </div>

        <>
          <motion.div className="absolute right-1/2 bottom-1/2 h-20 w-px translate-y-3.5 bg-linear-to-b from-transparent to-cyan-500 blur-[2px] group-hover/pin:h-40" />
          <motion.div className="absolute right-1/2 bottom-1/2 h-20 w-px translate-y-3.5 bg-linear-to-b from-transparent to-cyan-500 group-hover/pin:h-40" />
          <motion.div className="absolute right-1/2 bottom-1/2 z-40 h-1 w-1 translate-x-[1.5px] translate-y-3.5 rounded-full bg-cyan-600 blur-[3px]" />
          <motion.div className="absolute right-1/2 bottom-1/2 z-40 h-0.5 w-0.5 translate-x-[0.5px] translate-y-3.5 rounded-full bg-cyan-300" />
        </>
      </div>
    </motion.div>
  );
};
