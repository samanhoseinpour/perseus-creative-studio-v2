import { BlogPost, Heading } from "@/app/components";

const FromTheBlog = () => {
  return (
    <section className="mb-16">
      <Heading
        title="From the Blog"
        titleTag="h3"
        description="Fresh perspectives on strategy, design, and creative technology—selected highlights from our studio journal."
      />
      <BlogPost limit={3} />
    </section>
  );
};

export default FromTheBlog;
