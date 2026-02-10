import { Container } from '@/app/components';

const BlogHeader = () => {
  return (
    <section className="mb-16 pt-32">
      <Container className="text-center">
        <h1 className="text-4xl leading-4xl font-bold sm:text-5xl sm:leading-5xl">
          Digital Marketing Blogs & Articles
        </h1>
        <h2 className="mt-2 text-md leading-md text-background-contrast-white">
          Digital Marketing research, case studies, and updates from Perseus
          Creative Studio for Vancouver businesses.
        </h2>
      </Container>
    </section>
  );
};

export default BlogHeader;
