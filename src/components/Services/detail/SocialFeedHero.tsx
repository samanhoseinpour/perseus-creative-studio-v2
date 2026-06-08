'use client';

import { motion, type Variants } from 'motion/react';
import {
  LuBadgeCheck,
  LuClapperboard,
  LuHeart,
  LuLayoutGrid,
  LuPlay,
  LuTag,
} from 'react-icons/lu';

import ImageKit from '../../ImageKit';
import type { SocialFeedPanel } from '../types';
import { useCountUp } from './useCountUp';

const EASE = [0.22, 1, 0.36, 1] as const;

const tileContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.35 } },
};
const tileItem: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE } },
};

const TABS = [
  { label: 'Posts', icon: LuLayoutGrid },
  { label: 'Reels', icon: LuClapperboard },
  { label: 'Tagged', icon: LuTag },
] as const;

/**
 * Social hero "wow panel" — a living feed inside a phone surface, not a flat
 * Instagram grid. A story-ring avatar + verified handle, follower stats that
 * count up on mount, a profile tab row, and a tile grid that staggers in with a
 * Reel cue + a like-pop. Keeps the Social silhouette (a profile feed). Studio
 * tokens, monochrome — the life comes from motion, not colour.
 */
const SocialFeedHero = ({ name, handle, stats, tiles }: SocialFeedPanel) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: EASE }}
    className="overflow-hidden rounded-[1.9rem] bg-background-contrast p-1.5 ring-1 ring-inset ring-black/10"
  >
    <div className="overflow-hidden rounded-[1.5rem] bg-background-contrast ring-1 ring-inset ring-black/[0.06]">
      {/* Phone status bar */}
      <div className="flex items-center justify-between px-5 pb-1.5 pt-2.5 font-mono text-[10px] tabular-nums text-black/45">
        <span>9:41</span>
        <span className="flex items-center gap-1.5">
          <span>5G</span>
          <span className="flex h-2.5 w-5 items-center rounded-[3px] p-[1.5px] ring-1 ring-inset ring-black/25">
            <span className="block h-full w-2/3 rounded-[1px] bg-black/45" />
          </span>
        </span>
      </div>

      {/* Profile header */}
      <div className="flex items-center gap-3 px-4 pb-3 sm:gap-4">
        <span className="rounded-full bg-linear-to-tr from-black to-black/30 p-[2.5px]">
          <span className="block rounded-full bg-background-contrast p-[2px]">
            <span className="grid size-10 place-items-center rounded-full bg-black text-base font-semibold text-white">
              {name.charAt(0)}
            </span>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-sm font-semibold tracking-tight">
            {name}
            <LuBadgeCheck aria-hidden className="size-3.5 shrink-0 text-black/55" />
          </p>
          <p className="truncate font-mono text-[11px] text-black/45">{handle}</p>
        </div>
        <div className="flex gap-3 sm:gap-4">
          {stats.map((stat) => (
            <CountStat key={stat.label} {...stat} />
          ))}
        </div>
      </div>

      {/* Tab row */}
      <div className="flex border-y border-black/10">
        {TABS.map((tab, i) => {
          const Icon = tab.icon;
          const active = i === 0;
          return (
            <span
              key={tab.label}
              className={[
                'flex flex-1 items-center justify-center gap-1.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em]',
                active
                  ? '-mb-px border-b-2 border-black text-black'
                  : 'text-black/35',
              ].join(' ')}
            >
              <Icon aria-hidden className="size-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </span>
          );
        })}
      </div>

      {/* Feed grid */}
      <motion.div
        variants={tileContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-3 gap-0.5 bg-black/5 p-0.5"
      >
        {tiles.map((tile, i) => {
          const isReel = /reel/i.test(tile.tag);
          return (
            <motion.div
              key={i}
              variants={tileItem}
              className="relative aspect-square overflow-hidden bg-black"
            >
              {tile.imageUrl ? (
                <>
                  <ImageKit
                    src={tile.imageUrl}
                    alt={tile.caption}
                    fill
                    sizes="(min-width: 1024px) 160px, 33vw"
                    className="rounded-none object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim/55 to-transparent" />
                  {isReel ? (
                    <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-scrim/55 text-on-media backdrop-blur-sm">
                      <LuPlay aria-hidden className="size-2.5" />
                    </span>
                  ) : (
                    <span className="absolute left-2 top-2 rounded-full bg-scrim/55 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-on-media/90 backdrop-blur-sm">
                      {tile.tag}
                    </span>
                  )}
                  {/* Like-pop on the first image tile */}
                  {i === 0 && (
                    <motion.span
                      className="absolute bottom-2 left-2 flex items-center gap-1 text-on-media"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.35, ease: EASE, delay: 1 }}
                    >
                      <LuHeart
                        aria-hidden
                        className="size-3.5 fill-on-media/90"
                      />
                    </motion.span>
                  )}
                </>
              ) : (
                <div className="flex size-full flex-col justify-between bg-black p-3 text-white">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
                    {tile.tag}
                  </span>
                  <p className="text-[13px] font-medium leading-snug tracking-tight text-white/90">
                    {tile.caption}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  </motion.div>
);

const CountStat = ({ value, label }: { value: string; label: string }) => {
  const display = useCountUp(value);
  return (
    <div className="text-center">
      <p className="text-sm font-semibold tabular-nums tracking-tight">
        {display}
      </p>
      <p className="font-mono text-[9px] uppercase tracking-tight text-black/40">
        {label}
      </p>
    </div>
  );
};

export default SocialFeedHero;
