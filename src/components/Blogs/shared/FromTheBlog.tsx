import { Button, Heading } from '@/components';
import BlogCard from './BlogCard';
import JournalShelf from './JournalShelf';
import { blogPosts } from '@/constants/blogs';
import Link from 'next/link';
import { LuBookOpenText as BookOpenText, LuCompass as Compass } from 'react-icons/lu';

// Newest-first, tie-broken by id — same ordering the /blogs grid uses. Computed
// once at module load since `blogPosts` is a build-time constant.
const SORTED_POSTS = [...blogPosts].sort((a, b) => {
  const bt = Date.parse(b.datetime);
  const at = Date.parse(a.datetime);
  const bTime = Number.isFinite(bt) ? bt : 0;
  const aTime = Number.isFinite(at) ? at : 0;
  if (bTime !== aTime) return bTime - aTime;
  return b.id - a.id;
});

// Cards offered in the shelf. The homepage feed easily fills this; a scoped
// project category shows however many posts that discipline has.
const FEED_LIMIT = 12;

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

  const feed = (
    scoped
      ? SORTED_POSTS.filter((p) => p.category.slug === categorySlug)
      : SORTED_POSTS
  ).slice(0, FEED_LIMIT);

  // Scoped to a discipline with no journal entries yet (e.g. branding) — drop
  // the band entirely rather than show an empty shelf.
  if (scoped && feed.length === 0) {
    return null;
  }

  const discipline = categoryTitle?.toLowerCase();

  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle={seperatorTitle ?? 'Studio Journal'}
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

      <JournalShelf
        label={scoped ? `Notes on ${discipline}` : 'From the studio journal'}
      >
        {feed.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </JournalShelf>

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
