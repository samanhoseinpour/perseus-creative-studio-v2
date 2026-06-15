'use client';

import { motion, useReducedMotion, type Transition } from 'framer-motion';

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

/**
 * Deterministic trig. JS engines may differ in the last ULP of Math.cos/sin
 * (the spec allows implementation-defined precision for transcendentals), which
 * makes server-computed SVG coordinates disagree with the client's by a final
 * digit and triggers a hydration mismatch. Rounding the result collapses that
 * difference to an identical float on both sides; the downstream +/* arithmetic
 * is bit-identical per IEEE-754, so the rendered coordinate strings match.
 */
const cos = (a: number) => Math.round(Math.cos(a) * 1e6) / 1e6;
const sin = (a: number) => Math.round(Math.sin(a) * 1e6) / 1e6;

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

/* ── Production — lens aperture + film transport ─────────────────────────── */

function ProductionArt({ animated, compact }: PartProps) {
  const cx = 812;
  const cy = 300;
  const rOpen = 120; // aperture opening radius
  const rBarrel = 224;
  // Hexagonal iris built from six swept blades: each blade is a triangle from
  // an opening edge out to the barrel, alternately shaded — reads as overlapping
  // aperture leaves. `O` = opening vertices, `B` = barrel vertices.
  const O: [number, number][] = [];
  const B: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    O.push([cx + rOpen * cos(a), cy + rOpen * sin(a)]);
    B.push([cx + (rBarrel - 18) * cos(a), cy + (rBarrel - 18) * sin(a)]);
  }
  const blades = O.map((o, i) => {
    const oNext = O[(i + 1) % 6];
    const bNext = B[(i + 1) % 6];
    return `M${o[0]} ${o[1]} L${oNext[0]} ${oNext[1]} L${bNext[0]} ${bNext[1]} Z`;
  });

  return (
    <g stroke={INK} fill="none" strokeWidth={1.25} vectorEffect="non-scaling-stroke">
      {/* barrel + focus rings */}
      <circle cx={cx} cy={cy} r={rBarrel} opacity={0.32} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={rBarrel + 18} opacity={0.14} />
      <circle cx={cx} cy={cy} r={rBarrel - 30} opacity={0.18} />
      {!compact &&
        Array.from({ length: 60 }).map((_, i) => {
          const a = (Math.PI / 30) * i;
          const r1 = rBarrel + 8;
          const r2 = rBarrel + (i % 5 === 0 ? 26 : 15);
          return (
            <line
              key={i}
              x1={cx + r1 * cos(a)}
              y1={cy + r1 * sin(a)}
              x2={cx + r2 * cos(a)}
              y2={cy + r2 * sin(a)}
              opacity={i % 5 === 0 ? 0.32 : 0.16}
            />
          );
        })}
      {/* focus-distance arc */}
      {!compact && (
        <path
          d={`M${cx + (rBarrel + 40) * cos(2.3)} ${cy + (rBarrel + 40) * sin(2.3)} A ${rBarrel + 40} ${rBarrel + 40} 0 0 1 ${cx + (rBarrel + 40) * cos(0.84)} ${cy + (rBarrel + 40) * sin(0.84)}`}
          opacity={0.25}
          strokeWidth={1.5}
        />
      )}

      {/* iris — slow continuous rotation around its own centre */}
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={animated ? { rotate: 360 } : undefined}
        transition={{ duration: 90, ease: 'linear', repeat: Infinity }}
      >
        {blades.map((d, i) => (
          <path key={i} d={d} fill={INK} fillOpacity={i % 2 ? 0.05 : 0.1} stroke={INK} strokeWidth={1.25} opacity={0.45} />
        ))}
        <polygon points={O.map((p) => p.join(',')).join(' ')} opacity={0.9} strokeWidth={1.75} />
        <circle cx={cx} cy={cy} r={rOpen - 22} opacity={0.55} />
        <circle cx={cx} cy={cy} r={6} fill={INK} stroke="none" opacity={0.7} />
      </motion.g>

      {/* film transport — left column with sprockets + a travelling scan */}
      <g opacity={0.5}>
        <rect x={70} y={-20} width={150} height={840} rx={8} opacity={0.35} />
        <line x1={108} y1={-20} x2={108} y2={820} opacity={0.3} />
        <line x1={182} y1={-20} x2={182} y2={820} opacity={0.3} />
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={120} y={-10 + i * 96} width={50} height={64} rx={4} opacity={0.3} />
        ))}
      </g>
      {animated && (
        <motion.line
          x1={70}
          x2={220}
          stroke={INK}
          strokeWidth={2}
          opacity={0.7}
          initial={{ y: -40 }}
          animate={{ y: 820 }}
          transition={{ duration: 5.5, ease: 'linear', repeat: Infinity }}
        />
      )}

      {!compact && (
        <g className="font-mono" fill={INK} stroke="none">
          <text x={cx - 22} y={cy + 6} fontSize={17} opacity={0.55} letterSpacing="0.18em">
            ƒ/1.4
          </text>
          <text x={655} y={560} fontSize={13} opacity={0.4} letterSpacing="0.28em">
            24 FPS · 6K
          </text>
        </g>
      )}
    </g>
  );
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

