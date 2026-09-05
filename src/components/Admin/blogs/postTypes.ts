import type { BlogEditorValues } from '@/lib/blogEditorFields';
import type {
  BlogPostStatus,
  BlogRevisionMarker,
  BlogRevisionReason,
} from '@/lib/blogFields';

/**
 * The serializable shapes the editor page hands to the client, kept apart from
 * the components for the reason `taxonomyTypes.ts` is: the page, the editor,
 * the two inspector panes and the dialogs all name them, and a type declared
 * inside one client entry and imported by another is a cycle waiting to be
 * written.
 *
 * EVERY IMPORT HERE IS TYPE-ONLY and must stay that way. `blogEditorFields.ts`
 * is a client-safe leaf, but the shapes it re-exports reach `@/db/schema` and
 * `@/lib/blogBody` for their jsonb payload types, and `blogBody.ts` builds the
 * whole Tiptap document schema at module scope. A type-only import is erased
 * at compile time; a value one would put ProseMirror in front of all 86
 * routes.
 *
 * Every DATE in here is already a finished string, resolved once in the
 * viewer's own zone on the server, plus the raw day key and minute the two
 * date controls edit. The browser never constructs a `Date` from a stored
 * instant: that is the `BlogPostItem` contract, and what keeps the server
 * render and the browser agreeing.
 */

/** One picker option. */
export type BlogOption = { value: string; label: string };

/** The service picker, grouped the way the services registry groups itself. */
export type BlogOptionGroup = { label: string; options: BlogOption[] };

/** Re-exported so the editor's components have one import for the shapes they
 *  render. The definition lives in the leaf beside `buildPostFields`, which is
 *  the function that turns it into a payload and the one thing about it a
 *  check script has to be able to reach. */
export type { BlogEditorValues };

/** The post as the editor opens it. */
export type BlogEditorPost = {
  id: string;
  version: number;
  status: BlogPostStatus;
  /** Whether the post has ever been live, which decides where a restore lands
   *  and whether the slug is still editable. */
  everPublished: boolean;
  /** `slugLocked(post)`, resolved on the server so the client never re-derives
   *  a rule the save door also applies. */
  slugLocked: boolean;
  /** The public path, for the snippet preview and the live link. */
  publicPath: string;
  /** "Aug 3, 2026", or empty when the post has never been published. */
  publishedLabel: string;
  /** The STUDIO_TZ day the publication date currently names, for the amend
   *  control's initial value. Empty when there is none. */
  publishedDayKey: string;
  /** "Aug 3, 2026, 9:00 AM" in the viewer's zone, or empty when unscheduled. */
  scheduledLabel: string;
  /** The scheduled instant split into the viewer's own day and minute, which
   *  is what the two schedule inputs edit. Empty and zero when unscheduled. */
  scheduleDayKey: string;
  scheduleMinutes: number;
  /** Relative "3d", for the bar. */
  updatedLabel: string;
  /** The STORED word count on the working row. Seeds the counter under the
   *  canvas; every successful save returns a fresh one. */
  wordCount: number;
  /** That count is still the IMPORTER's, so the first save will move it and
   *  the editor says so once. False for every post the editor has written to
   *  and for every post created in it. */
  wordCountIsLegacy: boolean;
  values: BlogEditorValues;
};

/**
 * One saved version, as the history screen renders it.
 *
 * Every date is already a finished STRING resolved in the viewer's own zone on
 * the server, the `BlogEditorPost` contract: the browser never turns a stored
 * instant into a `Date`, which is what keeps the server render and the
 * hydration agreeing.
 *
 * `marker` is `revisionMarker(row)` resolved on the server, so the screen
 * renders a decision rather than taking one. The snapshot is deliberately
 * absent: `listRevisions` does not select it, and a history list has no use
 * for a whole document per row.
 */
export type BlogRevisionItem = {
  id: string;
  /** Its number within this post. NOT its position in the list: numbers can
   *  have gaps, so nothing here may infer one from the other. */
  number: number;
  reason: BlogRevisionReason;
  /** The title the post carried in that version, which is what makes a
   *  headline rewrite findable. */
  title: string;
  wordCount: number;
  /** Who saved it. Null for an imported version, which had no actor, and for
   *  one whose account has since been deleted (`ON DELETE SET NULL`). */
  actorName: string | null;
  /** "Aug 3, 2026, 9:00 AM" in the viewer's zone. */
  savedLabel: string;
  /** "3d", for the same instant. */
  savedRelative: string;
  /** Which of the post's two pointers names it, if either. */
  marker: BlogRevisionMarker | null;
};
