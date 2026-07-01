'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Container, CountUp, TextShimmer, Heading } from './';

type City = {
  name: string;
  region: string;
  lat: number;
  lng: number;
  hq?: boolean;
};

type Country = {
  code: string;
  flag: string;
  name: string;
  continent: string;
  tz: string;
  cities: City[];
};

const COUNTRIES: Country[] = [
  {
    code: 'CA',
    flag: '🇨🇦',
    name: 'Canada',
    continent: 'North America',
    tz: 'America/Vancouver',
    cities: [
      {
        name: 'Vancouver',
        region: 'British Columbia',
        lat: 49.2827,
        lng: -123.1207,
        hq: true,
      },
      {
        name: 'North Vancouver',
        region: 'British Columbia',
        lat: 49.3163,
        lng: -123.0693,
      },
      {
        name: 'West Vancouver',
        region: 'British Columbia',
        lat: 49.3286,
        lng: -123.1601,
      },
      {
        name: 'Richmond',
        region: 'British Columbia',
        lat: 49.1666,
        lng: -123.1336,
      },
      {
        name: 'Coquitlam',
        region: 'British Columbia',
        lat: 49.2838,
        lng: -122.7932,
      },
      {
        name: 'Anmore',
        region: 'British Columbia',
        lat: 49.3127,
        lng: -122.855,
      },
      {
        name: 'Langley',
        region: 'British Columbia',
        lat: 49.1044,
        lng: -122.6604,
      },
      {
        name: 'Salt Spring Island',
        region: 'British Columbia',
        lat: 48.8217,
        lng: -123.5012,
      },
      {
        name: 'Kelowna',
        region: 'British Columbia',
        lat: 49.888,
        lng: -119.496,
      },
      {
        name: 'Kamloops',
        region: 'British Columbia',
        lat: 50.6745,
        lng: -120.3273,
      },
      { name: 'Edmonton', region: 'Alberta', lat: 53.5461, lng: -113.4938 },
      { name: 'Toronto', region: 'Ontario', lat: 43.6532, lng: -79.3832 },
    ],
  },
  {
    code: 'US',
    flag: '🇺🇸',
    name: 'United States',
    continent: 'North America',
    tz: 'America/Los_Angeles',
    cities: [
      {
        name: 'Los Angeles',
        region: 'California',
        lat: 34.0522,
        lng: -118.2437,
      },
      {
        name: 'Irvine',
        region: 'California',
        lat: 33.6846,
        lng: -117.8265,
      },
      {
        name: 'Raleigh',
        region: 'North Carolina',
        lat: 35.7796,
        lng: -78.6382,
      },
    ],
  },
  {
    code: 'ES',
    flag: '🇪🇸',
    name: 'Spain',
    continent: 'Europe',
    tz: 'Europe/Madrid',
    cities: [
      { name: 'Marbella', region: 'Andalusia', lat: 36.5099, lng: -4.8866 },
      {
        name: 'Madrid',
        region: 'Community of Madrid',
        lat: 40.4168,
        lng: -3.7038,
      },
    ],
  },
  {
    code: 'IT',
    flag: '🇮🇹',
    name: 'Italy',
    continent: 'Europe',
    tz: 'Europe/Rome',
    cities: [{ name: 'Como', region: 'Lombardy', lat: 45.8081, lng: 9.0852 }],
  },
  {
    code: 'GB',
    flag: '🇬🇧',
    name: 'United Kingdom',
    continent: 'Europe',
    tz: 'Europe/London',
    cities: [
      { name: 'Manchester', region: 'England', lat: 53.4808, lng: -2.2426 },
    ],
  },
  {
    code: 'CN',
    flag: '🇨🇳',
    name: 'China',
    continent: 'Asia',
    tz: 'Asia/Shanghai',
    cities: [
      { name: 'Chengdu', region: 'Sichuan', lat: 30.5728, lng: 104.0668 },
      { name: 'Xi’an', region: 'Shaanxi', lat: 34.3416, lng: 108.9398 },
      { name: 'Chongqing', region: 'Chongqing', lat: 29.4316, lng: 106.9123 },
    ],
  },
  {
    code: 'AE',
    flag: '🇦🇪',
    name: 'United Arab Emirates',
    continent: 'Middle East',
    tz: 'Asia/Dubai',
    cities: [{ name: 'Dubai', region: 'Dubai', lat: 25.2048, lng: 55.2708 }],
  },
];

