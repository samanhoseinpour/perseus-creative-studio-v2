import { Container, TextEffect } from "../components";
const IGFeed = () => {
  return (
    <>
      <Container className="pt-16 sm:pt-32 text-center">
        <TextEffect
          as="h3"
          className="font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl"
        >
          Latest on Instagram
        </TextEffect>
        <TextEffect
          as="p"
          per="line"
          delay={0.5}
          className="text-sm font-semibold"
        >
          Recent posts, reels, and behind-the-scenes updates.
        </TextEffect>
        <iframe
          src="https://70ce49832b1742b587f32a43861c3cd1.elf.site"
          width="100%"
          height="1000"
          className="mt-10 border-0"
        ></iframe>
      </Container>
    </>
  );
};

export default IGFeed;
