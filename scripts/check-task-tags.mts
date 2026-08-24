/**
 * Task-tag scope self-check — the two refusals, executable.
 *
 * Run:  node --import tsx scripts/check-task-tags.mts    (no DB, no env)
 *
 * `task_tag_categories` says which categories offer a tag, and an EMPTY scope
 * means "offered everywhere". That one encoding is why the category-major
 * save door (setCategoryTagOffers) has to refuse two things it would
 * otherwise perform silently — the schema can express "everywhere" but not
 * "nowhere", so both mistakes turn a tag INVISIBLE into a tag that is
 * suddenly on every picker in the studio:
 *
 *   - ticking a global tag into one category demotes it, and no category
 *     added later would ever pick it up again;
 *   - unticking a tag from its LAST category empties its scope, which reads
 *     as global — the exact opposite of what the click meant.
 *
 * Neither misfire throws, neither shows up in a filter test, and both are
 * only visible as "why is Reels suddenly offered under SEO?". planCategory-
 * TagOffers is a pure leaf in taskTagFields.ts (the taskPredicates.ts
 * precedent) precisely so this file can reach it with no session and no
 * database. Run it after touching that function or setCategoryTagOffers.
 *
 * The scope PREDICATE the pickers run — tagInScope / splitTagsForCategory —
 * is pinned here too, since it reads the same empty-means-everywhere rule
 * from the other end.
 */
