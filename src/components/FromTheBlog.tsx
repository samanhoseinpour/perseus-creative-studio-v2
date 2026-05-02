import { BlogPost, Heading, BlogPostSkleton } from '@/components';
import { Suspense } from 'react';

const FromTheBlog = () => {
  return (
    <section>
      <Heading
        titleTag="h2"
        seperatorTitle="07 — Studio Journal"
        eyebrowRight="Research · Marketing · Creative Technology"
        title="From the Blog"
        titleAccent="Ideas for sharper brand decisions."
        description="Fresh perspectives on strategy, design, marketing, and creative technology — selected insights from our studio journal."
        containerStyle="mb-10"
      />
      <Suspense fallback={<BlogPostSkleton />}>
        <BlogPost limit={4} enableFiltering={false} showFilters={false} />
      </Suspense>
    </section>
  );
};

export default FromTheBlog;
