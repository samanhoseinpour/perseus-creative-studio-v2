import { BlogHeader, BlogPost, TextShimmer } from '@/app/components';
import { Suspense } from 'react';

const BlogGrid = () => {
  return (
    <section className="">
      <BlogHeader />
      <Suspense
        fallback={<TextShimmer>Loading related articles...</TextShimmer>}
      >
        <BlogPost />
      </Suspense>
    </section>
  );
};

export default BlogGrid;
