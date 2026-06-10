import { Container, Heading, ImageKit } from '@/components';
import { ABOUT_WHY_HEADING, ABOUT_WHY_REASONS } from '@/constants/about';
import { CATEGORIES } from '@/constants/services';

/**
 * "Why Perseus" for /about — one dark instrument plate in the studio's drawn
 * monochrome language (charcoal radial field, hairline ink, grain — the same
 * system as CategoryVisual).
 *
 * Left: the reasons as an interactive index — hovering one dims the others
 * (pure CSS: container-group dim + self-hover important restore, no JS).
 * Right: a code-drawn hub-and-spokes schematic — the five disciplines orbiting
 * the Perseus mark, with two dashed orbit rings counter-rotating on slow CSS
 * spins. Bottom: a stat strip whose numbers mirror the home <Stats> section
 * (keep in sync with components/Stats.tsx) plus the registry-computed service
 * count — based in Vancouver, working across the countries shown there.
 *
 * The plate is a fixed dark surface, so every color uses the non-flipping
 * `on-media` token (never `text-white`/`border-white`, which invert in dark
 * mode and vanish against the plate).
 */
const categories = Object.values(CATEGORIES);

// Mirrors components/Stats.tsx (COUNTRIES length + STATS values) — update
// together. Services is computed live from the registry.
const PLATE_STATS: { value: string; label: string }[] = [
  { value: '+7', label: 'Countries served' },
  { value: '+90', label: 'Clients served' },
  { value: '+3000', label: 'Videos produced' },
  {
    value: String(categories.reduce((n, c) => n + c.services.length, 0)),
    label: 'Services in-house',
  },
];

/* Schematic geometry — center of the viewBox, five nodes on the orbit. The
   viewBox is wide enough that the side labels (BRANDING / WEBSITES / DIGITAL
   MARKETING) render fully inside it instead of clipping at the plate edge.
   Computed at module scope; this is a server component, so the coordinates
   are rendered once and never re-derived on a client. */
const VIEW = { w: 580, h: 520 } as const;
const CX = VIEW.w / 2;
const CY = VIEW.h / 2;
const ORBIT_R = 158;
const CORE_R = 52;

const NODES = categories.map((c, i) => {
  const angle = ((-90 + i * (360 / categories.length)) * Math.PI) / 180;
  const x = CX + ORBIT_R * Math.cos(angle);
  const y = CY + ORBIT_R * Math.sin(angle);
  // Spoke starts at the core's edge, not its center.
  const sx = CX + CORE_R * Math.cos(angle);
  const sy = CY + CORE_R * Math.sin(angle);
  return { title: c.title, x, y, sx, sy };
});

const nodeAnchor = (x: number): 'start' | 'middle' | 'end' => {
  if (x < CX - 24) return 'end';
  if (x > CX + 24) return 'start';
  return 'middle';
};

