'use client';

import { LuPlay } from 'react-icons/lu';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';

import {
  editorNodeBar,
  editorNodeLabel,
  editorNodeNote,
  editorNodeShell,
  editorNodeWell,
} from '@/components/Admin/blogs/editor/editorBox';

/**
 * The `youtube` node, drawn as the still half of the click-to-load facade the
 * published page renders.
 *
 * It does not play, on purpose: inside the canvas a click has to select the
 * block, and a writer opening the article is editing rather than watching. The
 * poster frame plus the id is enough to say which video this is.
 *
 * THE OWNERSHIP TOGGLE IS THE REASON THIS NODE VIEW EXISTS AT ALL. `external`
 * decides whether the public page emits a VideoObject claiming the video as
 * ours, and a hidden default silently mis-attributes somebody else's upload.
 * The insert dialog asks the question once; without this the answer could
 * never be corrected afterwards, and it is the one attribute here whose wrong
 * value is invisible on both the editor and the page.
 *
 * The wording matches `EmbedDialog` exactly, because it is the same question.
 */
export default function YoutubeNodeView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const attrs = node.attrs as { id: string | null; title: string | null; external: boolean };
  const id = attrs.id ?? '';
  const ours = attrs.external === false;

  return (
    <NodeViewWrapper className={editorNodeShell}>
      <div className={editorNodeBar} contentEditable={false}>
        <span className={editorNodeLabel}>YouTube</span>
        <span className="truncate font-mono text-xs text-black/45">{id}</span>
        <label className="ml-auto flex items-center gap-2 text-xs text-black/70">
          <input
            type="checkbox"
            checked={ours}
            disabled={!editor.isEditable}
            onChange={(event) => updateAttributes({ external: !event.target.checked })}
            className="size-3.5 shrink-0 accent-black"
          />
          On the Perseus channel
        </label>
      </div>

      <div className={editorNodeWell} contentEditable={false}>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          {id && (
            // YouTube's own poster frame: a third-party asset, outside the
            // self-hosted image pipeline, exactly as `components/YouTube.tsx`
            // treats it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
          <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white">
            <LuPlay className="h-4 w-4 translate-x-px fill-current" aria-hidden="true" />
          </span>
        </div>
      </div>

      <p className={editorNodeNote}>
        {ours
          ? 'Marked as ours, so the post claims to be this video’s home page.'
          : 'Not marked as ours, so the post makes no claim about the video.'}
      </p>
    </NodeViewWrapper>
  );
}
