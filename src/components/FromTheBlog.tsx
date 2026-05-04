import { BlogPost, Button, Heading, BlogPostSkleton } from '@/components';
import { Suspense } from 'react';
import Link from 'next/link';
import { BookOpenText, Compass } from 'lucide-react';

const FromTheBlog = () => {
  return (
    <section className='py-16'>
      <Heading
        titleTag="h2"
        seperatorTitle="08 — Studio Journal"
        eyebrowRight="Research · Marketing · Creative Technology"
        title="From the Blog"
        titleAccent="Ideas for sharper brand decisions."
        description="Fresh perspectives on strategy, design, marketing, and creative technology — selected insights from our studio journal."
        containerStyle="mb-10"
      />
      <Suspense fallback={<BlogPostSkleton />}>
        <BlogPost limit={4} enableFiltering={false} showFilters={false} />
      </Suspense>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/blogs">
          <Button variant="primary" icon={BookOpenText}>
            Read the Journal
          </Button>
        </Link>
        <Link href="/services">
          <Button variant="secondary" icon={Compass}>
            Explore Services
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default FromTheBlog;
