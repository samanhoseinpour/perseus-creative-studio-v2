/**
 * What the editor's `/` menu and its toolbar can put into an article, as data.
 *
 * A REACT-FREE, ZERO-COMMAND LEAF: every entry is either a JSON structure or a
 * name from a closed union the editor switches on exhaustively. That is what
 * lets `scripts/check-blogs.mts` run each insertable structure through the real
 * `validateBlogBody` before anybody clicks it.
 *
 * THE TRAP THIS FILE EXISTS TO CLOSE. `step`, `pros` and `cons` have NO `group`
 * in `blogBody.ts`: they are reachable only by name from inside `howTo` and
 * `prosCons`. So a menu that offered a bare `step` would produce a document
 * ProseMirror cannot place and the strict zod refuses, and the writer would
 * meet it as a save error on a node they did not think they had added. Every
 * `insert` below is therefore a COMPLETE structure: a how-to with a step in it,
 * a pros and cons with both halves.
 *
 * Member-visible copy: no em dash.
 */
import type { JSONContent } from '@tiptap/core';

import type { BlogMedia } from '@/db/schema';

/**
 * The conversions. Each one changes the block the caret is in rather than
 * adding a new one, so they carry no JSON: `heading2` on an empty paragraph
 * should leave one block, not two.
 *
 * A closed union so the editor's switch is exhaustive and the check script can
 * prove every name is handled. `table` is here rather than in `insert` because
 * TableKit's own `insertTable` builds the cells with their attributes; a
 * hand-written table template would be a second, drifting definition of one.
 */
export const BLOG_BLOCK_COMMANDS = [
  'heading2',
  'heading3',
  'heading4',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
  'table',
] as const;
export type BlogBlockCommand = (typeof BLOG_BLOCK_COMMANDS)[number];

/** The blocks whose attributes have to be collected before the node exists.
 *  A `youtube` with a null id, or a `figure` with no image, is a document the
 *  zod layer refuses; asking first is the only way to insert a valid one. */
export const BLOG_BLOCK_DIALOGS = ['youtube', 'instagram', 'image'] as const;
export type BlogBlockDialog = (typeof BLOG_BLOCK_DIALOGS)[number];

export type BlogBlockAction =
  | { kind: 'insert'; content: JSONContent }
  | { kind: 'command'; command: BlogBlockCommand }
  | { kind: 'dialog'; dialog: BlogBlockDialog };

export type BlogBlockItem = {
  id: string;
  label: string;
  hint: string;
  /** Extra words the `/` query matches on, beyond the label. Lowercase. */
  keywords: string[];
  action: BlogBlockAction;
};

/** An empty paragraph, the smallest thing every content hole can hold. */
const emptyParagraph: JSONContent = { type: 'paragraph' };

