'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import Button from '@/components/Button';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import GlassDialog from '@/components/Admin/GlassDialog';
import { GlassRim, adminLink } from '@/components/Admin/Glass';
import BodyEditorLazy from '@/components/Admin/blogs/editor/BodyEditorLazy';
import EditorTopBar from '@/components/Admin/blogs/EditorTopBar';
import HeroField, { type HeroValue } from '@/components/Admin/blogs/HeroField';
import InspectorPost from '@/components/Admin/blogs/InspectorPost';
import InspectorSeo from '@/components/Admin/blogs/InspectorSeo';
import PublishDialog, {
  AmendDateDialog,
  type PublishMode,
} from '@/components/Admin/blogs/PublishDialog';
import {
  editorCanvasColumn,
  editorLayout,
  editorRail,
  editorTitleField,
  inspectorBody,
  inspectorPanel,
  inspectorTab,
  inspectorTabStrip,
} from '@/components/Admin/blogs/postBox';
import type {
  BlogEditorPost,
  BlogEditorValues,
  BlogOption,
  BlogOptionGroup,
} from '@/components/Admin/blogs/postTypes';
import { useAutosave, type SaveOutcome } from '@/components/Admin/blogs/useAutosave';
import {
  amendPublishedDate,
  publishPost,
  restorePost,
  savePost,
  saveDraft,
  schedulePost,
  trashPost,
  unpublishPost,
  unschedulePost,
  updateSchedule,
  type BlogMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/blogPosts';
import type { BlogMedia } from '@/db/schema';
import {
  autosaveRefusalNotice,
  buildPostFields,
  describeWordCountChange,
  wordCountLine,
  inspectorPaneFor,
  nextSlug,
  nextSlugFollow,
  scheduleInstant,
  slugFollowArms,
  type BlogSaveCarries,
  type InspectorPane,
} from '@/lib/blogEditorFields';
import { publicUrlFor } from '@/lib/blogFields';
import { slugify } from '@/components/Projects/utils';
import { cn } from '@/lib/utils';

/** What a failed action says when it did not say anything itself. The same
 *  sentence the posts list and the taxonomy dialogs use. */
const TRANSPORT = 'Something went wrong. Try again.';

const CONFLICT =
  'Somebody else changed this post while you were writing. Reload the page to see their version.';

/** Which confirm is open. `null` means none. */
type Pending = 'trash' | 'restore' | 'unpublish' | 'unschedule' | null;

/** Nine in the morning: the hour a scheduled post most often wants, and a
 *  value the writer can see and change rather than a blank field. */
const DEFAULT_SCHEDULE_MINUTES = 9 * 60;

/**
 * The writing surface.
 *
 * A PAGE, NEVER A MODAL: an article is the one thing in this dashboard that is
 * worked on for an hour at a time, and everything else about the screen
 * follows from that. The article is on the left at the width it will be read
 * at; everything that is not the article is in a rail on the right, or a sheet
 * on a phone.
 *
 * WHAT THIS OWNS is the form values, and only the form values. The post's
 * STATE, its labels and its lock come from props on every render, so a
 * transition that revalidates `/admin` updates them without this component
 * knowing which door was pressed. That is also why there is no
 * `router.refresh()` anywhere: the fresh tree already rides back on the
 * action's own response, and refreshing again would be roughly ten more Neon
 * round trips for a render we have.
 *
 * NOTHING HERE IMPORTS `@/lib/blogBody` OR `@/lib/blogPostSchema`. Both reach
 * `@tiptap/core` at module scope, and Turbopack merges every eagerly
 * referenced client module into one shared chunk group that all 86 routes
 * load. The body editor and the word counter are both behind `dynamic`
 * boundaries for exactly that reason, validation is the server's (the
 * `taxonomyForm.ts` rule), and the body arrives here already canonical because
 * `BodyEditor` strips its own extension's trailing paragraph before handing it
 * up.
 */
export default function PostEditor({
  post,
  authors,
  categories,
  serviceGroups,
  tz,
  todayKey,
  canLogs,
  publicOrigin,
}: {
  post: BlogEditorPost;
  authors: BlogOption[];
  categories: BlogOption[];
  serviceGroups: BlogOptionGroup[];
  /** The writer's own zone, for the schedule control. */
  tz: string;
  /** Today in that zone, resolved on the server so the schedule field's
   *  default does not depend on a `Date` built in the browser. */
  todayKey: string;
  canLogs: boolean;
  publicOrigin: string;
}) {
  const [values, setValues] = useState<BlogEditorValues>(post.values);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pane, setPane] = useState<Exclude<InspectorPane, 'canvas'>>('post');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialog, setDialog] = useState<PublishMode | null>(null);
  const [amendOpen, setAmendOpen] = useState(false);
  // Seeded when the dialog OPENS, never once at mount: a post published during
  // this session gets its `publishedDayKey` from the render after the publish,
  // and a value captured at mount would open the field blank under a sentence
  // stating the day the post says.
  const [amendDay, setAmendDay] = useState('');
  const [confirm, setConfirm] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  // The count on the WORKING row, seeded from the column and refreshed by
  // every successful save. `wordCountLine` states what that is and is not: a
  // fact about the row rather than a prediction of it, but not the published
  // byline either, because a live post with saved-but-unpublished edits shows
  // the draft's number here and the older one on the site.
  const [words, setWords] = useState(post.wordCount);
  const [schedule, setSchedule] = useState({
    dayKey: post.scheduleDayKey || todayKey,
    minutes: post.scheduleDayKey ? post.scheduleMinutes : DEFAULT_SCHEDULE_MINUTES,
  });
  // Decided ONCE, on the row as it was opened, and only ever turned off from
  // there: `nextSlugFollow` has no path back to `armed`, and there is no
  // `setSlugFollow('armed')` anywhere in this file.
  const [slugFollow, setSlugFollow] = useState(() =>
    slugFollowArms({ slug: post.values.slug, slugLocked: post.slugLocked }),
  );

  /** The body the editor was seeded with. Read once and never updated: the
   *  editor owns the document from mount, and re-seeding it from a prop would
   *  fight the writer's caret on every autosave response. A state initializer
   *  rather than a ref, because this value IS read during render. */
  const [initialBody] = useState(post.values.body);
  /** The one-time word-count notice, which must not repeat on every save. */
  const saidWordCount = useRef(false);
  /** What the last door refused with, readable by a caller once its promise
   *  has resolved. `issues` is state and the render that scheduled the call
   *  cannot see the value set during it. */
  const lastIssues = useRef<Record<string, string>>({});
  /** The refusal sentence the screen last toasted, so a quiet autosave can
   *  announce each distinct refusal once rather than on every retry. */
  const announcedRef = useRef<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const readOnly = post.status === 'trash';

  const openAmend = () => {
    setSheetOpen(false);
    setAmendDay(post.publishedDayKey);
    setAmendOpen(true);
  };

  const fields = useMemo(() => buildPostFields(values), [values]);
  const snapshot = useMemo(() => JSON.stringify(fields), [fields]);

  /** A door's answer, as the autosave loop's four outcomes. `quiet` is the
   *  autosave path, where a refusal is already visible as "Not saved" beside
   *  the field that caused it, so it is announced once per distinct sentence
   *  (`autosaveRefusalNotice`) rather than on every retry of the timer. */
  const applyResult = useCallback(
    (res: BlogMutationResult | undefined, quiet: boolean): SaveOutcome => {
      if (!res) return { kind: 'transport' };
      if (res.ok) {
        lastIssues.current = {};
        announcedRef.current = null;
        setIssues({});
        setWords(res.wordCount);
        // Said at most once, and only on a post whose stored count is still
        // the importer's. Without that second gate the notice fires on the
        // first autosave of ANY edit to ANY post, because the previous count
        // is simply the row's count before this write.
        if (!saidWordCount.current) {
          const sentence = describeWordCountChange(
            res.previousWordCount,
            res.wordCount,
            post.wordCountIsLegacy,
          );
          if (sentence) {
            saidWordCount.current = true;
            toast(sentence, { duration: 12_000 });
          }
        }
        for (const warning of res.warnings ?? []) toast.warning(warning);
        return { kind: 'ok', version: res.version };
      }
      if (res.error === 'conflict') return { kind: 'conflict', own: false };
      if (res.error === 'validation') {
        lastIssues.current = res.issues;
        setIssues(res.issues);
        if (quiet) {
          // Quiet, not silent. The alert beside a field is enough for a field
          // the writer can see, and nothing at all for a body refusal whose
          // alert sits under five screens of article, which is how a save
          // defect shipped with the bar reading "Not saved" and no reason.
          const notice = autosaveRefusalNotice(announcedRef.current, res.issues);
          if (notice) {
            announcedRef.current = notice;
            toast.error(notice);
          }
        } else {
          const [field, message] = Object.entries(res.issues)[0] ?? [];
          if (field && field !== '_form' && field !== 'publishAt') {
            const owner = inspectorPaneFor(field);
            if (owner !== 'canvas') setPane(owner);
          }
          if (message) {
            announcedRef.current = message;
            toast.error(message);
          }
        }
        return { kind: 'refused' };
      }
      return { kind: 'refused' };
    },
    [post.wordCountIsLegacy],
  );

  const autosaveCall = useCallback(
    async (version: number): Promise<SaveOutcome> =>
      applyResult(await saveDraft({ id: post.id, version, fields }), true),
    [applyResult, fields, post.id],
  );

  const autosave = useAutosave({
    snapshot,
    initialVersion: post.version,
    save: autosaveCall,
    enabled: !readOnly,
  });

  const { run } = autosave;

  /**
   * Every explicit move goes through here, and therefore through the same
   * mutex autosave uses: `run` waits for anything already in flight before it
   * sends, so an action can never race the keystroke timer and lose to its own
   * write. An `own` conflict means it did anyway, which the mutex should make
   * unreachable; it is retried once rather than reported, because reporting a
   * conflict we caused ourselves would be a false alarm about the writer's own
   * typing.
   *
   * `carries` says whether this door sent `fields`. Four of them do; the five
   * status moves send none, and marking their success as "saved" is what lost
   * a writer's typing before `nextSavedSnapshot` existed.
   */
  const act = useCallback(
    async (
      call: (version: number) => Promise<BlogMutationResult | undefined>,
      carries: BlogSaveCarries,
      done?: string,
    ): Promise<boolean> => {
      setBusy(true);
      try {
        let outcome = await run(
          (version) => call(version).then((res) => applyResult(res, false)),
          carries,
        );
        if (outcome.kind === 'conflict' && outcome.own) {
          outcome = await run(
            (version) => call(version).then((res) => applyResult(res, false)),
            carries,
          );
        }
        if (outcome.kind === 'ok') {
          if (done) toast.success(done);
          return true;
        }
        if (outcome.kind === 'transport') toast.error(TRANSPORT);
        if (outcome.kind === 'conflict' && !outcome.own) toast.error(CONFLICT);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [applyResult, run],
  );

  function set<K extends keyof BlogEditorValues>(key: K, value: BlogEditorValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // The title box grows with its content. A textarea rather than an input so a
  // long headline wraps at the article's own measure instead of scrolling
  // sideways, which means its height has to be set by hand.
  useEffect(() => {
    const node = titleRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [values.title]);

  const hero: HeroValue = values.heroMedia
    ? { type: 'media', ...values.heroMedia }
    : values.heroStaticPath
      ? { type: 'static', src: values.heroStaticPath }
      : null;

  const canonicalUrl =
    values.canonicalOverride.trim() || `${publicOrigin}${publicUrlFor(values.slug)}`;

  const onTitleChange = (title: string) => {
    // `nextSlug` owns every reason the follow may not fire, so this handler
    // holds none of them. `post.slugLocked` comes from props, so a publish that
    // lands in another tab stops the follow in the same render that turns the
    // field read-only.
    const candidate = slugify(title);
    setValues((prev) => ({
      ...prev,
      title,
      slug: nextSlug(
        { slug: prev.slug, follow: slugFollow, slugLocked: post.slugLocked },
        candidate,
      ),
    }));
    setSlugFollow((current) => nextSlugFollow(current, 'title-edited'));
  };

  const onPrimary = () => {
    if (dialog === null) return;
    const call = (version: number) => {
      const input = { id: post.id, version, fields };
      if (dialog === 'schedule') {
        return schedulePost(input, {
          publishAt: scheduleInstant(tz, schedule.dayKey, schedule.minutes).toISOString(),
        });
      }
      if (dialog === 'reschedule') {
        return updateSchedule(input, {
          publishAt: scheduleInstant(tz, schedule.dayKey, schedule.minutes).toISOString(),
        });
      }
      return publishPost(input);
    };
    const done =
      dialog === 'schedule'
        ? 'Scheduled.'
        : dialog === 'reschedule'
          ? 'The new time is saved.'
          : dialog === 'update'
            ? 'The update is live.'
            : 'Published.';
    // Publishing fixes the address for good, so the follow is retired at the
    // same moment. `nextSlugFollow` has no path back, which is what stops a
    // later title edit rewriting a slug the door would then refuse.
    const publishes = dialog === 'publish' || dialog === 'update' || dialog === 'publish-now';
    void act(call, 'fields', done).then((ok) => {
      if (ok && publishes) setSlugFollow((current) => nextSlugFollow(current, 'published'));
      // A refusal that names a field the writer has to go and fix belongs
      // beside that field, not behind a dialog covering it. `_form` and
      // `publishAt` are the two the dialog itself renders, so those keep it
      // open.
      const elsewhere = Object.keys(lastIssues.current).some(
        (key) => key !== '_form' && key !== 'publishAt',
      );
      if (ok || elsewhere) setDialog(null);
    });
  };

  const inspector = (idPrefix: string) =>
    pane === 'post' ? (
      <InspectorPost
        idPrefix={idPrefix}
        values={values}
        set={set}
        issues={issues}
        disabled={readOnly || busy}
        slugLocked={post.slugLocked}
        authors={authors}
        categories={categories}
        serviceGroups={serviceGroups}
        onSlugEdited={() => setSlugFollow((c) => nextSlugFollow(c, 'slug-edited'))}
        publishedLabel={post.publishedLabel}
        canAmendDate={post.status === 'published'}
        onAmendDate={openAmend}
      />
    ) : (
      <InspectorSeo
        idPrefix={idPrefix}
        values={values}
        set={set}
        issues={issues}
        disabled={readOnly || busy}
        canonicalUrl={canonicalUrl}
      />
    );

  const tabs = (
    <div className={inspectorTabStrip}>
      {(['post', 'seo'] as const).map((key) => (
        <button
          key={key}
          type="button"
          aria-current={pane === key ? 'true' : undefined}
          onClick={() => setPane(key)}
          className={cn(
            inspectorTab,
            pane === key
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {key === 'post' ? 'Post' : 'SEO'}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <EditorTopBar
        post={post}
        saveState={autosave.state}
        dirty={autosave.dirty}
        blocked={autosave.blocked}
        busy={busy}
        canLogs={canLogs}
        onSave={() => {
          void act(
            (version) => savePost({ id: post.id, version, fields }),
            'fields',
            'Saved.',
          );
        }}
        onOpenDialog={setDialog}
        onAmendDate={openAmend}
        onUnschedule={() => setConfirm('unschedule')}
        onUnpublish={() => setConfirm('unpublish')}
        onTrash={() => setConfirm('trash')}
        onRestore={() => setConfirm('restore')}
        onOpenSettings={() => setSheetOpen(true)}
      />

      {autosave.blocked && (
        <div
          role="alert"
          className="mb-6 flex flex-col gap-2 rounded-2xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-foreground">
            Somebody else changed this post while you were writing. Saving has
            stopped so their work is not overwritten. Reloading shows their
            version and loses anything typed here since the last save.
          </p>
          <Button
            type="button"
            size="compact"
            variant="secondary"
            showIcon={false}
            className="shrink-0"
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </div>
      )}

      {readOnly && (
        <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-foreground/15 bg-foreground/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            This post is in the trash, so nothing here can be edited. Restore it
            to carry on writing.
          </p>
          <Button
            type="button"
            size="compact"
            variant="secondary"
            showIcon={false}
            disabled={busy}
            className="shrink-0"
            onClick={() => setConfirm('restore')}
          >
            Restore
          </Button>
        </div>
      )}

      {post.status === 'scheduled' && (
        <p className="mb-6 rounded-2xl border border-amber-600/25 bg-amber-500/[0.08] p-4 text-sm text-foreground">
          Goes live {post.scheduledLabel}. What publishes is the post as it was
          when you scheduled it, so anything written since needs the schedule
          saving again to go out with it.
        </p>
      )}

      <div className={editorLayout}>
        <div className={editorCanvasColumn}>
          <div>
            <label htmlFor="blog-title" className="sr-only">
              Title
            </label>
            <textarea
              id="blog-title"
              ref={titleRef}
              rows={1}
              value={values.title}
              placeholder="Untitled post"
              maxLength={300}
              disabled={readOnly}
              className={editorTitleField}
              onChange={(e) => onTitleChange(e.target.value)}
            />
            {issues.title && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {issues.title}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span id="blog-hero-label" className="text-xs font-medium text-foreground">
              Hero image
            </span>
            <HeroField
              postId={post.id}
              hero={hero}
              alt={values.heroAlt}
              caption={values.heroCaption}
              disabled={readOnly}
              onHeroChange={(media: BlogMedia) =>
                setValues((prev) => ({ ...prev, heroMedia: media, heroStaticPath: '' }))
              }
              onAltChange={(value) => set('heroAlt', value)}
              onCaptionChange={(value) => set('heroCaption', value)}
            />
            {issues.heroMedia && (
              <p role="alert" className="px-1 text-xs text-destructive">
                {issues.heroMedia}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <BodyEditorLazy
              postId={post.id}
              doc={initialBody}
              editable={!readOnly}
              onChange={(body) => setValues((prev) => ({ ...prev, body }))}
            />
            {issues.body && (
              <p role="alert" className="px-1 text-xs text-destructive">
                {issues.body}
              </p>
            )}
            <p className="px-1 text-xs text-muted-foreground">
              {wordCountLine(words, autosave.dirty)}
            </p>
          </div>
        </div>

        <aside className={editorRail}>
          <div className={inspectorPanel}>
            <GlassRim />
            {tabs}
            <div className={inspectorBody}>{inspector('post')}</div>
          </div>
        </aside>
      </div>

      {issues._form && (
        <p role="alert" className="mt-4 px-1 text-xs text-destructive">
          {issues._form}
        </p>
      )}

      <p className="mt-6 px-1 text-xs text-muted-foreground">
        Saves on its own as you write. Cmd+S saves right away.{' '}
        <Link href="/admin/blogs" className={cn(adminLink, 'text-muted-foreground hover:text-foreground')}>
          Back to all posts
        </Link>
      </p>

      {/* The rail's own contents, on a phone. Mounted only while open, and
          under its own id prefix, so the two copies can never share a DOM id
          and point a label at the wrong input. */}
      <GlassDialog
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        maxWidth="34rem"
        className="p-0"
        header={
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Post settings
            </h2>
            <Button
              type="button"
              size="compact"
              variant="secondary"
              showIcon={false}
              onClick={() => setSheetOpen(false)}
            >
              Done
            </Button>
          </div>
        }
      >
        {tabs}
        <div className={inspectorBody}>{inspector('sheet')}</div>
      </GlassDialog>

      <PublishDialog
        mode={dialog}
        tz={tz}
        schedule={schedule}
        onScheduleChange={setSchedule}
        onConfirm={onPrimary}
        onClose={() => setDialog(null)}
        pending={busy}
        error={issues.publishAt ?? issues._form}
      />

      <AmendDateDialog
        open={amendOpen}
        dayKey={amendDay}
        currentLabel={post.publishedLabel}
        onChange={setAmendDay}
        onConfirm={() => {
          void act(
            (version) => amendPublishedDate(post.id, version, amendDay),
            'no-fields',
            'The publication date is changed.',
          ).then((ok) => {
            if (ok) setAmendOpen(false);
          });
        }}
        onClose={() => setAmendOpen(false)}
        pending={busy}
        error={issues.publishedAt}
      />

      <ConfirmDialog
        open={confirm === 'trash'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Move this post to the trash?"
        description={
          post.status === 'published'
            ? 'It comes off the public blog straight away. Nothing is deleted: it waits in the trash until somebody empties it.'
            : 'Nothing is deleted. It waits in the trash until somebody empties it, and you can restore it from there.'
        }
        confirmLabel="Move to trash"
        destructive
        pending={busy}
        onConfirm={() => {
          void act((version) => trashPost(post.id, version), 'no-fields', 'Moved to the trash.').then(
            (ok) => {
              if (ok) setConfirm(null);
            },
          );
        }}
      />

      <ConfirmDialog
        open={confirm === 'restore'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Restore this post?"
        description={
          post.everPublished
            ? 'It comes back as Archived, because it was live before. Publishing it again is a separate step.'
            : 'It comes back as a Draft, exactly as it was.'
        }
        confirmLabel="Restore"
        pending={busy}
        onConfirm={() => {
          void act((version) => restorePost(post.id, version), 'no-fields', 'Restored.').then((ok) => {
            if (ok) setConfirm(null);
          });
        }}
      />

      <ConfirmDialog
        open={confirm === 'unpublish'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Take this post off the blog?"
        description="The URL stops resolving right away and the post moves to Archived. Its publication date is kept, so publishing it again puts back the date it originally went out on."
        confirmLabel="Unpublish"
        destructive
        pending={busy}
        onConfirm={() => {
          void act((version) => unpublishPost(post.id, version), 'no-fields', 'Unpublished.').then(
            (ok) => {
              if (ok) setConfirm(null);
            },
          );
        }}
      />

      <ConfirmDialog
        open={confirm === 'unschedule'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Cancel the schedule?"
        description="The post goes back to Draft and nothing publishes on its own. The version you scheduled stays in the saved versions."
        confirmLabel="Cancel the schedule"
        pending={busy}
        onConfirm={() => {
          void act(
            (version) => unschedulePost(post.id, version),
            'no-fields',
            'The schedule is cancelled.',
          ).then((ok) => {
            if (ok) setConfirm(null);
          });
        }}
      />
    </>
  );
}
