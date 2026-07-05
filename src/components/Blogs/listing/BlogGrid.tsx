import BlogCta from '@/components/Blogs/listing/BlogCta';
import BlogHeader from '@/components/Blogs/listing/BlogHeader';
import BlogPost from '@/components/Blogs/shared/BlogPost';
import Faqs from '@/components/Faqs';
import { BLOG_INDEX_FAQS } from '@/constants/blogs';
import { BLOG_PAGE_SIZE } from '@/constants/blogPagination';
import {
  BLOG_FILTER_CATEGORIES,
  TOTAL_BLOG_POST_COUNT,
  selectBlogCards,
} from '../shared/blogFeed';

type BlogGridProps = {
  initialCategory?: string;
  initialPage?: number;
};

const BlogGrid = ({ initialCategory, initialPage }: BlogGridProps) => {
  // Server-side selection: the client grid receives slim card data (plus the
  // filter-rail aggregates) instead of importing the blogPosts registry itself
  // — see blogFeed.ts. An unknown ?category= slug yields an empty list, which
  // the grid renders as its clear-filters state.
  //
  // Sliced to the requested page here (page/filter switches are <Link> navs,
  // so a fresh server render happens anyway): serializing the whole filtered
  // archive into the flight payload only to render one page was dead weight
  // that grew with every post. Same clamp the grid applies client-side.
  const filtered = selectBlogCards({
    categorySlug: initialCategory || undefined,
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / BLOG_PAGE_SIZE));
  const activePage = Math.min(
    Math.max(1, Math.floor(initialPage ?? 1)),
    totalPages,
  );
  const pagePosts = filtered.slice(
    (activePage - 1) * BLOG_PAGE_SIZE,
    activePage * BLOG_PAGE_SIZE,
  );

  return (
    <>
      <BlogHeader />

      <BlogPost
        posts={pagePosts}
        totalFilteredCount={filtered.length}
        categories={BLOG_FILTER_CATEGORIES}
        totalCount={TOTAL_BLOG_POST_COUNT}
        initialCategory={initialCategory}
        initialPage={initialPage}
        prioritizeFirst
      />

      <Faqs
        title="Frequently Asked Questions"
        description="What we publish, who writes it, and how to use what you read here. If your question is not covered, get in touch."
        faqs={BLOG_INDEX_FAQS}
      />

      <BlogCta />
    </>
  );
};

export default BlogGrid;