export const BLOG_BLOCK_ITEMS: readonly BlogBlockItem[] = [
  {
    id: 'heading2',
    label: 'Heading',
    hint: 'A section title',
    keywords: ['h2', 'title', 'section'],
    action: { kind: 'command', command: 'heading2' },
  },
  {
    id: 'heading3',
    label: 'Subheading',
    hint: 'A step down from a heading',
    keywords: ['h3', 'sub'],
    action: { kind: 'command', command: 'heading3' },
  },
  {
    id: 'heading4',
    label: 'Small heading',
    hint: 'The smallest heading',
    keywords: ['h4'],
    action: { kind: 'command', command: 'heading4' },
  },
  {
    id: 'bulletList',
    label: 'Bulleted list',
    hint: 'Points in no particular order',
    keywords: ['ul', 'bullets', 'unordered'],
    action: { kind: 'command', command: 'bulletList' },
  },
  {
    id: 'orderedList',
    label: 'Numbered list',
    hint: 'Points in order',
    keywords: ['ol', 'numbers', 'ordered'],
    action: { kind: 'command', command: 'orderedList' },
  },
  {
    id: 'blockquote',
    label: 'Quote',
    hint: 'Set a passage apart',
    keywords: ['blockquote', 'pull'],
    action: { kind: 'command', command: 'blockquote' },
  },
  {
    id: 'codeBlock',
    label: 'Code block',
    hint: 'Preformatted code',
    keywords: ['pre', 'snippet'],
    action: { kind: 'command', command: 'codeBlock' },
  },
  {
    id: 'table',
    label: 'Table',
    hint: 'Three columns with a header row',
    keywords: ['grid', 'rows', 'columns'],
    action: { kind: 'command', command: 'table' },
  },
  {
    id: 'horizontalRule',
    label: 'Divider',
    hint: 'A line between sections',
    keywords: ['hr', 'rule', 'separator'],
    action: { kind: 'insert', content: { type: 'horizontalRule' } },
  },
  {
    id: 'image',
    label: 'Image',
    hint: 'Upload a picture with a caption',
    keywords: ['figure', 'photo', 'picture', 'upload'],
    action: { kind: 'dialog', dialog: 'image' },
  },
  {
    id: 'youtube',
    label: 'YouTube video',
    hint: 'Embed by link or video id',
    keywords: ['video', 'embed', 'yt'],
    action: { kind: 'dialog', dialog: 'youtube' },
  },
  {
    id: 'instagram',
    label: 'Instagram post',
    hint: 'Embed a post, reel or IGTV',
    keywords: ['reel', 'embed', 'ig'],
    action: { kind: 'dialog', dialog: 'instagram' },
  },
  {
    // A how-to with NO step is not a how-to: `howTo` is `step+`, and the zod
    // layer additionally requires at least one child. The step in turn is
    // `(paragraph | bulletList | orderedList | blockquote | figure)+` and its
    // title must be non-empty, so both are filled in here.
    id: 'howTo',
    label: 'How-to steps',
    hint: 'Numbered steps that also become structured data',
    keywords: ['howto', 'guide', 'steps', 'tutorial'],
    action: {
      kind: 'insert',
      content: {
        type: 'howTo',
        attrs: { title: null, totalTime: null },
        content: [
          { type: 'step', attrs: { title: 'First step' }, content: [emptyParagraph] },
        ],
      },
    },
  },
  {
    // `prosCons` is `pros? cons?` in the schema but must hold at least one
    // child by the zod layer, and a block called "Pros and cons" with only one
    // side is not what anybody picked. Both are inserted.
    id: 'prosCons',
    label: 'Pros and cons',
    hint: 'Two columns, upsides and downsides',
    keywords: ['proscons', 'pros', 'cons', 'compare'],
    action: {
      kind: 'insert',
      content: {
        type: 'prosCons',
        attrs: { title: null },
        content: [
          { type: 'pros', content: [emptyParagraph] },
          { type: 'cons', content: [emptyParagraph] },
        ],
      },
    },
  },
];

/**
 * The three blocks whose attributes a dialog collects first, as BUILDERS.
 *
 * They live here rather than in `BodyEditor.tsx` for one reason: the check
 * script runs every `insert` template above through the real
 * `validateBlogBody`, and three of the fourteen menu entries were exempt from
 * that guarantee because their JSON was written inline at the call site. A
 * figure's nested `image` is the trickiest shape in the whole vocabulary, so
 * the entry that produced it was the one least covered. Being functions rather
 * than constants changes nothing about that: the script calls them with a
 * fixture and validates what comes back.
 *
 * `BlogMedia` is imported as a TYPE only, so this stays a runtime-dependency
 * free leaf (the `articleMapping.ts` precedent).
 */
export type BlogInstagramKind = 'p' | 'reel' | 'tv';

/** `external` says whether the published page may claim the video as ours.
 *  It is a required argument, never defaulted here: a default would be a
 *  silent claim about somebody else's upload. */
export function youtubeBlock(value: { id: string; external: boolean }): JSONContent {
  return { type: 'youtube', attrs: { id: value.id, external: value.external } };
}

export function instagramBlock(value: { id: string; type: BlogInstagramKind }): JSONContent {
  return { type: 'instagram', attrs: { id: value.id, type: value.type } };
}

/** `alt` is required by the zod layer (`shortText.min(1)`), which is why the
 *  dialog collects it before the node exists rather than after. */
export function figureBlock(value: {
  media: BlogMedia;
  alt: string;
  caption: string | null;
  credit: string | null;
}): JSONContent {
  return {
    type: 'figure',
    attrs: {
      image: { type: 'media', ...value.media },
      alt: value.alt,
      caption: value.caption,
      credit: value.credit,
    },
  };
}

/**
 * The `/` menu's filter. Matches the label and the keywords, never the hint:
 * a hint is a sentence, so matching it makes half the menu answer to any
 * common word and the list stops narrowing as you type.
 *
 * An empty query WIDENS to everything rather than collapsing to nothing, the
 * rule `searchAllTokens` follows, which is what makes a bare `/` useful.
 */
export function filterBlogBlocks(query: string): BlogBlockItem[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [...BLOG_BLOCK_ITEMS];
  return BLOG_BLOCK_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.keywords.some((word) => word.includes(q)),
  );
}
