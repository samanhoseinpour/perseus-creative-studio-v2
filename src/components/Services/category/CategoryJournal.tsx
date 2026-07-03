import { Suspense } from 'react';
import Link from 'next/link';
import { LuBookOpenText } from 'react-icons/lu';

import BlogPost from '@/components/Blogs/shared/BlogPost';
import BlogPostSkleton from '@/components/Blogs/shared/BlogPostSkleton';
import Button from '@/components/Button';
import Heading from '@/components/Heading';
import { selectBlogCards } from '@/components/Blogs/shared/blogFeed';

interface CategoryJournalProps {
  /** Blog category whose posts feed this section. */
  blogCategorySlug?: string;
  /** Service category title — used in the heading. */
  categoryTitle: string;
}

/**
 * Category-aware "From the Journal" — renders the posts from this service's
 * matching blog category (e.g. social → social posts). Replaces the generic
 * proof band so each category page surfaces its own relevant writing. Renders
 * nothing when the category has no posts yet (e.g. branding).
 */
const CategoryJournal = ({
  blogCategorySlug,
  categoryTitle,
}: CategoryJournalProps) => {
  if (!blogCategorySlug) return null;

  // Server-side selection — the client grid receives four slim cards instead
  // of importing the blogPosts registry (see blogFeed.ts).
  const posts = selectBlogCards({ categorySlug: blogCategorySlug, limit: 4 });
  if (posts.length === 0) return null;

  const blogTitle = posts[0].category.title;

  return (
    <section className="pb-16 sm:pb-24">
      <Heading
        titleTag="h2"
        seperatorTitle="From the journal"
        eyebrowRight={categoryTitle}
        title="Guides & insights"
        titleAccent={`for ${blogTitle.toLowerCase()}.`}
        description={`Practical articles from our studio journal on ${blogTitle.toLowerCase()} — strategy, process, and lessons from real client work.`}
        containerStyle="mb-10"
      />

      <Suspense fallback={<BlogPostSkleton />}>
        <BlogPost posts={posts} enableFiltering={false} showFilters={false} />
      </Suspense>

      <div className="mt-10 flex justify-center">
        <Link href={`/blogs?category=${blogCategorySlug}`}>
          <Button variant="secondary" icon={LuBookOpenText}>
            Read more on {blogTitle}
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default CategoryJournal;
