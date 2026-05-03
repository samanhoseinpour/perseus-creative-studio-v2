import Link from 'next/link';
import {
  LayoutTextFlip,
  Container,
  Button,
  Globe,
  Heading,
} from '@/components';

const HomeWelcome = () => {
  return (
    <section className="py-16 z-20">
      <Container>
        <Heading
          titleTag="h2"
          seperatorTitle="02 — Welcome"
          eyebrowRight="Creative · Marketing · Growth"
          title="Welcome to Perseus Creative Studio"
          titleAccent="Strategy, design, content, and digital built to grow brands."
          description="We help ambitious teams shape sharper identities, launch stronger campaigns, and create digital experiences that connect with the right audience."
          containerStyle="px-0 md:px-0 mb-7"
          titleStyle="max-w-4xl"
          descStyle="max-w-3xl"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-start">
          <div className="flex flex-col items-start max-w-2xl">
            <div className="mb-6">
              <LayoutTextFlip
                text="Built for "
                words={[
                  'Brand Evolution',
                  'Marketing That Works',
                  'Creative Strategy',
                  'Digital Growth',
                  'Design That Connects',
                  'Your Next Big Move',
                  'Results That Matter',
                ]}
              />
            </div>

            <div className="space-y-3 text-sm leading-6 text-black/65 dark:text-white/65">
              <p>
                We’re a{' '}
                <strong className="font-semibold text-black dark:text-white">
                  creative marketing agency
                </strong>{' '}
                helping brands grow through design, strategy, and storytelling
                that delivers results. Our team blends creativity with
                data-driven insight to craft work that looks beautiful and
                performs even better.
              </p>
              <p>
                We specialize in{' '}
                <strong className="font-semibold text-black dark:text-white">
                  branding, web design, video production, and content marketing
                </strong>{' '}
                — creating visuals and experiences that connect your business
                with the right audience.
              </p>
              <p>
                From logo design and brand identity systems to digital
                campaigns, photography, and social content, we handle every step
                of the creative process. Whether you’re launching a new brand or
                scaling an existing one, our mission is to help you build an
                identity that stands out, inspires trust, and drives real growth.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start justify-start mt-8 gap-3">
              <Link href="/services">
                <Button size="medium">Explore Our Services</Button>
              </Link>
              <Link href="/about">
                <Button size="medium">Who We Are</Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-center items-start lg:-mt-16">
            <Globe />
          </div>
        </div>
      </Container>
    </section>
  );
};

export default HomeWelcome;
