import type { ComponentType } from 'react';

/**
 * Cell-filling artifact visuals for the Branding category — the same signatures
 * the detail pages use (a positioning map, an identity spec, a voice scale, a
 * creative north-star, a guidelines spread), distilled to fill a bento cell or
 * the overview's crossfade stage. They render no surface of their own and use
 * only theme tokens for structure (literal hex is reserved for the brand's real
 * swatches), so the same component reads on the bento's adaptive cell *and* on
 * the overview's dark stage (framed there by an adaptive card).
 *
 * Content is the studio's own brand — monogram `P` / `Perseus`, the Ink · Bone ·
 * Ember · Stone palette — so the overview teaser, the category bento, and the
 * detail signatures all tell one story.
 */

// The studio's real palette (BRANDING_SERVICES) — these are brand colours, so
// they stay literal rather than mapping to theme tokens.
const INK = '#141414';
const BONE = '#F5F2EC';
const EMBER = '#C4502E';
const STONE = '#8A8378';

// A faint construction grid drawn from the element's own (themed) text colour,
// so it survives on both light and dark grounds.
const GRID_STYLE = {
  backgroundImage:
    'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
  backgroundSize: '16px 16px',
};

// Brand Strategy & Positioning — a 2×2 perceptual map. Competitors sit as faint
// dots; the studio plots as the ink dot that owns the distinctive/specialist
// corner.
const POINTS = [
  { label: 'You', x: 78, y: 82, you: true },
  { label: 'Legacy Co.', x: 30, y: 28 },
  { label: 'Discount', x: 18, y: 50 },
  { label: 'Agency X', x: 54, y: 40 },
  { label: 'Freelancers', x: 64, y: 22 },
];

