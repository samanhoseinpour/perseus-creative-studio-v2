import { Container, Button, FromTheBlog } from "../";
import ScrollRevealParagraph from "@/components/smoothui/scroll-reveal-paragraph";

const ScrollRevealProject = () => {
  const p1 = `Ready to move on a real project—not just explore ideas? Perseus Creative Studio helps teams launch products, refresh brands, and build clear, focused digital experiences. Tell us what you're working on and we'll shape the design around your roadmap.`;

  return (
    <section className="bg-white">
      <Container className="flex flex-col gap-12">
        <h3 className="text-5xl leading-5xl md:text-7xl md:leading-7xl font-semibold text-center text-black">
          Let&apos;s make something big.
        </h3>
        <ScrollRevealParagraph paragraph={p1} className="" />
        <Button>Get In Touch With Us</Button>
        <FromTheBlog />
      </Container>
    </section>
  );
};

export default ScrollRevealProject;
