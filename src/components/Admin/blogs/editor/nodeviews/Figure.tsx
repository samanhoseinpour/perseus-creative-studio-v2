'use client';

import { useId, useState } from 'react';
import { Popover } from 'radix-ui';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';

import { MediaImage } from '@/components/ProjectMediaImage';
import {
  editorNodeBar,
  editorNodeField,
  editorNodeFieldLabel,
  editorNodeLabel,
  editorNodeNote,
  editorNodePanel,
  editorNodeProblem,
  editorNodeShell,
  editorNodeWell,
  editorToolButton,
} from '@/components/Admin/blogs/editor/editorBox';
import type { BlogMedia } from '@/db/schema';

type StaticImage = { type: 'static'; src: string };
type MediaImageSource = { type: 'media' } & BlogMedia;
type FigureImage = StaticImage | MediaImageSource | null;

const SIZES = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'default', label: 'Default' },
  { value: 'wide', label: 'Wide' },
] as const;

/**
 * The `figure` node, drawn as itself.
 *
 * An ATOM, so this is a plain rendering plus a controls popover rather than an
 * editable region: there is no text inside a figure for a caret to enter, and
 * ProseMirror gives an atom's node view `contenteditable="false"` on its own.
 *
 * THE IMAGE BRANCHES ON ITS OWN `type` AND MUST. An uploaded image is a set of
 * public Blob rungs, and `Img`'s `resolveImageSrc` placeholders anything
 * outside `/images/`, so routing a Blob URL through it would show the Perseus
 * wordmark where the writer's photograph should be. `MediaImage` is the
 * dynamic-content twin that exists for exactly that. A `/images/...` path goes
 * to a plain `<img>` instead: `Img` is `server-only` (it reads the generated
 * blur map) and `ImgClient` wants a blur value this node has never carried.
 *
 * The controls edit alt, caption, credit and size and NOTHING ELSE. `image` is
 * not offered: replacing the picture is a new upload, which is the insert
 * dialog's job, and an editable image object is exactly the shape that turns
 * into "[object Object]" the moment anyone forgets it is not a string.
 */
export default function FigureNodeView(props: ReactNodeViewProps) {
  const { node, updateAttributes, editor } = props;
  const [open, setOpen] = useState(false);
  const altId = useId();
  const captionId = useId();
  const creditId = useId();

  const attrs = node.attrs as {
    image: FigureImage;
    alt: string;
    caption: string | null;
    credit: string | null;
    size: string;
  };
  const image = attrs.image;
  const alt = attrs.alt ?? '';

  /**
   * Commit an optional text field, on BLUR rather than on every keystroke.
   *
   * Coercing `'' -> null` while the writer types makes a leading space
   * impossible: the first space trims to empty, becomes null, and the
   * controlled input swallows it, so "  Two operators" can never be typed and
   * the field feels broken. Trimming at the commit point is also what
   * `FigureDialog` does when it inserts the figure, so the two doors agree on
   * what an empty caption is.
   */
  const commitText = (key: 'caption' | 'credit' | 'alt') => (value: string) => {
    const next = value.trim();
    updateAttributes({ [key]: key === 'alt' ? next : next === '' ? null : next });
  };

  return (
    <NodeViewWrapper className={editorNodeShell}>
      <div className={editorNodeBar} contentEditable={false}>
        <span className={editorNodeLabel}>Image</span>
        <span className="ml-auto flex items-center gap-1">
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger className={editorToolButton} disabled={!editor.isEditable}>
              Edit
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                sideOffset={6}
                align="end"
                className={editorNodePanel}
                onOpenAutoFocus={(event) => {
                  // Radix focuses the panel itself; send the caret to the one
                  // field that has to be filled instead.
                  event.preventDefault();
                  document.getElementById(altId)?.focus();
                }}
              >
                <div className="flex flex-col gap-1">
                  <label className={editorNodeFieldLabel} htmlFor={altId}>
                    Describe the image
                  </label>
                  <input
                    id={altId}
                    className={editorNodeField}
                    value={alt}
                    maxLength={300}
                    placeholder="Two camera operators on a Vancouver street"
                    onChange={(event) => updateAttributes({ alt: event.target.value })}
                    onBlur={(event) => commitText('alt')(event.target.value)}
                  />
                  <p className="text-[11px] text-black/50">
                    Read by screen readers and search engines. Required.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className={editorNodeFieldLabel} htmlFor={captionId}>
                    Caption
                  </label>
                  <input
                    id={captionId}
                    className={editorNodeField}
                    value={attrs.caption ?? ''}
                    maxLength={2000}
                    placeholder="Shown under the image"
                    onChange={(event) => updateAttributes({ caption: event.target.value })}
                    onBlur={(event) => commitText('caption')(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className={editorNodeFieldLabel} htmlFor={creditId}>
                    Credit
                  </label>
                  <input
                    id={creditId}
                    className={editorNodeField}
                    value={attrs.credit ?? ''}
                    maxLength={2000}
                    placeholder="Who took it"
                    onChange={(event) => updateAttributes({ credit: event.target.value })}
                    onBlur={(event) => commitText('credit')(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className={editorNodeFieldLabel}>Width</span>
                  <div className="flex items-center gap-1">
                    {SIZES.map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        className={editorToolButton}
                        aria-pressed={(attrs.size ?? 'default') === size.value}
                        onClick={() => updateAttributes({ size: size.value })}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </span>
      </div>

      {image === null ? (
        <p className={editorNodeProblem}>
          This image has nothing to show. Delete the block and add the picture again.
        </p>
      ) : (
        <div className={editorNodeWell} contentEditable={false}>
          {image.type === 'media' ? (
            <MediaImage
              variants={image.variants}
              alt={alt}
              blurDataUrl={image.blurDataUrl}
              sizes="(max-width: 768px) 100vw, 720px"
              className="h-auto w-full rounded-lg"
            />
          ) : (
            // A self-hosted /images asset, straight from public/. The custom
            // next/image loader only knows the pre-generated rung ladder, and
            // an editor preview has no use for one.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.src} alt={alt} className="h-auto w-full rounded-lg" />
          )}
          {(attrs.caption || attrs.credit) && (
            <p className="mt-2 text-xs text-black/60">
              {attrs.caption}
              {attrs.caption && attrs.credit ? ' ' : null}
              {attrs.credit && <span className="text-black/40">{attrs.credit}</span>}
            </p>
          )}
        </div>
      )}

      {alt.trim() === '' ? (
        <p className={editorNodeProblem}>
          Add a description before saving. Open Edit and fill in the first field.
        </p>
      ) : (
        <p className={editorNodeNote}>{alt}</p>
      )}
    </NodeViewWrapper>
  );
}
