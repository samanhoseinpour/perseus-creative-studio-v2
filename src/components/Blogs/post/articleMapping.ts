import { Children, createElement, Fragment, type ComponentType, type ReactNode } from 'react';
import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import type { Mark as PMMark, Node as PMNode } from '@tiptap/pm/model';

import type { BlogMedia } from '@/db/schema';
import { EXTENSIONS, type BlogDoc } from '@/lib/blogBody';

/**
 * The static-renderer mapping for a blog body: Tiptap JSON → the existing
 * React components. Pure and createElement-based so
 * scripts/check-blog-body.mts renders it with react-dom/server under plain
 * node, with stubs for the components that pull server-only modules.
 * ArticleBody.tsx binds the real components.
 *
 * Facts this code rests on (@tiptap/static-renderer 3.31): a nodeMapping
 * function IS the React element type the renderer creates, and it receives
 * { node, parent, children, renderElement } with a live ProseMirror node; so
 * (1) container components that introspect their children (HowTo, ProsCons)
 * get REAL <Step>/<Pros>/<Cons> elements built here from node.content via
 * renderElement, never the rendered children array; (2) heading ids come from
 * a precomputed array (one derivation with the TOC), read in render order;
 * (3) tables split the leading header rows into <thead> because Tiptap has no
 * thead and the page's black header row keys on it; (4) cells and list items
 * unwrap a lone paragraph, which is what remark emitted; (5) client components
 * receive scalar props only, never the node.
 */

/** The stored media set, the exact shape Image's `media` prop takes
 *  (type-only, so this leaf still imports nothing at runtime): `full`
 *  carries its pathname beside the size, or the real Image is not
 *  assignable to ArticleComponents. */
export type MediaSource = BlogMedia;

export type ArticleComponents = {
  Image: ComponentType<{
    src?: string;
    media?: MediaSource;
    alt?: string;
    caption?: string;
    credit?: string;
    size?: 'narrow' | 'default' | 'wide';
    priority?: boolean;
    width?: number;
    height?: number;
  }>;
  YouTube: ComponentType<{ id: string; title?: string }>;
  Instagram: ComponentType<{ id: string; type?: 'p' | 'reel' | 'tv'; caption?: boolean }>;
  HowTo: ComponentType<{ title?: string; totalTime?: string; children?: ReactNode }>;
  Step: ComponentType<{ title: string; children?: ReactNode }>;
  ProsCons: ComponentType<{ title?: string; children?: ReactNode }>;
  Pros: ComponentType<{ children?: ReactNode }>;
  Cons: ComponentType<{ children?: ReactNode }>;
  SmartLink: ComponentType<{ href?: string; children?: ReactNode }>;
  /** Called with the node name when a node reaches the fallback. */
  onUnhandled: (name: string) => void;
};

type RenderElement = (args: { content: PMNode; parent?: PMNode }) => ReactNode;
type NodeProps = { node: PMNode; parent?: PMNode; children?: ReactNode; renderElement: RenderElement };
type MarkProps = { mark: PMMark; children?: ReactNode };

export const TABLE_WRAPPER_CLASS = 'my-8 overflow-x-auto rounded-2xl border border-black/20';

const attrsOf = (node: PMNode) => node.attrs as Record<string, unknown>;
const orUndefined = <T,>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

export const MAPPED_NODE_NAMES = [
  'doc', 'text', 'paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock',
  'horizontalRule', 'hardBreak', 'table', 'tableRow', 'tableHeader', 'tableCell',
  'youtube', 'instagram', 'figure', 'howTo', 'step', 'prosCons', 'pros', 'cons',
] as const;

