/**
 * The post editor's own decisions, as pure functions.
 *
 * `blogFields.ts` says what a post IS, `blogListFields.ts` what the LIST does
 * with one, `blogFilters.ts` owns the list's URL. This is the third of those:
 * the vocabulary of the writing screen. It lives apart from the components for
 * the reason `taskCalendar.ts` and `digestEmail.ts` do — a screen's decisions
 * are only checkable when a script can reach them, and every component in this
 * feature is a client entry that `scripts/check-blogs.mts` cannot import.
 *
 * Zero runtime dependencies beyond two leaves of its own kind (`calendar.ts`,
 * `blogFields.ts`). No zod, no drizzle, no React, no `server-only`, and above
 * all no VALUE import of `@/lib/blogBody` or `@/lib/blogPostSchema`: both of
 * those reach `@tiptap/core` at module scope, and Turbopack merges every
 * eagerly referenced client module into one shared chunk group that all 86
 * routes load. `taxonomyForm.ts` states the same rule at length.
 *
 * The two `import type` lines are the one allowance, and they are free because
 * TypeScript erases a type-only import entirely: `blogFields.ts` takes exactly
 * the same allowance for exactly the same jsonb payload shapes, and states
 * that NOTHING there may become a value import. The same holds here.
 *
 * NINE THINGS LIVE HERE, and each of them is silent when it is wrong:
 *
 *  1. `buildPostFields` — the payload, including the map from a form's `''`
 *     back onto a nullable column. Miss one and either the save is refused
 *     (the two path shapes, where `''` is malformed rather than empty) or both
 *     fingerprints move for a change nobody made, which republishes a
 *     freshness signal and pings IndexNow for 38 unchanged URLs.
 *  2. `compactPostLists` — the blank-row drop. Task 5's whitespace gate binds
 *     ARRAY ITEMS as well as fields, so a writer who clicks "Add FAQ" and
 *     types one space would have every autosave refused with a validation
 *     error while they are still thinking. An empty row in the UI is an
 *     affordance, not a value.
 *  3. The schedule's minute bound. `dayTimeIn` measures ELAPSED time, so on a
 *     23-hour spring-forward day minute 1380 (23:00) is really the next day —
 *     pinned in section 10 of the check script, which notes that whatever
 *     offers a time picker has to bound it by the day's real length. This is
 *     that bound. Without it a writer picks 23:00 and the post goes live on
 *     the following day, once a year, with nothing on screen to explain it.
 *  4. `nextSlugFollow` and `nextSlug` — the title-to-slug auto-follow. It may
 *     only run while the stored slug is still a `draft-<hex>` placeholder, and
 *     it must never RE-ARM: a writer who typed a slug and then kept editing
 *     the title would otherwise watch their chosen address rewrite itself.
 *  5. `blogEditorActions` and `primaryAction` — which moves the screen offers.
 *     Derived from `transitionProblem` rather than restated, so the editor can
 *     never offer a move the state leaf refuses (the `blogRowActions` rule).
 *  6. `inspectorPaneFor` — which pane owns a field a door refused. On a phone
 *     the inspector is a closed sheet, so this is the difference between a
 *     refusal that points somewhere and one that just says no.
 *  7. `wordCountLine` and `describeWordCountChange` — what the counter says,
 *     and the sentence the first save of an imported post shows. The 38
 *     imported rows carry the legacy whole-file count and the editor's formula
 *     comes out 4 to 21 percent lower, which visibly moves the "N min read"
 *     byline. The change is intended; being silent about it is not.
 *  8. `bodyRefusalSentence` — what a save or a restore says when the validator
 *     refuses the document. It names the first problems, because they are the
 *     only thing that says WHICH block was refused; the sentence alone left
 *     the reason on the dev server's stdout and the writer with "Not saved".
 *  9. `autosaveRefusalNotice` — whether the quiet autosave path announces a
 *     refusal. Once per distinct sentence: the loop retries every 1.5 s of
 *     typing and a toast on that timer is noise, while a refusal under a long
 *     article's body was never seen at all.
 *
 * Run `node --import tsx scripts/check-blogs.mts` after touching any of it.
 */
import type { BlogMedia, BlogRobotsExtra } from '@/db/schema';
import type { BlogDoc } from '@/lib/blogBody';
import { STUDIO_TZ, dayKeyIn, dayStartIn, dayTimeIn, shiftDayKey } from '@/lib/calendar';
import { readingMinutes } from '@/utils/extractHeadings';
import {
  isPlaceholderSlug,
  transitionProblem,
  type BlogPostHistory,
  type BlogPostStatus,
} from '@/lib/blogFields';

