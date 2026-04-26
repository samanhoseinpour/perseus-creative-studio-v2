import Link from 'next/link';
import { Container, CountUp, TextShimmer } from './';

const stats = [
  { id: 1, name: 'Countries', value: 7 },
  { id: 2, name: 'Clients Served', value: 90 },
  { id: 3, name: 'Videos Produced', value: 3000 },
  { id: 4, name: 'Websites Developed', value: 14 },
];

const Stats = () => {
  return (
    <section className="section-padding">
      <Container className="flex flex-col gap-12">
        <dl className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.id} className="flex max-w-xs flex-col gap-y-4">
              <dt className="md:text-2xl md:leading-2xl font-semibold">
                {stat.name}
              </dt>
              <dd className="order-first text-4xl leading-4xl font-bold">
                +
                <CountUp
                  from={0}
                  to={stat.value}
                  separator=","
                  direction="up"
                  duration={1}
                  className="count-up-text"
                />
              </dd>
            </div>
          ))}
        </dl>

        <p>
          We started in Vancouver and have been working with clients around the
          world ever since. We&apos;re a full-service creative and marketing
          studio. Branding, content, video production, web design, and digital
          marketing — we handle it all in-house. Our clients range from small
          local businesses to international brands, and we approach every
          project the same way regardless of size. We know what works and we
          focus on results that actually move the needle for our clients.
        </p>

        <Link href="/contact" className="flex justify-center items-center">
          <TextShimmer className="sm:text-4xl sm:leading-4xl text-xl leading-xl font-semibold text-center">
            Together, Let’s Create Something Extraordinary.
          </TextShimmer>
        </Link>
      </Container>
    </section>
  );
};

export default Stats;
