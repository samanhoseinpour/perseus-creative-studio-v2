import { BlogHeader, BlogPost, BlogPostSkleton } from '@/components';
import { Suspense } from 'react';

type BlogGridProps = {
  initialCategory?: string;
  initialQuery?: string;
};

const BlogGrid = ({ initialCategory, initialQuery }: BlogGridProps) => {
  return (
    <section>
      <BlogHeader />

      <Suspense fallback={<BlogPostSkleton count={8} showFilters={true} />}>
        <BlogPost
          initialCategory={initialCategory}
          initialQuery={initialQuery}
        />
      </Suspense>
    </section>
  );
};

export default BlogGrid;
