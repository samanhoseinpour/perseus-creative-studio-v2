"use client";
import React, { useEffect, JSX } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageKit, Button } from "@/app/components";

interface CarouselProps {
  items: JSX.Element[];
  initialScroll?: number;
}

type Card = {
  src: string;
  title: string;
  category: string;
};

export const Carousel = ({ items, initialScroll = 0 }: CarouselProps) => {
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full mt-8">
      <div
        className="flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth pb-4 [scrollbar-width:none] md:pb-8"
        ref={carouselRef}
        onScroll={checkScrollability}
      >
        <div
          className={cn(
            "absolute right-0 z-1000 h-auto w-[5%] overflow-hidden bg-linear-to-l"
          )}
        />

        <div
          className={cn(
            "flex flex-row justify-start gap-4",
            "mx-auto max-w-7xl max-xl:pl-4" // remove max-w-4xl if you want the carousel to span the full width of its container
          )}
        >
          {items.map((item, index) => (
            <div
              key={"card" + index}
              className="rounded-3xl last:pr-[5%] md:last:pr-[33%]"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="mr-10 flex justify-center gap-2">
        <Button className="p-2" onClick={scrollLeft} disabled={!canScrollLeft}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          className="p-2"
          onClick={scrollRight}
          disabled={!canScrollRight}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const Card = ({
  card,
}: {
  card: Card;
  index: number;
  layout?: boolean;
}) => {
  return (
    <div className="relative z-10 flex h-80 w-56 flex-col items-start justify-start overflow-hidden rounded-3xl bg-black md:h-160 md:w-96">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-full bg-linear-to-b from-black/50 via-transparent to-transparent" />
      <div className="relative z-40 p-4 sm:p-8">
        <p className="text-left text-[10px] font-semibold text-white">
          {card.category}
        </p>
        <h3 className="max-w-xs text-left text-md leading-md sm:text-2xl sm:leading-2xl font-semibold text-balance text-white">
          {card.title}
        </h3>
      </div>
      <ImageKit
        src={card.src}
        alt={card.title}
        fill
        className="absolute inset-0 z-10 object-cover"
      />
    </div>
  );
};
