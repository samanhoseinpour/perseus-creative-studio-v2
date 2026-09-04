import type { Editor } from '@tiptap/core';

import type { BlogBlockAction, BlogBlockDialog } from '@/lib/blogEditorBlocks';

/**
 * Apply one entry of the block vocabulary to the editor.
 *
 * ONE door, reached by the toolbar and by the `/` menu, so a block cannot
 * behave differently depending on which control added it.
 *
 * The switch is EXHAUSTIVE over `BlogBlockCommand` and `BlogBlockDialog` (the
 * `never` arms below): a name added to either union in `blogEditorBlocks.ts` is
 * a type error here rather than a menu row that quietly does nothing.
 *
 * `insert` hands the structure straight to `insertContent`, which is why those
 * templates are complete: `blogEditorBlocks.ts` explains why a bare `step`,
 * `pros` or `cons` can never be one of them.
 */
export function runBlogBlock(
  editor: Editor,
  action: BlogBlockAction,
  openDialog: (dialog: BlogBlockDialog) => void,
): void {
  if (action.kind === 'dialog') {
    openDialog(action.dialog);
    return;
  }
  if (action.kind === 'insert') {
    editor.chain().focus().insertContent(action.content).run();
    return;
  }
  const chain = editor.chain().focus();
  switch (action.command) {
    case 'heading2':
      chain.toggleHeading({ level: 2 }).run();
      return;
    case 'heading3':
      chain.toggleHeading({ level: 3 }).run();
      return;
    case 'heading4':
      chain.toggleHeading({ level: 4 }).run();
      return;
    case 'bulletList':
      chain.toggleBulletList().run();
      return;
    case 'orderedList':
      chain.toggleOrderedList().run();
      return;
    case 'blockquote':
      chain.toggleBlockquote().run();
      return;
    case 'codeBlock':
      chain.toggleCodeBlock().run();
      return;
    case 'table':
      // TableKit's own builder, never a hand-written template: the cells carry
      // attributes (`colwidth`, `align`) the zod layer knows about, and a
      // second definition of a table is a second thing to keep in step.
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      return;
    default: {
      const unreachable: never = action.command;
      throw new Error(`runBlogBlock: no case for ${String(unreachable)}`);
    }
  }
}
