'use client';

import { useAnimate } from 'framer-motion';
import {
  Photography,
  WebDevlopment,
  ContentCreation,
  Branding,
  Advertising,
  Smm,
  Videography,
  AerialProduction,
  FloorPlan,
  MatterPort,
} from './Card';
import { Title } from './Title';

import { Container, ServicesTitle } from '..';

const servicesFeatures = [
  {
    id: 1,
    title: 'Videography',
    desc: 'We specialize in crafting innovative and tailored solutions to bring your unique ideas to life. Whether it’s design, development, or creative strategy, our goal is to turn your vision into impactful realities that exceed expectations.',
    card: Videography,
  },
  {
    id: 2,
    title: 'Website Development',
    desc: 'Transforming creative concepts into functional, tangible designs is our expertise. From initial brainstorming to final execution, we ensure every detail inspires and delivers exceptional value to your project.',
    card: WebDevlopment,
  },
  {
    id: 3,
    title: 'Photography',
    desc: 'Perseus statue of a classical figure adjusting a DSLR camera on a tripod with studio lights in the background.',
    card: Photography,
  },
  {
    id: 4,
    title: 'Content Creation',
    desc: 'Perseus statue of a classical figure speaking into a studio microphone beside a camera setup.',
    card: ContentCreation,
  },
  {
    id: 5,
    title: 'Branding',
    desc: 'Perseus statue of a classical figure reviewing a branding sheet with logo and color swatches while sketching a layout.',
    card: Branding,
  },
  {
    id: 6,
    title: 'Advertising',
    desc: 'Perseus statue of a classical figure at a desk comparing printed ad performance charts to digital marketing statistics on dual monitors.',
    card: Advertising,
  },
  {
    id: 7,
    title: 'Social Media Management',
    desc: 'Perseus statue of a classical figure checking social media analytics on a smartphone with floating engagement icons.',
    card: Smm,
  },
  {
    id: 8,
    title: 'Aerial Production',
    desc: 'Perseus statue of a classical figure holding a quadcopter drone with a floating flight-path map interface.',
    card: AerialProduction,
  },
  {
    id: 9,
    title: 'Floorplan & 2D Model',
    desc: 'Perseus statue of a classical figure sketching a floor plan with a 2D architectural model projection floating above the paper.',
    card: FloorPlan,
  },
  {
    id: 10,
    title: 'Matterport & 3D Model (360 Tours)',
    desc: 'Perseus statue presenting a Matterport ‘3D & 360 Tour’ card in one hand and holding a VR headset in the other.',
    card: MatterPort,
  },
];

const Services = () => {
  const [scope] = useAnimate();

  return (
    <section className="bg-white pt-16 sm:pt-32">
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
                        <p className="text-lg leading-lg">{feature.desc}</p>
                      </div>
                    </Title>
                  </li>
                ))}
              </ul>
            </div>
            <div className="sticky top-0 flex h-screen w-full items-center">
              <div className="relative aspect-square w-full rounded-2xl bg-[url('https://ik.imagekit.io/perseus/services-videography.jpg')] bg-cover bg-center [&:has(>_.active-card)]:bg-transparent">
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
