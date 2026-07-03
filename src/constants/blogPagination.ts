// Posts per page on /blogs. Lives in its own tiny module so the client-side
// grid (components/Blogs/shared/BlogPost.tsx) can import the number without
// dragging the whole blogPosts registry into the browser bundle.
// constants/blogs.ts re-exports it for the server-side consumers.
export const BLOG_PAGE_SIZE = 12;
