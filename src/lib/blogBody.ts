/**
 * The blog body vocabulary: a CLOSED Tiptap node set, the schema the static
 * renderer and (step 2) the editor share, the zod attribute layer that runs
 * on the RAW JSON before ProseMirror sees it, and the derivations every
 * consumer folds from a validated doc.
 *
 * A guard-free leaf: no `server-only`, no React, no database. Imports only
 * @tiptap/core, the extension packages, zod and the field leaves, so
 * scripts/check-blog-body.mts runs the real thing under plain node. Never
 * import it from a 'use client' file.
 *
 * Validation ORDER is load-bearing: `nodeFromJSON` silently DROPS unknown
 * attributes and `.check()` never validates attribute VALUES, so zod must see
 * the raw JSON first. What is stored is the canonical `node.toJSON()`, with
 * every default filled, so an importer doc and an editor doc are
 * byte-identical in shape.
 */
import { getSchema, Mark, Node, type JSONContent } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { z } from 'zod';

import {
  BLUR_DATA_URL_RE,
  PROJECT_IMAGE_FULL_MAX,
  STATIC_IMAGE_PATH_RE,
  YOUTUBE_ID_RE,
} from '@/lib/portfolioFields';
import { BLOG_MEDIA_PATHNAME_RE, publicBlobUrl } from '@/lib/publicBlobFields';
import { safeHref } from '@/lib/safeHref';
import {
  deriveStepIds,
  makeSlugDeduper,
  type EmbeddedImage,
  type EmbeddedVideo,
  type Heading,
  type HowToData,
} from '@/utils/extractHeadings';

// ── Limits ──────────────────────────────────────────────────────────────────

export const BODY_MAX_BYTES = 2 * 1024 * 1024;
export const BODY_MAX_NODES = 20_000;
export const BODY_MAX_DEPTH = 32;
export const TABLE_MAX_COLS = 20;
export const TABLE_MAX_ROWS = 200;
export const SHORT_MAX = 300;
export const LONG_MAX = 2000;

// ── The schema ──────────────────────────────────────────────────────────────

/** `link` with `href` ONLY. Tiptap's Link declares target/rel/class/title
 *  with defaults that nodeFromJSON would materialise and the editor would
 *  serialise; the render layer decides target/rel. priority 1000 ranks it
 *  FIRST among marks, so `**[x](y)**` renders <strong><a>, which is the
 *  nesting the retired MDX mapper produced and the order every stored
 *  document is already in. The editor mounts `Link.extend({ addAttributes:
 *  () => ({ href: { default: null } }) })` under the same name, so both sides
 *  serialise identical JSON. */
export const BlogLink = Mark.create({
  name: 'link',
  priority: 1000,
  inclusive: false,
  addAttributes() {
    return { href: { default: null } };
  },
  renderHTML({ HTMLAttributes }) {
    return ['a', HTMLAttributes, 0];
  },
});

const STEP_CONTENT = '(paragraph | bulletList | orderedList | blockquote | figure)+';

export const YouTubeNode = Node.create({
  name: 'youtube',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      id: { default: null },
      title: { default: null },
      description: { default: null },
      uploadDate: { default: null },
      external: { default: false },
    };
  },
});

export const InstagramNode = Node.create({
  name: 'instagram',
  group: 'block',
  atom: true,
  addAttributes() {
    return { id: { default: null }, type: { default: 'p' }, caption: { default: false } };
  },
});

export const FigureNode = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      // Object-valued: `rendered: false` so step 2's editor never writes
      // "[object Object]" into a DOM attribute.
      image: { default: null, rendered: false },
      alt: { default: '' },
      caption: { default: null },
      credit: { default: null },
      size: { default: 'default' },
      width: { default: null },
      height: { default: null },
      priority: { default: false },
    };
  },
});

export const HowToNode = Node.create({
  name: 'howTo',
  group: 'block',
  content: 'step+',
  defining: true,
  addAttributes() {
    return { title: { default: null }, totalTime: { default: null } };
  },
});

/** NO group: reachable only by name from howTo, so an orphan step (or one
 *  inside a list item or a cell) is a schema violation, not an importer
 *  rule. The content list keeps headings, tables, nested howTos and
 *  prosCons out of a step body. */
