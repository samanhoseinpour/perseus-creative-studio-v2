'use server';

/**
 * The one upload door for blog imagery: a post's hero, its OG image, a body
 * figure, and an author's photo.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions, so this
 * gates itself on the blogs area (`requireArea`), FIRST and outside the try.
 * Every byte-level control is shared with `uploadProjectMedia` through
 * `@/lib/imageRungUpload` rather than copied: the magic-byte sniff (never the
 * filename), the decoded-pixel gate, the SUM cap against Vercel's body
 * ceiling, and the allSettled fan-out that keeps the cleanup ledger complete.
 *
 * THE PATHNAME IS THE ATTACK SURFACE HERE, and neither guard beneath it is a
 * traversal guard: `assertPublicPrefix` is a `startsWith` test and
 * `BLOG_MEDIA_PATHNAME_RE` permits nested segments, so an owner id of
 * `authors/<some-uuid>` sent as a post id would land in the authors namespace
 * and still satisfy both. So the id is shape-checked by `blogMediaBase` before
 * anything else, the label comes from a closed union, and the owner ROW is
 * read before the first put: a shape says nothing about a post that was
 * purged a second ago, and an upload against one accumulates blobs no purge
 * sweep will ever visit.
 *
 * THIS ACTION RETURNS THE MEDIA VALUE; IT WRITES NOTHING TO A POST. The editor
 * puts it into the working copy through the save doors, which validate it
 * again. One write path for post data.
 *
 * REPLACED BLOBS ARE NOT SWEPT WHILE A POST LIVES, and that is deliberate:
 * a PUBLISHED revision still renders the image the working copy just replaced,
 * and revision history is restorable. `purgePost` sweeps the whole
 * `blogs/<id>/` prefix when the row goes for good, and that is the only sweep.
 * Do not add another here.
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { blogAuthors, blogPosts, type BlogMedia } from '@/db/schema';
import { logActivity } from '@/lib/activityLog';
import { requireArea } from '@/lib/adminAccess';
import { blogMediaSchema } from '@/lib/blogBody';
import {
  PASSTHROUGH_UPLOAD_ERRORS,
  collectImageRungs,
  putImageRungs,
} from '@/lib/imageRungUpload';
import { reportError } from '@/lib/monitoringRecord';
import { delPublic } from '@/lib/publicBlob';
import {
  blogMediaBase,
  isBlogMediaLabel,
  type BlogMediaLabel,
  type BlogMediaOwner,
} from '@/lib/publicBlobFields';

export type BlogMediaUploadResult =
  | { ok: true; media: BlogMedia }
  | { ok: false; error: string };

const GENERIC = 'Upload failed. Try again.';

/** How each slot is named on the audit feed. `og` is not a word anybody
 *  reads, and "a og image" is not a sentence. Keyed by the closed label set,
 *  so a slot added later is a type error here rather than a blank line. */
const SLOT_SUMMARY: Record<BlogMediaLabel, string> = {
  hero: 'the hero image',
  og: 'the social preview image',
  figure: 'a body image',
  photo: 'the profile photo',
};

/** The owner in the body: exactly one of the two ids, never both. */
function ownerFrom(formData: FormData): BlogMediaOwner | null {
  const postId = formData.get('postId');
  const authorId = formData.get('authorId');
  if (typeof postId === 'string' && postId !== '') {
    return typeof authorId === 'string' && authorId !== ''
      ? null
      : { kind: 'post', id: postId };
  }
  if (typeof authorId === 'string' && authorId !== '') {
    return { kind: 'author', id: authorId };
  }
  return null;
}

/**
 * Store one image for a post or an author and hand the value back.
 *
 * FormData: `postId` XOR `authorId`, `label` (hero | og | figure | photo),
 * `blur`, `fullWidth`, `fullHeight`, files `full` (required) and
 * `w960`/`w640`/`w384` (sparse) — the ladder `reduceProjectImage` fans a pick
 * into in the browser.
 */
