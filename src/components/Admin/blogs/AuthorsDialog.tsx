'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import {
  LuArrowLeft,
  LuChevronRight,
  LuPlus,
  LuUsers,
} from 'react-icons/lu';

import Button from '@/components/Button';
import ImgClient from '@/components/ImgClient';
import { MediaImage } from '@/components/ProjectMediaImage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GlassDialog from '@/components/Admin/GlassDialog';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { ChipGroup } from '@/components/Admin/portfolio/PortfolioChips';
// The shared label to control to hint/error slot (see CategoriesDialog).
import {
  Field,
  selectClasses,
  textareaClasses,
} from '@/components/Admin/careers/FormField';
import ScreenshotDropzone, {
  type ShotState,
} from '@/components/Admin/tickets/ScreenshotDropzone';
import type {
  BlogAuthorItem,
  BylineAccountOption,
} from '@/components/Admin/blogs/taxonomyTypes';
import {
  dropIssues,
  issueFor,
  linesToList,
  listToLines,
  taxonomyIssues,
} from '@/components/Admin/blogs/taxonomyForm';
import {
  createAuthor,
  deleteAuthor,
  updateAuthor,
} from '@/app/(admin)/admin/(protected)/_actions/blogTaxonomy';
import { uploadBlogMedia } from '@/app/(admin)/admin/(protected)/_actions/blogMedia';
import type { BlogMedia } from '@/db/schema';
import { blogUsageCount, blogUsageSentence } from '@/lib/blogFields';
import {
  reduceProjectImage,
  type ReducedProjectImage,
} from '@/lib/reduceScreenshot';
import {
  MAX_PROJECT_UPLOAD_BYTES,
  PROJECT_IMAGE_ACCEPT,
  PROJECT_IMAGE_BAD_TYPE,
  PROJECT_IMAGE_FULL_MAX,
  PROJECT_IMAGE_RUNGS,
  projectImageInputProblem,
} from '@/lib/portfolioFields';
import { sniffScreenshotKind } from '@/lib/ticketFields';
import { slugify } from '@/components/Projects/utils';
import { cn } from '@/lib/utils';

/** The `<form>` the pinned footer's Save button points at. The footer sits
 *  OUTSIDE the scroller, and therefore outside the form, so the submit has to
 *  name it. */
const FORM_ID = 'blog-author-form';

/** Matching blogAuthorFieldsSchema: text(200, 1), text(200, 1), text(2000, 1). */
const NAME_MAX = 200;
const ROLE_MAX = 200;
const BIO_MAX = 2000;
const SAME_AS_MAX = 20;
const KNOWS_ABOUT_MAX = 40;

const KIND_OPTIONS = [
  { slug: 'person', label: 'Person' },
  { slug: 'organization', label: 'Organization' },
] as const;

const orNull = (value: string): string | null =>
  value.trim() === '' ? null : value.trim();

/** Which author the editor is on. The roster is the resting state. */
type View = { kind: 'list' } | { kind: 'edit'; id: string } | { kind: 'create' };

const BLANK = {
  name: '',
  slug: '',
  role: '',
  bio: '',
  sameAs: '',
  knowsAbout: '',
  order: '',
};

type Values = typeof BLANK;

/** The fields the screen does not offer, carried through a save untouched.
 *  `blogAuthorFieldsSchema` is `.strict()` and `authorColumns` names every one
 *  of them in its `.set()`, so a payload that dropped them would not leave
 *  them alone: it would fail the parse. */
type Carried = Pick<
  BlogAuthorItem,
  'imageStaticPath' | 'ogImageStaticPath' | 'tags' | 'location'
>;

const NO_CARRIED: Carried = {
  imageStaticPath: '',
  ogImageStaticPath: '',
  tags: [],
  location: null,
};