export const StepNode = Node.create({
  name: 'step',
  content: STEP_CONTENT,
  defining: true,
  addAttributes() {
    return { title: { default: '' } };
  },
});

export const ProsConsNode = Node.create({
  name: 'prosCons',
  group: 'block',
  content: 'pros? cons?',
  defining: true,
  addAttributes() {
    return { title: { default: null } };
  },
});

export const ProsNode = Node.create({ name: 'pros', content: STEP_CONTENT, defining: true });
export const ConsNode = Node.create({ name: 'cons', content: STEP_CONTENT, defining: true });

export const CUSTOM_NODE_NAMES = [
  'youtube',
  'instagram',
  'figure',
  'howTo',
  'step',
  'prosCons',
  'pros',
  'cons',
] as const;

/** The eight names as a type. Exported so `blogNodeHtml.ts` can key its
 *  clipboard codecs off this vocabulary with a TYPE-only import and stay a
 *  zero-dependency leaf. */
export type BlogCustomNodeName = (typeof CUSTOM_NODE_NAMES)[number];

/** The schema list. Dropcursor/gapcursor/undoRedo/listKeymap/trailingNode add
 *  no schema and would drag prosemirror-view, history and linkifyjs into the
 *  RSC bundle; step 2's editor composes `[...EXTENSIONS, Dropcursor, …]`. */
export const EXTENSIONS = [
  BlogLink,
  StarterKit.configure({
    dropcursor: false,
    gapcursor: false,
    undoRedo: false,
    listKeymap: false,
    trailingNode: false,
    link: false,
    heading: { levels: [2, 3, 4] },
  }),
  TableKit,
  YouTubeNode,
  InstagramNode,
  FigureNode,
  HowToNode,
  StepNode,
  ProsConsNode,
  ProsNode,
  ConsNode,
];

export const blogSchema = getSchema(EXTENSIONS);

// ── The zod layer (raw JSON, strict) ────────────────────────────────────────

const NO_CONTROL_RE = /[\u0000-\u001f\u007f]/;
// Text nodes may carry \n (soft line breaks, code) and \t (code).
const TEXT_CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const clean = (max: number) =>
  z.string().max(max).refine((s) => !NO_CONTROL_RE.test(s), 'control character');
const shortText = clean(SHORT_MAX);
const longText = clean(LONG_MAX);
const optShort = shortText.nullable().optional();
const optLong = longText.nullable().optional();

function isRealDay(key: string): boolean {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isRealDay, 'not a calendar day');

const href = z.string().refine((h) => safeHref(h) !== null, 'unsafe href');

const markSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bold') }).strict(),
  z.object({ type: z.literal('italic') }).strict(),
  z.object({ type: z.literal('strike') }).strict(),
  z.object({ type: z.literal('code') }).strict(),
  z.object({ type: z.literal('underline') }).strict(),
  z.object({ type: z.literal('link'), attrs: z.object({ href }).strict() }).strict(),
]);

const rungSchema = z
  .object({
    url: z.string(),
    pathname: z.string().regex(BLOG_MEDIA_PATHNAME_RE, 'pathname outside blogs/'),
  })
  .strict()
  .refine((r) => r.url === publicBlobUrl(r.pathname), 'url must derive from the pathname on our store');

const variantsSchema = z
  .object({
    full: z
      .object({
        url: z.string(),
        pathname: z.string().regex(BLOG_MEDIA_PATHNAME_RE),
        width: z.number().int().min(1).max(PROJECT_IMAGE_FULL_MAX),
        height: z.number().int().min(1).max(PROJECT_IMAGE_FULL_MAX),
      })
      .strict()
      .refine((r) => r.url === publicBlobUrl(r.pathname), 'url must derive from the pathname on our store'),
    w960: rungSchema.optional(),
    w640: rungSchema.optional(),
    w384: rungSchema.optional(),
  })
  .strict();

