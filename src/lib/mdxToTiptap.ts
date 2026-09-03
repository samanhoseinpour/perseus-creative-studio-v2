/**
 * Pure mdast → Tiptap JSON mapper for the MDX corpus. No I/O, no server-only.
 * Every construct the corpus uses has an explicit rule; everything else is a
 * hard error, COLLECTED (never thrown) so one run reports every problem in a
 * post. In MDX mode there are no `html` nodes: lowercase tags arrive as JSX
 * elements and are switched on `name` below.
 */
import type { JSONContent } from '@tiptap/core';
import type { PhrasingContent, Root, RootContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxExpressionAttribute, MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { STATIC_IMAGE_PATH_RE } from '@/lib/portfolioFields';
import { safeHref } from '@/lib/safeHref';

export type MapProblem = { line: number | null; message: string };
export type MapNote = { kind: 'WARN' | 'NOTE'; line: number | null; message: string };
export type MapResult = { doc: JSONContent; problems: MapProblem[]; notes: MapNote[] };

type Mark = { type: 'bold' | 'italic' | 'strike' | 'code' | 'underline' } | { type: 'link'; attrs: { href: string } };

type Ctx = {
  problems: MapProblem[];
  notes: MapNote[];
  definitions: Map<string, string>;
};

/** The parser, in the ORDER @mdx-js/mdx registers plugins: parse → mdx → gfm. */
export function parseMdx(source: string): Root {
  return unified().use(remarkParse).use(remarkMdx).use(remarkGfm).parse(source) as Root;
}

type Positioned = { position?: { start: { line: number } } };
const lineOf = (n: Positioned): number | null => n.position?.start.line ?? null;

// ── JSX attributes ──────────────────────────────────────────────────────────

type AttrValue = string | number | boolean;

function attrs(
  el: MdxJsxFlowElement | MdxJsxTextElement,
  ctx: Ctx,
): Record<string, AttrValue> {
  const out: Record<string, AttrValue> = {};
  for (const a of el.attributes as (MdxJsxAttribute | MdxJsxExpressionAttribute)[]) {
    if (a.type !== 'mdxJsxAttribute') {
      ctx.problems.push({ line: lineOf(el), message: `<${el.name}>: spread attribute is not supported` });
      continue;
    }
    if (a.value === null || a.value === undefined) {
      out[a.name] = true; // bare attribute
      continue;
    }
    if (typeof a.value === 'string') {
      out[a.name] = a.value;
      continue;
    }
    const src = a.value.value.trim();
    if (/^-?\d+(?:\.\d+)?$/.test(src)) out[a.name] = Number(src);
    else if (/^(['"]).*\1$/.test(src)) out[a.name] = src.slice(1, -1);
    else if (src === 'true' || src === 'false') out[a.name] = src === 'true';
    else ctx.problems.push({ line: lineOf(el), message: `<${el.name} ${a.name}={…}>: only literal expressions are supported` });
  }
  return out;
}

const str = (v: AttrValue | undefined): string | undefined => (typeof v === 'string' ? v : undefined);
const num = (v: AttrValue | undefined): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : undefined;
const bool = (v: AttrValue | undefined): boolean => v === true || v === 'true';

// ── Inline content ──────────────────────────────────────────────────────────

function text(value: string, marks: Mark[]): JSONContent {
  return marks.length ? { type: 'text', text: value, marks } : { type: 'text', text: value };
}

function inlines(nodes: PhrasingContent[], marks: Mark[], ctx: Ctx): JSONContent[] {
  const out: JSONContent[] = [];
  for (const n of nodes) {
    switch (n.type) {
      case 'text':
        if (n.value) out.push(text(n.value, marks));
        break;
      case 'emphasis':
        out.push(...inlines(n.children, [...marks, { type: 'italic' }], ctx));
        break;
      case 'strong':
        out.push(...inlines(n.children, [...marks, { type: 'bold' }], ctx));
        break;
      case 'delete':
        out.push(...inlines(n.children, [...marks, { type: 'strike' }], ctx));
        break;
      case 'inlineCode': {
        if (marks.length) {
          ctx.notes.push({ kind: 'WARN', line: lineOf(n), message: `code span inside ${marks.map((m) => m.type).join('+')}: outer mark dropped (code excludes other marks)` });
        }
        out.push(text(n.value, [{ type: 'code' }]));
        break;
      }
      case 'link': {
        const href = safeHref(n.url);
        if (href === null) {
          ctx.problems.push({ line: lineOf(n), message: `unsafe link href ${JSON.stringify(n.url)}` });
          break;
        }
        out.push(...inlines(n.children, [...marks, { type: 'link', attrs: { href } }], ctx));
        break;
      }
      case 'linkReference': {
        const url = ctx.definitions.get(n.identifier.toLowerCase());
        if (!url) {
          ctx.problems.push({ line: lineOf(n), message: `unresolved link reference [${n.identifier}]` });
          break;
        }
        const href = safeHref(url);
        if (href === null) {
          ctx.problems.push({ line: lineOf(n), message: `unsafe link href ${JSON.stringify(url)}` });
          break;
        }
        out.push(...inlines(n.children, [...marks, { type: 'link', attrs: { href } }], ctx));
        break;
      }
      case 'break':
        // A break inside emphasis/strong/link carries the active marks, as
        // ProseMirror's addMark and DOMParser attach them to inline nodes;
        // hardBreak is the one non-text node the validator lets carry marks.
        out.push(marks.length ? { type: 'hardBreak', marks } : { type: 'hardBreak' });
        break;
      case 'mdxJsxTextElement': {
        if (n.name === 'br') out.push(marks.length ? { type: 'hardBreak', marks } : { type: 'hardBreak' });
        else ctx.problems.push({ line: lineOf(n), message: `inline JSX <${n.name}> is not supported` });
        break;
      }
      case 'mdxTextExpression':
        ctx.problems.push({ line: lineOf(n), message: `MDX expression {${n.value}} is not supported` });
        break;
      case 'image':
      case 'imageReference':
        ctx.problems.push({ line: lineOf(n), message: 'an inline image inside a paragraph is not supported; use <Image /> on its own line' });
        break;
      case 'html':
        ctx.problems.push({ line: lineOf(n), message: `raw html ${JSON.stringify(n.value.slice(0, 40))}` });
        break;
      case 'footnoteReference':
        ctx.problems.push({ line: lineOf(n), message: 'footnotes are not supported' });
        break;
      default:
        ctx.problems.push({ line: lineOf(n as Positioned), message: `unsupported inline node ${(n as { type: string }).type}` });
    }
  }
  return out;
}

// ── Blocks ──────────────────────────────────────────────────────────────────

const STATIC_IMAGE_TITLE_DIMS = /(\d+)\s*x\s*(\d+)/i;

function figureFromImage(el: MdxJsxFlowElement | MdxJsxTextElement, ctx: Ctx): JSONContent | null {
  const a = attrs(el, ctx);
  const src = str(a.src);
  if (!src || !STATIC_IMAGE_PATH_RE.test(src)) {
    ctx.problems.push({ line: lineOf(el), message: `<Image src=${JSON.stringify(src)}>: not a /images path` });
    return null;
  }
  let width = num(a.width);
  let height = num(a.height);
  const title = str(a.title);
  if (title) {
    const m = title.match(STATIC_IMAGE_TITLE_DIMS);
    if (m && !width && !height) {
      width = Number(m[1]);
      height = Number(m[2]);
    } else {
      ctx.notes.push({ kind: 'NOTE', line: lineOf(el), message: `<Image title=${JSON.stringify(title)}> dropped (not WxH; never rendered)` });
    }
  }
  const size = str(a.size);
  return {
    type: 'figure',
    attrs: {
      image: { type: 'static', src },
      alt: str(a.alt) ?? '',
      ...(str(a.caption) ? { caption: str(a.caption) } : {}),
      ...(str(a.credit) ? { credit: str(a.credit) } : {}),
      size: size === 'narrow' || size === 'wide' ? size : 'default',
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      priority: bool(a.priority),
    },
  };
}

function jsxChildren(el: MdxJsxFlowElement): RootContent[] {
  return el.children as RootContent[];
}

function namedChildren(el: MdxJsxFlowElement, names: string[], ctx: Ctx): MdxJsxFlowElement[] {
  const out: MdxJsxFlowElement[] = [];
  for (const c of jsxChildren(el)) {
    if (c.type === 'mdxJsxFlowElement' && c.name && names.includes(c.name)) out.push(c);
    else if (c.type === 'text' && !c.value.trim()) continue;
    else if (c.type === 'paragraph' && c.children.every((x) => x.type === 'text' && !x.value.trim())) continue;
    else ctx.problems.push({ line: lineOf(c as Positioned), message: `<${el.name}> may only contain ${names.map((n) => `<${n}>`).join('/')}` });
  }
  return out;
}

function blocks(nodes: RootContent[], ctx: Ctx): JSONContent[] {
  const out: JSONContent[] = [];
  for (const n of nodes) {
    switch (n.type) {
      case 'heading': {
        if (n.depth < 2 || n.depth > 4) {
          ctx.problems.push({ line: lineOf(n), message: `h${n.depth} is not allowed (2-4 only)` });
          break;
        }
        out.push({ type: 'heading', attrs: { level: n.depth }, content: inlines(n.children, [], ctx) });
        break;
      }
      case 'paragraph': {
        // The @mdx-js/mdx "unravel" rule: a paragraph made only of JSX
        // elements and whitespace is treated as flow.
        const meaningful = n.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
        if (meaningful.length > 0 && meaningful.every((c) => c.type === 'mdxJsxTextElement')) {
          for (const c of meaningful as MdxJsxTextElement[]) out.push(...jsxFlow(c as unknown as MdxJsxFlowElement, ctx));
          break;
        }
        if (meaningful.length === 1 && meaningful[0].type === 'image') {
          const img = meaningful[0];
          const src = img.url;
          if (!STATIC_IMAGE_PATH_RE.test(src)) {
            ctx.problems.push({ line: lineOf(img), message: `![](${src}): not a /images path` });
            break;
          }
          const m = img.title?.match(STATIC_IMAGE_TITLE_DIMS);
          out.push({
            type: 'figure',
            attrs: {
              image: { type: 'static', src },
              alt: img.alt ?? '',
              size: 'default',
              ...(m ? { width: Number(m[1]), height: Number(m[2]) } : {}),
              priority: false,
            },
          });
          break;
        }
        const content = inlines(n.children, [], ctx);
        // Indentation inside a JSX body arrives as whitespace text; a paragraph
        // made only of it must not become <p> </p>.
        if (content.length && !content.every((c) => c.type === 'text' && !(c.text ?? '').trim())) {
          out.push({ type: 'paragraph', content });
        }
        break;
      }
      case 'list': {
        const items: JSONContent[] = [];
        for (const item of n.children) {
          const inner = blocks(item.children, ctx);
          if (inner.length === 0 || inner[0].type !== 'paragraph') {
            ctx.problems.push({ line: lineOf(item), message: 'a list item must start with a paragraph' });
            continue;
          }
          items.push({ type: 'listItem', content: inner });
        }
        out.push(
          n.ordered
            ? { type: 'orderedList', attrs: { start: n.start ?? 1 }, content: items }
            : { type: 'bulletList', content: items },
        );
        break;
      }
      case 'blockquote':
        out.push({ type: 'blockquote', content: blocks(n.children, ctx) });
        break;
      case 'code':
        out.push({
          type: 'codeBlock',
          attrs: { language: n.lang ?? null },
          ...(n.value ? { content: [{ type: 'text', text: n.value }] } : {}),
        });
        break;
      case 'thematicBreak':
        out.push({ type: 'horizontalRule' });
        break;
      case 'table': {
        const rows = n.children.map((row, ri) => ({
          type: 'tableRow',
          content: row.children.map((cell) => {
            const content = inlines(cell.children, [], ctx);
            return {
              type: ri === 0 ? 'tableHeader' : 'tableCell',
              content: [content.length ? { type: 'paragraph', content } : { type: 'paragraph' }],
            };
          }),
        }));
        out.push({ type: 'table', content: rows });
        break;
      }
      case 'mdxJsxFlowElement':
        out.push(...jsxFlow(n, ctx));
        break;
      case 'mdxFlowExpression':
        ctx.problems.push({ line: lineOf(n), message: `MDX expression {${n.value}} is not supported` });
        break;
      case 'html':
        ctx.problems.push({ line: lineOf(n), message: `raw html ${JSON.stringify(n.value.slice(0, 40))}` });
        break;
      case 'definition':
        break; // collected up front
      case 'yaml':
        ctx.problems.push({ line: lineOf(n), message: 'frontmatter is not supported' });
        break;
      case 'footnoteDefinition':
        ctx.problems.push({ line: lineOf(n), message: 'footnotes are not supported' });
        break;
      case 'text':
        // Stray whitespace between JSX tags; anything else at block level is a
        // parse we do not understand.
        if (n.value.trim()) ctx.problems.push({ line: lineOf(n), message: 'bare text at block level' });
        break;
      default:
        ctx.problems.push({ line: lineOf(n as Positioned), message: `unsupported block ${(n as { type: string }).type}` });
    }
  }
  return out;
}

function jsxFlow(el: MdxJsxFlowElement, ctx: Ctx): JSONContent[] {
  const name = el.name ?? '';
  switch (name) {
    case 'YouTube': {
      const a = attrs(el, ctx);
      const id = str(a.id);
      if (!id) {
        ctx.problems.push({ line: lineOf(el), message: '<YouTube> without an id' });
        return [];
      }
      return [
        {
          type: 'youtube',
          attrs: {
            id,
            ...(str(a.title) ? { title: str(a.title) } : {}),
            ...(str(a.description) ? { description: str(a.description) } : {}),
            ...(str(a.uploadDate) ? { uploadDate: str(a.uploadDate) } : {}),
            external: bool(a.external),
          },
        },
      ];
    }
    case 'Instagram': {
      const a = attrs(el, ctx);
      const id = str(a.id);
      if (!id) {
        ctx.problems.push({ line: lineOf(el), message: '<Instagram> without an id' });
        return [];
      }
      const type = str(a.type);
      return [{ type: 'instagram', attrs: { id, type: type === 'reel' || type === 'tv' ? type : 'p', caption: bool(a.caption) } }];
    }
    case 'Image': {
      const fig = figureFromImage(el, ctx);
      return fig ? [fig] : [];
    }
    case 'HowTo': {
      const a = attrs(el, ctx);
      const steps = namedChildren(el, ['Step'], ctx).map((s) => {
        const sa = attrs(s, ctx);
        const title = str(sa.title)?.trim();
        if (!title) ctx.problems.push({ line: lineOf(s), message: '<Step> without a title' });
        return { type: 'step', attrs: { title: title ?? '' }, content: blocks(jsxChildren(s), ctx) };
      });
      return [
        {
          type: 'howTo',
          attrs: {
            ...(str(a.title) ? { title: str(a.title) } : {}),
            ...(str(a.totalTime) ? { totalTime: str(a.totalTime) } : {}),
          },
          content: steps,
        },
      ];
    }
    case 'Step':
      ctx.problems.push({ line: lineOf(el), message: '<Step> outside <HowTo>' });
      return [];
    case 'ProsCons': {
      const a = attrs(el, ctx);
      const cols = namedChildren(el, ['Pros', 'Cons'], ctx).map((c) => ({
        type: c.name === 'Pros' ? 'pros' : 'cons',
        content: blocks(jsxChildren(c), ctx),
      }));
      return [{ type: 'prosCons', attrs: { ...(str(a.title) ? { title: str(a.title) } : {}) }, content: cols }];
    }
    case 'Pros':
    case 'Cons':
      ctx.problems.push({ line: lineOf(el), message: `<${name}> outside <ProsCons>` });
      return [];
    case 'br':
      // A root-level spacer line: one empty line box, exactly what a bare
      // <br> between blocks draws today (no stylesheet gives p a margin).
      return [{ type: 'paragraph', content: [{ type: 'hardBreak' }] }];
    case 'a': {
      const a = attrs(el, ctx);
      const href = safeHref(str(a.href));
      if (href === null) {
        ctx.problems.push({ line: lineOf(el), message: `<a href=${JSON.stringify(a.href)}>: unsafe href` });
        return [];
      }
      const inner = blocks(jsxChildren(el), ctx);
      if (inner.length !== 1 || inner[0].type !== 'paragraph') {
        ctx.problems.push({ line: lineOf(el), message: '<a> must wrap exactly one paragraph' });
        return [];
      }
      const content = (inner[0].content ?? []).map((c) =>
        c.type === 'text' ? { ...c, marks: [{ type: 'link', attrs: { href } }, ...(c.marks ?? [])] } : c,
      );
      return [{ type: 'paragraph', content }];
    }
    case 'aside':
      ctx.notes.push({ kind: 'WARN', line: lineOf(el), message: '<aside> unwrapped to its blocks (unstyled today; decide a callout in the editor later)' });
      return blocks(jsxChildren(el), ctx);
    default:
      ctx.problems.push({ line: lineOf(el), message: `unknown JSX <${name}>` });
      return [];
  }
}

export function mdxToTiptap(tree: Root): MapResult {
  const ctx: Ctx = { problems: [], notes: [], definitions: new Map() };
  for (const n of tree.children) {
    if (n.type === 'definition') ctx.definitions.set(n.identifier.toLowerCase(), n.url);
  }
  const content = blocks(tree.children, ctx);
  return { doc: { type: 'doc', content }, problems: ctx.problems, notes: ctx.notes };
}
