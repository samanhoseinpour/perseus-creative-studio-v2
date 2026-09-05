/**
 * How the eight custom blog nodes cross the CLIPBOARD.
 *
 * A ZERO-DEPENDENCY LEAF: no imports at runtime, so `scripts/check-blogs.mts`
 * runs the real codecs under plain node and `blogEditorExtensions.ts` stays
 * React-free while using them.
 *
 * WHY THIS EXISTS AT ALL. Tiptap gives a node a `toDOM` only when its
 * extension defines `renderHTML`, and the eight custom nodes in
 * `blogBody.ts` define none: the public page renders through
 * `@tiptap/static-renderer`, which reads a node MAPPING and never a DOM spec,
 * so the renderer never needed one. ProseMirror's clipboard serializer,
 * however, is `DOMSerializer.fromSchema`, and `gatherToDOM` FILTERS a node
 * with no `toDOM` rather than refusing it. So the failure was silent in the
 * schema and loud at the keyboard: copying a selection that merely touched a
 * figure threw. Copying a paragraph beside a figure is an ordinary thing to
 * do.
 *
 * WHY THE CODECS ARE EXPLICIT rather than Tiptap's per-attribute default. The
 * default renders `{ [name]: attrs[name] }` and parses back with
 * `fromString(element.getAttribute(name))`, which is wrong here in three
 * separate ways:
 *
 *  1. `figure.image` is an OBJECT, and is declared `rendered: false` in
 *     `blogBody.ts` precisely so the editor can never write
 *     "[object Object]" into a DOM attribute. Left to the default it would
 *     simply not travel, and a pasted figure would carry `image: null` —
 *     which the strict zod refuses on the NEXT save, with an error pointing
 *     at a node the writer never touched.
 *  2. Attribute names collide with real HTML. `title` on a div is a tooltip,
 *     `id` is an element id, `width`/`height` are legacy presentational
 *     attributes. Prefixing every one with `data-` is what keeps the round
 *     trip ours: it also means `element.getAttribute('title')` is null, so
 *     Tiptap's `injectExtensionAttributesToParseRule` (which merges its own
 *     parse OVER ours) skips every attribute and cannot overwrite what the
 *     codecs decoded.
 *  3. A DOM attribute is a STRING. `external: false` comes back as the
 *     truthy `"false"`, and `width: 1200` as `"1200"`, unless something
 *     coerces. `fromString` guesses at that, which is worse than deciding.
 *
 * THE ABSENT-MEANS-DEFAULT RULE. `fromAttr` returns `undefined` for an
 * attribute that is not on the element, and {@link blogNodeAttrsFromDOM}
 * OMITS those keys, so ProseMirror fills them from the schema's own default.
 * That is why no default is written twice: a codec cannot drift from the
 * schema it decodes into, because it never states one.
 *
 * THE REFUSAL, AND EXACTLY HOW FAR IT REACHES. Three attributes have no
 * usable default: a figure with no image, and a youtube or instagram with no
 * id, are documents the zod layer refuses. Their rules therefore return
 * `false` (ProseMirror reads that as "this rule does not match") rather than
 * building a node that can never be saved. They are exactly the three the
 * insert dialogs collect BEFORE the node exists, for the same reason.
 *
 * What this file refuses is a SHAPE. Whether a decoded VALUE is one the
 * vocabulary would accept is a separate question, and for `figure.image` the
 * answer is a rule rather than a type: a `/images/...` path has a pattern, and
 * an uploaded image's every rung is pinned to our own Blob store. Restating
 * either here would put a second copy of a security predicate in a leaf, so
 * `blogEditorExtensions.ts` runs the real `blogImageSourceSchema` over the
 * decoded attrs and returns the same `false` through the same mechanism. Read
 * the two together: this half says the attribute is an object, that half says
 * it is a legal image.
 */

/** The eight node names, mirrored from `CUSTOM_NODE_NAMES` in `blogBody.ts`
 *  and pinned equal to it by `scripts/check-blogs.mts`. Imported as a TYPE
 *  only, so this leaf keeps no runtime dependency on the vocabulary. */
import type { BlogCustomNodeName } from '@/lib/blogBody';

/** The tag every custom node serialises to. Deliberately a `div` and not the
 *  semantic tag the public page renders (`figure`, `section`, `aside`, `ol`,
 *  `li`): `li` and `ol` are claimed by the list nodes' own parse rules, so a
 *  step serialised as an `li` would come back as a list item. `div` is
 *  claimed by nothing in this vocabulary. */
export const BLOG_NODE_TAG = 'div';

/** The attribute that says WHICH custom node an element is. */
export const BLOG_NODE_ATTR = 'data-blog-node';

/** The parse rule's selector for one node. */
export const blogNodeSelector = (name: BlogCustomNodeName): string =>
  `${BLOG_NODE_TAG}[${BLOG_NODE_ATTR}="${name}"]`;

/**
 * One attribute's round trip.
 *
 * `toAttr` returns null to leave the attribute OFF the element (ProseMirror's
 * `renderSpec` skips a null-valued attribute anyway; returning null says so
 * rather than relying on it). `fromAttr` returns `undefined` to mean "absent,
 * use the schema default".
 */
type AttrCodec = {
  /** The DOM attribute name. Always `data-` prefixed. */
  attr: string;
  toAttr: (value: unknown) => string | null;
  fromAttr: (raw: string | null) => unknown;
};

/** A string attribute. A stored `null` is written as nothing, so it comes
 *  back through the schema default rather than as the four letters "null". */