// ── The save indicator ──────────────────────────────────────────────────────

/** What the top bar says about the last save. `failed` covers a refused save
 *  and a dropped request alike: the writer's next move is the same either way,
 *  and the reason is stated beside the field or in a toast. */
export type BlogSaveState = 'saved' | 'saving' | 'unsaved' | 'failed';

export const BLOG_SAVE_STATE_LABELS: Record<BlogSaveState, string> = {
  saved: 'Saved',
  saving: 'Saving',
  unsaved: 'Unsaved changes',
  failed: 'Not saved',
};

/**
 * Whether a door sent the editor's current payload.
 *
 * Every explicit move rides the same mutex as autosave, but only four of them
 * carry `fields`: Save, Publish, Schedule and the reschedule. Trash, Restore,
 * Unpublish, Unschedule and the date amendment send a status change and
 * nothing else, so what came back says nothing at all about the words on
 * screen.
 */
export type BlogSaveCarries = 'fields' | 'no-fields';

/**
 * The saved BASELINE after a door answered ok: what the bar may now call
 * saved, and what the leave guard compares against.
 *
 * A DATA-LOSS PATH, which is why it is a function here rather than a line in
 * the hook. It used to advance unconditionally, so a door that carried no
 * fields marked the writer's current payload saved: open a live post, add a
 * Source row with a title and no URL (`compactPostLists` keeps a half-filled
 * row, so every autosave is refused and the bar correctly reads "Not saved"),
 * then Unpublish. The move succeeds, the issues clear, and the bar reads
 * "Saved" over text the server has never seen. The Save button greys out, the
 * field error disappears, the `beforeunload` guard goes with it, and the work
 * is lost with the screen having said it was safe.
 *
 * Keeping the old baseline is the truthful answer in every other case too: a
 * status move landed, the words did not, so the post stays unsaved and the
 * next autosave sends them.
 */
export function nextSavedSnapshot(
  carries: BlogSaveCarries,
  sent: string,
  saved: string,
): string {
  return carries === 'fields' ? sent : saved;
}

// ── What the form holds ─────────────────────────────────────────────────────

export type EditorFaq = { question: string; answer: string };
export type EditorSource = { title: string; href: string; rel?: 'nofollow' | 'sponsored' | 'ugc' };
export type EditorEntity = { name: string; sameAs: string[]; primary: boolean };

/**
 * Exactly what the save doors take, as the FORM holds it.
 *
 * Every nullable column is held as `''` rather than `null`, because a
 * controlled `<input value={null}>` is an uncontrolled input and React says so
 * in the console. `buildPostFields` maps them back, in one place, so a field
 * cannot be stored as an empty string on one door and as null on the next.
 */
export type BlogEditorValues = {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  authorSlug: string;
  serviceSlug: string;
  heroStaticPath: string;
  heroMedia: BlogMedia | null;
  heroAlt: string;
  heroCaption: string;
  body: BlogDoc;
  keyTakeaways: string[];
  faqs: EditorFaq[];
  sources: EditorSource[];
  entities: EditorEntity[];
  relatedSlugs: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalOverride: string;
  ogTitle: string;
  ogDescription: string;
  ogImageStaticPath: string;
  ogImageMedia: BlogMedia | null;
  twitterCard: 'summary_large_image' | 'summary';
  robotsIndex: boolean;
  robotsFollow: boolean;
  robotsExtra: BlogRobotsExtra;
  focusKeywords: string[];
  emitLegacyMetaKeywords: boolean;
  llmsInclude: boolean;
};

// ── Blank rows never reach the schema ───────────────────────────────────────

const blank = (value: string): boolean => value.trim() === '';

/**
 * The five list fields with their ENTIRELY blank rows removed.
 *
 * A PARTIALLY filled row survives on purpose. A question with no answer is
 * real data that is incomplete, and the publish door refusing it is the
 * correct outcome; a row where the writer has typed nothing at all is a UI
 * affordance that was never a value. That distinction is the whole function.
 *
 * `sameAs` is compacted INSIDE a surviving entity too, because the field is a
 * textarea of one URL per line and a trailing newline is how everybody leaves
 * one. An entity whose name is filled but whose links are all blank still goes
 * through, and `blogEntitiesSchema`'s `min(1)` on `sameAs` refuses it with a
 * message pointing at the row: that is a half-filled row, not an empty one.
 */
