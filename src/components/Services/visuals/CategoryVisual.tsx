'use client';

import { motion, useReducedMotion, type Transition } from 'framer-motion';

import Img from '@/components/Img';
import { cn } from '@/lib/utils';

/**
 * Bespoke, code-rendered category artwork — one composition per discipline.
 *
 * These replace the old stock/AI photos behind the service-category surfaces
 * (CategoryHero, the /services hub index, the OtherCategories grid). The studio
 * already renders its signature sections as drawn CSS/SVG art rather than
 * photography; this brings the category covers up to the same bar.
 *
 * Design language — strictly the site's monochrome system:
 *  - a near-black charcoal field with an off-axis radial lift (top-right),
 *  - hairline line-work in bone/white at varied opacity (value, not hue, is the
 *    accent — one "live" element reads bright against a dimmed field),
 *  - a single restrained, transform/opacity-only motion gesture per discipline,
 *  - a soft grain + a bottom-left vignette so the on-media scrim + H1 still read.
 *
 * Variants tune density for context:
 *  - `hero`  — full composition with micro-labels (CategoryHero).
 *  - `card`  — animated, labels dropped (hub float preview, OtherCategories).
 *  - `thumb` — static primary motif only (the 64px mobile thumb).
 */

export type CategoryVisualVariant = 'hero' | 'card' | 'thumb';

interface CategoryVisualProps {
  slug: string;
  variant?: CategoryVisualVariant;
  className?: string;
}

const VIEW = { w: 1200, h: 800 } as const;
const INK = '#ededed';

/** Fine fractal-noise grain, shared by the drawn plates and the photo plate. */
const GRAIN_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Lower-left vignette that seats the on-media scrim + H1. */
const VIGNETTE_BG =
  'radial-gradient(95% 85% at 22% 102%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 58%)';

/**
 * Photo overrides — a category whose cover is a real Perseus photograph rather
 * than the drawn plate. A photo can't ride the `invert` / `media-adaptive`
 * theme flip, so its root is tagged `data-media="photo"` and globals.css pins
 * the media tokens (light ink + dark scrim, both themes) on any category cell
 * that contains one. Hosts need no per-call change.
 */
const PHOTO: Record<string, { src: string; alt: string }> = {
  production: {
    src: '/images/categories/category-production.avif',
    alt: '',
  },
  branding: {
    src: '/images/categories/category-branding.avif',
    alt: '',
  },
};

/** True when a category renders a real photo cover rather than a drawn plate. */
export const isPhotoCategory = (slug: string): boolean => slug in PHOTO;

/** A perpetual draw-in/hold loop for stroked paths. */
const drawLoop = (duration: number, repeatDelay = 1.6): Transition => ({
  duration,
  ease: 'easeInOut',
  repeat: Infinity,
  repeatType: 'loop',
  repeatDelay,
});

interface PartProps {
  animated: boolean;
  compact: boolean;
}

/* ── Websites — a layout drawing itself, responsively ───────────────────── */

function WebsitesArt({ animated, compact }: PartProps) {
  const bx = 250;
  const by = 150;
  const bw = 820;
  const bh = 520;
  const blocks: { x: number; y: number; w: number; h: number; len: number }[] = [
    { x: bx + 40, y: by + 110, w: 340, h: 64, len: 808 }, // headline
    { x: bx + 40, y: by + 196, w: 240, h: 30, len: 540 }, // sub
    { x: bx + 40, y: by + 250, w: 150, h: 42, len: 384 }, // button
    { x: bx + 470, y: by + 110, w: 310, h: 220, len: 1060 }, // media
    { x: bx + 40, y: by + 372, w: 220, h: 96, len: 632 }, // card
    { x: bx + 300, y: by + 372, w: 220, h: 96, len: 632 }, // card
    { x: bx + 560, y: by + 372, w: 220, h: 96, len: 632 }, // card
  ];

  return (
    <g stroke={INK} fill="none" vectorEffect="non-scaling-stroke">
      {/* baseline grid */}
      {!compact && (
        <g opacity={0.1} strokeWidth={1}>
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={i} x1={bx + i * 64} y1={40} x2={bx + i * 64} y2={760} />
          ))}
        </g>
      )}

      {/* browser chrome */}
      <rect x={bx} y={by} width={bw} height={bh} rx={18} strokeWidth={1.5} opacity={0.55} />
      <line x1={bx} y1={by + 52} x2={bx + bw} y2={by + 52} opacity={0.4} strokeWidth={1.5} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={bx + 28 + i * 22} cy={by + 26} r={6} opacity={0.45} strokeWidth={1.25} />
      ))}
      <rect x={bx + 120} y={by + 14} width={bw - 200} height={24} rx={12} opacity={0.3} strokeWidth={1.25} />

      {/* skeleton blocks — perpetual draw-in stagger */}
      {blocks.map((b, i) => (
        <motion.rect
          key={i}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={8}
          strokeWidth={1.5}
          opacity={0.5}
          strokeDasharray={b.len}
          initial={false}
          animate={animated ? { strokeDashoffset: [b.len, 0, 0] } : { strokeDashoffset: 0 }}
          transition={animated ? { ...drawLoop(1.1, 2.4), delay: 0.18 * i } : undefined}
        />
      ))}

      {/* responsive viewport line sweeping across the frame */}
      {animated && (
        <motion.g
          initial={{ x: 0 }}
          animate={{ x: [0, bw - 360, bw - 360, 0] }}
          transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity, times: [0, 0.42, 0.6, 1] }}
        >
          <line x1={bx + 360} y1={by - 18} x2={bx + 360} y2={by + bh + 18} strokeDasharray="3 7" opacity={0.5} />
          <path d={`M${bx + 350} ${by - 18} l-12 0 M${bx + 370} ${by - 18} l12 0`} opacity={0.6} />
        </motion.g>
      )}

      {/* blinking caret on the headline block */}
      {animated && !compact && (
        <motion.rect
          x={bx + 392}
          y={by + 116}
          width={3}
          height={52}
          fill={INK}
          stroke="none"
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
        />
      )}

      {!compact && (
        <g className="font-mono" fill={INK} stroke="none" opacity={0.4} letterSpacing="0.2em">
          <text x={bx} y={by - 22} fontSize={13}>
            1440
          </text>
          <text x={bx + 360} y={by - 22} fontSize={13}>
            1024
          </text>
          <text x={bx + 620} y={by - 22} fontSize={13}>
            768
          </text>
        </g>
      )}
    </g>
  );
}

