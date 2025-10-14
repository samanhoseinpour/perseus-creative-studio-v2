import { Container, Heading } from "../components";
const IGFeed = () => {
  return (
    <section className="bg-white text-black">
      <Heading
        seperatorTitle="Follows Us on Instagram"
        title="Latest on Instagram"
        titleTag="h3"
        description="Recent posts, reels, and behind-the-scenes updates."
      />
      <Container>
        <iframe
          src="https://70ce49832b1742b587f32a43861c3cd1.elf.site"
          width="100%"
          height="1000"
          className="mt-10 border-0 rounded-2xl"
        />
      </Container>
    </section>
  );
};

export default IGFeed;
