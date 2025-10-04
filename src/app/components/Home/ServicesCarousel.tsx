"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import { AnimatedGroup, ImageKit, TextEffect, Button } from "../";
import { servicesCarousel } from "../../constants/index";

import { ArrowRight, ArrowLeft } from "lucide-react";

const slideWidth = 440;
const slideMargin = 20;

const scrollToSlide = (slider: HTMLUListElement | null, slideIndex: number) => {
  if (!slider) return;
  slider.scrollTo({
    left: slideIndex * (slideWidth + slideMargin),
    behavior: "smooth",
  });
};

const ServicesCarousel = () => {
  const sliderRef = useRef<HTMLUListElement | null>(null);
  const [sliderPosition, setSliderPosition] = useState(0);

  const currentSlide = useMemo(() => {
    return Math.floor(sliderPosition / (slideWidth + slideMargin));
  }, [sliderPosition]);

  const scrolledToEndOfSlider = useMemo(() => {
    if (!sliderRef.current) return false;
    return (
      sliderRef.current.scrollWidth -
        sliderRef.current.scrollLeft -
        sliderRef.current.clientWidth ===
      0
    );
  }, []);

  const goToNextSlide = useCallback(() => {
    scrollToSlide(sliderRef.current, currentSlide + 1);
  }, [currentSlide]);

  const goToPreviousSlide = useCallback(() => {
    scrollToSlide(sliderRef.current, currentSlide - 1);
  }, [currentSlide]);

  return (
    <section className="mb-16">
      <div className="flex flex-col gap-2 container mx-auto px-6 max-w-[1400px] mb-8">
        <TextEffect
          as="h3"
          className="text-4xl leading-4xl font-bold text-black dark:text-white"
        >
          All-in-One Solution
        </TextEffect>
        <TextEffect
          as="p"
          per="line"
          className="text-black/30 dark:text-white/30 text-lg leading-lg"
        >
          From digital marketing to branding, we craft strategies that elevate
          brands in every industry.
        </TextEffect>
      </div>

      <AnimatedGroup className="px-6">
        <ul
          ref={sliderRef}
          onScroll={(ev) => {
            setSliderPosition(ev.currentTarget.scrollLeft);
          }}
          className="flex h-[500px] pb-10 overflow-x-auto snap-x snap-mandatory hide-scrollbar"
        >
          {servicesCarousel.map((slide) => (
            <li
              className="snap-start snap-always shrink-0 mr-5 last:mr-[0] text-white"
              key={slide.id}
            >
              <div className="slide-center relative flex h-full flex-col bg-black/30 backdrop-blur-xl w-[440px] rounded-2xl">
                <div
                  className={twMerge("flex h-full justify-center items-center")}
                >
                  <ImageKit
                    className="object-cover max-sm:mr-24"
                    src={slide.img}
                    alt={slide.title}
                    fill
                    loading="lazy"
                  />
                </div>
                <h3 className="-mt-24 text-xl leading-xl font-semibold p-6 z-99 text-center">
                  {slide.title}
                </h3>
              </div>
            </li>
          ))}
        </ul>
      </AnimatedGroup>

      <AnimatedGroup className="flex justify-center gap-2">
        <Button
          disabled={currentSlide === 0}
          onClick={() => goToPreviousSlide()}
          className="p-2"
        >
          <span className="sr-only">Previous slide</span>
          <ArrowLeft size={20} />
        </Button>
        <Button
          disabled={
            scrolledToEndOfSlider || currentSlide === servicesCarousel.length
          }
          onClick={() => goToNextSlide()}
          className="p-2"
        >
          <span className="sr-only">Next slide</span>
          <ArrowRight size={20} />
        </Button>
      </AnimatedGroup>
    </section>
  );
};

export default ServicesCarousel;