/* ── Digital Marketing — a real performance curve being plotted ─────────── */

function MarketingArt({ animated, compact }: PartProps) {
  const x0 = 250;
  const x1 = 1080;
  const y0 = 640; // baseline
  const yTop = 200;
  // gently accelerating climb
  const pts: [number, number][] = [
    [x0, 590],
    [x0 + 150, 540],
    [x0 + 300, 520],
    [x0 + 440, 430],
    [x0 + 590, 388],
    [x0 + 720, 268],
    [x1, 232],
  ];
  const line = pts
    .map((p, i) => (i === 0 ? `M${p[0]} ${p[1]}` : `L${p[0]} ${p[1]}`))
    .join(' ');
  const area = `${line} L${x1} ${y0} L${x0} ${y0} Z`;
  const head = pts[pts.length - 1];

  return (
    <g vectorEffect="non-scaling-stroke">
      <defs>
        <linearGradient id="mkt-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INK} stopOpacity={0.16} />
          <stop offset="100%" stopColor={INK} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* axes + gridlines */}
      <g stroke={INK} fill="none" strokeWidth={1}>
        {[0, 1, 2, 3].map((i) => {
          const y = yTop + ((y0 - yTop) / 3) * i;
          return <line key={i} x1={x0} y1={y} x2={x1} y2={y} opacity={0.12} />;
        })}
        <line x1={x0} y1={yTop - 20} x2={x0} y2={y0} opacity={0.3} />
        <line x1={x0} y1={y0} x2={x1 + 20} y2={y0} opacity={0.3} />
        {!compact &&
          ['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
            <line
              key={q}
              x1={x0 + ((x1 - x0) / 3) * i}
              y1={y0}
              x2={x0 + ((x1 - x0) / 3) * i}
              y2={y0 + 10}
              opacity={0.3}
            />
          ))}
      </g>

      {/* area fill */}
      <motion.path
        d={area}
        fill="url(#mkt-area)"
        stroke="none"
        initial={false}
        animate={animated ? { opacity: [0, 1] } : { opacity: 1 }}
        transition={animated ? { duration: 2.2, repeat: Infinity, repeatType: 'reverse', repeatDelay: 1.4 } : undefined}
      />

      {/* the curve, drawn in on a loop */}
      <motion.path
        d={line}
        fill="none"
        stroke={INK}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        initial={false}
        animate={animated ? { pathLength: [0, 1, 1] } : { pathLength: 1 }}
        transition={animated ? drawLoop(2.4, 1.6) : undefined}
      />

      {/* travelling head marker */}
      {animated ? (
        <motion.g
          initial={false}
          animate={{ opacity: [0, 0, 1, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 0.62, 1], repeatDelay: 0 }}
        >
          <circle cx={head[0]} cy={head[1]} r={16} fill={INK} opacity={0.12} />
          <circle cx={head[0]} cy={head[1]} r={5} fill={INK} />
        </motion.g>
      ) : (
        <circle cx={head[0]} cy={head[1]} r={5} fill={INK} />
      )}

      {!compact && (
        <g className="font-mono" fill={INK} stroke="none" opacity={0.4}>
          <text x={head[0] - 92} y={head[1] - 18} fontSize={14} letterSpacing="0.12em">
            ▲ growth
          </text>
          {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
            <text key={q} x={x0 - 6 + ((x1 - x0) / 3) * i} y={y0 + 32} fontSize={12} letterSpacing="0.2em">
              {q}
            </text>
          ))}
        </g>
      )}
    </g>
  );
}

/* ── Social — a content grid breathing in a wave ────────────────────────── */