const ALL_CITIES = COUNTRIES.flatMap((c) =>
  c.cities.map((city) => ({ ...city, country: c.name, code: c.code })),
);
const HQ = ALL_CITIES.find((c) => c.hq)!;
const TOTAL_CITIES = ALL_CITIES.length;
const TOTAL_COUNTRIES = COUNTRIES.length;

const COUNTRY_CYCLE_MS = 5600;
const COUNTRY_PROGRESS_SECONDS = 5.35;

// Active-country city list. A fixed-height window keeps the panel the same
// height for every country (no jump on switch). Only lists taller than the
// window (Canada) scroll as a vertical marquee; shorter ones sit static.
const LIST_ROW_PX = 49;
const LIST_WINDOW_PX = 240;
const RAIL_SECONDS_PER_CITY = 2.6;

const STATS = [
  { id: 'countries', label: 'Countries', value: TOTAL_COUNTRIES, prefix: '+' },
  { id: 'cities', label: 'Cities', value: TOTAL_CITIES, prefix: '+' },
  { id: 'clients', label: 'Clients Served', value: 90, prefix: '+' },
  { id: 'videos', label: 'Videos Produced', value: 3000, prefix: '+' },
  { id: 'websites', label: 'Websites Designed', value: 15, prefix: '+' },
];

// Index where the last mobile-row begins (so border-b stops on the row above).
const STATS_LAST_ROW_START = Math.floor((STATS.length - 1) / 2) * 2;

// Equirectangular projection over a 2:1 container.
const project = (lat: number, lng: number) => ({
  x: ((lng + 180) / 360) * 100,
  y: ((90 - lat) / 180) * 100,
});

// Quadratic-bezier arc midpoint, lifted toward the pole for a satellite-style curve.
const arcPath = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const lift = Math.min(18, Math.abs(dx) * 0.18 + 4);
  return `M ${a.x} ${a.y} Q ${mx} ${my - lift} ${b.x} ${b.y}`;
};

// Great-circle distance in km between two lat/lng points.
const haversineKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
};

// Hour offset of a timezone right now, e.g. "Asia/Shanghai" -> +8.
const tzOffsetHours = (tz: string, ref: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(ref)
    .find((p) => p.type === 'timeZoneName')?.value;
  if (!parts) return 0;
  const m = parts.match(/GMT([+-]?\d+)(?::(\d+))?/);
  if (!m) return 0;
  const h = parseInt(m[1], 10) || 0;
  const min = parseInt(m[2] || '0', 10);
  return h + (h < 0 ? -min / 60 : min / 60);
};

const UNIQUE_CONTINENTS = Array.from(
  new Set(COUNTRIES.map((c) => c.continent)),
);

// Furthest city from HQ — the longest leg of the studio's network.
const FURTHEST = ALL_CITIES.filter((c) => !c.hq).reduce(
  (acc, c) => {
    const km = haversineKm(HQ, c);
    return km > acc.km ? { city: c, km } : acc;
  },
  { city: ALL_CITIES[0], km: 0 },
);
// One city row — shared by the static list and both copies of the scrolling
// marquee. Plain function (not a component) so it's inlined as JSX.
const cityRow = (city: City, i: number) => (
  <li
    key={`${city.name}-${i}`}
    className="flex items-center justify-between py-3"
  >
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] tabular-nums text-black/60">
        {String(i + 1).padStart(2, '0')}
      </span>
      <span className="text-base font-medium">{city.name}</span>
      {city.hq && (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest bg-black text-white">
          HQ
        </span>
      )}
    </div>
    <span className="text-xs text-black/50">{city.region}</span>
  </li>
);

