'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';

import EditorToolbar from '@/components/Admin/blogs/editor/EditorToolbar';
import EmbedDialog, {
  type EmbedKind,
  type EmbedValue,
} from '@/components/Admin/blogs/editor/EmbedDialog';
import FigureDialog, {
  type FigureValue,
} from '@/components/Admin/blogs/editor/FigureDialog';
import LinkBubble from '@/components/Admin/blogs/editor/LinkBubble';
import LinkDialog, { type LinkDraft } from '@/components/Admin/blogs/editor/LinkDialog';
import SlashMenuList, {
  type SlashMenuHandle,
} from '@/components/Admin/blogs/editor/SlashMenuList';
import TableBubble from '@/components/Admin/blogs/editor/TableBubble';
import { runBlogBlock } from '@/components/Admin/blogs/editor/blockRun';
import {
  editorCanvas,
  editorShell,
} from '@/components/Admin/blogs/editor/editorBox';
import { BLOG_NODE_VIEWS } from '@/components/Admin/blogs/editor/nodeviews';
import { ARTICLE_BODY_CLASS } from '@/lib/articleBodyClass';
import type { BlogDoc } from '@/lib/blogBody';
import {
  figureBlock,
  filterBlogBlocks,
  instagramBlock,
  youtubeBlock,
  type BlogBlockDialog,
  type BlogBlockItem,
} from '@/lib/blogEditorBlocks';
import {
  BLOG_EDITOR_EXTENSIONS,
  BLOG_LINK_REQUEST_EVENT,
  BlogSlashMenu,
  overrideByName,
} from '@/lib/blogEditorExtensions';
import { safeHref } from '@/lib/safeHref';
import { cn } from '@/lib/utils';

type Props = {
  /** The post the body belongs to. Body images are stored under it. */
  postId: string;
  /** The stored body. Read ONCE, on mount: this editor owns the document from
   *  then on, and re-seeding it from a prop would fight the writer's caret on
   *  every autosave response. */
  doc: BlogDoc;
  onChange: (doc: BlogDoc) => void;
  editable?: boolean;
};

/**
 * The writing surface.
 *
 * NEVER IMPORT THIS DIRECTLY. `BodyEditorLazy` is the one door, and it is a
 * `dynamic(..., { ssr: false })` import: Turbopack merges every EAGERLY
 * referenced client module into one shared chunk group that every route loads,
 * so a static import anywhere would put ProseMirror in every admin page's
 * bundle.
 *
 * The extension list comes from `@/lib/blogEditorExtensions` through
 * `overrideByName`, which cannot add or rename an entry. That is what makes
 * the schema-identity assertion in `scripts/check-blogs.mts` an assertion about
 * THIS editor rather than about a list nobody mounts: the schema it checks is
 * built from the same array, and the only thing configured here is the `/`
 * menu's React renderer, which adds no node and no mark.
 *
 * `ARTICLE_BODY_CLASS` lands on the ProseMirror root itself, through
 * `editorProps.attributes.class`, because its selectors are direct-child
 * (`[&>h2]`, `[&>ul]`): on a wrapper div none of them would match.
 */
