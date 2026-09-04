'use client';

import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';

import { editorNodeLabel } from '@/components/Admin/blogs/editor/editorBox';

/**
 * One column of a pros-and-cons card, shared by both node views.
 *
 * `Mdx/ProsCons` keeps the same shape in one private `Column` for the same
 * reason: the two sides differ by a glyph and a word, and writing them twice
 * is how a plus ends up beside a minus's spacing. Monochrome, like the
 * published block: a mono glyph rather than green and red, so it reads as part
 * of the article's own system in both themes.
 */
export default function ProsConsColumn({ label, glyph }: { label: string; glyph: string }) {
  return (
    <NodeViewWrapper className="min-w-0 px-4 py-3">
      <div className="flex items-center gap-2.5" contentEditable={false}>
        <span
          aria-hidden="true"
          className="flex size-5 items-center justify-center rounded-full border border-black/20 font-mono text-[11px] leading-none text-black/60"
        >
          {glyph}
        </span>
        <span className={editorNodeLabel}>{label}</span>
      </div>
      <NodeViewContent className="mt-2 [&_li]:my-1 [&_li]:text-sm [&_p]:my-1.5 [&_p]:text-sm [&_p]:text-black/85 [&_ul]:list-disc [&_ul]:pl-5" />
    </NodeViewWrapper>
  );
}