/**
 * A whole uploaded image: the `BlogMedia` value in src/db/schema.ts.
 *
 * A SECURITY PREDICATE wearing a formatter's clothes, and the reason is in
 * publicBlobFields.ts's header: `*.public.blob.vercel-storage.com` matches
 * every Vercel tenant, and next/image never consults `remotePatterns` when a
 * custom loader is in play. `rungSchema`'s `url === publicBlobUrl(pathname)`
 * refinement is therefore the only thing between an editor-typed URL and an
 * anonymous visitor's <img src>. Never loosen it, and never let a caller pass
 * a `url` that is not derived from its own `pathname`.
 *
 * It exists as its own export because a figure node is not the only image on
 * a post: the hero, the OG image and (task 11) an author photo are all
 * BlogMedia values that reach no `figure` node, so until this they had no
 * validator at all. The `media` branch below is built from its shape rather
 * than restating it, so the figure door and the hero door cannot drift.
 */
export const blogMediaSchema = z
  .object({
    variants: variantsSchema,
    blurDataUrl: z.string().regex(BLUR_DATA_URL_RE).nullable(),
  })
  .strict();

/**
 * What a `figure.image` may be: a self-hosted `/images/...` path, or a whole
 * uploaded image whose every rung is pinned to OUR public Blob store.
 *
 * EXPORTED because the zod layer is not the only door it has to guard. The
 * editor's clipboard rule decodes `data-image` from foreign HTML (see
 * `blogNodeHtml.ts` and the paste guard in `blogEditorExtensions.ts`), and
 * `json()` there can only vouch for the SHAPE of a decoded value. Restating
 * the host pin and the path rule in that leaf would be a second copy of a
 * security predicate; running this one is not.
 */
export const blogImageSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('static'), src: z.string().regex(STATIC_IMAGE_PATH_RE, 'not a /images path') }).strict(),
  z.object({ type: z.literal('media'), ...blogMediaSchema.shape }).strict(),
]);

const int = (min: number, max: number) => z.number().int().min(min).max(max);

/** The shape `walkCaps` walks and the zod annotations name. `attrs` is
 *  `unknown` because the helper takes any `z.ZodType`, whose output type
 *  is `unknown`; `marks` is `unknown` because it enters the helper's
 *  shape through a conditional spread, which zod types as a possibly-absent
 *  key with an `unknown` output. A narrower annotation for either fails to
 *  type-check, and nothing reads either off this shape. */
type RawNode = {
  type: string;
  attrs?: unknown;
  content?: RawNode[];
  marks?: unknown;
  text?: string;
};

const children: z.ZodType<RawNode[]> = z.lazy(() => z.array(rawNode));

/** `attrs` may be omitted only when the schema's own defaults would pass
 *  this same object: an attrs schema that refuses `{}` has a REQUIRED key,
 *  and letting the whole object be absent handed nodeFromJSON a youtube
 *  with a null id, a level-1 heading and a figure with no image, none of
 *  which the canonical form could then re-validate.
 *
 *  `content` is REQUIRED wherever `minContent` is set: `Node.toJSON()`
 *  omits the key for an empty node, so `{ type: 'prosCons' }` is the only
 *  shape an empty prosCons ever has, and an optional key let it past the
 *  pipe that exists to refuse it.
 *
 *  `marks` ride only on inline nodes, and `hardBreak` is the schema's only
 *  inline non-text node: prosemirror-transform's addMark marks every inline
 *  node in range, so bolding a selection across a soft break marks the
 *  break (DOMParser does the same for <strong>a<br>b</strong>) and the
 *  canonical form carries it. Every block node stays mark-free. */
const node = (type: string, attrs?: z.ZodType, extra?: { minContent?: number; marks?: boolean }) =>
  z
    .object({
      type: z.literal(type),
      ...(attrs ? { attrs: attrs.safeParse({}).success ? attrs.optional() : attrs } : {}),
      ...(extra?.marks ? { marks: z.array(markSchema).optional() } : {}),
      content: extra?.minContent
        ? children.pipe(z.array(z.any()).min(extra.minContent))
        : children.optional(),
    })
    .strict();

const textNode = z
  .object({
    type: z.literal('text'),
    text: z.string().min(1).refine((s) => !TEXT_CONTROL_RE.test(s), 'control character'),
    marks: z.array(markSchema).optional(),
  })
  .strict();

