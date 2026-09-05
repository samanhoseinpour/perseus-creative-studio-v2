/**
 * The /admin editor's extension list, composed from `blogBody.ts`'s CLOSED
 * vocabulary and nothing else.
 *
 * The guarantee this file exists to keep: what the editor produces is exactly
 * what `validateBlogBody` accepts and `renderArticle` renders. The public
 * renderer is proven against the live site by a parity snapshot, so any drift
 * here is drift away from a proven surface. `scripts/check-blogs.mts` pins it
 * by comparing the schema built from this list against `blogSchema` itself.
 *
 * A REACT-FREE LEAF: no React import, no node views (those are task 16's, and
 * they ride `.extend()` on these same entries). It is imported by the editor
 * canvas and by the check script, so it must stay runnable under plain node.
 *
 * WHAT MAY BE ADDED HERE, AND WHAT MAY NOT. The six extensions appended below
 * add NO node and NO mark, which is what keeps the schema identical by
 * construction rather than by inspection. `StarterKit` already disables its
 * own copies of the first four inside `EXTENSIONS`, precisely so the editor can
 * re-enable them without a duplicate-name conflict.
 *
 * NOT here, deliberately:
 *
 *  - `CharacterCount`. The editor's counter calls `wordCount({ doc, faqs })`,
 *    the number the reader sees on the page. CharacterCount disagrees with it
 *    in both directions: it counts code blocks and inline code, which
 *    `wordCount` drops, and it knows nothing about FAQ prose, which
 *    `wordCount` includes.
 *  - `@tiptap/extension-link`. It is installed (StarterKit depends on it) and
 *    declares `target`, `rel` and `class` with defaults that `getJSON()`
 *    materialises, so adding it would produce documents the strict zod refuses
 *    with an opaque path error on every save. The house `link` mark has ONLY
 *    `href`, and it gains its commands through `.extend()` below. There is no
 *    autolink and no link-on-paste for the same reason: both mint hrefs that
 *    never passed `safeHref`.
 */
import { Extension, type AnyExtension, type Mark, type Node as TiptapNode } from '@tiptap/core';
import { ListKeymap } from '@tiptap/extension-list';
import {
  Dropcursor,
  Gapcursor,
  Placeholder,
  TrailingNode,
  UndoRedo,
} from '@tiptap/extensions';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';

import {
  CUSTOM_NODE_NAMES,
  EXTENSIONS,
  blogImageSourceSchema,
  blogSchema,
  type BlogCustomNodeName,
} from '@/lib/blogBody';
import type { BlogBlockItem } from '@/lib/blogEditorBlocks';
import {
  BLOG_NODE_TAG,
  blogNodeAttrsFromDOM,
  blogNodeAttrsToDOM,
  blogNodeSelector,
} from '@/lib/blogNodeHtml';
import { safeHref } from '@/lib/safeHref';

/**
 * The editor's own commands for the house `link` mark.
 *
 * Named `setBlogLink` / `unsetBlogLink` rather than `setLink` / `unsetLink` on
 * purpose. `@tiptap/extension-link`'s types reach this project transitively
 * through StarterKit and augment `Commands` with `setLink`, so those names are
 * already TYPED as existing while the extension itself is not LOADED: calling
 * one would type-check and then be undefined at runtime. Distinct names cannot
 * collide with a command that is not there.
 */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blogLink: {
      /** Apply the link mark, or refuse if `safeHref` does not accept it. */
      setBlogLink: (href: string) => ReturnType;
      unsetBlogLink: () => ReturnType;
    };
  }
}

/**
 * The DOM event the editor's own `Mod-k` fires on the ProseMirror root.
 *
 * The keyboard shortcut lives with the mark (where a reader looks for it) while
 * the dialog it opens is React, so the two are joined by an event rather than
 * by an import, the way `perseus:admin-search-open` joins the sidebar trigger
 * to the ⌘K palette. It bubbles, so the canvas listens on its own wrapper.
 */
export const BLOG_LINK_REQUEST_EVENT = 'perseus:blog-link';

/**
 * Replace entries of a Tiptap extension list BY NAME.
 *
 * Never append a second extension with an existing name: two extensions named
 * `figure` is a schema conflict. Task 16 attaches eight node views through this
 * same door. It THROWS on a name that is not in the list, because the silent
 * failure is worse: an override nobody applied looks exactly like a feature
 * nobody wrote, and the schema assertion would still pass.
 */