export function renderArticle(
  doc: BlogDoc,
  headingIds: string[],
  c: ArticleComponents,
  mode: 'development' | 'production',
): ReactNode {
  let headingIndex = 0;

  /** The inline children of a paragraph, rendered through the renderer. */
  const inline = (block: PMNode, renderElement: RenderElement): ReactNode[] => {
    const out: ReactNode[] = [];
    block.forEach((child, _offset, i) => {
      out.push(createElement(Fragment, { key: i }, renderElement({ content: child, parent: block })));
    });
    return out;
  };

  const blocks = (container: PMNode, renderElement: RenderElement): ReactNode[] => {
    const out: ReactNode[] = [];
    container.forEach((child, _offset, i) => {
      out.push(createElement(Fragment, { key: i }, renderElement({ content: child, parent: container })));
    });
    return out;
  };

  /** A cell or item holding ONE paragraph renders that paragraph's inlines
   *  bare, as remark did; more than one block keeps the <p>s. */
  const unwrapLone = ({ node, children, renderElement }: NodeProps): ReactNode => {
    if (node.childCount === 1 && node.firstChild?.type.name === 'paragraph') {
      return inline(node.firstChild, renderElement);
    }
    return children;
  };

  // A named function expression: the mapping IS a component type, and
  // react/display-name refuses an anonymous one (the object-property arrows
  // below take their key as a name; this one is returned by a factory).
  const cell = (tag: 'th' | 'td') =>
    function Cell(props: NodeProps) {
      const a = attrsOf(props.node);
      const colSpan = typeof a.colspan === 'number' && a.colspan > 1 ? a.colspan : undefined;
      const rowSpan = typeof a.rowspan === 'number' && a.rowspan > 1 ? a.rowspan : undefined;
      return createElement(tag, { colSpan, rowSpan }, unwrapLone(props));
    };

  const unreachable = (name: string) => () => {
    throw new Error(`${name} is rendered by its parent mapping and must never be reached`);
  };

  const nodeMapping: Record<(typeof MAPPED_NODE_NAMES)[number], (props: NodeProps) => ReactNode> = {
    doc: ({ children }) => createElement(Fragment, null, children),
    text: ({ node }) => node.text ?? '',
    paragraph: ({ children }) => createElement('p', null, children),
    heading: ({ node, children }) =>
      createElement(`h${attrsOf(node).level}`, { id: headingIds[headingIndex++] }, children),
    bulletList: ({ children }) => createElement('ul', null, children),
    orderedList: ({ node, children }) => {
      const start = attrsOf(node).start;
      return createElement('ol', typeof start === 'number' && start !== 1 ? { start } : null, children);
    },
    listItem: ({ node, children, renderElement }) => {
      if (node.firstChild?.type.name === 'paragraph') {
        const rest = Children.toArray(children).slice(1);
        return createElement('li', null, inline(node.firstChild, renderElement), rest);
      }
      return createElement('li', null, children);
    },
    blockquote: ({ children }) => createElement('blockquote', null, children),
    codeBlock: ({ node, children }) => {
      const language = attrsOf(node).language;
      return createElement(
        'pre',
        null,
        createElement('code', { className: typeof language === 'string' && language ? `language-${language}` : undefined }, children),
      );
    },
    horizontalRule: () => createElement('hr'),
    hardBreak: () => createElement('br'),
    table: ({ node, children }) => {
      const rows = Children.toArray(children);
      let headCount = 0;
      for (let i = 0; i < node.childCount; i++) {
        const row = node.child(i);
        let allHeaders = row.childCount > 0;
        row.forEach((cellNode) => {
          if (cellNode.type.name !== 'tableHeader') allHeaders = false;
        });
        if (!allHeaders) break;
        headCount++;
      }
      return createElement(
        'div',
        { className: TABLE_WRAPPER_CLASS },
        createElement(
          'table',
          null,
          headCount > 0 ? createElement('thead', null, rows.slice(0, headCount)) : null,
          createElement('tbody', null, rows.slice(headCount)),
        ),
      );
    },
    tableRow: ({ children }) => createElement('tr', null, children),
    tableHeader: cell('th'),
    tableCell: cell('td'),
    youtube: ({ node }) => {
      const a = attrsOf(node);
      return createElement(c.YouTube, { id: String(a.id), title: orUndefined(a.title as string | null) });
    },
    instagram: ({ node }) => {
      const a = attrsOf(node);
      return createElement(c.Instagram, {
        id: String(a.id),
        type: a.type as 'p' | 'reel' | 'tv',
        caption: Boolean(a.caption),
      });
    },
    figure: ({ node }) => {
      const a = attrsOf(node);
      const image = a.image as { type: 'static'; src: string } | ({ type: 'media' } & MediaSource);
      const shared = {
        alt: String(a.alt ?? ''),
        caption: orUndefined(a.caption as string | null),
        credit: orUndefined(a.credit as string | null),
        size: (a.size as 'narrow' | 'default' | 'wide') ?? 'default',
        priority: Boolean(a.priority),
        width: orUndefined(a.width as number | null),
        height: orUndefined(a.height as number | null),
      };
      return image.type === 'static'
        ? createElement(c.Image, { src: image.src, ...shared })
        : createElement(c.Image, { media: { variants: image.variants, blurDataUrl: image.blurDataUrl }, ...shared });
    },
    howTo: ({ node, renderElement }) => {
      const a = attrsOf(node);
      const steps: ReactNode[] = [];
      node.forEach((step, _offset, i) => {
        steps.push(
          createElement(c.Step, { key: i, title: String(attrsOf(step).title ?? '') }, blocks(step, renderElement)),
        );
      });
      return createElement(
        c.HowTo,
        { title: orUndefined(a.title as string | null), totalTime: orUndefined(a.totalTime as string | null) },
        steps,
      );
    },
    step: unreachable('step'),
    prosCons: ({ node, renderElement }) => {
      const a = attrsOf(node);
      const columns: ReactNode[] = [];
      node.forEach((col, _offset, i) => {
        const Column = col.type.name === 'pros' ? c.Pros : c.Cons;
        columns.push(createElement(Column, { key: i }, blocks(col, renderElement)));
      });
      return createElement(c.ProsCons, { title: orUndefined(a.title as string | null) }, columns);
    },
    pros: unreachable('pros'),
    cons: unreachable('cons'),
  };

  const markMapping = {
    link: ({ mark, children }: MarkProps) =>
      createElement(c.SmartLink, { href: String(mark.attrs.href) }, children),
  };

  return renderToReactElement({
    content: doc,
    extensions: EXTENSIONS,
    options: {
      nodeMapping,
      markMapping,
      // Supplying these downgrades an unknown node from a throw to a logged
      // omission in production (a corrupt row must not take the page down);
      // development throws so a mapping gap is found before it ships.
      unhandledNode: ({ node }: { node: PMNode }) => {
        const name = node.type.name;
        c.onUnhandled(name);
        if (mode === 'development') throw new Error(`Unmapped blog body node: ${name}`);
        return null;
      },
      unhandledMark: ({ mark, children }: MarkProps) => {
        c.onUnhandled(`mark:${mark.type.name}`);
        if (mode === 'development') throw new Error(`Unmapped blog body mark: ${mark.type.name}`);
        return createElement(Fragment, null, children);
      },
    },
  });
}
