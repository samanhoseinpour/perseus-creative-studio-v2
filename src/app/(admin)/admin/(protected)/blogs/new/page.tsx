import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LuNewspaper } from 'react-icons/lu';

import AdminPage from '@/components/Admin/AdminPage';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel, adminLink } from '@/components/Admin/Glass';
import { createPost } from '@/app/(admin)/admin/(protected)/_actions/blogPosts';
import { requireArea } from '@/lib/adminAccess';

export const metadata: Metadata = { title: 'New post' };

/**
 * /admin/blogs/new: start a draft and open it.
 *
 * IT IS A GET THAT WRITES A ROW, so nothing may ever prefetch it. The "New
 * post" button on the list calls `createPost()` directly for that reason; this
 * route exists as the typed-URL and bookmarked door onto the same action, and
 * any link that is ever pointed here must carry `prefetch={false}` or Next
 * would mint a draft for every hover over it.
 *
 * `createPost` gates itself on the blogs area and ends in a `redirect`, which
 * works by throwing, so on the happy path nothing below the call runs. The
 * gate is repeated here anyway: this is a page, and a page whose authorization
 * lives inside a helper it happens to call is one refactor away from having
 * none.
 *
 * Two things can come back instead of the redirect, and both are refusals with
 * a sentence rather than errors: there are no categories yet, or no authors
 * yet. A post needs one of each, so the empty state says which is missing and
 * points at the list, where both are managed.
 */
export default async function NewBlogPostPage() {
  await requireArea('blogs', '/admin');

  const result = await createPost();

  // Reached only when the action refused. A successful create throws
  // NEXT_REDIRECT out of `createPost` itself.
  if (result.ok) redirect(`/admin/blogs/${result.id}`);

  const problem =
    result.error === 'validation'
      ? (Object.values(result.issues)[0] ?? 'The post could not be started.')
      : 'The post could not be started. Try again.';

  return (
    <AdminPage width="narrow">
      <GlassPanel className="mt-6">
        <EmptyState
          icon={LuNewspaper}
          title="The post could not be started"
          description={problem}
          action={
            <Link href="/admin/blogs" className={adminLink}>
              Back to the blog
            </Link>
          }
        />
      </GlassPanel>
    </AdminPage>
  );
}
