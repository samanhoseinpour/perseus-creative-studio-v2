import { BlogHeader, BlogPost, BlogBackground } from "@/app/components";

const BlogGrid = () => {
  return (
    <section className="relative overflow-hidden ">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <BlogBackground
          colorStops={["#4A4A4A", "#272757", "#660033"]}
          blend={1}
          amplitude={1.5}
          speed={0.5}
        />
      </div>

      <div className="relative z-10">
        <BlogHeader />
        <BlogPost />
      </div>
    </section>
  );
};

export default BlogGrid;
