import { Container, Heading } from "../components";
const IGFeed = () => {
  return (
    <section className="bg-white text-black pt-16 sm:pt-32">
      <Heading
        seperatorTitle="Follows Us on Instagram"
        title="Latest on Instagram"
        titleTag="h3"
        description="Recent posts, reels, and behind-the-scenes updates."
      />
      <Container>
        <iframe
          src="https://70ce49832b1742b587f32a43861c3cd1.elf.site"
          className="mt-10 border-0 rounded-3xl w-[calc(100%+12px)] md:w-full h-[750] md:h-[900px]"
        />
      </Container>
    </section>
  );
};

export default IGFeed;