export function compactPostLists(
  values: Pick<
    BlogEditorValues,
    'keyTakeaways' | 'focusKeywords' | 'faqs' | 'sources' | 'entities'
  >,
): {
  keyTakeaways: string[];
  focusKeywords: string[];
  faqs: EditorFaq[];
  sources: EditorSource[];
  entities: EditorEntity[];
} {
  return {
    keyTakeaways: values.keyTakeaways.filter((v) => !blank(v)),
    focusKeywords: values.focusKeywords.filter((v) => !blank(v)),
    faqs: values.faqs.filter((f) => !(blank(f.question) && blank(f.answer))),
    sources: values.sources.filter((s) => !(blank(s.title) && blank(s.href))),
    entities: values.entities
      .map((e) => ({ ...e, sameAs: e.sameAs.filter((v) => !blank(v)) }))
      .filter((e) => !(blank(e.name) && e.sameAs.length === 0)),
  };
}

// ── The payload ─────────────────────────────────────────────────────────────

const orNull = (value: string): string | null =>
  value.trim() === '' ? null : value.trim();

/**
 * The payload both save doors take, built from the form in ONE place.
 *
 * Two things happen here and nowhere else, and both are silent when they are
 * wrong. A nullable column held as `''` in the form becomes `null`, so a field
 * cannot be stored as an empty string on one door and as null on the next,
 * which would move BOTH fingerprints and with them the "Updated" byline, the
 * sitemap lastmod and an IndexNow ping, for a change nobody made. Two of them
 * are stricter than that: `heroStaticPath` and `ogImageStaticPath` are path
 * SHAPES where `''` is malformed rather than empty, so an unmapped one is a
 * refused save rather than a wrong fingerprint.
 *
 * And every list drops its ENTIRELY blank rows, through `compactPostLists`.
 *
 * `robotsExtra` follows the same rule as the nullable strings: an empty object
 * and `null` mean the same thing to `blogRobotsExtraSchema`, and `null` is
 * what all 38 imported rows carry, so sending `{}` would move every one of
 * their fingerprints on the first save.
 *
 * The key ORDER is fixed by this literal, and that is load-bearing rather than
 * cosmetic: the editor compares `JSON.stringify` of the result against the last
 * saved one to decide whether anything is unsaved, and two objects with the
 * same values in a different order do not compare equal.
 */
export function buildPostFields(values: BlogEditorValues) {
  const lists = compactPostLists(values);
  return {
    slug: values.slug,
    title: values.title,
    description: values.description,
    categorySlug: values.categorySlug,
    authorSlug: values.authorSlug,
    serviceSlug: orNull(values.serviceSlug),
    heroStaticPath: orNull(values.heroStaticPath),
    heroMedia: values.heroMedia,
    heroAlt: values.heroAlt,
    heroCaption: orNull(values.heroCaption),
    keyTakeaways: lists.keyTakeaways,
    faqs: lists.faqs,
    sources: lists.sources,
    entities: lists.entities,
    relatedSlugs: values.relatedSlugs,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
    canonicalOverride: orNull(values.canonicalOverride),
    ogTitle: values.ogTitle,
    ogDescription: values.ogDescription,
    ogImageStaticPath: orNull(values.ogImageStaticPath),
    ogImageMedia: values.ogImageMedia,
    twitterCard: values.twitterCard,
    robotsIndex: values.robotsIndex,
    robotsFollow: values.robotsFollow,
    robotsExtra:
      Object.keys(values.robotsExtra).length > 0 ? values.robotsExtra : null,
    focusKeywords: lists.focusKeywords,
    emitLegacyMetaKeywords: values.emitLegacyMetaKeywords,
    llmsInclude: values.llmsInclude,
    body: values.body,
  };
}

// ── The schedule's clock ────────────────────────────────────────────────────

/** Minutes in a `YYYY-MM-DD` in `tz`. 1440 on an ordinary day, 1380 on a
 *  spring-forward one and 1500 on a fall-back one. Measured as REAL elapsed
 *  time between two day starts, which is the only thing `dayTimeIn` counts. */
