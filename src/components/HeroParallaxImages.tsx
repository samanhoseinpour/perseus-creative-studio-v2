'use client';

import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from 'framer-motion';
import { ScrollHorizontalGallery } from './';
import { MapPin } from 'lucide-react';
import { useRef } from 'react';
import { projectsHorizontalGallery } from '../constants/projects';
import { YoutubeFeed } from './';

const HeroParallaxImages = () => {
  return (
    <div>
      <Hero />
      <Schedule />
      <ScrollHorizontalGallery imageProjects={projectsHorizontalGallery} />
      <YoutubeFeed />
    </div>
  );
};

const SECTION_HEIGHT = 1500;

const Hero = () => {
  return (
    <div
      style={{ height: `calc(${SECTION_HEIGHT}px + 100svh)` }}
      className="relative w-full"
    >
      <CenterImage />
      <ParallaxImages />
    </div>
  );
};

const CenterImage = () => {
  const { scrollYProgress } = useScroll();

  const clip1 = useTransform(scrollYProgress, [0, 0.7, 1], [25, 0, -10]);
  const clip2 = useTransform(scrollYProgress, [0, 0.7, 1], [75, 100, 110]);

  const clipPath = useMotionTemplate`polygon(${clip1}% ${clip1}%, ${clip2}% ${clip1}%, ${clip2}% ${clip2}%, ${clip1}% ${clip2}%)`;

  const backgroundSize = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ['170%', '100%', '140%'],
  );
  const opacity = useTransform(scrollYProgress, [0.7, 1], [1, 0]);

  return (
    <motion.div
      className="sticky top-0 h-svh w-full bg-center bg-no-repeat bg-cover rounded-lg"
      style={{
        clipPath,
        backgroundSize,
        opacity,
        backgroundImage:
          'url(https://ik.imagekit.io/perseus/homeServices-2.JPG)',
      }}
    />
  );
};

const ParallaxImages = () => {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-[200px]">
      <ParallaxImg
        src="https://ik.imagekit.io/perseus/homeServices-1.JPG"
        alt="And example of a space launch"
        start={-200}
        end={200}
        className="w-1/3 rounded-lg"
      />
      <ParallaxImg
        src="https://ik.imagekit.io/perseus/homeServices-3.JPG"
        alt="An example of a space launch"
        start={200}
        end={-250}
        className="mx-auto w-2/3 rounded-lg"
      />
      <ParallaxImg
        src="https://ik.imagekit.io/perseus/homeServices-4.JPG"
        alt="Orbiting satellite"
        start={-200}
        end={200}
        className="ml-auto w-1/3 rounded-lg"
      />
      <ParallaxImg
        src="https://ik.imagekit.io/perseus/homeServices-2.JPG"
        alt="Orbiting satellite"
        start={150}
        end={-500}
        className="ml-24 w-5/12 rounded-lg"
      />
    </div>
  );
};

interface ParallaxImgProps {
  className?: string;
  alt: string;
  src: string;
  start: number;
  end: number;
}

const ParallaxImg = ({ className, alt, src, start, end }: ParallaxImgProps) => {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [`${start}px end`, `end ${end * -1}px`],
  });

  const opacity = useTransform(scrollYProgress, [0.75, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0.75, 1], [1, 0.85]);

  const y = useTransform(scrollYProgress, [0, 1], [start, end]);
  const transform = useMotionTemplate`translateY(${y}px) scale(${scale})`;

  return (
    <motion.img
      src={src}
      alt={alt}
      className={className}
      ref={ref}
      style={{ transform, opacity }}
    />
  );
};

const Schedule = () => {
  return (
    <section
      id="launch-schedule"
      className="mx-auto max-w-6xl px-4 py-12 text-black"
    >
      <motion.h2
        initial={{ y: 48, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ ease: 'easeInOut', duration: 0.75 }}
        className="mb-20 text-4xl leading-4xl font-bold text-black"
      >
        Featured Projects
      </motion.h2>
      <ScheduleItem
        title="Iron Nation Fitness"
        date="2024"
        location="Vancouver, BC"
        url="https://www.youtube.com/watch?v=l2aQOr4zBGo"
      />
      <ScheduleItem
        title="Diba Windows Showroom"
        date="2024"
        location="North Vancouver, BC"
        url="https://www.youtube.com/watch?v=57cDQR2e3EQ"
      />
      <ScheduleItem
        title="Professional Wedding Venue Tour"
        date="2024"
        location="Vancouver, BC"
        url="https://www.youtube.com/watch?v=iTpstvVWhGg"
      />
      <ScheduleItem
        title="Cinematic Gym Commercial"
        date="2024"
        location="Vancouver, BC"
        url="https://www.youtube.com/watch?v=T09VEdyk6cs"
      />
      <ScheduleItem
        title="Client Appreciation Event Recap"
        date="2024"
        location="Vancouver, BC"
        url="https://www.youtube.com/watch?v=103KG7ZVHm0"
      />
      <ScheduleItem
        title="Vancouver's Architectural Masterpiece — Westbank"
        date="2024"
        location="Vancouver, BC"
        url="https://www.youtube.com/watch?v=EAi6_VltJnA"
      />
    </section>
  );
};

interface ScheduleItemProps {
  title: string;
  date: string;
  location: string;
  url: string;
}

const ScheduleItem = ({ title, date, location, url }: ScheduleItemProps) => {
  return (
    <motion.div
      initial={{ y: 48, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ ease: 'easeInOut', duration: 0.75 }}
      className="mb-9 flex items-center justify-between border-b gap-8 border-black-70 px-3 pb-9"
    >
      <a href={url} target="_blank">
        <p className="mb-1.5 text-lg leading-lg text-black font-semibold">
          {title}
        </p>
        <p className="text-xs uppercase text-black/70">{date}</p>
      </a>
      <div className="flex items-center gap-1.5 text-end text-xs leading-xs text-black/50">
        <p>{location}</p>
        <MapPin size={16} />
      </div>
    </motion.div>
  );
};

export default HeroParallaxImages;