/**
 * The blog's authors: the roster, and the editor for one of them.
 *
 * ONE DIALOG WITH TWO VIEWS rather than a roster page plus a form, because an
 * author is edited a handful of times a year and does not earn a route. The
 * roster is the resting state; picking a row swaps the body, the header and
 * the footer to that author's form, and Back returns without saving.
 *
 * THE SLUG IS FIXED AFTER CREATION and is shown read-only while editing. It is
 * the live `/blogs/authors/<slug>` address, `updateAuthor` refuses a change
 * with a sentence, and a control the door will refuse is worse than no control.
 *
 * THE BYLINE LINK IS THE ONE FIELD THE BLOGS GRANT IS NOT ENOUGH FOR. Linking
 * a public byline to a dashboard account is a privilege change, so
 * `bylineColumn` in _actions/blogTaxonomy.ts takes it as its own argument and
 * lets only an owner or a superadmin send it. The picker therefore renders
 * only for those two, and for anybody else the argument is `undefined`, which
 * means "do not touch the column" rather than "clear it".
 *
 * THE PHOTO IS OFFERED ONLY ON AN AUTHOR THAT EXISTS. `uploadBlogMedia` reads
 * the owner row before its first put, precisely so a well-shaped id for a row
 * that is not there cannot accumulate blobs under a prefix no sweep will
 * visit, so a create form has nothing to upload against and says so.
 *
 * Seeding is the `OpeningDialog` pattern: a ref remembers which author the
 * form was filled from, so the revalidated tree that arrives after every save
 * (a fresh `authors` array on each parent render) can never land on top of
 * something half typed. Closing resets it, so reopening always seeds fresh.
 */