export function dayLengthMinutes(tz: string, dayKey: string): number {
  const start = dayStartIn(tz, dayKey).getTime();
  // `shiftDayKey` is the calendar module's own key arithmetic, not a second
  // copy of it here: a day key has no instant and no zone, and that file is
  // the only place allowed to do either kind of date math.
  const next = dayStartIn(tz, shiftDayKey(dayKey, 1)).getTime();
  return Math.round((next - start) / 60_000);
}

/**
 * A picked time of day, bounded by the day it was picked ON.
 *
 * The clamp is the point. `dayTimeIn` adds elapsed minutes to the day's first
 * moment, so on the 23-hour spring-forward day 23:00 is 24 hours in and lands
 * on the next day. A picker offering a fixed 00:00 to 23:59 would let a writer
 * schedule a post for a day it cannot go live on, once a year, and the only
 * symptom would be a post that appeared a day late.
 *
 * Clamped rather than refused: the writer picked a wall-clock time that does
 * not exist on that day, and the last minute that does exist is the honest
 * reading of it. The editor states the resolved instant beside the control, so
 * a clamped pick is visible rather than silent.
 */
export function clampDayMinutes(tz: string, dayKey: string, minutes: number): number {
  const length = dayLengthMinutes(tz, dayKey);
  if (!Number.isFinite(minutes)) return 0;
  return Math.min(Math.max(Math.trunc(minutes), 0), Math.max(length - 1, 0));
}

/** The instant a schedule fires: the writer's day and time, in the WRITER's
 *  zone, bounded by that day's real length. */
export function scheduleInstant(tz: string, dayKey: string, minutes: number): Date {
  return dayTimeIn(tz, dayKey, clampDayMinutes(tz, dayKey, minutes));
}

/** Which STUDIO_TZ day a scheduled instant lands on. The readout beside the
 *  schedule control, and the only control against a Tehran writer picking a
 *  morning time that is still the previous day in Vancouver. */
export function studioDayFor(at: Date): string {
  return dayKeyIn(STUDIO_TZ, at);
}

