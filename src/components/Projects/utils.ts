import type { ProjectGalleryImage, ProjectSummary } from './types';

/** Zero-pad to two digits: 3 → "03". The house number format, used for
 *  position indices, category counts, tallies, and register positions. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** URL token for a display value, e.g. "Construction & Development" →
 *  "construction-development". Shared by the project filter rail and the
 *  card's industry tag, so a tag links to the exact filter token it sets. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Newest 4-digit year in a project's display year, e.g. "2023–2024" → 2024.
 *  Sorts projects newest-first on the category showcase and the home shelf. */
export function latestYear(year: string): number {
  const years = year.match(/\d{4}/g);
  return years ? Number(years[years.length - 1]) : 0;
}

/** Inverse of `normalizeInstagramUrl` (src/lib/portfolioFields.ts): the stored
 *  canonical `https://www.instagram.com/(p|reel|tv)/<id>/` embed ref → the
 *  `{type, id}` pair the `<Instagram>` component consumes. Null for anything
 *  malformed — callers skip the embed rather than crash the page. */
export function parseInstagramRef(
  ref: string,
): { type: 'p' | 'reel' | 'tv'; id: string } | null {
  const match = ref.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match
    ? { type: match[1] as 'p' | 'reel' | 'tv', id: match[2] }
    : null;
}

/** Every 4-digit year across a set of project cards, as numbers. Shared by the
 *  range label (hub) and the span count (proof tally). */
function allYears(projects: ProjectSummary[]): number[] {
  return projects.flatMap((p) => p.year.match(/\d{4}/g) ?? []).map(Number);
}

/** Min–max of every 4-digit year across a set of cards, e.g. "2023–2024". */
export function yearRange(projects: ProjectSummary[]): string | null {
  const years = allYears(projects);
  if (years.length === 0) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min}–${max}`;
}

/** Inclusive count of years a set of cards spans, e.g. 2024–2026 → 3. Derived
 *  from the same card dates as `yearRange`, for the proof tally's CountUp. */
export function yearSpan(projects: ProjectSummary[]): number {
  const years = allYears(projects);
  if (years.length === 0) return 0;
  return Math.max(...years) - Math.min(...years) + 1;
}

// ── Gallery chapter rhythm ──────────────────────────────────────────────────

export type GalleryBeatKind = 'full-bleed' | 'contained-wide' | 'paired-half';

/** One beat of the detail page's stills chapter: 1 frame (full-bleed /
 *  contained-wide) or 2 (paired-half). `index` is the frame's position in the
 *  stored sort order — the global "Frame NN" number. */
export interface GalleryBeat {
  kind: GalleryBeatKind;
  frames: { image: ProjectGalleryImage; index: number }[];
}

/** Wide enough to earn a full-bleed: landscape past ~3:2. */
const WIDE_AR = 1.45;

type FrameShape = 'wide' | 'standard' | 'portrait';

function shapeOf(image: ProjectGalleryImage): FrameShape {
  const { width, height } = image.variants.full;
  const ar = height > 0 ? width / height : 1;
  if (ar >= WIDE_AR) return 'wide';
  if (ar < 1) return 'portrait';
  return 'standard';
}

/**
 * Maps the stored still order onto the case study's media rhythm — alternating
 * cinematic beats instead of a uniform grid — purely from position + stored
 * aspect ratio, so reordering in /admin's gallery manager stays the only
 * editorial control. Rules: never bleed a lone frame; the opening beat bleeds
 * only when the frame is wide; portraits pair with the next non-wide frame; a
 * wide frame bleeds at most once every three beats; adjacent non-wides pair.
 */
export function galleryBeats(images: ProjectGalleryImage[]): GalleryBeat[] {
  const frames = images.map((image, index) => ({ image, index }));
  if (frames.length === 0) return [];
  if (frames.length === 1) return [{ kind: 'contained-wide', frames }];
  if (frames.length === 2) {
    return frames.some((f) => shapeOf(f.image) === 'wide')
      ? frames.map((f) => ({ kind: 'contained-wide' as const, frames: [f] }))
      : [{ kind: 'paired-half', frames }];
  }

  const beats: GalleryBeat[] = [];
  let i = 0;
  while (i < frames.length) {
    const current = frames[i];
    const shape = shapeOf(current.image);
    const next = frames[i + 1];
    const nextShape = next ? shapeOf(next.image) : null;

    if (beats.length === 0) {
      beats.push({
        kind: shape === 'wide' ? 'full-bleed' : 'contained-wide',
        frames: [current],
      });
      i += 1;
    } else if (shape === 'portrait' && next && nextShape !== 'wide') {
      beats.push({ kind: 'paired-half', frames: [current, next] });
      i += 2;
    } else if (shape === 'wide' && beats.length % 3 === 0) {
      beats.push({ kind: 'full-bleed', frames: [current] });
      i += 1;
    } else if (next && shape !== 'wide' && nextShape !== 'wide') {
      beats.push({ kind: 'paired-half', frames: [current, next] });
      i += 2;
    } else {
      beats.push({ kind: 'contained-wide', frames: [current] });
      i += 1;
    }
  }
  return beats;
}
