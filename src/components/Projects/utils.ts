import type { ProjectCategoryContent } from './types';

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

/** Every 4-digit year across a category's projects, as numbers. Shared by the
 *  range label (hub) and the span count (proof tally). */
function categoryYears(category: ProjectCategoryContent): number[] {
  return category.projects
    .flatMap((p) => p.year.match(/\d{4}/g) ?? [])
    .map(Number);
}

/** Min–max of every 4-digit year across a category's projects, e.g. "2023–2024". */
export function yearRange(category: ProjectCategoryContent): string | null {
  const years = categoryYears(category);
  if (years.length === 0) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min}–${max}`;
}

/** Inclusive count of years a category spans, e.g. 2024–2026 → 3. Derived from
 *  the same card dates as `yearRange`, for the proof tally's animated count. */
export function yearSpan(category: ProjectCategoryContent): number {
  const years = categoryYears(category);
  if (years.length === 0) return 0;
  return Math.max(...years) - Math.min(...years) + 1;
}
