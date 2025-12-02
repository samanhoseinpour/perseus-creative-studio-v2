import Link from "next/link";
import { Container, CountUp, TextShimmer } from "./";

const stats = [
  { id: 1, name: "Countries", value: 5 },
  { id: 2, name: "Clients", value: 25 },
  { id: 3, name: "Videos Produced", value: 3000 },
  { id: 4, name: "Websites Developed", value: 8 },
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

        <div className="first-letter:text-5xl first-letter:font-bold first-letter:me-3 first-letter:float-start">
          <span className="text-md">Perseus Creative Studio</span> – our journey
          is driven by passion, creativity, and meaningful results. From
          collaborating with{" "}
          <span className="text-md">
            <TextShimmer>+25 Clients</TextShimmer>
          </span>{" "}
          across{" "}
          <span className="text-md">
            <TextShimmer>+5 Countries</TextShimmer>
          </span>{" "}
          to producing{" "}
          <span className="text-md">
            <TextShimmer>+3000 Videos </TextShimmer>
          </span>{" "}
          and launching{" "}
          <span className="text-md">
            <TextShimmer>+14 Websites</TextShimmer>
          </span>
          , our numbers speak to a legacy of excellence. We&apos;ve completed{" "}
          <span className="text-md">+150 Projects</span>, delivered{" "}
          <span className="text-md">
            <TextShimmer>+200 Aerial Shoots</TextShimmer>
          </span>
          , and served{" "}
          <span className="text-md">
            <TextShimmer>+10 Industries</TextShimmer>
          </span>
          .
        </div>

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
