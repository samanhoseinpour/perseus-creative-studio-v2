import { Container, Heading } from '../components';
const IGFeed = () => {
  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle="Instagram"
        eyebrowRight="Social Feed"
        title="Latest on Instagram"
        titleAccent="Behind the scenes from the studio."
        description="Recent posts, reels, and behind-the-scenes updates from Perseus Creative Studio."
        containerStyle="mb-10"
        titleStyle="max-w-4xl"
        descStyle="max-w-3xl"
      />
      <Container>
        <div className="relative">
          <iframe
            src="https://70ce49832b1742b587f32a43861c3cd1.elf.site"
            title="Perseus Creative Studio on Instagram"
            loading="lazy"
            className="border-0 rounded-3xl w-[calc(100%+12px)] md:w-full h-[750]"
          />
          {/* The Elfsight widget renders a white footer strip we can't restyle
              cross-origin. Mask it in dark mode (it blends with the page in
              light mode, so no mask there). */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-12 rounded-b-3xl bg-background dark:block" />
        </div>
      </Container>
    </section>
  );
};

export default IGFeed;