/** Mirrors every attribute the installed cell nodes declare. Tiptap 3.31.2
 *  added `align` (normalised to left/center/right, else null) beside the
 *  three the spec lists; `toJSON()` materialises it as null on every cell,
 *  so a zod layer that does not know it refuses every canonical table.
 *  Pinned by `a canonical table re-validates unchanged`. */
const cellAttrs = z
  .object({
    colspan: int(1, TABLE_MAX_COLS).optional(),
    rowspan: int(1, TABLE_MAX_COLS).optional(),
    colwidth: z.array(int(1, 4096)).max(TABLE_MAX_COLS).nullable().optional(),
    align: z.enum(['left', 'center', 'right']).nullable().optional(),
  })
  .strict();

const rawNode: z.ZodType<RawNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    textNode,
    node('paragraph'),
    node('heading', z.object({ level: z.union([z.literal(2), z.literal(3), z.literal(4)]) }).strict()),
    node('bulletList'),
    node('orderedList', z.object({ start: int(0, 1_000_000).optional(), type: z.null().optional() }).strict()),
    node('listItem'),
    node('blockquote'),
    node('codeBlock', z.object({ language: z.string().regex(/^[a-z0-9+#-]{0,32}$/).nullable().optional() }).strict()),
    node('horizontalRule'),
    node('hardBreak', undefined, { marks: true }),
    node('table', z.object({}).strict()),
    node('tableRow'),
    node('tableHeader', cellAttrs),
    node('tableCell', cellAttrs),
    node(
      'youtube',
      z
        .object({
          id: z.string().regex(YOUTUBE_ID_RE),
          title: optShort,
          description: optLong,
          uploadDate: dayKey.nullable().optional(),
          external: z.boolean().optional(),
        })
        .strict(),
    ),
    node(
      'instagram',
      z
        .object({
          id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
          type: z.enum(['p', 'reel', 'tv']).optional(),
          caption: z.boolean().optional(),
        })
        .strict(),
    ),
    node(
      'figure',
      z
        .object({
          image: blogImageSourceSchema,
          alt: shortText.min(1),
          caption: optLong,
          credit: optLong,
          size: z.enum(['narrow', 'default', 'wide']).optional(),
          width: int(1, PROJECT_IMAGE_FULL_MAX).nullable().optional(),
          height: int(1, PROJECT_IMAGE_FULL_MAX).nullable().optional(),
          priority: z.boolean().optional(),
        })
        .strict(),
    ),
    node(
      'howTo',
      z
        .object({
          title: optShort,
          totalTime: z.string().regex(/^PT(?=\d)(?:\d+H)?(?:\d+M)?$/).nullable().optional(),
        })
        .strict(),
      { minContent: 1 },
    ),
    node('step', z.object({ title: shortText.min(1) }).strict(), { minContent: 1 }),
    node('prosCons', z.object({ title: optShort }).strict(), { minContent: 1 }),
    node('pros', undefined, { minContent: 1 }),
    node('cons', undefined, { minContent: 1 }),
  ]),
);

const rawDoc = z.object({ type: z.literal('doc'), content: children.pipe(z.array(z.any()).min(1)) }).strict();

// ── Caps, walked iteratively on the raw JSON before anything recursive ──────

function walkCaps(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return 'body is not an object';
  const stack: { node: RawNode; depth: number }[] = [{ node: raw as RawNode, depth: 1 }];
  let count = 0;
  while (stack.length) {
    const { node: n, depth } = stack.pop()!;
    count++;
    if (count > BODY_MAX_NODES) return `more than ${BODY_MAX_NODES} nodes`;
    if (depth > BODY_MAX_DEPTH) return `deeper than ${BODY_MAX_DEPTH}`;
    if (n && typeof n === 'object' && n.type === 'table' && Array.isArray(n.content)) {
      if (n.content.length > TABLE_MAX_ROWS) return `table with more than ${TABLE_MAX_ROWS} rows`;
      for (const row of n.content) {
        if (Array.isArray(row?.content) && row.content.length > TABLE_MAX_COLS)
          return `table with more than ${TABLE_MAX_COLS} columns`;
      }
    }
    if (n && typeof n === 'object' && Array.isArray(n.content)) {
      for (const child of n.content) stack.push({ node: child as RawNode, depth: depth + 1 });
    }
  }
  return null;
}

// ── The validator ───────────────────────────────────────────────────────────

/** The canonical, stored form: `node.toJSON()` of a schema-checked doc. */
export type BlogDoc = JSONContent & { type: 'doc' };

export type BlogValidation = { ok: true; doc: BlogDoc } | { ok: false; problems: string[] };

/** A `paragraph` carrying nothing. `Node.toJSON()` OMITS `content` on an
 *  empty node, so `{ type: 'paragraph' }` is the canonical spelling and
 *  `content: []` is the raw-input one; both count. Private on purpose: the
 *  two questions anybody asks about an empty paragraph are answered by the
 *  two functions below, and a third spelling of "empty paragraph" elsewhere
 *  would be the thing that drifts. */
function isEmptyParagraph(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const n = node as { type?: unknown; content?: unknown };
  if (n.type !== 'paragraph') return false;
  return !Array.isArray(n.content) || n.content.length === 0;
}

/**
 * Drop empty paragraphs from the END of a doc's top-level content.
 *
 * `TrailingNode` (task 15) appends an empty paragraph whenever the document's
 * last child is not a paragraph, and the zod layer accepts an empty
 * paragraph. So without this, opening a legacy post that ends in a figure, a
 * table or a howTo and fixing one typo would silently append `<p></p>` to the
 * stored body, move `contentFingerprint` (and with it the "Updated" byline,
 * the sitemap lastmod and JSON-LD dateModified) and grow the rendering-parity
 * allowlist. Canonicalising inside the ONE validator is what keeps the
 * editor, the importer and the check scripts on the same stored form.
 *
 * AT LEAST ONE NODE ALWAYS SURVIVES: the doc's content expression is
 * `block+`, so a doc emptied completely would no longer be a valid document
 * at all. A post whose whole body is one empty paragraph is a blank article,
 * which is `bodyIsBlank`'s question and the publish door's refusal, not this
 * function's business.
 */
export function stripTrailingEmptyParagraphs(doc: BlogDoc): BlogDoc {
  const content = doc.content;
  if (!Array.isArray(content)) return doc;
  let end = content.length;
  while (end > 1 && isEmptyParagraph(content[end - 1])) end--;
  return end === content.length ? doc : { ...doc, content: content.slice(0, end) };
}

/**
 * A doc as PLAIN data: every object reachable from it with `Object.prototype`.
 *
 * prosemirror-model builds a node's `attrs` with `Object.create(null)`
 * (`computeAttrs` and `defaultAttrs`), and `Node.toJSON()` hands that object
 * back BY REFERENCE, so `editor.getJSON()` is a tree whose every `attrs`, on
 * nodes and on marks alike, has no prototype. React's server-action serializer
 * refuses those as non-plain ("Classes or null prototypes are not supported")
 * and, because Next passes a temporary-reference set, ships each one as a `$T`
 * reference rather than throwing; the server decodes that as a tagged
 * FUNCTION, and the zod layer above refuses `content.0.attrs: expected object,
 * received function` on every node that carries attributes. That was every
 * autosave after the first keystroke on any real post (found 2026-09-05), with
 * nothing on screen to say why: `JSON.stringify` accepts a null-prototype
 * object, so the editor's dirty snapshot worked while the wire did not.
 *
 * A JSON round trip rather than a hand-written walk, so whatever ProseMirror
 * or a later extension puts into a document that is not plain data is
 * flattened the same way. The editor calls this on every `getJSON()` before
 * the document leaves the canvas; `scripts/check-blogs.mts` pins the need (a
 * positive control on the null prototype) and the cure, through React's own
 * `encodeReply`.
 */
export function plainDoc(doc: BlogDoc): BlogDoc {
  return JSON.parse(JSON.stringify(doc)) as BlogDoc;
}

/**
 * A paragraph a reader would see as empty: no content at all, or nothing in
 * it but whitespace text. The zod layer refuses an EMPTY text node but
 * accepts one holding a single space, so `<p> </p>` is a legal, storable,
 * completely blank paragraph.
 *
 * DELIBERATELY NOT the predicate `stripTrailingEmptyParagraphs` uses, and the
 * asymmetry is the point: a paragraph holding a space is a node somebody
 * typed, so canonicalising it away would EDIT a stored body, while the
 * publish door only has to decide whether anything is there to read. The
 * strip removes what TrailingNode adds; this decides whether a post is blank.
 *
 * A paragraph carrying anything that is not a text node (a hardBreak, say) is
 * NOT blank. That is the conservative direction: the cost is letting an
 * oddly-empty post through, where the reverse would refuse a legitimate one.
 */
function isBlankParagraph(node: unknown): boolean {
  if (isEmptyParagraph(node)) return true;
  const n = node as { type?: unknown; content?: unknown };
  if (n.type !== 'paragraph' || !Array.isArray(n.content)) return false;
  return n.content.every((child) => {
    const c = child as { type?: unknown; text?: unknown } | null;
    return c?.type === 'text' && typeof c.text === 'string' && c.text.trim() === '';
  });
}

/** Nothing but blank paragraphs (or nothing at all): a blank article. The
 *  publish door in blogPostSchema.ts refuses one, which is a refusal a
 *  per-field schema cannot make. Deliberately permissive about its argument
 *  so a schema's own inferred body type can be passed straight in. */
export function bodyIsBlank(doc: { content?: readonly unknown[] } | null | undefined): boolean {
  if (!doc || !Array.isArray(doc.content)) return true;
  return doc.content.every(isBlankParagraph);
}

export function validateBlogBody(raw: unknown): BlogValidation {
  let serialized: string;
  try {
    serialized = JSON.stringify(raw) ?? '';
  } catch {
    return { ok: false, problems: ['body is not serialisable'] };
  }
  if (serialized.length > BODY_MAX_BYTES) return { ok: false, problems: [`body over ${BODY_MAX_BYTES} bytes`] };
  const cap = walkCaps(raw);
  if (cap) return { ok: false, problems: [cap] };
  const parsed = rawDoc.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    };
  }
  let pm: PMNode;
  try {
    pm = blogSchema.nodeFromJSON(raw as JSONContent);
    pm.check();
  } catch (error) {
    return { ok: false, problems: [error instanceof Error ? error.message : String(error)] };
  }
  return { ok: true, doc: stripTrailingEmptyParagraphs(pm.toJSON() as BlogDoc) };
}

