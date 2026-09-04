// Posts per page on /blogs. Lives in its own tiny module so the client-side
// grid (components/Blogs/shared/BlogPost.tsx) can import the number without
// dragging the whole blogPosts registry into the browser bundle.
// Server-side consumers import it from here directly too (`@/constants/blogPagination`).
export const BLOG_PAGE_SIZE = 12;

/** "More articles" page size on /blogs/authors/[author]. */
export const AUTHOR_PAGE_SIZE = 6;
