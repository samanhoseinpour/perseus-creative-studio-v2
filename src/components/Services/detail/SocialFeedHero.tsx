'use client';

import { useEffect, useState } from 'react';
import { motion, type Variants } from 'motion/react';
import { PERSEUS_LOGO } from '@/constants';
import {
  LuBadgeCheck,
  LuClapperboard,
  LuHeart,
  LuLayoutGrid,
  LuPlay,
  LuTag,
} from 'react-icons/lu';

import Img from '../../Img';
import type { SocialFeedPanel, SocialPostTile } from '../types';
import { useCountUp } from './useCountUp';

const EASE = [0.22, 1, 0.36, 1] as const;

const tileContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
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

const isReel = (t: SocialPostTile) => /reel/i.test(t.tag);

/** Live clock in iOS status-bar style ("9:41"), deferred to the client. */
const useClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const h = d.getHours() % 12 || 12;
      setTime(`${h}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, []);
  return time;
};

/**
 * Social hero "wow panel" — a living feed inside a phone surface. A real-time
 * status clock, the Perseus mark as the profile avatar, count-up stats, and a
 * working Posts / Reels / Tagged tab bar that filters the grid on click (each
 * switch re-staggers). Keeps the Social silhouette; studio tokens, monochrome.
 */
const SocialFeedHero = ({ name, handle, stats, tiles }: SocialFeedPanel) => {
  const time = useClock();
  const [tab, setTab] = useState(0);

  // Each tab shows the same feed, reordered so the relevant tiles lead — never
  // empty. Reels float reel tiles up; Tagged floats photo tiles up.
  const ordered =
    tab === 1
      ? [...tiles.filter(isReel), ...tiles.filter((t) => !isReel(t))]
      : tab === 2
        ? [...tiles.filter((t) => t.imageUrl), ...tiles.filter((t) => !t.imageUrl)]
        : tiles;

  // Always fill at least two rows so the grid height never jumps between tabs.
  const cells: SocialPostTile[] = [...ordered];
  for (let k = 0; cells.length < 6 && ordered.length; k++) {
    cells.push(ordered[k % ordered.length]);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="overflow-hidden rounded-[1.9rem] bg-background-contrast p-1.5"
    >
      <div className="overflow-hidden rounded-[1.5rem] bg-background-contrast">
        {/* Phone status bar */}
        <div className="flex items-center justify-between px-5 pb-1.5 pt-2.5 font-mono text-[10px] tabular-nums text-black/45">
          <span>{time || ' '}</span>
          <span className="flex items-center gap-1.5">
            <span>5G</span>
            <span className="flex h-2.5 w-5 items-center rounded-[3px] p-[1.5px]">
              <span className="block h-full w-2/3 rounded-[1px] bg-black/45" />
            </span>
          </span>
        </div>

        {/* Profile header */}
        <div className="flex items-center gap-3 px-4 pb-3 sm:gap-4">
          <span className="rounded-full bg-linear-to-tr from-black to-black/30 p-[2.5px]">
            <span className="block rounded-full bg-background-contrast p-[2px]">
              {/* Full Perseus wordmark, contained (not cover-cropped) so the
                  whole lockup reads inside the circular avatar. Padding keeps
                  it off the rim; dark:invert flips the black mark in dark mode. */}
              <span className="relative block size-10 overflow-hidden rounded-full bg-background-contrast">
                <Img
                  src={PERSEUS_LOGO}
                  alt={name}
                  fill
                  sizes="40px"
                  className="object-contain p-1 dark:invert"
                />
              </span>
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-sm font-semibold tracking-tight">
              {name}
              <LuBadgeCheck
                aria-hidden
                className="size-3.5 shrink-0 text-black/55"
              />
            </p>
            <p className="truncate font-mono text-[11px] text-black/45">
              {handle}
            </p>
          </div>
          <div className="flex gap-3 sm:gap-4">
            {stats.map((stat) => (
              <CountStat key={stat.label} {...stat} />
            ))}
          </div>
        </div>

        {/* Tab row — switches the grid */}
        <div className="flex border-y border-black/10">
          {TABS.map((t, i) => {
            const Icon = t.icon;
            const active = i === tab;
            return (
              <button
                key={t.label}
                type="button"
                aria-pressed={active}
                onClick={() => setTab(i)}
                className={[
                  'flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors',
                  active
                    ? '-mb-px border-b-2 border-black text-black'
                    : 'text-black/35 hover:text-black/60',
                ].join(' ')}
              >
                <Icon aria-hidden className="size-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feed grid — always 2 rows; re-keyed by tab so it re-staggers */}
        <motion.div
          key={tab}
          variants={tileContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-0.5 bg-black/5 p-0.5"
        >
          {cells.map((tile, i) => (
            <motion.div
              key={`${tab}-${i}`}
              variants={tileItem}
              className="relative aspect-square overflow-hidden bg-black"
            >
              {tile.imageUrl ? (
                  <>
                    <Img
                      src={tile.imageUrl}
                      alt={tile.caption}
                      fill
                      sizes="(min-width: 1024px) 160px, 33vw"
                      className="rounded-none object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim/55 to-transparent" />
                    {isReel(tile) ? (
                      <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-scrim/55 text-on-media backdrop-blur-sm">
                        <LuPlay aria-hidden className="size-2.5" />
                      </span>
                    ) : (
                      <span className="absolute left-2 top-2 rounded-full bg-scrim/55 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-on-media/90 backdrop-blur-sm">
                        {tile.tag}
                      </span>
                    )}
                    {i === 0 && (
                      <motion.span
                        className="absolute bottom-2 left-2 flex items-center gap-1 text-on-media"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, ease: EASE, delay: 0.8 }}
                      >
                        <LuHeart aria-hidden className="size-3.5 fill-on-media/90" />
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
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

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
