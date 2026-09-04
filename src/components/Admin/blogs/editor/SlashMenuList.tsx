'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';

import {
  editorMenuItem,
  editorMenuItemActive,
  editorPopover,
} from '@/components/Admin/blogs/editor/editorBox';
import type { BlogBlockItem } from '@/lib/blogEditorBlocks';
import { cn } from '@/lib/utils';

export type SlashMenuHandle = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

type Props = {
  items: BlogBlockItem[];
  command: (item: BlogBlockItem) => void;
};

/**
 * The list the `/` menu shows. Rendered by the suggestion plugin through
 * `ReactRenderer`, positioned by the plugin's own `mount`.
 *
 * KEYBOARD OWNS THE HIGHLIGHT. The arrow keys move `active`, and a row is
 * highlighted by index rather than by `:hover`, because a mouse resting where
 * the list happened to open would otherwise out-rank the arrow keys and the
 * writer would commit a block they never looked at. `onMouseEnter` moves the
 * index too, so the mouse still works; it just does not win by standing still.
 *
 * The handle is what the plugin calls on every keystroke: returning `true`
 * swallows the key, so Enter picks a block instead of splitting a paragraph.
 */
const SlashMenuList = forwardRef<SlashMenuHandle, Props>(function SlashMenuList(
  { items, command },
  ref,
) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // A narrowed query can leave the index past the end of the list. Reset on
  // every change of the item set rather than clamping on read, so the first
  // row is what Enter takes after typing.
  useEffect(() => {
    setActive(0);
  }, [items]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (items.length === 0) return false;
      if (event.key === 'ArrowUp') {
        setActive((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setActive((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = items[active];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className={editorPopover}>
        <p className="px-3 py-2.5 text-xs text-black/50">No block matches that.</p>
      </div>
    );
  }

  return (
    <div className={editorPopover}>
      <div ref={listRef} className="overflow-y-auto overscroll-contain p-1.5">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            data-index={index}
            className={cn(editorMenuItem, index === active && editorMenuItemActive)}
            onMouseEnter={() => setActive(index)}
            onClick={() => command(item)}
          >
            <span className="text-sm font-medium text-black">{item.label}</span>
            <span className="text-xs text-black/55">{item.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

export default SlashMenuList;
