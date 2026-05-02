import { Container, Heading } from '@/components';

const BlogHeader = () => {
  return (
    <section className="pb-12 pt-24 sm:pt-32">
      <Container>
        <Heading
          titleTag="h1"
          seperatorTitle="Blog"
          eyebrowRight="Studio Notes"
          title="Digital Marketing Blogs & Articles"
          titleAccent="Research, case studies, and practical updates."
          description="Digital marketing research, case studies, and updates from Perseus Creative Studio for Vancouver businesses."
          containerStyle="px-0 md:px-0 w-full max-w-none items-center text-center"
          titleStyle="max-w-4xl text-center text-4xl md:text-5xl"
          descStyle="max-w-2xl text-center"
        />
      </Container>
    </section>
  );
};

export default BlogHeader;
