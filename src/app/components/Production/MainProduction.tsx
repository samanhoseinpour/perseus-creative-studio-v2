'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

import { ImageKit } from '../';

interface MainProductionProps {
  imageSrc: string;
  tag: string;
  title: string;
  description: string;
}
const MainProduction: React.FC<MainProductionProps> = ({
  imageSrc,
  tag,
  title,
  description,
}) => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['-30%', '10%']);

  return (
    <section ref={sectionRef} className="relative h-[100vh] overflow-hidden">
      <motion.div
        className="absolute w-full h-[120%] -z-10 "
        style={{ top: y }}
      >
        <div className="absolute inset-0 bg-black/20 z-10" />
        <ImageKit
          src={imageSrc}
          alt="title"
          loading="lazy"
          fill
          className="object-cover"
          sizes="90vw"
        />
      </motion.div>

      <div className="flex flex-col gap-2 p-12 text-white">
        <span className="uppercase text-xs">{tag}</span>
        <h2 className="text-4xl max-w-[25ch]">{title}</h2>
        <p className="max-w-[50ch]">{description}</p>
      </div>
    </section>
  );
};

export default MainProduction;
