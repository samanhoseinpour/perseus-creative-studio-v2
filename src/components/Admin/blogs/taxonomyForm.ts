import type {
  BlogTaxonomyActionResult,
  BlogTaxonomyResult,
} from '@/app/(admin)/admin/(protected)/_actions/blogTaxonomy';

/**
 * The bits both taxonomy dialogs need, in one place so the two cannot drift.
 *
 * THE VALIDATION IS THE SERVER'S, and that is a bundle decision rather than a
 * shortcut. Careers runs `jobOpeningSchema` in the browser first for instant
 * field errors, but the blog equivalent cannot: `blogPostSchema.ts` imports
 * `blogBody.ts`, which imports `@tiptap/core`, StarterKit and the table kit at
 * module scope. Turbopack merges every eagerly referenced client module into
 * one shared chunk group that all 86 routes load, so importing the schema here
 * would put the whole Tiptap document schema in front of every page on the
 * site to save one round trip on a form somebody opens by hand. The doors
 * already return `{ error: 'validation', issues }` keyed per field, which is
 * what these dialogs render.
 */

/** What a failed action says when it did not say anything itself: a deploy
 *  mid-session, an offline tab, a redirect that resolved the promise with no
 *  value. Worded like every other blog surface. */
export const TRANSPORT_PROBLEM = 'Something went wrong. Try again.';

/** A door's answer as the form's per-field issue map. An `ok` result and a
 *  refusal are both normalised here so a caller has one shape to render. */
export function taxonomyIssues(
  res: BlogTaxonomyResult | BlogTaxonomyActionResult | undefined,
): Record<string, string> {
  if (!res) return { _form: TRANSPORT_PROBLEM };
  if (res.ok) return {};
  if (res.error === 'validation') return res.issues;
  return { _form: TRANSPORT_PROBLEM };
}

/** The issues map minus the given keys, which is how a field's error clears as
 *  it is edited. Careers' helper, and the same one-line shape. */
export const dropIssues = (
  issues: Record<string, string>,
  ...keys: string[]
): Record<string, string> =>
  Object.fromEntries(Object.entries(issues).filter(([k]) => !keys.includes(k)));

/**
 * The first message belonging to a field, whether it landed on the field
 * itself or on one of its entries.
 *
 * `flattenBlogIssues` keys a per-entry failure as `sameAs.3`, so reading only
 * `issues.sameAs` would drop the one message that says which line is wrong and
 * leave the form looking like it saved. OpeningDialog does the same for tags.
 */
export const issueFor = (
  issues: Record<string, string>,
  field: string,
): string | undefined =>
  issues[field] ??
  Object.entries(issues).find(([k]) => k.startsWith(`${field}.`))?.[1];

/**
 * A textarea of one entry per line as the stored array: trimmed, empties
 * dropped, duplicates dropped case-insensitively.
 *
 * One per LINE rather than comma-separated, unlike the careers tag box, for a
 * reason the values themselves give: these are URLs and topic phrases, and a
 * comma inside one is ordinary. Never truncated to the schema's cap here, so
 * the refusal a member reads names the limit instead of an entry silently
 * going missing.
 */
export function linesToList(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const value = raw.trim();
    if (value && !out.some((v) => v.toLowerCase() === value.toLowerCase())) {
      out.push(value);
    }
  }
  return out;
}

/** The stored array back into a textarea. */
export const listToLines = (list: readonly string[]): string => list.join('\n');
