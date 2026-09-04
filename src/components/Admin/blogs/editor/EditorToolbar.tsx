'use client';

import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import type { IconType } from 'react-icons';
import {
  LuBold,
  LuCode,
  LuHeading2,
  LuHeading3,
  LuHeading4,
  LuImage,
  LuInstagram,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuMinus,
  LuQuote,
  LuRedo,
  LuScale,
  LuStrikethrough,
  LuTable,
  LuUnderline,
  LuUndo,
  LuYoutube,
} from 'react-icons/lu';

import {
  editorToolButton,
  editorToolDivider,
  editorToolbar,
} from '@/components/Admin/blogs/editor/editorBox';
import { runBlogBlock } from '@/components/Admin/blogs/editor/blockRun';
import { BLOG_BLOCK_ITEMS, type BlogBlockDialog } from '@/lib/blogEditorBlocks';
import { cn } from '@/lib/utils';

/** The items the toolbar shows, by id, in the order it shows them. Everything
 *  here is one of `BLOG_BLOCK_ITEMS`, so a button and its `/` menu row can
 *  never do two different things, and a block can never exist in the toolbar
 *  alone with no vocabulary entry behind it. */
const TOOL_BLOCKS: { id: string; icon: IconType }[] = [
  { id: 'heading2', icon: LuHeading2 },
  { id: 'heading3', icon: LuHeading3 },
  { id: 'heading4', icon: LuHeading4 },
  { id: 'bulletList', icon: LuList },
  { id: 'orderedList', icon: LuListOrdered },
  { id: 'blockquote', icon: LuQuote },
  { id: 'codeBlock', icon: LuCode },
  { id: 'table', icon: LuTable },
  { id: 'horizontalRule', icon: LuMinus },
  { id: 'image', icon: LuImage },
  { id: 'youtube', icon: LuYoutube },
  { id: 'instagram', icon: LuInstagram },
  { id: 'howTo', icon: LuListOrdered },
  { id: 'prosCons', icon: LuScale },
];

/** Which editor state each block button reads its pressed state from. A block
 *  that only ever ADDS something (a divider, an embed, a how-to) has no
 *  pressed state at all, which is the honest answer: it is not a toggle. */
const ACTIVE_FOR: Record<string, [string, Record<string, unknown>?]> = {
  heading2: ['heading', { level: 2 }],
  heading3: ['heading', { level: 3 }],
  heading4: ['heading', { level: 4 }],
  bulletList: ['bulletList'],
  orderedList: ['orderedList'],
  blockquote: ['blockquote'],
  codeBlock: ['codeBlock'],
};

type Props = {
  editor: Editor;
  onRequestLink: () => void;
  onOpenDialog: (dialog: BlogBlockDialog) => void;
  disabled?: boolean;
};

/**
 * The toolbar above the canvas.
 *
 * It reads through `useEditorState` rather than re-rendering on every
 * transaction: the selector returns a flat record of booleans, so a keystroke
 * inside a paragraph re-renders nothing while a move into a heading does.
 *
 * Every control is a `button` with `aria-pressed`, so the accessible state and
 * the styling come from the same attribute and cannot disagree.
 */
export default function EditorToolbar({
  editor,
  onRequestLink,
  onOpenDialog,
  disabled = false,
}: Props) {
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive('bold'),
      italic: instance.isActive('italic'),
      underline: instance.isActive('underline'),
      strike: instance.isActive('strike'),
      code: instance.isActive('code'),
      link: instance.isActive('link'),
      blocks: Object.fromEntries(
        Object.entries(ACTIVE_FOR).map(([id, [name, attrs]]) => [
          id,
          instance.isActive(name, attrs),
        ]),
      ) as Record<string, boolean>,
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
    }),
  });

  const mark = (
    label: string,
    icon: IconType,
    active: boolean,
    run: () => void,
  ) => (
    <ToolButton label={label} icon={icon} pressed={active} disabled={disabled} onClick={run} />
  );

  return (
    <div className={editorToolbar} role="toolbar" aria-label="Formatting">
      {mark('Bold', LuBold, state.bold, () => editor.chain().focus().toggleBold().run())}
      {mark('Italic', LuItalic, state.italic, () =>
        editor.chain().focus().toggleItalic().run(),
      )}
      {mark('Underline', LuUnderline, state.underline, () =>
        editor.chain().focus().toggleUnderline().run(),
      )}
      {mark('Strikethrough', LuStrikethrough, state.strike, () =>
        editor.chain().focus().toggleStrike().run(),
      )}
      {mark('Inline code', LuCode, state.code, () =>
        editor.chain().focus().toggleCode().run(),
      )}
      <span className={editorToolDivider} />
      <ToolButton
        label="Link"
        icon={LuLink}
        pressed={state.link}
        disabled={disabled}
        onClick={onRequestLink}
      />
      <span className={editorToolDivider} />
      {TOOL_BLOCKS.map(({ id, icon }) => {
        const item = BLOG_BLOCK_ITEMS.find((entry) => entry.id === id);
        if (!item) return null;
        return (
          <ToolButton
            key={id}
            label={item.label}
            icon={icon}
            pressed={state.blocks[id] ?? false}
            disabled={disabled}
            onClick={() => runBlogBlock(editor, item.action, onOpenDialog)}
          />
        );
      })}
      <span className={editorToolDivider} />
      <ToolButton
        label="Undo"
        icon={LuUndo}
        disabled={disabled || !state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolButton
        label="Redo"
        icon={LuRedo}
        disabled={disabled || !state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      />
    </div>
  );
}

function ToolButton({
  label,
  icon: Icon,
  pressed,
  disabled,
  onClick,
}: {
  label: string;
  icon: IconType;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // Omitted rather than `false` on the controls that are not toggles: a
      // divider is not "not pressed", it has no pressed state at all.
      aria-pressed={pressed === undefined ? undefined : pressed}
      disabled={disabled}
      // The toolbar sits outside the contenteditable, so a plain click blurs
      // it and ProseMirror loses the selection before the command runs. Every
      // command re-focuses, but the SELECTION has to survive the mousedown.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(editorToolButton)}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