const AboutWhyUs = () => {
  return (
    <section className="py-16">
      <Heading titleTag="h2" {...ABOUT_WHY_HEADING} containerStyle="mb-10" />

      <Container>
        <div className="relative isolate overflow-hidden rounded-4xl bg-[#0a0a0b] ring-1 ring-inset ring-black/[0.07]">
          {/* charcoal field with an off-axis lift — same plate as CategoryVisual */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(120% 130% at 78% 12%, #1e1e22 0%, #131316 45%, #0a0a0b 100%)',
            }}
          />
          {/* fine grain */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] mix-blend-soft-light"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          <div className="grid lg:grid-cols-[1.25fr_1fr]">
            {/* The index — hovering a reason dims the rest */}
            <div className="p-7 sm:p-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-on-media/35">
                The working habits
              </p>
              <ol className="group/why mt-6">
                {ABOUT_WHY_REASONS.map((reason, i) => (
                  <li
                    key={reason.title}
                    className="group border-b border-on-media/10 py-6 transition-opacity duration-300 first:pt-0 last:border-b-0 last:pb-0 group-hover/why:opacity-40 hover:opacity-100!"
                  >
                    <div className="flex items-baseline gap-5">
                      <span className="shrink-0 font-mono text-[11px] tracking-[0.2em] text-on-media/35 tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3 className="text-xl font-semibold tracking-tight text-on-media transition-transform duration-300 ease-out group-hover:translate-x-1 sm:text-2xl">
                          {reason.title}
                        </h3>
                        <p className="mt-2 max-w-xl text-sm leading-snug text-on-media/55">
                          {reason.description}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* The schematic — five disciplines around the Perseus mark */}
            <div className="relative hidden border-l border-on-media/10 lg:block">
              <svg
                aria-hidden="true"
                viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* registration marks */}
                <g stroke="#ededed" strokeOpacity={0.18} strokeWidth={1}>
                  <path d={`M20 28 h12 M26 22 v12`} />
                  <path d={`M${VIEW.w - 32} 28 h12 M${VIEW.w - 26} 22 v12`} />
                  <path d={`M20 ${VIEW.h - 28} h12 M26 ${VIEW.h - 34} v12`} />
                  <path
                    d={`M${VIEW.w - 32} ${VIEW.h - 28} h12 M${VIEW.w - 26} ${VIEW.h - 34} v12`}
                  />
                </g>

                {/* counter-rotating dashed orbits — slow CSS spins; the
                    viewBox center is the rings' center, so origin-center
                    rotates them in place */}
                <g className="origin-center animate-[spin_55s_linear_infinite]">
                  <circle
                    cx={CX}
                    cy={CY}
                    r={ORBIT_R}
                    fill="none"
                    stroke="#ededed"
                    strokeOpacity={0.22}
                    strokeWidth={1}
                    strokeDasharray="3 7"
                  />
                </g>
                <g className="origin-center animate-[spin_80s_linear_infinite_reverse]">
                  <circle
                    cx={CX}
                    cy={CY}
                    r={ORBIT_R - 44}
                    fill="none"
                    stroke="#ededed"
                    strokeOpacity={0.1}
                    strokeWidth={1}
                    strokeDasharray="2 10"
                  />
                </g>

                {/* spokes */}
                <g stroke="#ededed" strokeOpacity={0.16} strokeWidth={1}>
                  {NODES.map((n) => (
                    <line
                      key={n.title}
                      x1={n.sx}
                      y1={n.sy}
                      x2={n.x}
                      y2={n.y}
                    />
                  ))}
                </g>

                {/* core */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={CORE_R}
                  fill="none"
                  stroke="#ededed"
                  strokeOpacity={0.45}
                  strokeWidth={1}
                />
                <circle
                  cx={CX}
                  cy={CY}
                  r={CORE_R - 7}
                  fill="none"
                  stroke="#ededed"
                  strokeOpacity={0.12}
                  strokeWidth={1}
                />

                {/* discipline nodes — one per category, labels read from the
                    registry so this stays in sync */}
                {NODES.map((n) => {
                  const anchor = nodeAnchor(n.x);
                  const labelX =
                    anchor === 'start'
                      ? n.x + 12
                      : anchor === 'end'
                        ? n.x - 12
                        : n.x;
                  const labelY = n.y < CY ? n.y - 14 : n.y + 22;
                  return (
                    <g key={n.title}>
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={3.5}
                        fill="#ededed"
                        fillOpacity={0.9}
                      />
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={9}
                        fill="none"
                        stroke="#ededed"
                        strokeOpacity={0.25}
                        strokeWidth={1}
                      />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor={anchor}
                        fill="#ededed"
                        fillOpacity={0.6}
                        fontSize={10}
                        letterSpacing={2}
                        fontFamily="var(--font-mono, ui-monospace, monospace)"
                      >
                        {n.title.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Perseus mark in the core — the viewBox center maps to the
                  column center (meet + full-bleed svg), so a centered overlay
                  sits exactly inside the core rings. `invert` keeps the black
                  logo asset white on this fixed dark plate in both themes. */}
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <ImageKit
                  src="/logo-black.png"
                  alt=""
                  aria-hidden="true"
                  width={120}
                  height={120}
                  className="w-12 invert"
                />
              </div>
            </div>
          </div>

          {/* Instrument strip — numbers mirror the home Stats section */}
          <div className="border-t border-on-media/10">
            <dl className="grid grid-cols-2 sm:grid-cols-4">
              {PLATE_STATS.map((s, i) => (
                <div
                  key={s.label}
                  className={`p-6 sm:p-7 ${i > 0 ? 'border-l border-on-media/10' : ''} ${
                    i >= 2 ? 'border-t border-on-media/10 sm:border-t-0' : ''
                  } ${i === 2 ? 'border-l-0 sm:border-l' : ''}`}
                >
                  <dd className="text-3xl font-semibold tracking-tight text-on-media tabular-nums sm:text-4xl">
                    {s.value}
                  </dd>
                  <dt className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-on-media/45">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Footer — the honest geography line */}
          <div className="border-t border-on-media/10 p-7 sm:px-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-media/45">
              HQ — Vancouver, BC
              <span className="text-on-media/25"> · </span>
              Working across 7 countries
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default AboutWhyUs;