export default function BodyEditor({ postId, doc, onChange, editable = true }: Props) {
  const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null);
  const [embed, setEmbed] = useState<EmbedKind | null>(null);
  const [figureOpen, setFigureOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  // Stable by construction: its whole body is state SETTERS, which React keeps
  // identical for the life of the component. That is what lets the extension
  // list below depend on it and still be built exactly once, without a ref
  // read during render.
  const openDialog = useCallback((dialog: BlogBlockDialog) => {
    if (dialog === 'image') setFigureOpen(true);
    else setEmbed(dialog);
  }, []);

  const extensions = useMemo(
    () =>
      overrideByName(BLOG_EDITOR_EXTENSIONS, {
        // The eight custom nodes, drawn as themselves. Each rides an
        // `.extend({ addNodeView })` of the entry already in the list, never a
        // second extension with the same name, and `addNodeView` never reaches
        // the node spec, so the schema-identity assertion still holds.
        ...BLOG_NODE_VIEWS,
        blogSlashMenu: (extension) =>
          (extension as typeof BlogSlashMenu).configure({
            suggestion: {
              items: ({ query }) => filterBlogBlocks(query),
              command: ({ editor, range, props }) => {
                // Delete the typed `/query` FIRST and as its own transaction,
                // so the block lands where the slash was rather than after it.
                editor.chain().focus().deleteRange(range).run();
                runBlogBlock(editor, props.action, openDialog);
              },
              render: () => {
                let component: ReactRenderer<SlashMenuHandle> | null = null;
                let unmount: (() => void) | null = null;
                return {
                  onStart: (props: SuggestionProps<BlogBlockItem, BlogBlockItem>) => {
                    component = new ReactRenderer(SlashMenuList, {
                      props: { items: props.items, command: props.command },
                      editor: props.editor,
                    });
                    unmount = props.mount(component.element as HTMLElement);
                  },
                  onUpdate: (props: SuggestionProps<BlogBlockItem, BlogBlockItem>) => {
                    component?.updateProps({
                      items: props.items,
                      command: props.command,
                    });
                  },
                  onKeyDown: (props: SuggestionKeyDownProps) => {
                    if (props.event.key === 'Escape') {
                      unmount?.();
                      unmount = null;
                      return false;
                    }
                    return component?.ref?.onKeyDown(props) ?? false;
                  },
                  onExit: () => {
                    unmount?.();
                    unmount = null;
                    component?.destroy();
                    component = null;
                  },
                };
              },
            },
          }),
      }),
    [openDialog],
  );

  const editor = useEditor({
    extensions,
    // Read once. `doc` is the mount-time value on purpose (see the prop docs).
    content: doc,
    editable,
    // The dynamic import is `ssr: false`, so this only ever mounts in a
    // browser; `false` keeps the first paint out of the render pass anyway,
    // which is what Tiptap asks for in any React 18+ tree.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          ARTICLE_BODY_CLASS,
          'min-h-[40vh] focus:outline-none [&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-black/30',
        ),
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getJSON() as BlogDoc);
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  // Mod-k is bound on the link mark itself and fires this event on the
  // ProseMirror root, which bubbles here. Joining the shortcut to the dialog
  // by an event rather than an import is what keeps the extension leaf
  // React-free (the `perseus:admin-search-open` shape).
  const requestLink = useCallback(() => {
    if (!editor) return;
    const { state } = editor;
    const editing = editor.isActive('link');
    setLinkDraft({
      href: editing ? String(editor.getAttributes('link').href ?? '') : '',
      needsText: state.selection.empty && !editing,
      editing,
    });
  }, [editor]);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;
    const handler = () => requestLink();
    node.addEventListener(BLOG_LINK_REQUEST_EVENT, handler);
    return () => node.removeEventListener(BLOG_LINK_REQUEST_EVENT, handler);
  }, [requestLink]);

  /**
   * The ONE place this component turns an href into a mark, both branches.
   *
   * `setBlogLink` refuses an href `safeHref` does not accept, and it is what
   * both branches apply the mark with. The explicit gate on the way in is not
   * redundant: `chain().run()` DISPATCHES its transaction even when a command
   * in it returned false, so on the insert branch a refused href would still
   * leave the words in the document. Refusing before anything is written is
   * the only version where a bad href changes nothing at all.
   */
  function applyLink(href: string, text: string | null) {
    if (!editor) return;
    if (safeHref(href) === null) return;
    if (text !== null) {
      // Nothing was selected, so there is no text to wrap. Insert the wording
      // the writer gave as a bare text NODE (a string would be parsed as HTML,
      // so "a < b" would not survive), select it, and mark it through the same
      // command the other branch uses. Then collapse to the end.
      const { from } = editor.state.selection;
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text })
        .setTextSelection({ from, to: from + text.length })
        .setBlogLink(href)
        .setTextSelection(from + text.length)
        .run();
    } else {
      // `extendMarkRange` is what makes editing an existing link replace the
      // WHOLE link rather than the few characters the caret happens to sit in.
      editor.chain().focus().extendMarkRange('link').setBlogLink(href).run();
    }
    setLinkDraft(null);
  }

  // The three dialog-built blocks go through the SAME vocabulary the `/` menu
  // and the toolbar use, so the check script's "every insertable structure is
  // a document the validator accepts" covers all fourteen entries rather than
  // the eleven whose JSON happened to be written as a constant.
  function insertEmbed(value: EmbedValue) {
    if (!editor) return;
    const content: JSONContent =
      value.kind === 'youtube'
        ? youtubeBlock({ id: value.id, external: value.external })
        : instagramBlock({ id: value.id, type: value.type });
    editor.chain().focus().insertContent(content).run();
    setEmbed(null);
  }

  function insertFigure(value: FigureValue) {
    if (!editor) return;
    editor.chain().focus().insertContent(figureBlock(value)).run();
    setFigureOpen(false);
  }

  return (
    <div ref={shellRef} className={editorShell}>
      {editor && (
        <EditorToolbar
          editor={editor}
          onRequestLink={requestLink}
          onOpenDialog={openDialog}
          disabled={!editable}
        />
      )}
      <div className={editorCanvas}>
        <EditorContent editor={editor} />
      </div>
      {editor && (
        <>
          <LinkBubble editor={editor} onEdit={requestLink} />
          <TableBubble editor={editor} />
        </>
      )}
      <LinkDialog
        draft={linkDraft}
        onClose={() => setLinkDraft(null)}
        onApply={applyLink}
        onRemove={() => {
          editor?.chain().focus().extendMarkRange('link').unsetBlogLink().run();
          setLinkDraft(null);
        }}
      />
      <EmbedDialog kind={embed} onClose={() => setEmbed(null)} onInsert={insertEmbed} />
      <FigureDialog
        postId={postId}
        open={figureOpen}
        onClose={() => setFigureOpen(false)}
        onInsert={insertFigure}
      />
    </div>
  );
}