const text = (attr: string): AttrCodec => ({
  attr,
  toAttr: (value) => (typeof value === 'string' ? value : null),
  fromAttr: (raw) => (raw === null ? undefined : raw),
});

/** A boolean. Written explicitly both ways so the value is legible in the
 *  copied HTML; `"false"` is a truthy STRING, which is the whole reason this
 *  cannot be left to a generic coercion. */
const flag = (attr: string): AttrCodec => ({
  attr,
  toAttr: (value) => (typeof value === 'boolean' ? String(value) : null),
  fromAttr: (raw) => (raw === null ? undefined : raw === 'true'),
});

/** A whole number. A value that is not an integer is dropped rather than
 *  rounded: the zod layer takes `int()` here, so a guess would be a document
 *  that refuses to save. */
const count = (attr: string): AttrCodec => ({
  attr,
  toAttr: (value) => (typeof value === 'number' && Number.isInteger(value) ? String(value) : null),
  fromAttr: (raw) => {
    if (raw === null || raw.trim() === '') return undefined;
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : undefined;
  },
});

/** An object attribute, as JSON in one attribute VALUE. The browser escapes
 *  `&`, `<` and `"` on the way out and unescapes them on the way back, so the
 *  quotes JSON needs cannot break out of the attribute. Anything that is not
 *  a plain object decodes as absent, which for `figure.image` means the rule
 *  refuses (see REQUIRED below) rather than pasting an unsavable figure. A
 *  plain object is as far as this goes: an object of the WRONG SHAPE is
 *  refused by the value guard in `blogEditorExtensions.ts`, which runs the
 *  vocabulary's own schema rather than a copy of it. */
const json = (attr: string): AttrCodec => ({
  attr,
  toAttr: (value) => (value === null || value === undefined ? null : JSON.stringify(value)),
  fromAttr: (raw) => {
    if (raw === null) return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : undefined;
    } catch {
      return undefined;
    }
  },
});

/**
 * Every attribute of every custom node, and how it travels.
 *
 * Pinned EXACTLY equal to each node's schema attributes by
 * `scripts/check-blogs.mts`, in both directions: an attribute added to
 * `blogBody.ts` and forgotten here would silently stop crossing the
 * clipboard, and one listed here that the schema does not declare would be
 * written to the DOM and thrown away on parse.
 */
export const BLOG_NODE_ATTR_CODECS: Record<
  BlogCustomNodeName,
  Readonly<Record<string, AttrCodec>>
> = {
  youtube: {
    id: text('data-id'),
    title: text('data-title'),
    description: text('data-description'),
    uploadDate: text('data-upload-date'),
    external: flag('data-external'),
  },
  instagram: {
    id: text('data-id'),
    type: text('data-type'),
    caption: flag('data-caption'),
  },
  figure: {
    // The one the brief calls out, and the reason this file exists.
    image: json('data-image'),
    alt: text('data-alt'),
    caption: text('data-caption'),
    credit: text('data-credit'),
    size: text('data-size'),
    width: count('data-width'),
    height: count('data-height'),
    priority: flag('data-priority'),
  },
  howTo: {
    title: text('data-title'),
    totalTime: text('data-total-time'),
  },
  step: {
    title: text('data-title'),
  },
  prosCons: {
    title: text('data-title'),
  },
  pros: {},
  cons: {},
};

/**
 * The attributes whose absence means the element did not come from us.
 *
 * All three have a default the zod layer refuses (`image: null`, `id: null`),
 * so decoding without them would produce a node that can never be saved. A
 * rule that returns `false` is skipped, so nothing is pasted instead, which
 * is the smaller loss by a wide margin: a missing block is visible, an
 * unsavable document is not, and its error names a node the writer did not
 * add.
 */
export const BLOG_NODE_REQUIRED_ATTRS: Record<BlogCustomNodeName, readonly string[]> = {
  youtube: ['id'],
  instagram: ['id'],
  figure: ['image'],
  howTo: [],
  step: [],
  prosCons: [],
  pros: [],
  cons: [],
};

/** The DOM attributes one custom node serialises to, `data-blog-node`
 *  included. Only string values, so nothing can ever stringify itself into
 *  "[object Object]" on the way out. */
export function blogNodeAttrsToDOM(
  name: BlogCustomNodeName,
  attrs: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = { [BLOG_NODE_ATTR]: name };
  for (const [key, codec] of Object.entries(BLOG_NODE_ATTR_CODECS[name])) {
    const value = codec.toAttr(attrs[key]);
    if (value !== null) out[codec.attr] = value;
  }
  return out;
}

/** The minimum an element has to offer to be decoded. Structural rather than
 *  `HTMLElement` so the check script can round-trip through a stub that
 *  models `setAttribute`/`getAttribute` and nothing else. */
export type BlogNodeElement = { getAttribute(name: string): string | null };

/** One custom node's attributes, read back off an element. `false` means the
 *  rule does not match: see {@link BLOG_NODE_REQUIRED_ATTRS}. */
export function blogNodeAttrsFromDOM(
  name: BlogCustomNodeName,
  element: BlogNodeElement,
): Record<string, unknown> | false {
  const out: Record<string, unknown> = {};
  for (const [key, codec] of Object.entries(BLOG_NODE_ATTR_CODECS[name])) {
    const value = codec.fromAttr(element.getAttribute(codec.attr));
    // Omitted rather than set to undefined: ProseMirror fills an absent key
    // from the schema's own default, which is what keeps every default
    // spelled exactly once.
    if (value !== undefined) out[key] = value;
  }
  for (const required of BLOG_NODE_REQUIRED_ATTRS[name]) {
    if (out[required] === undefined) return false;
  }
  return out;
}