/* ── Branding — a type specimen on a construction grid ──────────────────── */

function BrandingArt({ animated, compact }: PartProps) {
  const baseline = 560;
  const cap = 210;
  const xh = 330;

  return (
    <g vectorEffect="non-scaling-stroke">
      {/* construction grid */}
      {!compact && (
        <g stroke={INK} opacity={0.1} strokeWidth={1}>
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`v${i}`} x1={360 + i * 80} y1={120} x2={360 + i * 80} y2={680} />
          ))}
        </g>
      )}

      {/* guide lines — draw in on a loop */}
      <g stroke={INK} strokeWidth={1.25}>
        {[
          { y: cap, label: 'cap' },
          { y: xh, label: 'x-height' },
          { y: baseline, label: 'baseline' },
        ].map((g, i) => (
          <g key={g.label}>
            <motion.line
              x1={300}
              x2={1120}
              y1={g.y}
              y2={g.y}
              opacity={0.4}
              strokeDasharray="6 8"
              pathLength={1}
              initial={false}
              animate={animated ? { pathLength: [0, 1, 1] } : { pathLength: 1 }}
              transition={animated ? { ...drawLoop(1.6, 2.6), delay: i * 0.25 } : undefined}
            />
            {!compact && (
              <text
                className="font-mono"
                x={300}
                y={g.y - 8}
                fontSize={12}
                fill={INK}
                stroke="none"
                opacity={0.4}
                letterSpacing="0.18em"
              >
                {g.label}
              </text>
            )}
          </g>
        ))}
      </g>

      {/* the specimen — a solid 'Aa' with a stroked ghost twin behind */}
      <text
        x={560}
        y={baseline}
        fontSize={460}
        fontWeight={600}
        letterSpacing="-0.04em"
        fill={INK}
        stroke="none"
        opacity={0.9}
        style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
      >
        Aa
      </text>
      <text
        x={560}
        y={baseline}
        fontSize={460}
        fontWeight={600}
        letterSpacing="-0.04em"
        fill="none"
        stroke={INK}
        strokeWidth={1}
        opacity={0.18}
        style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
      >
        Aa
      </text>

      {/* tonal system swatches */}
      {!compact && (
        <g>
          {[0.14, 0.28, 0.45, 0.66, 0.9].map((o, i) => (
            <rect
              key={i}
              x={360 + i * 70}
              y={620}
              width={56}
              height={56}
              rx={10}
              fill={INK}
              fillOpacity={o}
              stroke={INK}
              strokeWidth={1}
              strokeOpacity={0.25}
            />
          ))}
        </g>
      )}
    </g>
  );
}

/* ── dispatcher ─────────────────────────────────────────────────────────── */

const ART: Record<string, (p: PartProps) => React.ReactElement> = {
  production: ProductionArt,
  websites: WebsitesArt,
  'digital-marketing': MarketingArt,
  social: SocialArt,
  branding: BrandingArt,
};

const CategoryVisual = ({ slug, variant = 'hero', className }: CategoryVisualProps) => {
  const prefersReduced = useReducedMotion();
  const Art = ART[slug] ?? WebsitesArt;
  const compact = variant !== 'hero';
  const animated = variant !== 'thumb' && !prefersReduced;

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
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* seat the on-media scrim / H1 in the lower-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(95% 85% at 22% 102%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 58%)',
        }}
      />
    </div>
  );
};

export default CategoryVisual;
