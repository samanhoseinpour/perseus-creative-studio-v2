import { BlogPost, Heading, Skleton } from '@/app/components';
import { Suspense } from 'react';

const FromTheBlog = () => {
  return (
    <section className="mb-16">
      <Heading
        title="From the Blog"
        titleTag="h3"
        description="Fresh perspectives on strategy, design, and creative technology—selected highlights from our studio journal."
        seperatorTitle="Latest Research and Marketing Insights"
        seperatorTitleStyle="text-white"
        titleStyle="text-white"
        descStyle="text-white/70"
        containerStyle="border-white"
      />
      <Suspense fallback={<Skleton />}>
        <BlogPost limit={4} enableFiltering={false} showFilters={false} />
      </Suspense>
    </section>
  );
};

export default FromTheBlog;
