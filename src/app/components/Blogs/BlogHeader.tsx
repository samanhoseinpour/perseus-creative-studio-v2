import { Container, TextShimmer } from '@/app/components';

const BlogHeader = () => {
  return (
    <section className="mb-8 pt-48">
      <Container className="text-center">
        <h1 className="text-4xl leading-4xl font-bold sm:text-5xl sm:leading-5xl">
          Digital Marketing Blogs & Articles
        </h1>
        <TextShimmer className="mt-2 text-sm leading-sm">
          Digital Marketing research, case studies, and updates from Perseus
          Creative Studio for Vancouver businesses.
        </TextShimmer>
      </Container>
    </section>
  );
};

export default BlogHeader;
