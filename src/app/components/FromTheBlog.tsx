import { BlogPost, Heading, BlogPostSkleton } from '@/app/components';
import { Suspense } from 'react';

const FromTheBlog = () => {
  return (
    <section className="mb-16">
      <Heading
        title="From the Blog"
        titleTag="h3"
        description="Fresh perspectives on strategy, design, and creative technology—selected highlights from our studio journal."
        seperatorTitle="Latest Research and Marketing Insights"
      />
      <Suspense fallback={<BlogPostSkleton />}>
        <BlogPost limit={4} enableFiltering={false} showFilters={false} />
      </Suspense>
    </section>
  );
};

export default FromTheBlog;
