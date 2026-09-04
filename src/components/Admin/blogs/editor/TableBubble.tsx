'use client';

import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';

import {
  editorBubble,
  editorToolButton,
  editorToolDivider,
} from '@/components/Admin/blogs/editor/editorBox';

type Props = { editor: Editor };

/**
 * The bar for table cells. A table is the one block in this vocabulary whose
 * shape is edited after it exists, and none of these moves has a keyboard
 * gesture worth remembering.
 *
 * Text labels rather than glyphs: "add a row above" and "add a row below" are
 * two icons nobody can tell apart at 16px, and the bar only shows while the
 * caret is in a cell, so it costs no permanent width.
 */
export default function TableBubble({ editor }: Props) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="blogTableBubble"
      shouldShow={({ editor: instance }) =>
        instance.isActive('tableCell') || instance.isActive('tableHeader')
      }
      options={{ placement: 'top', offset: 8 }}
      className={editorBubble}
    >
      <Action label="Row above" onClick={() => editor.chain().focus().addRowBefore().run()} />
      <Action label="Row below" onClick={() => editor.chain().focus().addRowAfter().run()} />
      <Action label="Delete row" onClick={() => editor.chain().focus().deleteRow().run()} />
      <span className={editorToolDivider} />
      <Action
        label="Column left"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
      />
      <Action
        label="Column right"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      />
      <Action
        label="Delete column"
        onClick={() => editor.chain().focus().deleteColumn().run()}
      />
      <span className={editorToolDivider} />
      <Action
        label="Header row"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
      />
      <Action
        label="Delete table"
        onClick={() => editor.chain().focus().deleteTable().run()}
      />
    </BubbleMenu>
  );
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={editorToolButton}
    >
      {label}
    </button>
  );
}