export async function uploadBlogMedia(
  formData: FormData,
): Promise<BlogMediaUploadResult> {
  const profile = await requireArea('blogs', '/admin');

  const uploaded: string[] = [];
  try {
    // 1. The target, before anything touches the store: an id that is not a
    //    bare uuid and a label outside the closed set for that owner are both
    //    refused here, so neither half of the filename can carry a `/`.
    const owner = ownerFrom(formData);
    const labelRaw = formData.get('label');
    // `isBlogMediaLabel` narrows the FormData string onto the closed set (the
    // audit copy below is keyed by it); `blogMediaBase` then refuses the id
    // shape and the owner/slot pairing, and keeps refusing an unknown label on
    // its own account, because it is a leaf every future caller reaches too.
    const label = typeof labelRaw === 'string' ? labelRaw : '';
    if (!owner || !isBlogMediaLabel(label)) {
      return { ok: false, error: 'That image slot is not available.' };
    }
    const base = blogMediaBase(owner, label);
    if (base === null) {
      return { ok: false, error: 'That image slot is not available.' };
    }

    // 2. The row has to EXIST. A well-shaped id for a post somebody purged a
    //    second ago would otherwise accumulate blobs under a prefix no sweep
    //    will ever visit again.
    const [row] =
      owner.kind === 'post'
        ? await db
            .select({ name: blogPosts.slug })
            .from(blogPosts)
            .where(eq(blogPosts.id, owner.id))
        : await db
            .select({ name: blogAuthors.slug })
            .from(blogAuthors)
            .where(eq(blogAuthors.id, owner.id));
    if (!row) {
      return {
        ok: false,
        error:
          owner.kind === 'post'
            ? 'That post is no longer here.'
            : 'That author is no longer here.',
      };
    }

    // 3. The master's own pixel size travels with the pick: the rung files
    //    carry no dimensions and the ladder needs the aspect ratio.
    const fullWidth = Number(formData.get('fullWidth'));
    const fullHeight = Number(formData.get('fullHeight'));
    const blurRaw = formData.get('blur');
    const blur = typeof blurRaw === 'string' && blurRaw !== '' ? blurRaw : null;

    // 4/5/6. The shared half: collect and gate the rungs, then sniff, gate the
    //    decoded pixels and store the set.
    const collected = collectImageRungs(formData);
    if (!collected.ok) return { ok: false, error: collected.error };
    const stored = await putImageRungs(
      collected.files,
      (rung, kind) => `${base}-${rung}.${kind}`,
      uploaded,
    );
    // Unreachable (collectImageRungs requires `full` and any rung failure
    // throws), but it is what narrows the sparse record. THROWN rather than
    // returned so it takes the one cleanup path below with everything else
    // that can fail after a put.
    if (!stored.full) throw new Error('rung set came back with no master');

    // 7. The value is validated before it leaves, by the same schema the save
    //    doors run: it is what proves every rung's url derives from its OWN
    //    pathname on our pinned store.
    const parsed = blogMediaSchema.safeParse({
      variants: {
        full: {
          url: stored.full.url,
          pathname: stored.full.pathname,
          width: fullWidth,
          height: fullHeight,
        },
        ...(stored.w960 ? { w960: stored.w960 } : {}),
        ...(stored.w640 ? { w640: stored.w640 } : {}),
        ...(stored.w384 ? { w384: stored.w384 } : {}),
      },
      blurDataUrl: blur,
    });
    // Thrown, not returned: the blobs are already in the store, so this has to
    // reach the cleanup in the catch. A return here would strand the ladder.
    if (!parsed.success) throw parsed.error;

    // 8. The value is on its way back and the caller will save it, so from
    //    here the catch must NOT delete these blobs. Clearing the ledger makes
    //    that structural rather than a rule to remember. There are no
    //    transactions here.
    const media: BlogMedia = parsed.data;
    uploaded.length = 0;

    logActivity(profile, {
      area: 'blogs',
      entity: owner.kind === 'post' ? 'blog-post' : 'blog-author',
      entityId: owner.id,
      entityName: row.name,
      action: 'update',
      summary: `Uploaded ${SLOT_SUMMARY[label]} for ${row.name}`,
      payload: { meta: { slot: label } },
    });

    return { ok: true, media };
  } catch (error) {
    // Nothing is saving these, so do not strand them.
    if (uploaded.length > 0) await delPublic(uploaded).catch(() => {});
    // Field-level rejections thrown from the rung batch carry their own copy.
    if (error instanceof Error && PASSTHROUGH_UPLOAD_ERRORS.has(error.message)) {
      return { ok: false, error: error.message };
    }
    reportError('[blogs] uploadBlogMedia failed', error);
    return { ok: false, error: GENERIC };
  }
}
