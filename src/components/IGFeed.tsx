import { Container, Heading } from '../components';
const IGFeed = () => {
  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle="08 — Instagram"
        eyebrowRight="Social Feed"
        title="Latest on Instagram"
        titleAccent="Behind the scenes from the studio."
        description="Recent posts, reels, and behind-the-scenes updates from Perseus Creative Studio."
        containerStyle="mb-10"
        titleStyle="max-w-4xl"
        descStyle="max-w-3xl"
      />
      <Container>
        <iframe
          src="https://70ce49832b1742b587f32a43861c3cd1.elf.site"
          className="border-0 rounded-3xl w-[calc(100%+12px)] md:w-full h-[750]"
        />
      </Container>
    </section>
  );
};

export default IGFeed;
