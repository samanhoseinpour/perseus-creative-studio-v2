import { BlogHeader, BlogPost, BlogPostSkleton } from '@/app/components';
import { Suspense } from 'react';

const BlogGrid = () => {
  return (
    <section className="">
      <BlogHeader />

      <Suspense fallback={<BlogPostSkleton count={8} showFilters={true} />}>
        <BlogPost />
      </Suspense>
    </section>
  );
};

export default BlogGrid;