function SocialArt({ animated, compact }: PartProps) {
  const cols = 4;
  const rows = 3;
  const gap = 26;
  const gx = 300;
  const gy = 150;
  const tile = 150;
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({ r, c, x: gx + c * (tile + gap), y: gy + r * (tile + gap) });
    }
  }

  const Glyph = ({ kind, x, y }: { kind: number; x: number; y: number }) => {
    const cx = x + tile / 2;
    const cy = y + tile / 2;
    if (kind === 0)
      // play
      return <path d={`M${cx - 14} ${cy - 20} L${cx + 22} ${cy} L${cx - 14} ${cy + 20} Z`} opacity={0.6} />;
    if (kind === 1)
      // heart
      return (
        <path
          d={`M${cx} ${cy + 18} C ${cx - 30} ${cy - 8}, ${cx - 14} ${cy - 30}, ${cx} ${cy - 12} C ${cx + 14} ${cy - 30}, ${cx + 30} ${cy - 8}, ${cx} ${cy + 18} Z`}
          opacity={0.55}
        />
      );
    if (kind === 2)
      // carousel dots
      return (
        <g opacity={0.6}>
          {[-1, 0, 1].map((d) => (
            <circle key={d} cx={cx + d * 16} cy={cy} r={4} />
          ))}
        </g>
      );
    // image / mountains
    return (
      <g opacity={0.55}>
        <path d={`M${x + 28} ${y + tile - 30} l28 -34 l22 24 l26 -34 l32 44 Z`} />
        <circle cx={x + 44} cy={y + 40} r={9} />
      </g>
    );
  };

  return (
    <g stroke={INK} fill={INK} vectorEffect="non-scaling-stroke">
      {tiles.map((t, i) => {
        const wave = (t.c + t.r) * 0.22;
        return (
          <g key={i}>
            <motion.rect
              x={t.x}
              y={t.y}
              width={tile}
              height={tile}
              rx={20}
              fill={INK}
              stroke="none"
              initial={false}
              animate={animated ? { opacity: [0.04, 0.14, 0.04] } : { opacity: 0.07 }}
              transition={
                animated
                  ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: wave }
                  : undefined
              }
            />
            <rect
              x={t.x}
              y={t.y}
              width={tile}
              height={tile}
              rx={20}
              fill="none"
              stroke={INK}
              strokeWidth={1.25}
              opacity={0.28}
            />
            {[5, 1, 8, 10].includes(i) && (
              <g stroke="none" fill={INK}>
                <Glyph kind={[5, 1, 8, 10].indexOf(i)} x={t.x} y={t.y} />
              </g>
            )}
          </g>
        );
      })}

      {!compact && (
        <text
          className="font-mono"
          x={gx}
          y={gy - 22}
          fontSize={13}
          fill={INK}
          stroke="none"
          opacity={0.4}
          letterSpacing="0.24em"
        >
          FEED · 4×3
        </text>
      )}
    </g>
  );
}

/* ── dispatcher ─────────────────────────────────────────────────────────── */

const ART: Record<string, (p: PartProps) => React.ReactElement> = {
  websites: WebsitesArt,
  'digital-marketing': MarketingArt,
  social: SocialArt,
};

const CategoryVisual = ({ slug, variant = 'hero', className }: CategoryVisualProps) => {
  const prefersReduced = useReducedMotion();
  const Art = ART[slug] ?? WebsitesArt;
  const compact = variant !== 'hero';
  const animated = variant !== 'thumb' && !prefersReduced;

  // Photo cover — real photography, so no invert; tokens are pinned by the
  // `[data-media="photo"]` rule in globals.css. Same grain + lower-left
  // vignette as the drawn plates, plus a light uniform darken so the on-media
  // (light) chrome stays legible over the busier image.
  const photo = PHOTO[slug];
  if (photo) {
    return (
      <div
        data-media="photo"
        className={cn(
          'absolute inset-0 overflow-hidden bg-[#0a0a0b]',
          className,
        )}
      >
        <Img
          src={photo.src}
          alt={photo.alt}
          fill
          priority={variant === 'hero'}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
          className="h-full w-full rounded-none object-cover"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/15" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light"
          style={{ backgroundImage: GRAIN_BG }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: VIGNETTE_BG }}
        />
      </div>
    );
  }

  return (
    // Drawn dark-native; the `invert` flips the whole monochrome plate to its
    // light version in light mode (same trick as the site logo). Hosts wrap
    // the surface in `media-adaptive` so on-media/scrim chrome flips with it.
    <div
      className={cn(
        'absolute inset-0 overflow-hidden bg-[#0a0a0b] invert dark:invert-0',
        className,
      )}
    >
      {/* charcoal field with an off-axis lift toward the top-right */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 130% at 78% 18%, #1e1e22 0%, #131316 42%, #0a0a0b 100%)',
        }}
      />

      <svg
        aria-hidden
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        style={{ color: INK }}
      >
        <Art animated={animated} compact={compact} />
      </svg>

      {/* fine grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light"
        style={{ backgroundImage: GRAIN_BG }}
      />

      {/* seat the on-media scrim / H1 in the lower-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: VIGNETTE_BG }}
      />
    </div>
  );
};

export default CategoryVisual;
