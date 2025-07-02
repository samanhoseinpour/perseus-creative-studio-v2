'use client';

import { useAnimate } from 'framer-motion';
import {
  Availability,
  Colors,
  Music,
  SchedulingLinks,
  Team,
  Todo,
} from './Card';
import { Title } from './Title';

import { Container, ServicesTitle } from '../..';

const servicesFeatures = [
  {
    title: 'Services #1',
    desc: 'We specialize in crafting innovative and tailored solutions to bring your unique ideas to life. Whether it’s design, development, or creative strategy, our goal is to turn your vision into impactful realities that exceed expectations.',
    id: 'todo-list',
    card: Todo,
  },
  {
    title: 'Services #2',
    desc: 'Transforming creative concepts into functional, tangible designs is our expertise. From initial brainstorming to final execution, we ensure every detail inspires and delivers exceptional value to your project.',
    id: 'colors',
    card: Colors,
  },
  {
    title: 'Services #3',
    desc: 'We work closely with clients to create tailored strategies that deliver measurable results and exceed expectations, driving growth and success.',
    id: 'availability',
    card: Availability,
  },
  {
    title: 'Services #4',
    desc: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti ad doloremque, aliquid quo cum praesentium. Quisquam fugiat, provident nihil porro temporibus cumque dolore iusto accusamus eveniet obcaecati vitae soluta reprehenderit.',
    id: 'music',
    card: Music,
  },
  {
    title: 'Services #5',
    desc: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti ad doloremque, aliquid quo cum praesentium. Quisquam fugiat, provident nihil porro temporibus cumque dolore iusto accusamus eveniet obcaecati vitae soluta reprehenderit.',
    id: 'scheduling-links',
    card: SchedulingLinks,
  },
  {
    title: 'Services #6',
    desc: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti ad doloremque, aliquid quo cum praesentium. Quisquam fugiat, provident nihil porro temporibus cumque dolore iusto accusamus eveniet obcaecati vitae soluta reprehenderit.',
    id: 'team',
    card: Team,
  },
];

const Services = () => {
  const [scope] = useAnimate();

  return (
    <section>
      <Container className="flex flex-col">
        <ServicesTitle />
        <div ref={scope}>
          <div className="flex w-full items-start gap-20">
            <div className="w-full py-[50vh]">
              <ul>
                {servicesFeatures.map((feature) => (
                  <li key={feature.id}>
                    <Title id={feature.id}>
                      <div className="flex flex-col gap-4">
                        <h3 className="text-4xl leading-4xl font-semibold">
                          {feature.title}
                        </h3>
                        <p className="text-xl leading-xl">{feature.desc}</p>
                      </div>
                    </Title>
                  </li>
                ))}
              </ul>
            </div>
            <div className="sticky top-0 flex h-screen w-full items-center">
              <div className="relative aspect-square w-full rounded-2xl bg-[url('https://ik.imagekit.io/perseus/homeServices-1.JPG')] bg-cover bg-center [&:has(>_.active-card)]:bg-transparent">
                {servicesFeatures.map((feature) => (
                  <feature.card id={feature.id} key={feature.id} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Services;