const Stats = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // No pause state: selecting a country just restarts the cycle from it, which
  // already gives a full dwell. A separate pause used to hold the progress line
  // empty for ~3s after a tap, so the selected segment looked frozen.

  const [now, setNow] = useState<Date | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Hydrate the clock on the client only (avoids SSR mismatch).
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Time-zone span across all countries (max - min offset hours).
  const tzSpan = useMemo(() => {
    if (!now) return null;
    const offsets = COUNTRIES.map((c) => tzOffsetHours(c.tz, now));
    return Math.round(Math.max(...offsets) - Math.min(...offsets));
  }, [now]);

  useEffect(() => {
    if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);

    cycleTimerRef.current = setTimeout(() => {
      setActiveIdx((i) => (i + 1) % COUNTRIES.length);
    }, COUNTRY_CYCLE_MS);

    return () => {
      if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);
    };
  }, [activeIdx]);

  const active = COUNTRIES[activeIdx];
  const hqPt = project(HQ.lat, HQ.lng);
  const activeAnchor = active.cities[0];
  const distanceFromHq =
    active.code === 'CA' ? 0 : haversineKm(HQ, activeAnchor);
  const localTime = now
    ? new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: active.tz,
      }).format(now)
    : '—';

  // The list animates only when it overflows the fixed window (Canada); for
  // shorter countries — and for reduced-motion users — it stays static.
  const railOverflows = active.cities.length * LIST_ROW_PX > LIST_WINDOW_PX;
  const marquee = railOverflows && !prefersReducedMotion;
  const railDuration = active.cities.length * RAIL_SECONDS_PER_CITY;

  return (
    <section className="py-16">
      <Container className="flex flex-col">
        {/* Eyebrow */}
        <Heading
          seperatorTitle="03 — Global Footprint"
          eyebrowRight={`${TOTAL_CITIES} cities · ${TOTAL_COUNTRIES} countries`}
          title="From one studio in Vancouver."
          titleAccent={`To ${TOTAL_CITIES} cities, across ${TOTAL_COUNTRIES} countries.`}
          description="We're a full-service creative and marketing studio — branding, content, video, web, and digital. Same standard for every project, every city."
          containerStyle="px-0 md:px-0"
        />

        {/* Stats row */}
        <dl className="mt-12 grid grid-cols-2 md:grid-cols-5 border-y border-black/10">
          {STATS.map((s, i) => {
            const isMobileOrphan =
              STATS.length % 2 !== 0 && i === STATS.length - 1;
            return (
              <div
                key={s.id}
                className={[
                  'py-7 px-1 md:px-6',
                  // Span full width on mobile if it's the lone last cell.
                  isMobileOrphan ? 'col-span-2 md:col-span-1' : '',
                  // md+: hairline divider between every cell except the last.
                  i !== STATS.length - 1
                    ? 'md:border-r md:border-black/10'
                    : '',
                  // mobile: vertical divider on left cells (skip the orphan).
                  i % 2 === 0 && !isMobileOrphan
                    ? 'border-r border-black/10 md:border-r'
                    : '',
                  // mobile: horizontal divider on every row except the last.
                  i < STATS_LAST_ROW_START
                    ? 'border-b border-black/10 md:border-b-0'
                    : '',
                ].join(' ')}
              >
                <dt className="font-mono text-[10px] tracking-[0.18em] uppercase text-black/50">
                  {s.label}
                </dt>
                <dd className="mt-3 ms-0 flex items-baseline gap-0.5 text-4xl leading-4xl font-semibold tracking-tighter tabular-nums">
                  <span className="text-black/30">{s.prefix}</span>
                  <CountUp from={0} to={s.value} separator="," duration={1.4} />
                </dd>
              </div>
            );
          })}
        </dl>

        {/* Map + active country */}
        <div className="mt-16 grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Map */}
          <div className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-black/10 bg-background-contrast flex flex-col">
            <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-black/10 flex items-center justify-between gap-4">
              <div>
                <span className="eyebrow text-[10px] text-black/50">
                  Trsuted Worldwide
                </span>

                <h3 className="my-1 text-lg sm:text-xl leading-tight font-semibold tracking-tighter">
                  Where we have worked
                </h3>
              </div>

              <span className="hidden sm:inline-flex font-mono text-[10px] tracking-[0.18em] uppercase text-black/45 whitespace-nowrap">
                {TOTAL_CITIES} cities mapped
              </span>
            </div>
            <div className="relative aspect-2/1 w-full shrink-0">
              {/* Soft radial glow */}
              <div
                className="absolute inset-0 opacity-60 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(60% 60% at 50% 45%, rgba(20,20,20,0.06), transparent 70%)',
                }}
              />

              {/* Dotted world */}
              {/* Pre-generated by scripts/generate-dotted-map.mjs so the
                  dotted-map/proj4 libraries stay out of the client bundle.
                  Dots are baked dark into the SVG; invert in dark mode so they
                  read as light on a dark background (transparent stays
                  transparent). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/dotted-world-map.svg"
                loading="lazy"
                decoding="async"
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover mask-[radial-gradient(85%_85%_at_50%_50%,#000_60%,transparent_100%)] dark:invert"
              />

              {/* Arc connections from HQ */}
              <svg
                viewBox="0 0 100 50"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none text-black"
              >
                <defs>
                  {/* currentColor follows the svg's text-black token, so the
                      arcs flip with the theme instead of staying near-black. */}
                  <linearGradient id="arc-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop
                      offset="0%"
                      stopColor="currentColor"
                      stopOpacity="0"
                    />
                    <stop
                      offset="50%"
                      stopColor="currentColor"
                      stopOpacity="0.55"
                    />
                    <stop
                      offset="100%"
                      stopColor="currentColor"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                {ALL_CITIES.filter((c) => !c.hq).map((city, i) => {
                  const a = { x: hqPt.x, y: hqPt.y / 2 };
                  const p = project(city.lat, city.lng);
                  const b = { x: p.x, y: p.y / 2 };
                  const isActive = active.code === city.code;
                  return (
                    <motion.path
                      key={city.name}
                      d={arcPath(a, b)}
                      fill="none"
                      stroke="url(#arc-grad)"
                      strokeWidth={isActive ? 0.35 : 0.18}
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 1 }}
                      viewport={{ once: true, margin: '-20%' }}
                      animate={{
                        opacity: isActive ? 1 : 0.4,
                      }}
                      transition={{
                        pathLength: {
                          duration: 1.4,
                          delay: 0.4 + i * 0.08,
                          ease: [0.22, 1, 0.36, 1],
                        },
                        opacity: { duration: 0.4 },
                      }}
                    />
                  );
                })}
              </svg>

              {/* Markers */}
              {ALL_CITIES.map((city) => {
                const { x, y } = project(city.lat, city.lng);
                const isActive = active.code === city.code;
                const isHq = !!city.hq;
                return (
                  <div
                    key={`${city.country}-${city.name}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    {/* Pulse ring */}
                    <span
                      className={[
                        'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full',
                        isHq
                          ? 'w-6 h-6 bg-black/15 animate-ping'
                          : isActive
                            ? 'w-5 h-5 bg-black/15 animate-ping'
                            : 'w-3 h-3 bg-black/0',
                      ].join(' ')}
                      style={{ animationDuration: '2.2s' }}
                    />
                    {/* Dot */}
                    <span
                      className={[
                        'relative block rounded-full transition-all duration-300',
                        isHq
                          ? 'w-2.5 h-2.5 bg-black ring-2 ring-white shadow-[0_0_0_4px_rgba(20,20,20,0.08)]'
                          : isActive
                            ? 'w-2 h-2 bg-black ring-2 ring-white'
                            : 'w-1.5 h-1.5 bg-black/55 ring-1 ring-white',
                      ].join(' ')}
                    />
                    {/* Label on hover (and always for HQ) */}
                    <div
                      className={[
                        'absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap',
                        'pointer-events-none transition-opacity duration-200',
                        isHq || isActive
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100',
                      ].join(' ')}
                    >
                      <div className="px-2 py-1 rounded-md bg-black text-white text-[10px] font-mono tracking-wider uppercase shadow-lg">
                        {isHq && <span className="opacity-60">HQ · </span>}
                        {city.name}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Legend */}
              <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-full border border-black/10 bg-white/80 backdrop-blur px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-black/70">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-black ring-2 ring-white shadow-[0_0_0_3px_rgba(20,20,20,0.1)]" />
                  HQ
                </span>
                <span className="w-px h-3 bg-black/15" />
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-black/55" />
                  Studio Reach
                </span>
              </div>
            </div>

            {/* Tracking-station info strip — fills the space below the map */}
            <div className="flex-1 border-t border-black/10 grid grid-cols-3 divide-x divide-black/10 min-h-[140px]">
              {/* Active marker */}
              <div className="flex flex-col justify-center px-4 sm:px-5 py-4 overflow-hidden">
                <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-black/50">
                  Active Marker
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.code}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-2 flex items-center gap-3"
                  >
                    <span className="text-3xl leading-none">{active.flag}</span>
                    <div className="min-w-0">
                      <div className="text-base font-semibold tracking-tighter truncate">
                        {activeAnchor.name}
                      </div>
                      <div className="text-[11px] text-black/50 truncate">
                        {activeAnchor.region}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Coordinates */}
              <div className="flex flex-col justify-center px-4 sm:px-5 py-4">
                <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-black/50">
                  Coordinates
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.code}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-2"
                  >
                    <div className="font-mono text-sm font-semibold tabular-nums">
                      {Math.abs(activeAnchor.lat).toFixed(4)}°{' '}
                      <span className="text-black/50">
                        {activeAnchor.lat >= 0 ? 'N' : 'S'}
                      </span>
                    </div>
                    <div className="font-mono text-sm font-semibold tabular-nums mt-0.5">
                      {Math.abs(activeAnchor.lng).toFixed(4)}°{' '}
                      <span className="text-black/50">
                        {activeAnchor.lng >= 0 ? 'E' : 'W'}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Network status */}
              <div className="flex flex-col justify-center px-4 sm:px-5 py-4">
                <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-black/50">
                  Network
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-sm font-semibold tracking-tighter">
                    Live
                  </span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-black/50 mt-1.5 tabular-nums">
                  {TOTAL_CITIES} markers · {TOTAL_COUNTRIES} regions
                </div>
              </div>
            </div>
          </div>

          {/* Active country panel */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-black/10 bg-background-contrast">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-black/20 to-transparent" />
            <div className="p-6 sm:p-8 min-h-[530px] flex flex-col">
              <div className="flex items-center justify-between">
                <span className="eyebrow text-[10px] text-black/50">
                  Now showing
                </span>
                <span className="font-mono text-[10px] tabular-nums text-black/50">
                  {String(activeIdx + 1).padStart(2, '0')} /{' '}
                  {String(COUNTRIES.length).padStart(2, '0')}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={active.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-5"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-5xl leading-none drop-shadow-sm">
                      {active.flag}
                    </span>
                    <div>
                      <h3 className="text-2xl leading-2xl font-semibold tracking-tighter">
                        {active.name}
                      </h3>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-black/50">
                        {active.continent} · {active.cities.length}{' '}
                        {active.cities.length === 1 ? 'city' : 'cities'}
                      </span>
                    </div>
                  </div>

                  {/* City list — a fixed-height window so the panel never
                      changes height between countries. Lists taller than the
                      window (Canada) scroll as a vertical marquee (paused on
                      hover); shorter countries sit static. */}
                  <div className="mt-6 border-y border-black/10">
                    <div
                      className={[
                        'group/cityrail relative',
                        marquee ? 'overflow-hidden fadeout-vertical' : '',
                        !marquee && railOverflows
                          ? 'overflow-y-auto fadeout-vertical'
                          : '',
                        !marquee && !railOverflows ? 'overflow-hidden' : '',
                      ].join(' ')}
                      style={{ height: LIST_WINDOW_PX }}
                    >
                      {marquee ? (
                        <div
                          className="city-rail group-hover/cityrail:paused"
                          style={
                            {
                              '--rail-duration': `${railDuration}s`,
                            } as React.CSSProperties
                          }
                        >
                          <ul className="flex flex-col divide-y divide-black/10">
                            {active.cities.map((city, i) => cityRow(city, i))}
                          </ul>
                          {/* Second copy makes the -50% slide loop seamlessly. */}
                          <ul
                            aria-hidden
                            className="flex flex-col divide-y divide-black/10 border-t border-black/10"
                          >
                            {active.cities.map((city, i) => cityRow(city, i))}
                          </ul>
                        </div>
                      ) : (
                        <ul className="flex flex-col divide-y divide-black/10">
                          {active.cities.map((city, i) => cityRow(city, i))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Live local time + distance from HQ */}
                  <div className="mt-5 grid grid-cols-2 gap-px bg-black/10 border border-black/10 rounded-lg overflow-hidden">
                    <div className="bg-background-contrast px-3 py-2.5">
                      <div className="eyebrow text-[9px] text-black/50">
                        Local Time
                      </div>
                      <div className="mt-1 text-base font-semibold tabular-nums">
                        {localTime}
                        <span className="ml-1 text-[10px] font-mono text-black/60 uppercase tracking-widest">
                          {active.tz.split('/').pop()?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="bg-background-contrast px-3 py-2.5">
                      <div className="eyebrow text-[9px] text-black/50">
                        From HQ
                      </div>
                      <div className="mt-1 text-base font-semibold tabular-nums">
                        {distanceFromHq === 0
                          ? 'Headquarters'
                          : `${distanceFromHq.toLocaleString('en-US')} km`}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mt-auto pt-6 flex items-center gap-2">
                {COUNTRIES.map((_, i) => {
                  const isComplete = i < activeIdx;
                  const isCurrent = i === activeIdx;
                  return (
                    <span
                      key={i}
                      className="h-0.5 flex-1 rounded-full bg-black/10 overflow-hidden"
                    >
                      {isComplete ? (
                        // Countries already shown stay filled, like a stepper —
                        // the previous segment is full before the next fills.
                        <span className="block h-full w-full bg-black" />
                      ) : isCurrent ? (
                        <motion.span
                          // Remount per country so the fill restarts cleanly
                          // from the left each time, including on selection.
                          key={`progress-${activeIdx}`}
                          className="block h-full bg-black origin-left"
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{
                            duration: COUNTRY_PROGRESS_SECONDS,
                            ease: 'linear',
                          }}
                        />
                      ) : null}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Country chip rail */}
        <div className="mt-6 -mx-6 px-6 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            {COUNTRIES.map((c, i) => {
              const isActive = i === activeIdx;
              return (
                <button
                  key={c.code}
                  onClick={() => setActiveIdx(i)}
                  className={[
                    'group flex items-center gap-2 px-3.5 py-2 rounded-full border transition-all duration-300 cursor-pointer',
                    isActive
                      ? 'bg-black text-white border-black'
                      : 'bg-transparent text-black/70 border-black/15 hover:border-black/40 hover:text-black',
                  ].join(' ')}
                >
                  <span className="text-sm">{c.flag}</span>
                  <span className="text-xs font-medium tracking-tighter">
                    {c.name}
                  </span>
                  <span
                    className={[
                      'font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded',
                      isActive
                        ? 'bg-white/15 text-white/80'
                        : 'bg-black/5 text-black/50 group-hover:bg-black/10',
                    ].join(' ')}
                  >
                    {c.cities.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global summary tray */}
        <div className="mt-12 grid grid-cols-3 border-y border-black/10">
          <div className="py-5 px-4 sm:px-6 border-r border-black/10">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-black/50">
              Continents
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl leading-none font-semibold tabular-nums">
                {UNIQUE_CONTINENTS.length}
              </span>
              <span className="text-[11px] text-black/50 truncate">
                {UNIQUE_CONTINENTS.join(' · ')}
              </span>
            </div>
          </div>
          <div className="py-5 px-4 sm:px-6 border-r border-black/10">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-black/50">
              Time-Zone Span
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl leading-none font-semibold tabular-nums">
                {tzSpan ?? '—'}
              </span>
              <span className="text-[11px] text-black/50">hours</span>
            </div>
          </div>
          <div className="py-5 px-4 sm:px-6">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-black/50">
              Furthest Reach
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl leading-none font-semibold tabular-nums">
                {FURTHEST.km.toLocaleString('en-US')}
              </span>
              <span className="text-[11px] text-black/50">km</span>
              <span className="text-[11px] text-black/50 truncate ml-1">
                · {HQ.name} → {FURTHEST.city.name}
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/contact"
          className="mt-20 flex justify-center items-center"
        >
          <TextShimmer className="sm:text-4xl sm:leading-4xl text-xl leading-xl font-semibold text-center">
            Together, Let’s Create Something Extraordinary.
          </TextShimmer>
        </Link>
      </Container>
    </section>
  );
};

export default Stats;
