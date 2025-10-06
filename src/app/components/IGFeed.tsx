import { Container, TextEffect } from "../components";
const IGFeed = () => {
  return (
    <section className="bg-white text-black">
      <Container className="border-t">
        <TextEffect
          as="span"
          className="-ml-6 -mt-3.5 block w-max bg-gray-50 px-6 dark:bg-gray-950"
        >
          Follows Us on Instagram
        </TextEffect>
        <TextEffect
          as="h3"
          className="mt-12 sm:mt-24 font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl "
        >
          Latest on Instagram
        </TextEffect>
        <TextEffect
          as="p"
          per="line"
          delay={0.5}
          className="text-sm font-semibold text-black/70"
        >
          Recent posts, reels, and behind-the-scenes updates.
        </TextEffect>
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
