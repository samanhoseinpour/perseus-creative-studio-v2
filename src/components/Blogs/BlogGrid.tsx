import { BlogHeader, BlogPost, BlogPostSkleton } from '@/components';
import { Suspense } from 'react';

const BlogGrid = () => {
  return (
    <section>
      <BlogHeader />

      <Suspense fallback={<BlogPostSkleton count={8} showFilters={true} />}>
        <BlogPost />
      </Suspense>
    </section>
  );
};

export default BlogGrid;
