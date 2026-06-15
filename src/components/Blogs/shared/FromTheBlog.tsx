import { BlogPost, Button, Heading, BlogPostSkleton } from '@/components';
import { blogPosts } from '@/constants/blogs';
import { Suspense } from 'react';
import Link from 'next/link';
import { LuBookOpenText as BookOpenText, LuCompass as Compass } from 'react-icons/lu';

interface FromTheBlogProps {
  /**
   * Scope the feed to one category. Project and blog category slugs align 1:1
   * (production / websites / digital-marketing / social), so the project pages
   * pass their own slug straight through. Omit for the homepage's
   * latest-across-all feed.
   */
  categorySlug?: string;
  /** Category label woven into the scoped copy, e.g. "Production". */
  categoryTitle?: string;
  /** Mono separator label override (e.g. a project category's "Reading"). */
  seperatorTitle?: string;
}

const FromTheBlog = ({
  categorySlug,
  categoryTitle,
  seperatorTitle,
}: FromTheBlogProps) => {
  const scoped = Boolean(categorySlug);

  // Scoped to a discipline with no journal entries yet (e.g. branding) — drop
  // the band entirely rather than show BlogPost's empty "no related posts" state.
  if (scoped && !blogPosts.some((p) => p.category.slug === categorySlug)) {
    return null;
  }

  const discipline = categoryTitle?.toLowerCase();

  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle={seperatorTitle ?? '10 — Studio Journal'}
        eyebrowRight={
          scoped
            ? 'Studio Journal'
            : 'Research · Marketing · Creative Technology'
        }
        title="From the Blog"
        titleAccent={
          scoped
            ? `Notes on ${discipline}.`
            : 'Ideas for sharper brand decisions.'
        }
        description={
          scoped
            ? `Working notes on ${discipline} from the studio journal — the thinking behind the files in this drawer.`
            : 'Fresh perspectives on strategy, design, marketing, and creative technology — selected insights from our studio journal.'
        }
        containerStyle="mb-10"
      />
      <Suspense fallback={<BlogPostSkleton />}>
        <BlogPost
          limit={4}
          enableFiltering={false}
          showFilters={false}
          forcedCategorySlug={categorySlug}
        />
      </Suspense>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href={scoped ? `/blogs?category=${categorySlug}` : '/blogs'}>
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
