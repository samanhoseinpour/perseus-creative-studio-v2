import Link from 'next/link';
import { LayoutTextFlip, Container, Button } from '@/app/components';

const HomeWelcome = () => {
  return (
    <section className="mb-16">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
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

          <div className="flex flex-col gap-4">
            <p className="text-xl leading-xl text-black dark:text-white">
              Perseus is a strategy‑led creative studio building brands, digital
              products, and experiences for the next decade. We blend research,
              design systems, and creative technology—AI where it adds value—to
              ship identities, websites, and content engines that scale. We
              partner with founders and marketing teams to move metrics, not
              just aesthetics.
            </p>
            <Link href="/about" className="flex items-center justify-end">
              <Button>Learn More</Button>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default HomeWelcome;