/** A checked doc as a ProseMirror node, for the renderer. */
export function toPmDoc(doc: BlogDoc): PMNode {
  return blogSchema.nodeFromJSON(doc);
}

// ── Derivations (pure walks over a canonical doc) ───────────────────────────

export type FigureImage =
  | { type: 'static'; src: string }
  | { type: 'media'; variants: { full: { url: string } }; blurDataUrl: string | null };

/** The src a figure or hero renders/announces: the static path, or the
 *  media master's absolute Blob URL. */
export function figureSrc(image: FigureImage): string {
  return image.type === 'static' ? image.src : image.variants.full.url;
}

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

function hasMark(n: JSONContent, name: string): boolean {
  return Boolean(n.marks?.some((m) => m.type === name));
}

/** The prose of an inline container (paragraph, heading, cell) for bodyText.
 *  Inline code is excluded, as the legacy tokeniser excluded it; a heading's
 *  OWN text, for its id, is headingText below. */
function inlineText(n: JSONContent): string {
  let out = '';
  for (const child of n.content ?? []) {
    if (child.type === 'text') {
      if (!hasMark(child, 'code')) out += child.text ?? '';
    } else if (child.type === 'hardBreak') {
      out += ' ';
    }
  }
  return out;
}

/** A heading's own text (its id, TOC entry and the nearest-heading
 *  fallbacks), and with `keepCode` a how-to step's body: every text node,
 *  marks included, because the rendered element carries its <code> text and
 *  the legacy extractHeadings and stripBlockMarkdown both kept it. */