const PositioningVisual = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="flex w-full max-w-[20rem] items-center gap-2">
      <span className="eyebrow rotate-180 text-[9px] text-muted-foreground [writing-mode:vertical-rl]">
        Generalist
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-center eyebrow text-[9px] text-muted-foreground">
          Distinctive
        </p>
        <div className="relative aspect-square w-full rounded-xl border border-border">
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
          {POINTS.map((p) => (
            <div
              key={p.label}
              className="absolute -translate-x-1/2 translate-y-1/2"
              style={{ left: `${p.x}%`, bottom: `${p.y}%` }}
            >
              {p.you ? (
                <div className="flex flex-col items-center">
                  <span className="size-3 rounded-full bg-foreground ring-2 ring-background" />
                  <span className="mt-1 whitespace-nowrap rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-semibold tracking-tight text-background">
                    You
                  </span>
                </div>
              ) : (
                <span className="block size-2 rounded-full bg-foreground/25" />
              )}
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-center eyebrow text-[9px] text-muted-foreground">
          Expected
        </p>
      </div>
      <span className="eyebrow text-[9px] text-muted-foreground [writing-mode:vertical-rl]">
        Specialist
      </span>
    </div>
  </div>
);

// Logo & Visual Identity — a construction-grid monogram over a reversibility
// row (the mark on ink, on bone, on brand colour).
const REVERSALS = [
  { bg: INK, fg: BONE },
  { bg: BONE, fg: INK },
  { bg: EMBER, fg: BONE },
];

const IdentityVisual = () => (
  <div className="flex h-full w-full flex-col justify-center gap-3">
    <div
      className="relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded-xl border border-border text-foreground/[0.12]"
      style={GRID_STYLE}
    >
      <span className="absolute inset-[22%] rounded-md border border-dashed border-foreground/20" />
      <span className="font-semibold leading-none tracking-tighter text-foreground [font-size:clamp(2.5rem,7vw,4.5rem)]">
        P
      </span>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {REVERSALS.map((s, i) => (
        <div
          key={i}
          className="grid aspect-[5/3] place-items-center rounded-lg"
          style={{ backgroundColor: s.bg }}
        >
          <span
            className="text-xl font-semibold tracking-tighter"
            style={{ color: s.fg }}
          >
            P
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Brand Messaging & Copywriting — tone sliders dialed to the brand's voice over
// its tagline.
const TONES = [
  { left: 'Formal', right: 'Casual', position: 62 },
  { left: 'Serious', right: 'Playful', position: 42 },
  { left: 'Corporate', right: 'Human', position: 80 },
];

const VoiceVisual = () => (
  <div className="flex h-full w-full flex-col justify-center gap-4">
    <div className="flex flex-col gap-3.5">
      {TONES.map((t) => (
        <div key={t.left}>
          <div className="flex items-center justify-between eyebrow text-[9px] text-muted-foreground">
            <span>{t.left}</span>
            <span>{t.right}</span>
          </div>
          <div className="relative mt-1.5 h-1 rounded-full bg-foreground/15">
            <span
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-background"
              style={{ left: `${t.position}%` }}
            />
          </div>
        </div>
      ))}
    </div>
    <p className="border-t border-border pt-3 text-sm font-semibold tracking-tighter text-foreground">
      “Production that earns a second look.”
    </p>
  </div>
);

// Creative Direction — a code-only north-star board: keyword, palette, type, and
// wordmark tiles art-directed into an asymmetric grid (no stock imagery).
const CreativeVisual = () => (
  <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-2">
    <div
      className="col-span-2 flex items-center rounded-lg px-3"
      style={{ backgroundColor: EMBER }}
    >
      <span
        className="text-sm font-semibold tracking-tighter"
        style={{ color: BONE }}
      >
        Bold · Warm · Editorial
      </span>
    </div>
    <div className="grid place-items-center rounded-lg border border-border">
      <span className="text-2xl font-semibold tracking-tighter text-foreground">
        Aa
      </span>
    </div>
    <div className="grid place-items-center rounded-lg bg-foreground">
      <span className="text-xs font-semibold tracking-tight text-background">
        Perseus
      </span>
    </div>
    <div className="col-span-2 flex gap-1.5 rounded-lg border border-border p-2">
      {[INK, BONE, EMBER, STONE].map((c) => (
        <span
          key={c}
          className="flex-1 rounded"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  </div>
);

// Brand Guidelines — a mini document spread: an ink cover, a colour page, and a
// type page.
const PALETTE = [INK, EMBER, STONE, BONE];

const GuidelinesVisual = () => (
  <div className="grid h-full w-full grid-cols-3 gap-2.5">
    <div className="flex flex-col items-center justify-center rounded-lg bg-foreground py-3 text-background">
      <span className="text-3xl font-semibold leading-none tracking-tighter">
        P
      </span>
      <span className="mt-1.5 text-[10px] font-semibold tracking-tight">
        Perseus
      </span>
      <span className="mt-0.5 eyebrow text-[7px] text-background/50">
        Guidelines
      </span>
    </div>
    <div className="flex flex-col gap-1 rounded-lg border border-border p-2">
      <span className="eyebrow text-[7px] text-muted-foreground">Color</span>
      <div className="grid flex-1 grid-cols-2 gap-1">
        {PALETTE.map((c) => (
          <span key={c} className="rounded" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
    <div className="flex flex-col rounded-lg border border-border p-2">
      <span className="eyebrow text-[7px] text-muted-foreground">Type</span>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <span className="text-xl font-semibold leading-none tracking-tighter text-foreground">
          Aa
        </span>
        <span className="mt-1 text-[8px] leading-tight text-muted-foreground">
          Built to be remembered
        </span>
      </div>
    </div>
  </div>
);

// Registry keyed by `${categorySlug}/${serviceSlug}` (see socialBentoVisuals).
export const BRANDING_BENTO_VISUALS: Record<string, ComponentType> = {
  'branding/brand-strategy-positioning': PositioningVisual,
  'branding/logo-visual-identity': IdentityVisual,
  'branding/brand-messaging-copywriting': VoiceVisual,
  'branding/creative-direction': CreativeVisual,
  'branding/brand-guidelines': GuidelinesVisual,
};

// Convenience for the overview teaser, which addresses visuals by service slug.
export const getBrandingVisual = (
  serviceSlug: string,
): ComponentType | undefined =>
  BRANDING_BENTO_VISUALS[`branding/${serviceSlug}`];
