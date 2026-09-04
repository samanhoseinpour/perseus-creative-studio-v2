'use client';

import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import { LuExternalLink, LuPencil, LuUnlink } from 'react-icons/lu';

import {
  editorBubble,
  editorToolButton,
} from '@/components/Admin/blogs/editor/editorBox';
import { safeHref } from '@/lib/safeHref';

type Props = {
  editor: Editor;
  onEdit: () => void;
};

/**
 * The bar that appears when the caret is inside a link: what it points at,
 * and the two things anybody wants to do with it.
 *
 * The href is shown as TEXT and opened through an anchor whose own `href` is
 * re-checked by `safeHref`. It is a link the writer typed, rendered inside our
 * dashboard, so it gets the same guard the public renderer gives it; a stored
 * document could predate a tightening of that guard.
 */
export default function LinkBubble({ editor, onEdit }: Props) {
  const href = String(editor.getAttributes('link').href ?? '');
  const safe = safeHref(href);

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="blogLinkBubble"
      shouldShow={({ editor: instance }) => instance.isActive('link')}
      options={{ placement: 'bottom', offset: 8 }}
      className={editorBubble}
    >
      <span className="max-w-56 truncate px-2 text-xs text-black/60" title={href}>
        {href || 'No address'}
      </span>
      {safe && (
        <a
          href={safe}
          target="_blank"
          rel="noreferrer noopener"
          title="Open in a new tab"
          aria-label="Open in a new tab"
          className={editorToolButton}
        >
          <LuExternalLink className="size-4" aria-hidden />
        </a>
      )}
      <button
        type="button"
        title="Edit link"
        aria-label="Edit link"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onEdit}
        className={editorToolButton}
      >
        <LuPencil className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        title="Remove link"
        aria-label="Remove link"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() =>
          editor.chain().focus().extendMarkRange('link').unsetBlogLink().run()
        }
        className={editorToolButton}
      >
        <LuUnlink className="size-4" aria-hidden />
      </button>
    </BubbleMenu>
  );
}