export default function AuthorsDialog({
  open,
  onOpenChange,
  authors,
  accounts,
  canLinkAccount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authors: BlogAuthorItem[];
  /** Empty for anyone who may not link a byline: the page does not read them. */
  accounts: BylineAccountOption[];
  /** The owner or a superadmin, matching `bylineColumn`'s own gate. */
  canLinkAccount: boolean;
}) {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [values, setValues] = useState<Values>(BLANK);
  const [kind, setKind] = useState<'person' | 'organization'>('person');
  const [media, setMedia] = useState<BlogMedia | null>(null);
  const [carried, setCarried] = useState<Carried>(NO_CARRIED);
  const [userId, setUserId] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const editing = view.kind === 'edit' ? (authors.find((a) => a.id === view.id) ?? null) : null;
  // The row was deleted while its editor was open (or by somebody else), so
  // there is nothing left to edit. Rendered as the roster rather than a blank
  // form; the effect below re-seeds when a row is picked again.
  const onForm = view.kind === 'create' || editing !== null;

  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      // A closed dialog goes back to the roster, so reopening never lands
      // mid-edit. The functional form returns the SAME object when it is
      // already the roster: a fresh one every run would re-trigger this
      // effect for ever.
      setView((v) => (v.kind === 'list' ? v : { kind: 'list' }));
      return;
    }
    if (view.kind === 'list') {
      seededFor.current = null;
      return;
    }
    const seedKey = view.kind === 'edit' ? view.id : '__create__';
    if (seededFor.current === seedKey) return;
    seededFor.current = seedKey;
    const author = view.kind === 'edit' ? authors.find((a) => a.id === view.id) : undefined;
    if (author) {
      setValues({
        name: author.name,
        slug: author.slug,
        role: author.role,
        bio: author.bio,
        sameAs: listToLines(author.sameAs),
        knowsAbout: listToLines(author.knowsAbout),
        order: String(author.sortIndex),
      });
      setKind(author.kind);
      setMedia(author.imageMedia);
      setCarried({
        imageStaticPath: author.imageStaticPath,
        ogImageStaticPath: author.ogImageStaticPath,
        tags: author.tags,
        location: author.location,
      });
      setUserId(author.userId);
      setSlugTouched(true);
    } else {
      setValues(BLANK);
      setKind('person');
      setMedia(null);
      setCarried(NO_CARRIED);
      setUserId('');
      setSlugTouched(false);
    }
    setIssues({});
  }, [open, view, authors]);

  function close(next: boolean) {
    if (pending || deleting) return;
    onOpenChange(next);
  }

  function setValue(key: keyof Values, value: string) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === 'name' && !slugTouched) next.slug = slugify(value);
      return next;
    });
    setIssues((prev) => dropIssues(prev, key === 'order' ? 'sortIndex' : key));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const order = values.order.trim();
    const fields = {
      slug: editing ? editing.slug : values.slug,
      name: values.name.trim(),
      kind,
      role: values.role.trim(),
      bio: values.bio.trim(),
      imageStaticPath: orNull(carried.imageStaticPath),
      imageMedia: media,
      ogImageStaticPath: orNull(carried.ogImageStaticPath),
      sameAs: linesToList(values.sameAs),
      knowsAbout: linesToList(values.knowsAbout),
      tags: carried.tags,
      location: carried.location,
      // Left out entirely when blank, which is what makes the door keep the
      // current slot on an edit and append on a create.
      ...(order === '' ? {} : { sortIndex: Number(order) }),
    };
    // `undefined` is the whole gate: the column is only ever named by somebody
    // the action lets name it.
    const byline = canLinkAccount ? (userId === '' ? null : userId) : undefined;

    setPending(true);
    let next: Record<string, string>;
    try {
      next = taxonomyIssues(
        editing
          ? await updateAuthor(editing.id, fields, byline)
          : await createAuthor(fields, byline),
      );
    } catch {
      next = taxonomyIssues(undefined);
    }
    setPending(false);
    setIssues(next);
    if (Object.keys(next).length > 0) return;
    toast.success(editing ? 'Author saved.' : `Author added: ${fields.name}.`);
    setView({ kind: 'list' });
  }

  async function onDelete() {
    if (!editing) return;
    setDeleting(true);
    let next: Record<string, string>;
    try {
      next = taxonomyIssues(await deleteAuthor(editing.id));
    } catch {
      next = taxonomyIssues(undefined);
    }
    setDeleting(false);
    setConfirmingDelete(false);
    const problem = Object.values(next)[0];
    if (problem) {
      toast.error(problem);
      return;
    }
    toast.success(`Author deleted: ${editing.name}.`);
    setView({ kind: 'list' });
  }

  const sameAsIssue = issueFor(issues, 'sameAs');
  const knowsAboutIssue = issueFor(issues, 'knowsAbout');
  const usage = editing?.usage ?? { posts: 0, revisions: 0 };
  const inUse = usage.posts > 0 || usage.revisions > 0;

  return (
    <>
      <GlassDialog
        open={open}
        onOpenChange={close}
        maxWidth="48rem"
        header={
          <>
            <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
              {editing ? editing.name : onForm ? 'Add author' : 'Authors'}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              {onForm
                ? 'What the byline, the author page and Google see of this person.'
                : 'Everyone a post can be bylined to. Lower order shows first on the authors page.'}
            </Dialog.Description>
          </>
        }
        footer={
          onForm ? (
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                type="submit"
                // The actions live in the pinned footer, outside the <form>.
                form={FORM_ID}
                size="small"
                shimmer={false}
                showIcon={false}
                disabled={pending || deleting}
                className="w-full sm:w-auto"
              >
                {pending ? 'Saving…' : editing ? 'Save changes' : 'Create author'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="small"
                icon={LuArrowLeft}
                iconPosition="left"
                disabled={pending || deleting}
                onClick={() => setView({ kind: 'list' })}
                className="w-full sm:w-auto"
              >
                All authors
              </Button>
              {editing && (
                <div className="flex flex-1 items-center">
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    showIcon={false}
                    disabled={pending || deleting || inUse}
                    onClick={() => setConfirmingDelete(true)}
                    title={
                      inUse
                        ? `${blogUsageSentence('author', usage)} Move them to another author first.`
                        : undefined
                    }
                    className="text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                type="button"
                size="small"
                shimmer={false}
                icon={LuPlus}
                iconPosition="left"
                onClick={() => setView({ kind: 'create' })}
                className="w-full sm:w-auto"
              >
                Add author
              </Button>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  showIcon={false}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
              </Dialog.Close>
            </div>
          )
        }
      >
        {!onForm ? (
          <AuthorRoster authors={authors} onPick={(id) => setView({ kind: 'edit', id })} />
        ) : (
          /* One flat grid: a cell per block, and only the blocks that need the
             whole measure (prose, the photo, the two lists) span both. */
          <form
            id={FORM_ID}
            onSubmit={onSubmit}
            className="grid gap-4 md:grid-cols-2 md:items-start md:gap-x-6"
            noValidate
          >
            {issues._form && (
              <p role="alert" className="px-1 text-xs text-destructive md:col-span-2">
                {issues._form}
              </p>
            )}

            <Field id="author-name" label="Name" error={issues.name}>
              <Input
                id="author-name"
                value={values.name}
                onChange={(e) => setValue('name', e.target.value)}
                maxLength={NAME_MAX}
                autoComplete="off"
                disabled={pending}
                aria-invalid={issues.name ? true : undefined}
              />
            </Field>

            <Field
              id="author-slug"
              label="Slug"
              error={issues.slug}
              hint={
                editing
                  ? 'Fixed once created. It is the author page address people already have.'
                  : 'The author page address. Safe to leave auto-generated.'
              }
            >
              <Input
                id="author-slug"
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setValue('slug', e.target.value);
                }}
                autoComplete="off"
                spellCheck={false}
                disabled={pending || editing !== null}
                aria-invalid={issues.slug ? true : undefined}
              />
            </Field>

            <Field id="author-role" label="Role" error={issues.role}>
              <Input
                id="author-role"
                value={values.role}
                onChange={(e) => setValue('role', e.target.value)}
                placeholder="e.g. SEO Specialist"
                maxLength={ROLE_MAX}
                autoComplete="off"
                disabled={pending}
                aria-invalid={issues.role ? true : undefined}
              />
            </Field>

            <ChipGroup
              legend="Byline kind"
              options={KIND_OPTIONS}
              value={kind}
              onChange={(next) => {
                setIssues((prev) => dropIssues(prev, 'kind'));
                setKind(next);
              }}
              disabled={pending}
              error={issues.kind}
              help={
                kind === 'person'
                  ? 'Renders as a Person in the article schema.'
                  : 'Renders as the studio itself, for posts with no single writer.'
              }
            />

            <Field
              id="author-bio"
              label="Bio"
              className="md:col-span-2"
              error={issues.bio}
              hint={`Shown on the author page and under the byline. ${values.bio.length}/${BIO_MAX}`}
            >
              <textarea
                id="author-bio"
                rows={4}
                value={values.bio}
                onChange={(e) => setValue('bio', e.target.value)}
                maxLength={BIO_MAX}
                disabled={pending}
                aria-invalid={issues.bio ? true : undefined}
                className={cn(textareaClasses, 'min-h-24')}
              />
            </Field>

            <div className="flex flex-col gap-2 md:col-span-2">
              {/* No htmlFor: the dropzone owns its own file input and points
                  at this id with aria-labelledby instead. */}
              <Label id="author-photo-label">Photo</Label>
              {editing ? (
                <AuthorPhotoField
                  authorId={editing.id}
                  name={values.name}
                  media={media}
                  staticPath={carried.imageStaticPath}
                  onUploaded={setMedia}
                  onRemove={() => setMedia(null)}
                  disabled={pending || deleting}
                />
              ) : (
                <p className="px-1 text-xs text-muted-foreground">
                  Create the author first, then reopen them to add a photo.
                  There is nothing to store it against yet.
                </p>
              )}
            </div>

            <Field
              id="author-same-as"
              label="Profile links"
              className="md:col-span-2"
              error={sameAsIssue}
              hint={`One full https link per line, up to ${SAME_AS_MAX}. They tell Google this byline and those profiles are the same person.`}
            >
              <textarea
                id="author-same-as"
                rows={3}
                value={values.sameAs}
                onChange={(e) => {
                  setValue('sameAs', e.target.value);
                  setIssues((prev) =>
                    dropIssues(
                      prev,
                      ...Object.keys(prev).filter((k) => k.startsWith('sameAs.')),
                    ),
                  );
                }}
                placeholder="https://www.linkedin.com/in/..."
                spellCheck={false}
                disabled={pending}
                aria-invalid={sameAsIssue ? true : undefined}
                className={cn(textareaClasses, 'min-h-20 font-mono text-xs')}
              />
            </Field>

            <Field
              id="author-knows-about"
              label="Topics"
              className="md:col-span-2"
              error={knowsAboutIssue}
              hint={`One per line, up to ${KNOWS_ABOUT_MAX}. What this person is credited as knowing, on their profile and in the article schema.`}
            >
              <textarea
                id="author-knows-about"
                rows={3}
                value={values.knowsAbout}
                onChange={(e) => {
                  setValue('knowsAbout', e.target.value);
                  setIssues((prev) =>
                    dropIssues(
                      prev,
                      ...Object.keys(prev).filter((k) => k.startsWith('knowsAbout.')),
                    ),
                  );
                }}
                placeholder={'Technical SEO\nVideo production'}
                disabled={pending}
                aria-invalid={knowsAboutIssue ? true : undefined}
                className={cn(textareaClasses, 'min-h-20')}
              />
            </Field>

            <Field
              id="author-order"
              label="Order"
              error={issues.sortIndex}
              hint={
                editing
                  ? `Lower shows earlier on the authors page. Blank keeps the current slot (${editing.sortIndex}).`
                  : 'Lower shows earlier on the authors page. Blank puts them last.'
              }
            >
              <Input
                id="author-order"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={values.order}
                onChange={(e) => setValue('order', e.target.value)}
                autoComplete="off"
                disabled={pending}
                aria-invalid={issues.sortIndex ? true : undefined}
                className="sm:w-40"
              />
            </Field>

            {canLinkAccount && (
              <Field
                id="author-account"
                label="Dashboard account"
                error={issues.userId}
                hint="Optional. It links this public byline to a team login and changes nothing a visitor sees."
              >
                <select
                  id="author-account"
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    setIssues((prev) => dropIssues(prev, 'userId'));
                  }}
                  disabled={pending}
                  aria-invalid={issues.userId ? true : undefined}
                  className={selectClasses}
                >
                  <option value="">Not linked</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* What points at this author, on the screen rather than in the
                Delete button's `title`: a disabled button fires no mouse
                events, so the tooltip that used to be the only carrier of
                these numbers could never appear for anybody. When something
                does point here it also says why Delete is greyed out. */}
            {editing && (
              <p className="px-1 text-xs text-muted-foreground md:col-span-2">
                {blogUsageSentence('author', usage)}
                {inUse
                  ? ' Move them to another author before you can delete this one.'
                  : ' It can be deleted.'}
              </p>
            )}
          </form>
        )}
      </GlassDialog>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={(next) => !deleting && setConfirmingDelete(next)}
        title={editing ? `Delete “${editing.name}”?` : 'Delete this author?'}
        description={`${blogUsageSentence('author', usage)} The byline and any photo uploaded for it go for good, and this cannot be undone.`}
        confirmLabel="Delete author"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </>
  );
}