export function overrideByName(
  base: readonly AnyExtension[],
  overrides: Record<string, (extension: AnyExtension) => AnyExtension>,
): AnyExtension[] {
  const applied = new Set<string>();
  const out = base.map((extension) => {
    const override = overrides[extension.name];
    if (!override) return extension;
    applied.add(extension.name);
    const next = override(extension);
    if (next.name !== extension.name) {
      throw new Error(
        `blogEditorExtensions: override for "${extension.name}" returned "${next.name}"`,
      );
    }
    return next;
  });
  const missing = Object.keys(overrides).filter((name) => !applied.has(name));
  if (missing.length > 0) {
    throw new Error(`blogEditorExtensions: no extension named ${missing.join(', ')}`);
  }
  return out;
}

/**
 * The clipboard half of one custom node, as an override for
 * {@link overrideByName}.
 *
 * `renderHTML` is what gives the node a `toDOM`, and a `toDOM` is what puts it
 * in `DOMSerializer.fromSchema`'s table. Without one, prosemirror-model's
 * `gatherToDOM` simply leaves the node out and the clipboard serializer throws
 * on any selection containing it.
 *
 * IT LIVES HERE AND NOT IN `blogBody.ts` ON PURPOSE. The public page renders
 * through `@tiptap/static-renderer`, which reads a node mapping and never a
 * DOM spec, so the renderer has no use for either half; putting them in the
 * shared vocabulary would be a change to the canonical schema for the benefit
 * of one consumer. The schema-identity assertion compares a projection that
 * excludes `toDOM`/`parseDOM` exactly so this addition is expressible.
 *
 * The content hole is derived from `blogSchema` rather than listed: a leaf
 * (`figure`, `youtube`, `instagram`) must NOT declare one, and a node with
 * children must, or its content is dropped on paste. Reading the answer off
 * the schema is what stops that list drifting from the schema it describes.
 */
/**
 * The VALUE half of the paste guard, and the reason it lives here.
 *
 * `blogNodeAttrsFromDOM` vouches for an attribute's SHAPE: `json()` accepts
 * any non-null, non-array object, which is everything a zero-dependency leaf
 * can say about one. `figure.image` needs more than a shape. It is a
 * discriminated union whose `static` arm is pinned to `STATIC_IMAGE_PATH_RE`
 * and whose `media` arm pins every rung's URL to OUR public Blob store, and
 * `Figure.tsx` branches on `type === 'media'` alone: anything else is rendered
 * as a bare `<img src>`. So without this, article HTML from a page an attacker
 * controls could paste a figure that fetches an arbitrary URL from the
 * writer's authenticated browser, and put an arbitrary string where
 * `blurDataURL` goes.
 *
 * Nothing bad could ever be STORED (`prepareSave` runs `validateBlogBody` on
 * both doors and keeps only the canonical result), which is exactly why the
 * secondary harm was the visible one: the node pasted, and every save after it
 * failed with an opaque refusal naming a block the writer had not typed. That
 * is the loss `BLOG_NODE_REQUIRED_ATTRS` already refuses for a MISSING image,
 * one step along.
 *
 * It is a refusal rather than a repair because a rule returning `false` is the
 * mechanism ProseMirror already has: the element is not matched, so nothing is
 * inserted. A missing block is visible; an unsavable document is not.
 */
const pastedAttrsRefused = (
  name: BlogCustomNodeName,
  attrs: Record<string, unknown>,
): boolean => name === 'figure' && !blogImageSourceSchema.safeParse(attrs.image).success;

const clipboardHtml =
  (name: BlogCustomNodeName) =>
  (extension: AnyExtension): AnyExtension =>
    (extension as TiptapNode).extend({
      renderHTML({ node }) {
        const attrs = blogNodeAttrsToDOM(name, node.attrs);
        return (
          blogSchema.nodes[name].isLeaf ? [BLOG_NODE_TAG, attrs] : [BLOG_NODE_TAG, attrs, 0]
        ) as DOMOutputSpec;
      },
      parseHTML() {
        return [
          {
            tag: blogNodeSelector(name),
            getAttrs: (element: HTMLElement) => {
              const attrs = blogNodeAttrsFromDOM(name, element);
              return attrs === false || pastedAttrsRefused(name, attrs) ? false : attrs;
            },
          },
        ];
      },
    });

