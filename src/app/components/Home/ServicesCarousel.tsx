"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import { ImageKit } from "../";
import { servicesCarousel } from "../../constants/index";

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
    <section className="mb-24">
      <div className="flex flex-col gap-2 container mx-auto px-6 max-w-[1400px] mb-8">
        <h2 className="text-4xl leading-4xl font-bold text-black dark:text-white">
          All-in-One Solution
        </h2>
        <p className="text-black/30 dark:text-white/30 text-lg leading-lg">
          From digital marketing to branding, we craft strategies that elevate
          brands in every industry.
        </p>
      </div>

      <div className="px-6">
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
      </div>
      <div className="flex justify-center">
        <button
          disabled={currentSlide === 0}
          onClick={() => goToPreviousSlide()}
          className="disabled:text-black/30 disabled:border-black/30 w-10 h-10 border-2 border-black rounded-full flex items-center justify-center mr-2 cursor-pointer"
        >
          <span className="sr-only">Previous slide</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-6 text-black"
          >
            <path
              fillRule="evenodd"
              d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <button
          disabled={
            scrolledToEndOfSlider || currentSlide === servicesCarousel.length
          }
          onClick={() => goToNextSlide()}
          className="disabled:text-black/30 disabled:border-black/30 w-10 h-10 border-2 border-black rounded-full flex items-center justify-center cursor-pointer"
        >
          <span className="sr-only">Next slide</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-6 text-black"
          >
            <path
              fillRule="evenodd"
              d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </section>
  );
};

export default ServicesCarousel;
