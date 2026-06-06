'use client';

import { useRef, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

import { ImageKit } from '@/components';
import { cn } from '@/lib/utils';

interface ComparisonImage {
  imageUrl: string;
  alt: string;
}

interface BeforeAfterSliderProps {
  before: ComparisonImage;
  after: ComparisonImage;
  /** Demo only: filter the Before image to look "dated" until real shots exist. */
  degradeBefore?: boolean;
}

/**
 * Draggable / hover before/after image comparison. The "after" is the base
 * layer; the "before" is clipped from the right and revealed by the divider.
 *   • Mouse  → the divider follows the cursor on hover (no click needed).
 *   • Touch  → drag to compare (vertical page scroll still passes through).
 *   • Keyboard / SR → a focusable range input drives the same value.
 */
const BeforeAfterSlider = ({
  before,
  after,
  degradeBefore,
}: BeforeAfterSliderProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [focused, setFocused] = useState(false);

  const moveTo = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, next)));
  };

  return (
    <div
      ref={ref}
      // Mouse hover-follow + touch drag both come through pointermove; touch-pan-y
      // keeps vertical page scrolling working while dragging horizontally.
      onPointerMove={(e) => moveTo(e.clientX)}
      className="group relative aspect-16/10 w-full touch-pan-y select-none overflow-hidden rounded-2xl ring-1 ring-inset ring-black/10 sm:aspect-2/1"
    >
      {/* After — base layer */}
      <ImageKit
        src={after.imageUrl}
        alt={after.alt}
        fill
        sizes="(min-width: 1280px) 1240px, 100vw"
        className="rounded-none object-cover"
      />
      <span className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-scrim/55 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-on-media/90 backdrop-blur-sm">
        After
      </span>

      {/* Before — clipped to the left of the divider */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <ImageKit
          src={before.imageUrl}
          alt={before.alt}
          fill
          sizes="(min-width: 1280px) 1240px, 100vw"
          className={cn(
            'rounded-none object-cover',
            degradeBefore && 'grayscale brightness-95 contrast-75',
          )}
        />
        <span className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-scrim/55 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-on-media/90 backdrop-blur-sm">
          Before
        </span>
      </div>

      {/* Divider + grab handle (lifts the ring when the control is focused) */}
      <div
        className="pointer-events-none absolute inset-y-0 -translate-x-1/2"
        style={{ left: `${pos}%` }}
      >
        <div className="mx-auto h-full w-0.5 bg-on-media/90" />
        <div
          className={cn(
            'absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-on-media text-scrim shadow-lg ring-1 ring-inset ring-scrim/10 transition-transform duration-200 group-hover:scale-105',
            focused && 'ring-2 ring-scrim',
          )}
        >
          <LuChevronLeft className="size-3.5" aria-hidden />
          <LuChevronRight className="-ml-1 size-3.5" aria-hidden />
        </div>
      </div>

      {/* Keyboard + screen-reader control. pointer-events-none so the container
          owns hover/drag; still focusable and arrow-key operable. */}
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Reveal before or after the redesign"
        className="pointer-events-none absolute inset-0 size-full appearance-none bg-transparent opacity-0"
      />
    </div>
  );
};

export default BeforeAfterSlider;
