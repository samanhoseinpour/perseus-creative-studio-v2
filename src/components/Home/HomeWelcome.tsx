import Link from 'next/link';
import { LuCompass as Compass, LuHandshake as Handshake } from 'react-icons/lu';
import LayoutTextFlip from '@/components/ui/LayoutTextFlip';
import Container from '@/components/ui/Container';
import Button from '@/components/Button';
// Lazy client boundary — keeps cobe/WebGL out of the shared eager chunk.
import Globe from '@/components/GlobeLazy';
import Heading from '@/components/Heading';

const HomeWelcome = () => {
  return (
    <section className="py-16 z-20">
      <Container>
        <Heading
          titleTag="h2"
          seperatorTitle="Welcome"
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

            <div className="space-y-3 text-sm leading-6 text-black/65">
              <p>
                Perseus Creative Studio is a{' '}
                <strong className="font-semibold text-black">
                  marketing agency in Vancouver, BC
                </strong>
                , working with businesses across North America. We blend
                creative craft with data-driven insight, work that looks
                beautiful and performs even better.
              </p>
              <p>
                We specialize in{' '}
                <strong className="font-semibold text-black">
                  branding, video and photography production, websites, social
                  media, and digital marketing
                </strong>
                . Five disciplines under one roof, so your message stays
                consistent everywhere your audience finds you.
              </p>
              <p>
                From logo design and brand identity to campaigns, photography,
                and social content, we handle every step of the creative
                process. Launching a new brand or scaling one that works? We
                build identities that stand out, earn trust, and drive real
                growth.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start justify-start mt-8 gap-3">
              <Link href="/services">
                <Button
                  size="medium"
                  variant="primary"
                  icon={Compass}
                  className="px-6 shadow-[0_14px_34px_-18px_rgba(0,0,0,0.7)]"
                >
                  Explore Services
                </Button>
              </Link>
              <Link href="/about">
                <Button
                  size="medium"
                  variant="secondary"
                  icon={Handshake}
                  className="px-6"
                >
                  Meet the Studio
                </Button>
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
