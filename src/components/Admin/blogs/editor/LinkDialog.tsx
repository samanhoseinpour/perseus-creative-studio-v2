'use client';

import { useEffect, useId, useState } from 'react';
import { Dialog } from 'radix-ui';

import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import { glassRowHover } from '@/components/Admin/Glass';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { searchPostLinks } from '@/app/(admin)/admin/(protected)/_actions/blogPosts';
import type { LinkTarget } from '@/db/blogAdminQueries';
import { BLOG_POST_STATUS_LABELS } from '@/lib/blogFields';
import { safeHref } from '@/lib/safeHref';
import { cn } from '@/lib/utils';

export type LinkDraft = {
  href: string;
  /** Present when the caret is not sitting on any text: the dialog then has to
   *  ask what the link should SAY, because there is nothing to wrap. */
  needsText: boolean;
  /** Whether the caret is on an existing link, which is what makes Remove
   *  meaningful. */
  editing: boolean;
};

type Props = {
  draft: LinkDraft | null;
  onClose: () => void;
  onApply: (href: string, text: string | null) => void;
  onRemove: () => void;
};

/**
 * The link editor: type a URL, or pick another article.
 *
 * `safeHref` RUNS HERE and again inside the `setBlogLink` command, and neither
 * is redundant. This one is the message the writer reads; the command's is the
 * one no caller can route around. Both are the same parse-based guard the zod
 * layer applies on save, so a link this dialog accepts is a link the post can
 * be saved with.
 *
 * UNPUBLISHED POSTS ARE OFFERED AND MARKED, never hidden: linking to an
 * article you are about to publish is ordinary, the publish door already warns
 * about a target that is not live yet, and hiding it would send the writer to
 * type the URL by hand, where nothing checks the slug at all.
 */
export default function LinkDialog({ draft, onClose, onApply, onRemove }: Props) {
  const hrefId = useId();
  const textId = useId();
  const searchId = useId();
  const [href, setHref] = useState('');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [targets, setTargets] = useState<LinkTarget[] | null>(null);

  const open = draft !== null;

  // Reload the fields from the draft each time the dialog opens, so a second
  // open never shows the previous link's URL.
  useEffect(() => {
    if (!draft) return;
    setHref(draft.href);
    setText('');
    setQuery('');
  }, [draft]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const timer = setTimeout(() => {
      searchPostLinks(query)
        .then((rows) => {
          if (live) setTargets(rows);
        })
        .catch(() => {
          if (live) setTargets([]);
        });
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  const trimmed = href.trim();
  const safe = safeHref(trimmed);
  const problem =
    trimmed === '' ? null : safe === null ? 'That address cannot be linked to.' : null;
  const canApply = safe !== null && (!draft?.needsText || text.trim() !== '');

  function apply() {
    if (safe === null || !draft) return;
    onApply(safe, draft.needsText ? text.trim() : null);
  }

  return (
    <GlassDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      maxWidth="30rem"
      header={
        <div className="px-5 pt-5 pb-3">
          <Dialog.Title className="text-base font-semibold">
            {draft?.editing ? 'Edit link' : 'Add link'}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            Paste an address, or pick another article below.
          </Dialog.Description>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-2 border-t border-white/40 px-5 py-3 dark:border-white/10">
          {draft?.editing ? (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs font-medium text-destructive hover:underline"
            >
              Remove link
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="compact"
              variant="secondary"
              shimmer={false}
              showIcon={false}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="compact"
              shimmer={false}
              showIcon={false}
              disabled={!canApply}
              onClick={apply}
            >
              {draft?.editing ? 'Update' : 'Add link'}
            </Button>
          </div>
        </div>
      }
      className="px-5 pb-4"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={hrefId}>Address</Label>
          <Input
            id={hrefId}
            value={href}
            autoFocus
            onChange={(event) => setHref(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && canApply) {
                event.preventDefault();
                apply();
              }
            }}
            placeholder="https://example.com or /blogs/a-post"
            aria-invalid={problem !== null}
            aria-describedby={problem ? `${hrefId}-error` : undefined}
          />
          {problem && (
            <p id={`${hrefId}-error`} role="alert" className="px-1 text-xs text-destructive">
              {problem}
            </p>
          )}
        </div>

        {draft?.needsText && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={textId}>Link text</Label>
            <Input
              id={textId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What the sentence should say"
              maxLength={300}
            />
            <p className="px-1 text-xs text-muted-foreground">
              Nothing is selected, so this is the wording the link will carry.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor={searchId}>Link to another article</Label>
          <Input
            id={searchId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search posts by title or slug"
          />
          <div className="max-h-56 overflow-y-auto overscroll-contain rounded-lg border border-foreground/10">
            {targets === null && (
              <p className="px-3 py-2 text-xs text-muted-foreground">Loading posts.</p>
            )}
            {targets !== null && targets.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No post matches that.</p>
            )}
            {targets?.map((target) => (
              <button
                key={target.slug}
                type="button"
                onClick={() => {
                  setHref(`/blogs/${target.slug}`);
                  if (draft?.needsText && text.trim() === '') setText(target.title);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-2 text-left',
                  glassRowHover,
                )}
              >
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {target.title}
                </span>
                {target.status !== 'published' && (
                  <span className="shrink-0 rounded-full bg-foreground/[0.08] px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                    {BLOG_POST_STATUS_LABELS[target.status]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            A post that is not live yet can still be linked. The publish checks will remind
            you before it goes out.
          </p>
        </div>
      </div>
    </GlassDialog>
  );
}