function headingText(n: JSONContent): string {
  let out = '';
  for (const child of n.content ?? []) {
    if (child.type === 'text') out += child.text ?? '';
    else if (child.type === 'hardBreak') out += ' ';
  }
  return collapse(out);
}

/** Prose blocks in document order, each whitespace-collapsed, joined by \n.
 *  Includes step/howTo/prosCons titles and figure captions/credits (visible
 *  prose); excludes codeBlock, and inline code unless `keepCode`: bodyText,
 *  the word-count input, drops it as the legacy countWords did, while a
 *  how-to step's text keeps it as the rendered step and stripBlockMarkdown
 *  did. */
function proseBlocks(container: JSONContent, out: string[], keepCode = false): void {
  for (const n of container.content ?? []) collectProse(n, out, keepCode);
}

function collectProse(n: JSONContent, out: string[], keepCode: boolean): void {
  const a = (n.attrs ?? {}) as Record<string, unknown>;
  switch (n.type) {
    case 'codeBlock':
      return;
    case 'paragraph':
    case 'heading': {
      const t = keepCode ? headingText(n) : collapse(inlineText(n));
      if (t) out.push(t);
      return;
    }
    case 'figure': {
      for (const k of ['caption', 'credit']) {
        const v = a[k];
        if (typeof v === 'string' && collapse(v)) out.push(collapse(v));
      }
      return;
    }
    case 'howTo':
    case 'prosCons': {
      if (typeof a.title === 'string' && collapse(a.title)) out.push(collapse(a.title));
      proseBlocks(n, out, keepCode);
      return;
    }
    case 'step': {
      if (typeof a.title === 'string' && collapse(a.title)) out.push(collapse(a.title));
      proseBlocks(n, out, keepCode);
      return;
    }
    default:
      proseBlocks(n, out, keepCode);
  }
}

