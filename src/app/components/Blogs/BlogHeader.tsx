import { Container, TextShimmer } from '@/app/components';

const BlogHeader = () => {
  return (
    <section className="mb-8 pt-32">
      <Container className="text-center">
        <h1 className="text-3xl leading-3xl font-bold sm:text-4xl sm:leading-4xl">
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
