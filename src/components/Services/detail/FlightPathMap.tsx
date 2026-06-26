'use client';

import { motion } from 'motion/react';

import Img from '../../Img';
import type { ProductionServiceContent } from '../types';

type FlightPath = NonNullable<ProductionServiceContent['flightPath']>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/**
 * Aerial Production signature — a drone "flight plan" drawn over an aerial still.
 *
 * Two stacked routes read as a mission: a faint dashed *planned* path is always
 * present, and a bright *flown* path draws on along it via `pathLength` on
 * scroll-in, while numbered waypoints pop in sequence and a leading position dot
 * pulses at the destination. A HUD of mono telemetry chips sits over the darkened
 * frame; a light "flight log" lists each waypoint's altitude. Built from the
 * studio idioms (scrim/on-media over media, mono HUD chips, hairline log rows) so
 * it feels native — the "wow" is the treatment, not new chrome.
 */
const FlightPathMap = ({
  imageUrl,
  imageAlt,
  path,
  waypoints,
  telemetry,
}: FlightPath) => {
  const last = waypoints[waypoints.length - 1];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr] lg:gap-6">
      {/* ───── Map: aerial still + drawn flight route ───── */}
      <div className="relative aspect-16/10 overflow-hidden rounded-3xl bg-scrim">
        <Img
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 760px, 100vw"
          className="rounded-none object-cover"
        />
        {/* Darken so the route reads; subtle vignette toward the corners */}
        <div className="pointer-events-none absolute inset-0 bg-scrim/45" />
        <div className="pointer-events-none absolute inset-0 bg-radial from-transparent to-scrim/55" />

        <svg
          viewBox="0 0 1000 625"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 size-full"
          aria-hidden
        >
          {/* Planned route — faint, dashed, always visible */}
          <path
            d={path}
            fill="none"
            stroke="var(--color-on-media)"
            strokeOpacity={0.3}
            strokeWidth={2}
            strokeDasharray="2 9"
            strokeLinecap="round"
          />

          {/* Flown route — bright, draws on along the plan */}
          <motion.path
            d={path}
            fill="none"
            stroke="var(--color-on-media)"
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 5px rgba(252,252,252,0.55))' }}
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={VIEWPORT}
            transition={{ duration: 2.1, ease: EASE }}
          />

          {/* Waypoints — pop in sequence as the route reaches them */}
          {waypoints.map((wp, i) => (
            <motion.g
              key={`${wp.x}-${wp.y}`}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={VIEWPORT}
              transition={{
                duration: 0.4,
                ease: EASE,
                delay: 0.5 + i * (1.5 / Math.max(waypoints.length - 1, 1)),
              }}
              style={{ transformOrigin: `${wp.x}px ${wp.y}px` }}
            >
              <circle
                cx={wp.x}
                cy={wp.y}
                r={13}
                fill="var(--color-scrim)"
                fillOpacity={0.55}
                stroke="var(--color-on-media)"
                strokeWidth={2}
              />
              <text
                x={wp.x}
                y={wp.y + 4}
                textAnchor="middle"
                className="fill-on-media font-mono text-[13px] font-semibold"
              >
                {i + 1}
              </text>
            </motion.g>
          ))}

          {/* Pulsing position dot at the destination */}
          {last && (
            <motion.circle
              cx={last.x}
              cy={last.y}
              r={20}
              fill="none"
              stroke="var(--color-on-media)"
              strokeWidth={1.5}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: [0, 0.6, 0], scale: [0.6, 1.5, 0.6] }}
              viewport={VIEWPORT}
              transition={{
                duration: 2,
                ease: 'easeInOut',
                repeat: Infinity,
                delay: 2,
              }}
              style={{ transformOrigin: `${last.x}px ${last.y}px` }}
            />
          )}
        </svg>

        {/* HUD corner brackets — flight-plan instrumentation cue */}
        <span className="pointer-events-none absolute left-4 top-4 size-5 border-l border-t border-on-media/40" />
        <span className="pointer-events-none absolute right-4 top-4 size-5 border-r border-t border-on-media/40" />
        <span className="pointer-events-none absolute bottom-4 left-4 size-5 border-b border-l border-on-media/40" />
        <span className="pointer-events-none absolute bottom-4 right-4 size-5 border-b border-r border-on-media/40" />

        {/* Live HUD label */}
        <div className="absolute left-5 top-5 flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-on-media/70" />
            <span className="relative inline-flex size-2 rounded-full bg-on-media" />
          </span>
          <span className="eyebrow text-[10px] text-on-media/80">
            Flight plan · RPAS
          </span>
        </div>

        {/* Telemetry chips */}
        {telemetry && telemetry.length > 0 && (
          <div className="absolute inset-x-5 bottom-5 flex flex-wrap gap-2">
            {telemetry.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-scrim/55 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-media/90 backdrop-blur-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ───── Flight log: waypoint + altitude readout ───── */}
      <div className="flex flex-col rounded-3xl bg-background-contrast p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-[10px] text-black/45">
            Flight log
          </span>
          <span className="eyebrow text-[10px] text-black/45">
            ALT
          </span>
        </div>

        <ol className="mt-5 flex flex-col">
          {waypoints.map((wp, i) => (
            <motion.li
              key={`${wp.label}-${wp.altitude}`}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={VIEWPORT}
              transition={{
                duration: 0.4,
                ease: EASE,
                delay: 0.5 + i * (1.5 / Math.max(waypoints.length - 1, 1)),
              }}
              className="flex items-baseline gap-3 border-t border-black/10 py-3.5 first:border-t-0"
            >
              <span className="font-mono text-[11px] tabular-nums text-black/35">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 text-sm font-medium tracking-tight text-black/80">
                {wp.label}
              </span>
              <span className="font-mono text-[13px] tabular-nums text-black/55">
                {wp.altitude}
              </span>
            </motion.li>
          ))}
        </ol>

        <p className="mt-auto pt-6 text-xs leading-relaxed text-black/45">
          Representative flight plan. Every route is scoped to the site and flown
          by a Transport Canada–licensed pilot.
        </p>
      </div>
    </div>
  );
};

export default FlightPathMap;