export function bodyText(doc: BlogDoc): string {
  const out: string[] = [];
  proseBlocks(doc, out);
  return out.join('\n');
}

export function countTokens(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** The editor-era word count: what the reader sees, body plus the FAQ
 *  accordion. This is what every save writes. The 38 rows that arrived
 *  through the cutover importer still carry the legacy `countWords(mdx)`
 *  over the whole MDX file until each is next saved, which is why
 *  `isLegacyWordCount` exists and why the editor announces the change. */
export function wordCount(view: { doc: BlogDoc; faqs: { question: string; answer: string }[] }): number {
  const faqText = view.faqs.map((f) => `${f.question} ${f.answer}`).join(' ');
  return countTokens(bodyText(view.doc)) + countTokens(faqText);
}

/** Every node in document order (depth-first), for the scans below. */
function* walk(n: JSONContent): Generator<JSONContent> {
  yield n;
  for (const child of n.content ?? []) yield* walk(child);
}

export function headings(doc: BlogDoc, reserved?: string[]): Heading[] {
  const dedupe = makeSlugDeduper(reserved);
  const out: Heading[] = [];
  for (const n of walk(doc)) {
    if (n.type !== 'heading') continue;
    const text = headingText(n);
    out.push({ id: dedupe(text), text, level: Number(n.attrs?.level) });
  }
  return out;
}

/** The page's TOC: body headings, then the `Sources` and `FAQs` pseudo-entries
 *  the rendered page owns, in that order. Both the TOC components and the
 *  BlogPosting `hasPart` read this one array. The pseudo-entries' { level,
 *  text, id } key order is deliberate: Task 13's parity check compares them
 *  by JSON.stringify against literals written in that order. */
export function tocEntries(
  bodyHeadings: Heading[],
  opts: { hasSources: boolean; hasFaqs: boolean },
): Heading[] {
  return [
    ...bodyHeadings,
    ...(opts.hasSources ? [{ level: 2, text: 'Sources', id: 'sources' }] : []),
    ...(opts.hasFaqs ? [{ level: 2, text: 'FAQs', id: 'faqs' }] : []),
  ];
}

/** Deduped by id, FIRST occurrence wins including its title; the title falls
 *  back to the nearest preceding heading (2-4) in document order. The
 *  description/uploadDate fallbacks (post description, publishedDay) are
 *  applied at the JSON-LD layer, as today. */
export function videos(doc: BlogDoc): EmbeddedVideo[] {
  const seen = new Set<string>();
  const out: EmbeddedVideo[] = [];
  let nearest: string | undefined;
  for (const n of walk(doc)) {
    if (n.type === 'heading') {
      nearest = headingText(n);
      continue;
    }
    if (n.type !== 'youtube') continue;
    const a = (n.attrs ?? {}) as Record<string, unknown>;
    const id = String(a.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      title: (a.title as string | null) ?? nearest,
      description: (a.description as string | null) ?? undefined,
      uploadDate: (a.uploadDate as string | null) ?? undefined,
      external: a.external ? true : undefined,
    });
  }
  return out;
}

