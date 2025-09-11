import { Container, TextEffect } from "@/app/components";

const BlogGrid = () => {
  return (
    <section className="h-[100svh] flex justify-center items-center">
      <Container className="max-w-4xl text-center">
        <TextEffect as="h1" className="text-4xl font-bold sm:text-5xl">
          Perseus Blog
        </TextEffect>
        <TextEffect
          as="p"
          per="line"
          delay={0.5}
          className="mt-2 text-md leading-md text-background-contrast-white"
        >
          Research, case studies, and updates from Perseus Creative Studio—on
          brand, product, and the systems that move businesses forward.
        </TextEffect>
      </Container>
    </section>
  );
};

export default BlogGrid;
