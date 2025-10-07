import Link from 'next/link';
import { LayoutTextFlip, Container, Button, Globe } from '@/app/components';

const HomeWelcome = () => {
  return (
    <section className="pb-16">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="flex flex-col items-start justify-center gap-4">
            <LayoutTextFlip
              text="Welcome to "
              words={[
                'Perseus Creative Studio',
                'Strategic Design',
                'Creative Technology',
                'Brand Evolution',
                'Brand Strategy',
                'Digital Products',
                'Immersive Experiences',
                'Design Systems',
                'Prototyping & R&D',
                'AI‑Assisted Workflows',
                'Content Systems',
                'Data‑Driven Creativity',
              ]}
            />
            <p className="text-md leading-md sm:text-lg sm:leading-lg text-black dark:text-white">
              Perseus is a strategy‑led creative studio building brands, digital
              products, and experiences for the next decade. We blend research,
              design systems, and creative technology—AI where it adds value—to
              ship identities, websites, and content engines that scale. We
              partner with founders and marketing teams to move metrics, not
              just aesthetics.
            </p>
            <p className="text-md leading-md sm:text-lg sm:leading-lg text-black dark:text-white">
              Our engagements are lean and outcome-driven: discovery sprints to
              identify the highest-leverage opportunities, modular brand systems
              built to evolve, and production pipelines that pair creative
              tooling with analytics. We embed with your team to validate
              fast—pilots, prototypes, and measurable lift across acquisition,
              conversion, and retention.
            </p>
            <div className="flex items-start justify-start mt-8 gap-4">
              <Link href="/services" className="">
                <Button size="medium">Explore Our Services</Button>
              </Link>
              <Link href="/about" className="">
                <Button size="medium">Learn More</Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-center items-center">
            <Globe />
          </div>
        </div>
      </Container>
    </section>
  );
};

export default HomeWelcome;