/** The roster: one row per author, each a door into its own editor. */
function AuthorRoster({
  authors,
  onPick,
}: {
  authors: BlogAuthorItem[];
  onPick: (id: string) => void;
}) {
  if (authors.length === 0) {
    return (
      <p className="px-1 text-sm text-muted-foreground">
        No authors yet. Add the first one to byline a post to somebody.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-white/40 dark:divide-white/10">
      {authors.map((author) => (
        <li key={author.id}>
          <button
            type="button"
            onClick={() => onPick(author.id)}
            className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
          >
            <AuthorThumb author={author} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {author.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {author.role} · {author.slug}
              </span>
            </span>
            {/* BOTH numbers, printed on the row. The saved versions are what
                grey out Delete on an author whose posts have all moved to
                somebody else, and the disabled button's `title` cannot say so:
                a disabled element fires no mouse events, and no touch device
                could reach a tooltip anyway. */}
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {blogUsageCount(author.usage)}
            </span>
            <LuChevronRight
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * The author's photo at thumbnail size.
 *
 * An uploaded photo goes through `MediaImage` and a seeded `/images/...` asset
 * through `ImgClient`, and the split is not a preference: `resolveImageSrc`
 * swaps anything outside `/images/` for the Perseus wordmark, so a Blob URL
 * through the static renderer draws the studio logo where the face should be,
 * which looks exactly like a bug. `toHero` in blogStore.ts takes media first,
 * so this is also the order the public site renders them in.
 */
function AuthorThumb({ author }: { author: BlogAuthorItem }) {
  const box = 'size-10 shrink-0 rounded-full object-cover';
  if (author.imageMedia) {
    return (
      <MediaImage
        variants={author.imageMedia.variants}
        blurDataUrl={author.imageMedia.blurDataUrl}
        alt=""
        sizes="40px"
        width={40}
        height={40}
        className={box}
      />
    );
  }
  if (author.imageStaticPath) {
    return (
      <ImgClient
        src={author.imageStaticPath}
        alt=""
        width={40}
        height={40}
        sizes="40px"
        className={box}
      />
    );
  }
  return (
    <span
      className={cn(
        box,
        'inline-flex items-center justify-center bg-foreground/[0.06] text-muted-foreground',
      )}
      aria-hidden="true"
    >
      <LuUsers className="size-4" />
    </span>
  );
}

/**
 * The author's photo, uploaded through the one blog media door.
 *
 * `HeroField`'s flow, unchanged in shape and for the same reasons: one pick is
 * fanned into the master, the width rungs and an LQIP in the BROWSER, the whole
 * ladder travels in one action body, and the byte budget is checked here as
 * well as on the server so a doomed upload never leaves the machine. The `gen`
 * ref is what makes a remove or a second pick mid-reduce discard the stale
 * async result instead of letting it land on top of a newer one.
 *
 * THE UPLOAD IS EXPLICIT AND WRITES NOTHING TO THE AUTHOR: `uploadBlogMedia`
 * hands the media value back and the ordinary Save door stores it. One write
 * path for author data.
 */
function AuthorPhotoField({
  authorId,
  name,
  media,
  staticPath,
  onUploaded,
  onRemove,
  disabled,
}: {
  authorId: string;
  name: string;
  media: BlogMedia | null;
  staticPath: string;
  onUploaded: (media: BlogMedia) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [reduced, setReduced] = useState<ReducedProjectImage | null>(null);
  const [shot, setShot] = useState<ShotState>({ phase: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const gen = useRef(0);
  const busy = pending || disabled;

  async function onPick(picked: File | null) {
    if (!picked || busy) return;
    const run = ++gen.current;
    setError(null);

    const problem = projectImageInputProblem(picked);
    const kind = problem ? null : await sniffScreenshotKind(picked);
    if (run !== gen.current) return;
    if (problem || !kind) {
      setShot({ phase: 'idle' });
      setError(problem ?? PROJECT_IMAGE_BAD_TYPE);
      return;
    }

    setShot({ phase: 'processing', name: picked.name });
    const result = await reduceProjectImage(picked, kind, {
      fullMax: PROJECT_IMAGE_FULL_MAX,
      rungWidths: PROJECT_IMAGE_RUNGS,
    });
    if (run !== gen.current) return;

    if (!result) {
      setShot({ phase: 'idle' });
      setError('Could not read that image. Try a different file.');
      return;
    }
    const totalBytes =
      result.full.file.size + result.rungs.reduce((sum, r) => sum + r.file.size, 0);
    if (totalBytes > MAX_PROJECT_UPLOAD_BYTES) {
      setShot({ phase: 'idle' });
      setError('Image is still over 4 MB after optimizing. Try a smaller image.');
      return;
    }

    setReduced(result);
    setShot({
      phase: 'ready',
      file: result.full.file,
      originalBytes: result.originalBytes,
      kept: false,
    });
  }

  function onClear() {
    gen.current++;
    setReduced(null);
    setShot({ phase: 'idle' });
    setError(null);
  }

  async function onStore() {
    if (!reduced || busy) return;
    setPending(true);
    setError(null);

    const fd = new FormData();
    fd.set('authorId', authorId);
    fd.set('label', 'photo');
    fd.set('blur', reduced.blurDataUrl);
    fd.set('fullWidth', String(reduced.full.width));
    fd.set('fullHeight', String(reduced.full.height));
    fd.set('full', reduced.full.file);
    for (const rung of reduced.rungs) fd.set(`w${rung.width}`, rung.file);

    let res: Awaited<ReturnType<typeof uploadBlogMedia>>;
    try {
      res = (await uploadBlogMedia(fd)) ?? {
        ok: false,
        error: 'Upload failed. Try again.',
      };
    } catch {
      res = { ok: false, error: 'Upload failed. Try again.' };
    }
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onUploaded(res.media);
    toast.success('Photo ready. Save the author to keep it.');
    onClear();
  }

  const showing = media !== null || staticPath !== '';

  return (
    <div className="flex flex-col gap-3">
      {showing && shot.phase === 'idle' && (
        <figure className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3">
          {media ? (
            <MediaImage
              variants={media.variants}
              blurDataUrl={media.blurDataUrl}
              alt={name}
              sizes="80px"
              width={80}
              height={80}
              className="size-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <ImgClient
              src={staticPath}
              alt={name}
              width={80}
              height={80}
              sizes="80px"
              className="size-20 shrink-0 rounded-full object-cover"
            />
          )}
          <figcaption className="min-w-0 flex-1 text-xs text-muted-foreground">
            {media
              ? 'Uploaded photo. Pick another to replace it.'
              : 'Original site asset. Upload one to replace it.'}
          </figcaption>
          {media && (
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              disabled={busy}
              onClick={onRemove}
              className="shrink-0"
            >
              Remove
            </Button>
          )}
        </figure>
      )}

      <ScreenshotDropzone
        state={shot}
        inputRef={inputRef}
        onPick={onPick}
        onClear={onClear}
        accept={PROJECT_IMAGE_ACCEPT}
        hint="PNG, JPEG, WebP, or AVIF. Up to 15 MB, optimized into responsive sizes before upload"
        labelledBy="author-photo-label"
        describedBy={error ? 'author-photo-error' : undefined}
        invalid={!!error}
        disabled={busy}
      />

      {shot.phase === 'ready' && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="small"
            shimmer={false}
            showIcon={false}
            disabled={busy}
            onClick={onStore}
          >
            {pending ? 'Uploading…' : 'Use this photo'}
          </Button>
        </div>
      )}

      {error && (
        <p id="author-photo-error" role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** The posts list header's "Authors" affordance, which owns its own state. */
export function AuthorsButton({
  authors,
  accounts,
  canLinkAccount,
}: {
  authors: BlogAuthorItem[];
  accounts: BylineAccountOption[];
  canLinkAccount: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="small"
        icon={LuUsers}
        iconPosition="left"
        onClick={() => setOpen(true)}
      >
        Authors
      </Button>
      <AuthorsDialog
        open={open}
        onOpenChange={setOpen}
        authors={authors}
        accounts={accounts}
        canLinkAccount={canLinkAccount}
      />
    </>
  );
}
