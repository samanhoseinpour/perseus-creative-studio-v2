'use client';

import { useState } from 'react';
import { LuMaximize, LuMousePointerClick } from 'react-icons/lu';

import Img from '../../Img';
import type { ProductionServiceContent } from '../types';

type Tour = NonNullable<ProductionServiceContent['tour']>;

/** Decorative hotspot positions (in %), cycled across scenes. */
const HOTSPOTS = [
  { top: '38%', left: '28%' },
  { top: '58%', left: '64%' },
  { top: '44%', left: '82%' },
];

/**
 * Virtual Tours signature — a Matterport-style viewer. A framed scene with
 * navigable hotspots, room thumbnails to switch viewpoints, and mode chips
 * (Walkthrough · Dollhouse · Floor plan). Interactive scene switch via state.
 * Scrim/on-media tokens over media; mono HUD.
 */
const DollhouseTour = ({ scenes, modes }: Tour) => {
  const [active, setActive] = useState(0);
  const scene = scenes[active];

  return (
    <div className="overflow-hidden rounded-3xl bg-scrim">
      {/* Viewport */}
      <div className="relative aspect-16/10 w-full sm:aspect-2/1">
        <Img
          key={scene.imageUrl}
          src={scene.imageUrl}
          alt={scene.imageAlt}
          fill
          sizes="(min-width: 1280px) 1240px, 100vw"
          className="rounded-none object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-radial from-transparent to-scrim/40" />

        {/* Hotspots */}
        {HOTSPOTS.map((h, i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: h.top, left: h.left }}
          >
            <span className="relative flex size-7 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-on-media/30" />
              <span className="relative inline-flex size-7 items-center justify-center rounded-full bg-on-media/90 text-scrim">
                <LuMousePointerClick aria-hidden className="size-3.5" />
              </span>
            </span>
          </span>
        ))}

        {/* Mode chips */}
        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          {(modes ?? ['Walkthrough', 'Dollhouse', 'Floor plan']).map((m, i) => (
            <span
              key={m}
              className={[
                'rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur-sm',
                i === 0
                  ? 'bg-on-media text-scrim'
                  : 'bg-scrim/45 text-on-media/85',
              ].join(' ')}
            >
              {m}
            </span>
          ))}
        </div>

        {/* Current room label */}
        <div className="absolute bottom-5 left-5 flex items-center gap-2">
          <LuMaximize aria-hidden className="size-4 text-on-media/70" />
          <span className="text-sm font-medium tracking-tight text-on-media">
            {scene.name}
          </span>
        </div>
      </div>

      {/* Room thumbnails — only when there's more than one scene to switch between */}
      {scenes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-on-media/10 p-3 [scrollbar-width:none] sm:p-4 [&::-webkit-scrollbar]:hidden">
          {scenes.map((s, i) => (
            <button
              key={s.imageUrl}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View ${s.name}`}
              aria-pressed={i === active}
              className={[
                'relative aspect-4/3 w-24 shrink-0 overflow-hidden rounded-lg transition-opacity sm:w-28',
                i === active
                  ? ''
                  : 'opacity-60 hover:opacity-100',
              ].join(' ')}
            >
              <Img
                src={s.imageUrl}
                alt=""
                fill
                sizes="120px"
                className="rounded-none object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 truncate bg-scrim/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-on-media/90">
                {s.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DollhouseTour;
