'use client';

import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';

import {
  editorNodeBar,
  editorNodeInput,
  editorNodeLabel,
  editorNodeShell,
} from '@/components/Admin/blogs/editor/editorBox';

/**
 * The `howTo` node: the stepper card, with its steps as real editable content.
 *
 * `NodeViewContent as="ol"` is doing real work rather than decoration. The
 * steps are numbered `01`, `02` on the published page, and the browser's own
 * list numbering is the only way to get that in the canvas without a node
 * knowing its own index: a step is a separate node view and cannot see its
 * position without `trackNodeViewPosition`, and a CSS counter would put the
 * numbers in a pseudo-element the Tailwind scanner has to be trusted to
 * generate. An `<ol>` just counts.
 *
 * `totalTime` is deliberately NOT offered here. It is an ISO 8601 duration
 * (`PT3H`) with a strict pattern in the zod layer, so a free text field would
 * let a writer type "3 hours" and make the whole document unsavable, with the
 * error naming a block they thought they had finished. It needs its own
 * control, which is a decision rather than a node view.
 */
export default function HowToNodeView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const attrs = node.attrs as { title: string | null };

  return (
    <NodeViewWrapper className={editorNodeShell}>
      <div className={editorNodeBar} contentEditable={false}>
        <span className={editorNodeLabel}>Step-by-step</span>
        <input
          className={editorNodeInput}
          value={attrs.title ?? ''}
          maxLength={300}
          disabled={!editor.isEditable}
          placeholder="Name these steps (optional)"
          aria-label="Title for these steps"
          onChange={(event) =>
            updateAttributes({ title: event.target.value.trim() === '' ? null : event.target.value })
          }
        />
      </div>

      {/* The generic is explicit because `as` is declared `NoInfer<T>`, so
          Tiptap will not infer the tag from the prop and defaults to a div. */}
      <NodeViewContent<'ol'>
        as="ol"
        className="my-1 pl-9 pr-3 marker:font-mono marker:text-xs marker:text-black/45"
        style={{ listStyleType: 'decimal-leading-zero' }}
      />
    </NodeViewWrapper>
  );
}