/** Showcase figures (those with a caption or credit), the ImageObject set. */
export function figures(doc: BlogDoc): EmbeddedImage[] {
  const out: EmbeddedImage[] = [];
  for (const n of walk(doc)) {
    if (n.type !== 'figure') continue;
    const a = (n.attrs ?? {}) as Record<string, unknown>;
    if (!a.caption && !a.credit) continue;
    out.push({
      src: figureSrc(a.image as FigureImage),
      // Carried rather than re-derived from the url: the JSON-LD ownership and
      // licence claim is emitted only over a static /images asset, and
      // sniffing the string for it would be a guess where the document holds
      // the fact.
      source: (a.image as FigureImage).type,
      alt: (a.alt as string) || undefined,
      caption: (a.caption as string | null) ?? undefined,
      credit: (a.credit as string | null) ?? undefined,
      width: typeof a.width === 'number' ? a.width : undefined,
      height: typeof a.height === 'number' ? a.height : undefined,
    });
  }
  return out;
}

/**
 * A `/blogs/<slug>` href, or null for anything else. Anchored and
 * charset-bounded, so it is also the reason `/blogs/authors/<slug>` is not a
 * post link (the slug class holds no `/`) and `//evil.com` is not one either
 * (it does not start `/blogs/`). A trailing slash, a query and a fragment are
 * all tolerated: they name the same post.
 */
const INTERNAL_POST_HREF_RE = /^\/blogs\/([a-z0-9-]+)\/?(?:[?#].*)?$/;

/**
 * The slugs of other posts this body links to, deduped, in document order.
 *
 * The publish door warns when one of them is not live yet. It is a WARNING and
 * never a refusal, because publishing a pair of posts that reference each
 * other is a normal thing to do and the second one is a click away.
 *
 * Only the `link` MARK carries an internal href today. Figure images, YouTube
 * ids and Instagram permalinks are not article links, and `sources` are
 * absolute external URLs held outside the body altogether.
 */
export function internalLinkSlugs(doc: BlogDoc): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of walk(doc)) {
    for (const mark of n.marks ?? []) {
      if (mark.type !== 'link') continue;
      const href = (mark.attrs as Record<string, unknown> | undefined)?.href;
      if (typeof href !== 'string') continue;
      const slug = INTERNAL_POST_HREF_RE.exec(href)?.[1];
      if (slug === undefined || seen.has(slug)) continue;
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}

export function howTos(doc: BlogDoc): HowToData[] {
  const out: HowToData[] = [];
  let nearest: string | undefined;
  for (const n of walk(doc)) {
    if (n.type === 'heading') {
      nearest = headingText(n);
      continue;
    }
    if (n.type !== 'howTo') continue;
    const a = (n.attrs ?? {}) as Record<string, unknown>;
    const raw = (n.content ?? [])
      .filter((s) => s.type === 'step')
      .map((s) => {
        const name = String((s.attrs as Record<string, unknown>)?.title ?? '').trim();
        const blocks: string[] = [];
        // keepCode: the rendered step body carries its <code> text, as the
        // legacy stripBlockMarkdown kept it; only bodyText drops inline code.
        proseBlocks(s, blocks, true);
        return { name, text: blocks.join('\n') || name };
      })
      .filter((s) => s.name);
    if (raw.length === 0) continue;
    const ids = deriveStepIds(raw.map((s) => s.name));
    out.push({
      name: (a.title as string | null) ?? nearest,
      totalTime: (a.totalTime as string | null) ?? undefined,
      steps: raw.map((s, i) => ({ ...s, id: ids[i] })),
    });
  }
  return out;
}
