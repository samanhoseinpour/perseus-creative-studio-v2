'use client';

import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';

import {
  editorNodeBar,
  editorNodeInput,
  editorNodeLabel,
  editorNodeShell,
} from '@/components/Admin/blogs/editor/editorBox';

/**
 * The `prosCons` node: two columns, upsides and downsides.
 *
 * The grid rules are the ones `Mdx/ProsCons` draws, restated rather than
 * imported: that component is a server component which reads its React
 * children to find the `Pros` and `Cons` elements, and a node view has no
 * React children at all. Its children are ProseMirror's contentDOM, which
 * arrives through `NodeViewContent` and holds whichever of the two columns the
 * document carries (the schema is `pros? cons?`, so one alone is legal).
 */
export default function ProsConsNodeView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const attrs = node.attrs as { title: string | null };

  return (
    <NodeViewWrapper className={editorNodeShell}>
      <div className={editorNodeBar} contentEditable={false}>
        <span className={editorNodeLabel}>Pros and cons</span>
        <input
          className={editorNodeInput}
          value={attrs.title ?? ''}
          maxLength={300}
          disabled={!editor.isEditable}
          placeholder="Name what is being weighed (optional)"
          aria-label="Title for the pros and cons"
          onChange={(event) => updateAttributes({ title: event.target.value })}
          onBlur={(event) => {
            // Coerced on BLUR, never on a keystroke, which is the rule
            // `Figure.tsx` states in full. Trimming inside `onChange` makes a
            // LEADING SPACE impossible: the first space trims to empty,
            // becomes null, and the controlled input swallows it.
            const next = event.target.value.trim();
            updateAttributes({ title: next === '' ? null : next });
          }}
        />
      </div>

      <NodeViewContent className="grid sm:grid-cols-2 max-sm:[&>*+*]:border-t sm:[&>*+*]:border-l [&>*+*]:border-black/10" />
    </NodeViewWrapper>
  );
}
