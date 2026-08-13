import { Suspense } from 'react';
import Link from 'next/link';
import { LuBookOpenText } from 'react-icons/lu';

import BlogPost from '@/components/Blogs/shared/BlogPost';
import BlogPostSkleton from '@/components/Blogs/shared/BlogPostSkleton';
import Button from '@/components/Button';
import Heading from '@/components/Heading';
import { selectBlogCards } from '@/components/Blogs/shared/blogFeed';

interface ServiceJournalProps {
  /** Service slug the posts are tagged with (`post.serviceSlug`). */
  serviceSlug: string;
  /** Service title — used in the heading accent. */
  serviceTitle: string;
  /** Parent category slug — the "read more" link's ?category= filter. */
  categorySlug: string;
  /** Parent category title — right eyebrow, matching the other sections. */
  categoryTitle: string;
}

/**
 * Service-scoped "From the journal" — the detail-page sibling of
 * CategoryJournal (category pages). Surfaces the posts tagged with this
 * exact service via `post.serviceSlug`, closing the services → blogs
 * internal-link loop; renders nothing while a service has no tagged posts.
 * Same server-side slim-card selection — the registry never reaches the
 * client chunk.
 */
const ServiceJournal = ({
  serviceSlug,
  serviceTitle,
  categorySlug,
  categoryTitle,
}: ServiceJournalProps) => {
  const posts = selectBlogCards({ serviceSlug, limit: 3 });
  if (posts.length === 0) return null;

  return (
    <section className="pb-16 sm:pb-24">
      <Heading
        titleTag="h2"
        seperatorTitle="From the journal"
        eyebrowRight={categoryTitle}
        title="Guides & insights"
        titleAccent={`for ${serviceTitle.toLowerCase()}.`}
        description={`Articles from our studio journal on ${serviceTitle.toLowerCase()} — strategy, process, and lessons from real client work.`}
        containerStyle="mb-10"
      />

      <Suspense fallback={<BlogPostSkleton />}>
        <BlogPost posts={posts} enableFiltering={false} showFilters={false} />
      </Suspense>

      <div className="mt-10 flex justify-center">
        <Link href={`/blogs?category=${categorySlug}`}>
          <Button variant="secondary" icon={LuBookOpenText}>
            Read more on the journal
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default ServiceJournal;