/** The eight overrides, by name. Built from `CUSTOM_NODE_NAMES` so a ninth
 *  custom node cannot be added to the vocabulary without one. */
const CLIPBOARD_OVERRIDES: Record<string, (extension: AnyExtension) => AnyExtension> =
  Object.fromEntries(CUSTOM_NODE_NAMES.map((name) => [name, clipboardHtml(name)]));

/** What an empty canvas says. Member-visible copy: no em dash. */
export const BLOG_BODY_PLACEHOLDER = 'Write the article. Press / to add a block.';

export type BlogSlashSuggestion = Partial<SuggestionOptions<BlogBlockItem, BlogBlockItem>>;

/**
 * The `/` menu, as an EXTENSION rather than a component.
 *
 * It adds no node and no mark, which is why it can live in this list at all:
 * the schema-identity assertion compares the schema built from this whole
 * array, so an editor that composed its list somewhere else would be checking
 * a list nobody runs. `BodyEditor` reaches it through {@link overrideByName}
 * and hands it a React renderer, so the leaf stays React-free while the
 * assertion still covers what the canvas actually mounts.
 */
export const BlogSlashMenu = Extension.create<{ suggestion: BlogSlashSuggestion }>({
  name: 'blogSlashMenu',
  addOptions() {
    return { suggestion: {} };
  },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, char: '/', ...this.options.suggestion })];
  },
});

export const BLOG_EDITOR_EXTENSIONS: AnyExtension[] = [
  ...overrideByName(EXTENSIONS, {
    ...CLIPBOARD_OVERRIDES,
    link: (extension) =>
      (extension as Mark).extend({
        addCommands() {
          return {
            // `safeHref` runs HERE as well as in the dialog, because this is
            // the command every control applies the mark WITH: the bubble
            // menu, the dialog, a paste handler somebody writes later. It is a
            // parse-based guard and the zod layer applies the same one, so a
            // refusal here is a link that would have failed the next save.
            //
            // It is NOT, on its own, the only way an href can reach a
            // document: `insertContent` takes a JSON node and a JSON node may
            // carry marks, so a caller could hand-write `marks: [{ type:
            // 'link' }]` and route around this entirely. `BodyEditor`'s
            // `applyLink` used to, on the branch that inserts words for an
            // empty selection. It now gates on `safeHref` before writing
            // anything and marks through this command like the other branch,
            // and `scripts/check-blogs.mts` asserts that no `link` mark is
            // built by hand anywhere in that file. The guarantee is the pair,
            // not this line alone.
            setBlogLink:
              (href: string) =>
              ({ commands }) =>
                safeHref(href) === null
                  ? false
                  : commands.setMark(this.name, { href }),
            unsetBlogLink:
              () =>
              ({ commands }) =>
                commands.unsetMark(this.name),
          };
        },
        addKeyboardShortcuts() {
          return {
            'Mod-k': () => {
              this.editor.view.dom.dispatchEvent(
                new CustomEvent(BLOG_LINK_REQUEST_EVENT, { bubbles: true }),
              );
              return true;
            },
            // `extendMarkRange` first, or a collapsed caret inside a link
            // unsets a zero-width range and the shortcut reads as dead.
            'Mod-Shift-k': () =>
              this.editor.chain().extendMarkRange(this.name).unsetBlogLink().run(),
          };
        },
      }),
  }),
  Dropcursor,
  Gapcursor,
  UndoRedo,
  ListKeymap,
  TrailingNode,
  Placeholder.configure({
    placeholder: BLOG_BODY_PLACEHOLDER,
    // Tiptap decorates the empty block with this class and a `data-placeholder`
    // attribute, and draws nothing on its own: the text is CSS `content`. A
    // literal utility string keeps that in the extension list rather than in
    // globals.css, where an editor-only rule would be loaded by every route.
    // `float-left` + `h-0` is the standard shape, so the hint sits in the line
    // the caret is already on and takes no height of its own.
    emptyNodeClass:
      'is-empty before:pointer-events-none before:float-left before:h-0 before:text-black/35 before:content-[attr(data-placeholder)]',
  }),
  BlogSlashMenu,
];
