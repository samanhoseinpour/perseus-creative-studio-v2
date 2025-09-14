import { BlogsParallaxHero, BlogGrid } from "../components";

export const metadata = {
  title: "Blogs | Perseus Creative Studio",
  description:
    "Explore the latest news, insights, and updates from Perseus Creative Studio. about Marketing, Visual Production, and Website Development & Design",
};

const BlogsPage = () => {
  return (
    <main>
      <BlogsParallaxHero />
      <BlogGrid />
    </main>
  );
};

export default BlogsPage;
