"use client";
import React from "react";
import { useScroll, useTransform } from "motion/react";
import { GoogleGeminiEffect } from "../../components";

const AboutCta = () => {
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const pathLengthFirst = useTransform(scrollYProgress, [0, 0.8], [0.1, 1.2]);
  const pathLengthSecond = useTransform(
    scrollYProgress,
    [0, 0.8],
    [0.075, 1.2]
  );
  const pathLengthThird = useTransform(scrollYProgress, [0, 0.8], [0.05, 1.2]);
  const pathLengthFourth = useTransform(
    scrollYProgress,
    [0, 0.8],
    [0.025, 1.2]
  );
  const pathLengthFifth = useTransform(scrollYProgress, [0, 0.8], [0, 1.2]);

  return (
    <section
      ref={ref}
      className="relative isolate w-full bg-white pt-16 sm:pt-32"
    >
      <div className="relative min-h-[450vh]">
        <GoogleGeminiEffect
          pathLengths={[
            pathLengthFirst,
            pathLengthSecond,
            pathLengthThird,
            pathLengthFourth,
            pathLengthFifth,
          ]}
        />
      </div>
      <div aria-hidden className="h-[20vh] sm:h-[30vh]" />
    </section>
  );
};

export default AboutCta;
