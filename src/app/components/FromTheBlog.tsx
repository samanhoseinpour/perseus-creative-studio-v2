import { BlogPost, Heading } from "@/app/components";

const FromTheBlog = () => {
  return (
    <section className="mb-16">
      <Heading
        title="From the Blog"
        titleTag="h3"
        seperatorTitle="Latest thinking, Research and Market Insights"
        description="Fresh perspectives on strategy, design, and creative technology—selected highlights from our studio journal."
        seperatorTitleStyle="text-white"
        titleStyle="text-white"
        descStyle="text-white/70"
        containerStyle="border-white"
      />
      <BlogPost limit={3} />
    </section>
  );
};

export default FromTheBlog;
