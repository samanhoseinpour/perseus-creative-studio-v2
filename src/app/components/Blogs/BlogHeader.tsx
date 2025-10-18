import { Container } from "@/app/components";

const BlogHeader = () => {
  return (
    <section className="mb-16 pt-32">
      <Container className="max-w-4xl text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">
          Perseus Blogs & Articles
        </h1>
        <p className="mt-2 text-md leading-md text-background-contrast-white">
          Research, case studies, and updates from Perseus Creative Studio—on
          brand, product, and the systems that move businesses forward.
        </p>
      </Container>
    </section>
  );
};

export default BlogHeader;
