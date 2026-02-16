import Link from 'next/link';
import { LayoutTextFlip, Container, Button, Globe } from '@/app/components';

const HomeWelcome = () => {
  return (
    <section className="pb-16 pt-48 z-20">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="flex flex-col items-start justify-center gap-4">
            <LayoutTextFlip
              text="Welcome to "
              words={[
                'Perseus Creative Studio',
                'Brand Evolution',
                'Marketing That Works',
                'Creative Strategy',
                'Digital Growth',
                'Design That Connects',
                'Your Next Big Move',
                'Results That Matter',
              ]}
            />

            <h2 className="text-sm leading-sm text-black">
              We’re a <strong>creative marketing agency</strong> helping brands
              grow through design, strategy, and storytelling that delivers
              results. Our team blends creativity with data-driven insight to
              craft work that looks beautiful and performs even better.
            </h2>
            <h2 className="text-sm leading-sm text-black">
              We specialize in{' '}
              <strong>
                branding, web design, video production, and content marketing
              </strong>{' '}
              — creating visuals and experiences that connect your business with
              the right audience.
            </h2>
            <h2 className="text-sm leading-sm text-black">
              From logo design and brand identity systems to digital campaigns,
              photography, and social content, we handle every step of the
              creative process. Whether you’re launching a new brand or scaling
              an existing one, our mission is to help you build an identity that
              stands out, inspires trust, and drives real growth.
            </h2>
            <div className="flex items-start justify-start mt-8 gap-4">
              <Link href="/services" className="">
                <Button size="medium">Explore Our Services</Button>
              </Link>
              <Link href="/about" className="">
                <Button size="medium">Who We Are</Button>
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
