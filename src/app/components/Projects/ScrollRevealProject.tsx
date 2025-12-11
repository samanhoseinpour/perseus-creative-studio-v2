import { Container, Button, BlogPost } from "../";
import ScrollRevealParagraph from "@/components/smoothui/scroll-reveal-paragraph";

const ScrollRevealProject = () => {
  const p1 = `Perseus Creative Studio is a full-service production and digital studio for real estate, construction, fitness, and local brands. We handle cinematic videography, photography, website development, branding, ads, and social content—plus aerial production, floorplans, and Matterport 3D tours. Tell us what you need to showcase and we’ll build the visuals and platforms to market it properly.`;

  return (
    <section className="bg-white">
      <Container className="flex flex-col gap-12">
        <h3 className="text-5xl leading-5xl md:text-7xl md:leading-7xl font-semibold text-center text-black text-gradient">
          Let&apos;s make something big.
        </h3>
        <ScrollRevealParagraph paragraph={p1} />
        <Button>Get In Touch With Us</Button>
        <BlogPost limit={3} />
      </Container>
    </section>
  );
};

export default ScrollRevealProject;
