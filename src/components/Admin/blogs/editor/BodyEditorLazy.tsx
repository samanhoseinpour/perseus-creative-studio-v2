'use client';

import dynamic from 'next/dynamic';

import {
  editorCanvas,
  editorShell,
  editorSkeletonLine,
  editorSkeletonToolbar,
  editorToolbar,
} from '@/components/Admin/blogs/editor/editorBox';
import { cn } from '@/lib/utils';

/**
 * The ONE door onto the body editor.
 *
 * `ssr: false` is right here and is NOT the marketing side's keep-SSR pattern:
 * `useEditor` refuses to render on the server unless `immediatelyRender` is
 * false, so a server pass would emit nothing while still risking a hydration
 * mismatch against whatever ProseMirror builds in the browser. An `ssr: false`
 * dynamic import is also illegal inside a Server Component, which is why this
 * wrapper carries `'use client'` and the page mounts the wrapper.
 *
 * Nothing may import `BodyEditor` eagerly. Turbopack merges every eagerly
 * referenced client module into one shared chunk group that every route loads,
 * so one stray static import would put ProseMirror on every admin page. The
 * check is `rg -l "prosemirror-view" .next/static/chunks/` after a build: it
 * must name an async chunk and never the shared one.
 */
const BodyEditor = dynamic(() => import('@/components/Admin/blogs/editor/BodyEditor'), {
  ssr: false,
  loading: () => <BodyEditorSkeleton />,
});

export default BodyEditor;

/**
 * Roughly the prose column, at the toolbar's real height, so the canvas does
 * not jump when the editor arrives. Every box is IMPORTED from `editorBox.ts`
 * rather than copied, for the reason `Admin/blogs/listBox.ts` gives: five
 * hand-copied class strings are how a skeleton drifts. `BlogEditorSkeleton`
 * draws the same two while the page itself loads, off the same tokens.
 */
const Line = ({ className }: { className: string }) => (
  <span className="text-md">
    <span
      className={cn(editorSkeletonLine, className)}
    />
  </span>
);

function BodyEditorSkeleton() {
  return (
    <div className={editorShell} aria-hidden>
      <div className={editorToolbar}>
        <div className={editorSkeletonToolbar} />
      </div>
      <div className={editorCanvas}>
        <div className="flex flex-col gap-4">
          <Line className="h-4 w-2/3" />
          <Line className="w-full" />
          <Line className="w-full" />
          <Line className="w-5/6" />
          <Line className="w-full" />
          <Line className="w-3/4" />
        </div>
      </div>
    </div>
  );
}
