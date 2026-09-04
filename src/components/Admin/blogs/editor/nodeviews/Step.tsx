'use client';

import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';

import {
  editorNodeInput,
  editorNodeProblem,
} from '@/components/Admin/blogs/editor/editorBox';

/**
 * One `step` inside a how-to.
 *
 * `step` has NO `group` in the schema: it is reachable only by name from
 * `howTo`, so there is no control here that creates one. A step arrives with
 * the how-to block and leaves with it, or by editing the list around it.
 *
 * Its outer element is an `<li>` (the `as` option in `nodeviews/index.ts`), so
 * the numeral comes from the parent `<ol>`. The title is an input rather than
 * editable content because it is an ATTRIBUTE, not a child: the schema's
 * content list for a step holds paragraphs, lists, quotes and figures, and
 * making the title a paragraph would put it in the step's body and out of the
 * structured data the published page emits.
 *
 * The empty-title warning is not decoration either. `step.title` is
 * `shortText.min(1)` in the zod layer, so an untitled step makes the WHOLE
 * document refuse to save, and the error would name a node rather than a
 * place on screen. Saying so here is the only cheap moment.
 */
export default function StepNodeView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const attrs = node.attrs as { title: string };
  const title = attrs.title ?? '';

  return (
    <NodeViewWrapper className="py-2">
      <input
        className={`${editorNodeInput} w-full font-semibold`}
        value={title}
        maxLength={300}
        disabled={!editor.isEditable}
        placeholder="Name this step"
        aria-label="Step title"
        contentEditable={false}
        onChange={(event) => updateAttributes({ title: event.target.value })}
      />
      {title.trim() === '' && (
        <p className={editorNodeProblem}>Every step needs a name before the post can be saved.</p>
      )}
      <NodeViewContent className="[&_p]:my-1.5 [&_p]:text-sm [&_p]:text-black/80" />
    </NodeViewWrapper>
  );
}