/** `540` as `09:00`, for a native `<input type="time">`. */
export function minutesToTimeValue(minutes: number): string {
  const m = Math.max(0, Math.trunc(minutes));
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** `09:00` back to `540`. `null` for anything that is not `HH:MM`, so a
 *  half-typed value leaves the stored minute alone rather than jumping to
 *  midnight on every keystroke. */
export function timeValueToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

// ── The slug follow ─────────────────────────────────────────────────────────

/** Whether the title-to-slug follow is running. There is no third value and,
 *  deliberately, no way back to `armed`. */
export type SlugFollow = 'armed' | 'off';

/** Anything that could turn the follow off. `title-edited` is in the list so
 *  the sweep in the check script covers the event that must NOT turn it off. */
export type SlugFollowEvent = 'title-edited' | 'slug-edited' | 'published';

/**
 * Whether the follow may run at all, decided once from the stored row.
 *
 * Two conditions, and both are needed. The slug must still be the generated
 * `draft-<hex>` placeholder, or a slug somebody chose would be overwritten by
 * the next title edit. And the post must not be locked, because a published
 * post's slug cannot be changed at all: arming there would make the field
 * rewrite itself into a value the save door then refuses. The lock is passed
 * in rather than re-derived, because `slugLocked(post)` is resolved once on
 * the server and the same answer has to reach the field and the door.
 */
export function slugFollowArms(post: { slug: string; slugLocked: boolean }): SlugFollow {
  return isPlaceholderSlug(post.slug) && !post.slugLocked ? 'armed' : 'off';
}

/**
 * The follow's whole state machine.
 *
 * IT NEVER RE-ARMS, and that is the reason it is a function rather than two
 * lines in a component: `off` is absorbing. A writer who types a slug, then
 * clears it back to empty, then keeps editing the title must not find their
 * address rewriting itself again, and a writer who publishes must not find it
 * rewriting itself at all. Expressed as a transition table, that is one line
 * per event and a sweep can prove it; expressed as conditions around a
 * `setState` it is three call sites and the next one added inherits nothing.
 */
export function nextSlugFollow(current: SlugFollow, event: SlugFollowEvent): SlugFollow {
  if (current === 'off') return 'off';
  return event === 'title-edited' ? 'armed' : 'off';
}

/**
 * The slug after a title edit, given the candidate the slugifier produced.
 *
 * THREE refusals, and each one is a different way the follow could corrupt the
 * address, which is why they are here rather than as conditions inside a
 * handler:
 *
 *  - the follow is off, which is the whole point of the state machine above;
 *  - the post is locked, read from the row on every render, so a publish that
 *    lands in another tab stops the follow in the same pass that turns the
 *    field read-only, without waiting for this state to be told;
 *  - the candidate is EMPTY. A writer who clears the title back to nothing
 *    slugifies to `''`, which no door accepts, so every autosave from then on
 *    would be refused on a field they never touched. The generated placeholder
 *    stays instead.
 *
 * The candidate is passed IN rather than slugified here, so this leaf keeps no
 * opinion about how a title becomes a slug: `slugify` is the dashboard's one
 * answer to that and the taxonomy dialogs already use it.
 */
export function nextSlug(
  current: { slug: string; follow: SlugFollow; slugLocked: boolean },
  candidate: string,
): string {
  if (current.follow !== 'armed') return current.slug;
  if (current.slugLocked) return current.slug;
  if (candidate === '') return current.slug;
  return candidate;
}

// ── What the screen offers ──────────────────────────────────────────────────

/** Which controls the editor shows for a post in this state. */
export type BlogEditorActions = {
  /** Save the working copy. Absent from the bin, where nothing may be edited. */
  save: boolean;
  /** Publish now, or Update when the post is already live. */
  publish: boolean;
  /** Set a publish time. Draft only: a scheduled update to a live post has no
   *  shape in this model and `transitionProblem` says so. */
  schedule: boolean;
  /** Move an existing schedule, which is an edit rather than a transition. */
  reschedule: boolean;
  unschedule: boolean;
  unpublish: boolean;
  trash: boolean;
  restore: boolean;
  /** Re-date a live post. Only a published post has a publication date. */
  amendDate: boolean;
};

/**
 * DERIVED from `transitionProblem`, never restated. The list's `blogRowActions`
 * is asserted against the same leaf for the same reason: a menu that offers a
 * move the state leaf refuses is a button whose only outcome is a sentence
 * explaining why it should not have been there.
 *
 * The three that are not transitions carry their own condition. `reschedule`
 * and `unschedule` are only meaningful on a scheduled post (moving a schedule
 * is an edit of one, which is why `updateSchedule` does not consult
 * `transitionProblem` either), and `amendDate` only on a published one.
 */
export function blogEditorActions(
  status: BlogPostStatus,
  history: BlogPostHistory,
): BlogEditorActions {
  const can = (to: BlogPostStatus) => transitionProblem(status, to, history) === null;
  return {
    save: status !== 'trash',
    publish: can('published'),
    schedule: can('scheduled'),
    reschedule: status === 'scheduled',
    unschedule: status === 'scheduled' && can('draft'),
    // `status === 'published'` is doing real work, exactly as it is one line
    // up. `can('archived')` is also true from the BIN for a post that was live
    // before, because `archived` is where `restoreTarget` sends it back to, so
    // the bare form offered Unpublish on a binned post and the door answered
    // "This post is in Trash, so it is already off the site."
    unpublish: status === 'published' && can('archived'),
    trash: can('trash'),
    restore: status === 'trash',
    amendDate: status === 'published',
  };
}

/** Which dialog the bar's primary button opens. `null` on a binned post,
 *  where the only move is to restore it. */
export type BlogPrimaryAction = 'publish' | 'update' | 'reschedule';

/**
 * Which `blogEditorActions` flag has to be true for the primary button to be
 * drawn at all.
 *
 * Written as a map rather than as a condition in the bar, because the bar had
 * the WRONG one: it gated every primary on `publish`, which is right for two
 * of the three and happens to be right for the third only because
 * `scheduled -> published` is currently allowed. Forbidding that move later
 * would have silently removed the Schedule button from every scheduled post,
 * with the state leaf saying nothing about it. Here the pairing is data, and
 * the sweep below proves every status's primary is one the screen may take.
 */
export const PRIMARY_ACTION_GATE: Record<BlogPrimaryAction, keyof BlogEditorActions> = {
  publish: 'publish',
  update: 'publish',
  reschedule: 'reschedule',
};

/**
 * The one primary action, and its label.
 *
 * `Update` rather than `Publish` once the post is live, because publishing an
 * update is a different act from putting a post out for the first time and the
 * button is the only thing that says so. `Schedule` on an already-scheduled
 * post, because the move that matters there is changing when it goes out;
 * publishing it early is a real but rarer act and lives in the overflow menu
 * beside Unschedule.
 *
 * Returned as a PAIR so the label and the dialog cannot drift: two functions
 * over the same status is how a button ends up saying Update and opening the
 * schedule fields.
 */
export function primaryAction(
  status: BlogPostStatus,
): { action: BlogPrimaryAction; label: string } | null {
  if (status === 'trash') return null;
  if (status === 'published') return { action: 'update', label: 'Update' };
  if (status === 'scheduled') return { action: 'reschedule', label: 'Schedule' };
  return { action: 'publish', label: 'Publish' };
}

// ── Where a refused field lives ─────────────────────────────────────────────

/** The three places a field can be edited. `canvas` is the article column:
 *  the title, the hero and the body itself. */
export type InspectorPane = 'post' | 'seo' | 'canvas';

/** Every field the SEO pane owns. Listed rather than derived because the split
 *  is an editorial one: `focusKeywords` and `llmsInclude` are both metadata,
 *  and only one of them is about search engines. */
const SEO_FIELDS = new Set([
  'seoTitle',
  'seoDescription',
  'canonicalOverride',
  'ogTitle',
  'ogDescription',
  'ogImageStaticPath',
  'ogImageMedia',
  'twitterCard',
  'robotsIndex',
  'robotsFollow',
  'robotsExtra',
  'focusKeywords',
  'emitLegacyMetaKeywords',
]);

/** The fields that are edited on the canvas rather than in either pane. */
const CANVAS_FIELDS = new Set(['title', 'body', 'heroMedia', 'heroStaticPath', 'heroAlt', 'heroCaption']);

/**
 * Which pane owns the field a door refused.
 *
 * A publish refusal names a field, and on a phone the inspector is a sheet
 * that is closed, while on a desktop it is one of two tabs, so the message can
 * easily be about a control the writer cannot see. The editor uses this to
 * open the right pane before it says anything, which is the difference between
 * a refusal that points somewhere and one that just says no.
 *
 * `flattenBlogIssues` keys a per-entry failure as `faqs.2.answer`, so the
 * FIRST segment is what decides, and anything unrecognised falls to the Post
 * pane: that is where the great majority of fields live, and an unknown key
 * there costs a wrong tab rather than a wrong claim.
 */
export function inspectorPaneFor(field: string): InspectorPane {
  const root = field.split('.')[0];
  if (CANVAS_FIELDS.has(root)) return 'canvas';
  return SEO_FIELDS.has(root) ? 'seo' : 'post';
}

// ── The word count ──────────────────────────────────────────────────────────

/**
 * The counter under the canvas, and it states the STORED count rather than a
 * live one.
 *
 * That is a deliberate reading of "the word counter calls
 * `wordCount({ doc, faqs })`, never CharacterCount". It does, and the call is
 * the save door's: every successful result carries the number that door just
 * computed with that function and stored, so the readout is a fact about the
 * row rather than a prediction of it. The stored column seeds it, so the line
 * is right before anything has been saved at all.
 *
 * It is NOT the published byline, and the difference matters on exactly one
 * kind of post. `saveDraft` writes `word_count` on the WORKING row while the
 * public byline reads the published revision's count, so a live post with
 * saved-but-unpublished edits shows the draft's number here and the older one
 * on the site. That is the same divergence the whole working-copy model has,
 * and publishing closes it.
 *
 * The alternative was calling `wordCount` in the browser, and it was MEASURED
 * and rejected: the function is a pure JSON walk, but its module builds the
 * whole Tiptap document schema at import, so reaching it needs a second
 * `dynamic()` boundary, and Turbopack emitted a SECOND 522,111-byte ProseMirror
 * chunk for it beside the body editor's. Half a megabyte more on the wire, to
 * show a number 1.5 seconds sooner, that the save was about to state anyway.
 *
 * `atLastSave` is what stops the number quietly lying while somebody types.
 */
export function wordCountLine(words: number, atLastSave: boolean): string {
  const count = `${words.toLocaleString('en-CA')} word${words === 1 ? '' : 's'}`;
  const time = `about ${readingMinutes(words)} min read`;
  const when = atLastSave ? ' Counted at the last save.' : '';
  return `${count}, ${time}.${when}`;
}

// ── The word count change ───────────────────────────────────────────────────

/**
 * The sentence the FIRST editor save of an imported post shows, or null when
 * there is nothing to say.
 *
 * The 38 imported rows carry the legacy `countWords(mdx)` over the whole file;
 * the editor stores `wordCount({ doc, faqs })`, which counts the body plus the
 * FAQ prose and comes out 4 to 21 percent lower. That moves the visible
 * "N min read" byline, the JSON-LD `wordCount` and the author-page totals. The
 * numbers come back on every successful save result precisely so this can be
 * said once instead of being discovered on the live page.
 *
 * `wasImported` IS THE WHOLE GATE, and it is a required parameter rather than
 * a condition at the call site because without it this fires on ordinary work.
 * `previousWordCount` is the working row's count read immediately before the
 * write, so ANY edit at all moves it: a writer adding one sentence to a mature
 * post would get a twelve-second toast about an import formula, on a post that
 * was never imported. `postWordCountIsLegacy` answers the question this needs
 * (the importer's own skip rule, read from the other end), and the parameter
 * makes forgetting to ask it a type error.
 */
export function describeWordCountChange(
  previous: number,
  next: number,
  wasImported: boolean,
): string | null {
  if (!wasImported) return null;
  if (previous === next) return null;
  const direction = next < previous ? 'down' : 'up';
  return `Word count went ${direction} from ${previous.toLocaleString('en-CA')} to ${next.toLocaleString('en-CA')}. The editor counts the article and its FAQ answers, which is what the reading time on the page is based on.`;
}

// ── What a refused body says ────────────────────────────────────────────────

/** How many validator problems the refusal names before it counts the rest. */
const BODY_REFUSAL_NAMED = 3;

/**
 * The sentence a save or a restore hands back when `validateBlogBody` refuses
 * the document.
 *
 * The validator's problems are diagnostics (`content.0.attrs: Invalid input:
 * expected object, received function`), not copy, and they are also the only
 * thing that says WHICH block was refused. So they are named rather than
 * hidden: the editor is the one thing that can produce a malformed document,
 * which makes every one of these a defect to report rather than a writer's
 * mistake, and a ticket carrying the diagnostic is what makes it findable.
 * The whole list still goes to the monitoring trail through `reportError`.
 *
 * It used to be one house sentence with the reason left on the dev server's
 * stdout, which is how ten refusals on 2026-09-05 read as "Not saved" and
 * nothing else.
 */
export function bodyRefusalSentence(problems: readonly string[]): string {
  const named = problems.slice(0, BODY_REFUSAL_NAMED);
  const rest = problems.length - named.length;
  const detail =
    named.length === 0
      ? ''
      : ` The check refused it with: ${named.join(' | ')}${rest > 0 ? ` (and ${rest} more)` : ''}.`;
  return `This content could not be saved.${detail} Undo your last change or reload the editor. If it keeps happening, file a ticket with this message.`;
}

// ── What an autosave refusal announces ──────────────────────────────────────

/**
 * The sentence the quiet autosave path announces for a refusal, or null.
 *
 * Autosave is quiet by design: a refusal is already visible as "Not saved" in
 * the bar and beside the field that caused it, and a toast on a keystroke
 * timer would be noise. That reasoning failed for the BODY, whose alert sits
 * under an article that may run five screens, so a refused body was never seen
 * at all. The rule is therefore to announce each distinct refusal ONCE: the
 * body's sentence ahead of any field's, and never the same sentence twice in a
 * row. `lastAnnounced` is what the screen last toasted, cleared by a clean
 * save, so a refusal that comes back after a fix is announced again.
 */
export function autosaveRefusalNotice(
  lastAnnounced: string | null,
  issues: Record<string, string>,
): string | null {
  const next = issues.body ?? Object.values(issues)[0] ?? null;
  if (next === null || next === lastAnnounced) return null;
  return next;
}

// ── The search snippet ──────────────────────────────────────────────────────

/** Google shows roughly this much of a title before it truncates. Advisory:
 *  the schema's own cap is 300, and a longer title is a judgement call rather
 *  than an error, so the preview truncates and counts but never refuses. */
export const SNIPPET_TITLE_TARGET = 60;
export const SNIPPET_DESCRIPTION_TARGET = 155;

/** What the snippet line shows: the value cut at the target, with an ellipsis
 *  when it was cut. Never a hard refusal, and never silently short: the count
 *  beside it always states the real length. */
export function snippetClamp(value: string, target: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= target) return trimmed;
  return `${trimmed.slice(0, target).trimEnd()}…`;
}
