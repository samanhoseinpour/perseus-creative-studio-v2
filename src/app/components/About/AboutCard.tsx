import { CustomCard, Container, TextEffect } from "..";

const AboutCard = () => {
  return (
    <section className="bg-white text-black pb-16 sm:pb-32">
      <Container className="border-t">
        <TextEffect
          as="span"
          className="-ml-6 -mt-3.5 block w-max bg-gray-50 px-6"
        >
          What You Can Expect From Us
        </TextEffect>
        <TextEffect
          as="h3"
          className="mt-12 sm:mt-24 font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl "
        >
          Agency Services
        </TextEffect>
        <TextEffect
          as="p"
          per="line"
          delay={0.5}
          className="text-sm font-semibold text-black/70 pb-4"
        >
          Our operating rhythm is simple: align on outcomes fast, plan
          deliberately, build with focus, then launch and iterate based on
          signal—not noise.
        </TextEffect>
        <div className="grid max-lg:grid-cols-1 grid-cols-2 gap-4 mt-6">
          <CustomCard
            tintColor="background-contrast-white"
            title="Brand & Strategy"
            description="Positioning, identity, and go-to-market plans that set the foundation."
            detailContent="Research-driven positioning and messaging, brand identity systems and guidelines, campaign planning, and measurable go-to-market roadmaps that align teams and accelerate growth."
          ></CustomCard>
          <CustomCard
            tintColor="background-contrast-white"
            title="Web & Product"
            description="High-performance websites and digital experiences."
            detailContent="Design and build of fast, accessible websites and products using modern stacks (e.g., Next.js), headless CMS integrations, eCommerce, UX/UI, analytics, and ongoing optimization."
          ></CustomCard>
        </div>
        <div className="mt-4">
          <CustomCard
            tintColor="background-contrast-white"
            title="Visual Production"
            description="End-to-end film, photo, and motion for campaigns."
            detailContent="Creative development, on-set production, post-production, and 2D/3D motion design for brand, product, and social content - delivered through our director network and studio partners."
          ></CustomCard>
        </div>
      </Container>
    </section>
  );
};

export default AboutCard;
