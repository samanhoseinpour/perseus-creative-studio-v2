'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { ImageKit, Button, Heading } from '../';
import { servicesCarousel } from '../../constants/index';

import { ArrowRight, ArrowLeft } from 'lucide-react';

const slideWidth = 440;
const slideMargin = 20;

const scrollToSlide = (slider: HTMLUListElement | null, slideIndex: number) => {
  if (!slider) return;
  slider.scrollTo({
    left: slideIndex * (slideWidth + slideMargin),
    behavior: 'smooth',
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
    <section className="mb-16 sm:mb-32">
      <Heading
        seperatorTitle="Agency Services"
        title="All-in-One Solution"
        titleTag="h3"
        description="From digital marketing to branding, we craft strategies that elevate
          brands in every industry."
      />

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
                  className={twMerge('flex h-full justify-center items-center')}
                >
                  <ImageKit
                    className="object-cover max-sm:mr-24"
                    src={slide.img}
                    alt={slide.title}
                    fill
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

      <div className="flex justify-center gap-2">
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
      </div>
    </section>
  );
};

export default ServicesCarousel;
