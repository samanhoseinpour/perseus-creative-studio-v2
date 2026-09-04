'use client';

import { FaInstagram } from 'react-icons/fa';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';

import {
  editorNodeBar,
  editorNodeLabel,
  editorNodeNote,
  editorNodeShell,
} from '@/components/Admin/blogs/editor/editorBox';

const KIND_LABELS: Record<string, string> = { p: 'Post', reel: 'Reel', tv: 'IGTV' };

/**
 * The `instagram` node, drawn as a placeholder card.
 *
 * A placeholder rather than the real embed, and the reason is not laziness:
 * Instagram's embed is a cross-origin iframe that loads its own script, sizes
 * itself, and cannot be restyled, so putting one in the canvas would drop a
 * moving third-party frame in the middle of the writer's article and make the
 * page around it jump while they type. What a writer needs here is to know
 * which post this is, which the id and the kind say.
 *
 * Read-only on purpose. Every attribute a writer would change is collected by
 * the insert dialog, and `caption` is a display choice nothing in this
 * programme offers yet: adding a control for it here would be the first place
 * it is settable, which is a decision rather than a node view.
 */
export default function InstagramNodeView({ node }: ReactNodeViewProps) {
  const attrs = node.attrs as { id: string | null; type: string };
  const id = attrs.id ?? '';
  const kind = attrs.type ?? 'p';
  const label = KIND_LABELS[kind] ?? kind;

  return (
    <NodeViewWrapper className={editorNodeShell}>
      <div className={editorNodeBar} contentEditable={false}>
        <span className={editorNodeLabel}>Instagram</span>
        <span className={editorNodeLabel}>{label}</span>
        <span className="ml-auto truncate font-mono text-xs text-black/45">{id}</span>
      </div>

      <div
        className="flex items-center gap-3 px-3 py-5"
        contentEditable={false}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-black/12 text-black/50">
          <FaInstagram className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 text-sm text-black/70">
          The embed loads on the published post.
        </span>
      </div>

      {id && (
        <p className={editorNodeNote}>
          <a
            href={`https://www.instagram.com/${kind}/${encodeURIComponent(id)}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Open on Instagram
          </a>
        </p>
      )}
    </NodeViewWrapper>
  );
}
