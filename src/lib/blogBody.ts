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
 *  FIRST among marks, so `**[x](y)**` renders <strong><a>, as remark does.
 *  Step 2's editor swaps in `Link.extend({ addAttributes: () => ({ href: {
 *  default: null } }) })` with the same name: same JSON. */
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

const imageSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('static'), src: z.string().regex(STATIC_IMAGE_PATH_RE, 'not a /images path') }).strict(),
  z
    .object({
      type: z.literal('media'),
      variants: variantsSchema,
      blurDataUrl: z.string().regex(BLUR_DATA_URL_RE).nullable(),
    })
    .strict(),
]);

const int = (min: number, max: number) => z.number().int().min(min).max(max);

/** The shape `walkCaps` walks and the zod annotations name. `attrs` is
 *  `unknown` because zod 4's `ZodTypeAny` is `ZodType<unknown>`, so the
 *  union's attrs come out `unknown` and a narrower annotation here fails
 *  to type-check; nothing reads attrs off this shape. */
type RawNode = {
  type: string;
  attrs?: unknown;
  content?: RawNode[];
  marks?: unknown[];
  text?: string;
};

const children: z.ZodType<RawNode[]> = z.lazy(() => z.array(rawNode));

/** `attrs` may be omitted only when the schema's own defaults would pass
 *  this same object: an attrs schema that refuses `{}` has a REQUIRED key,
 *  and letting the whole object be absent handed nodeFromJSON a youtube
 *  with a null id, a level-1 heading and a figure with no image, none of
 *  which the canonical form could then re-validate. */
const node = (type: string, attrs?: z.ZodTypeAny, extra?: { minContent?: number }) =>
  z
    .object({
      type: z.literal(type),
      ...(attrs ? { attrs: attrs.safeParse({}).success ? attrs.optional() : attrs } : {}),
      content: (extra?.minContent ? children.pipe(z.array(z.any()).min(extra.minContent)) : children).optional(),
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
    node('hardBreak'),
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
          image: imageSourceSchema,
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
  return { ok: true, doc: pm.toJSON() as BlogDoc };
}

/** A checked doc as a ProseMirror node, for the renderer. */
export function toPmDoc(doc: BlogDoc): PMNode {
  return blogSchema.nodeFromJSON(doc);
}