import {
  groupTags,
  planCategoryTagOffers,
  splitTagsForCategory,
  tagInScope,
  tagSummaryLabel,
  TASK_TAG_GROUPS,
  type TaskTagOption,
} from '@/lib/taskTagFields';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`,
  );
};

// Categories: VIDEO is the pane under test, PHOTO is the "somewhere else"
// that decides whether a removal orphans a tag.
const VIDEO = 'cat-video';
const PHOTO = 'cat-photo';

const row = (tagId: string, categoryId: string) => ({ tagId, categoryId });

// ── The plain delta ─────────────────────────────────────────────────────────

eq(
  'no rows, nothing wanted → nothing happens',
  planCategoryTagOffers({ categoryId: VIDEO, rows: [], wanted: [] }),
  { globals: [], orphans: [], removing: [], adding: [] },
);

eq(
  'adding a tag already scoped elsewhere',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('reels', PHOTO)],
    wanted: ['reels'],
  }),
  { globals: [], orphans: [], removing: [], adding: ['reels'] },
);

eq(
  'a tag already offered here is not re-added',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('reels', VIDEO)],
    wanted: ['reels'],
  }),
  { globals: [], orphans: [], removing: [], adding: [] },
);

eq(
  'removing a tag that survives in another category',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('reels', VIDEO), row('reels', PHOTO)],
    wanted: [],
  }),
  { globals: [], orphans: [], removing: ['reels'], adding: [] },
);

eq(
  'add and remove in one save',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('reels', VIDEO), row('reels', PHOTO), row('broll', PHOTO)],
    wanted: ['broll'],
  }),
  { globals: [], orphans: [], removing: ['reels'], adding: ['broll'] },
);

// ── Refusal 1: a global tag can't be ticked into one category ───────────────
// A global has NO rows at all, which is how it is recognised — there is no
// flag to read, so an absent tag is the whole signal.

eq(
  'a tag with no scope rows anywhere is refused as global',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [],
    wanted: ['revision'],
  }),
  { globals: ['revision'], orphans: [], removing: [], adding: [] },
);

eq(
  'the global is NEVER in adding — a refusal must not half-write',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('broll', PHOTO)],
    wanted: ['revision', 'broll'],
  }).adding,
  ['broll'],
);

eq(
  'a tag scoped only to ANOTHER category is not a global',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('retouch', PHOTO)],
    wanted: ['retouch'],
  }).globals,
  [],
);

// ── Refusal 2: a tag can't be dropped from its last category ────────────────

eq(
  'unticking a tag whose only category is this one is refused',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('reels', VIDEO)],
    wanted: [],
  }),
  { globals: [], orphans: ['reels'], removing: [], adding: [] },
);

eq(
  'the orphan is NEVER in removing — the delete must not run',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('reels', VIDEO), row('broll', VIDEO), row('broll', PHOTO)],
    wanted: [],
  }),
  { globals: [], orphans: ['reels'], removing: ['broll'], adding: [] },
);

eq(
  'a tag kept in the wanted set is not an orphan',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('reels', VIDEO)],
    wanted: ['reels'],
  }).orphans,
  [],
);

// Order independence: the caller feeds rows straight from Postgres, which
// makes no ordering promise without an ORDER BY.
eq(
  'row order does not change the plan',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('broll', PHOTO), row('reels', VIDEO), row('broll', VIDEO)],
    wanted: ['reels'],
  }),
  { globals: [], orphans: [], removing: ['broll'], adding: [] },
);

// A duplicate row (the same pair read twice) must not double-count.
eq(
  'duplicate rows are idempotent',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('reels', VIDEO), row('reels', VIDEO), row('reels', PHOTO)],
    wanted: [],
  }),
  { globals: [], orphans: [], removing: ['reels'], adding: [] },
);

// ── Frozen (archived) tags — the bug this section exists for ────────────────
// An archived tag KEEPS its scope rows so a restore brings its categories
// back, but the category pane does not render it, so the client's "complete
// offered set" can never mention it. Read literally that silence means "stop
// offering it here", which either deletes a row nobody saw or refuses the save
// forever naming an off-screen tag. `frozen` is what stops both.

eq(
  'an archived tag scoped here is NOT removed just because the client omitted it',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('storyboard', VIDEO)],
    wanted: [],
    frozen: ['storyboard'],
  }),
  { globals: [], orphans: [], removing: [], adding: [] },
);

eq(
  'without frozen the SAME input bricks the pane — proof the guard is load-bearing',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('storyboard', VIDEO)],
    wanted: [],
  }).orphans,
  ['storyboard'],
);

eq(
  'an archived tag scoped to two categories is not silently unscoped either',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('storyboard', VIDEO), row('storyboard', PHOTO)],
    wanted: [],
    frozen: ['storyboard'],
  }).removing,
  [],
);

eq(
  'frozen does not mask a REAL removal happening in the same save',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [
      row('storyboard', VIDEO),
      row('reels', VIDEO),
      row('reels', PHOTO),
    ],
    wanted: [],
    frozen: ['storyboard'],
  }),
  { globals: [], orphans: [], removing: ['reels'], adding: [] },
);

eq(
  'a frozen id sent in wanted is ignored rather than re-added or refused',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('storyboard', PHOTO)],
    wanted: ['storyboard'],
    frozen: ['storyboard'],
  }),
  { globals: [], orphans: [], removing: [], adding: [] },
);

eq(
  'frozen defaults to empty, so existing callers are unaffected',
  planCategoryTagOffers({
    categoryId: VIDEO,
    rows: [row('reels', VIDEO), row('reels', PHOTO)],
    wanted: [],
  }).removing,
  ['reels'],
);

// ── The picker side of the same rule ────────────────────────────────────────

const tag = (
  id: string,
  categoryIds: string[],
  archived = false,
): TaskTagOption => ({
  id,
  slug: id,
  name: id,
  group: 'content',
  archived,
  categoryIds,
});

eq('a global tag is in scope everywhere', tagInScope(tag('revision', []), VIDEO), true);
eq('a scoped tag is in scope where it is scoped', tagInScope(tag('reels', [VIDEO]), VIDEO), true);
eq('a scoped tag is out of scope elsewhere', tagInScope(tag('reels', [VIDEO]), PHOTO), false);

const VOCAB = [
  tag('reels', [VIDEO]),
  tag('retouch', [PHOTO]),
  tag('revision', []),
  tag('legacy', [VIDEO], true),
];

eq(
  'picker for a category: its own tags plus the globals, archived excluded',
  splitTagsForCategory(VOCAB, VIDEO, []).inScope.map((t) => t.id),
  ['reels', 'revision'],
);
eq(
  'an out-of-scope tag ALREADY on the task surfaces under "Other"',
  splitTagsForCategory(VOCAB, VIDEO, ['retouch']).other.map((t) => t.id),
  ['retouch'],
);
eq(
  'an archived tag already on the task still renders',
  splitTagsForCategory(VOCAB, VIDEO, ['legacy']).other.map((t) => t.id),
  ['legacy'],
);
eq(
  'no category chosen yet → the globals only, not the whole vocabulary',
  splitTagsForCategory(VOCAB, '', []).inScope.map((t) => t.id),
  ['revision'],
);
eq(
  'null category (the bulk bar) → every active tag, unscoped',
  splitTagsForCategory(VOCAB, null, []).inScope.map((t) => t.id),
  ['reels', 'retouch', 'revision'],
);

// ── Small shared leaves the panes lean on ───────────────────────────────────

eq('groupTags drops empty sections', groupTags(VOCAB).map((s) => s.group), ['content']);
eq('groupTags orders by TASK_TAG_GROUPS', TASK_TAG_GROUPS, ['format', 'content', 'workflow']);
eq('tagSummaryLabel: none', tagSummaryLabel([], 'Tags'), 'Tags');
eq('tagSummaryLabel: one', tagSummaryLabel(['Reels'], 'Tags'), 'Reels');
eq('tagSummaryLabel: many', tagSummaryLabel(['Reels', 'B-Roll', 'Vertical'], 'Tags'), 'Reels +2');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
