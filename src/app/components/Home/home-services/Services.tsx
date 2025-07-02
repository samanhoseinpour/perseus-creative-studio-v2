'use client';

import { stagger, useAnimate } from 'framer-motion';
import {
  Availability,
  Colors,
  Music,
  SchedulingLinks,
  Team,
  Todo,
} from './Card';
import { FeatureTitle } from './Title';
import { MusicVisual, OtherVisual } from './Visual';

import { useFeatureStore } from './Store';
import { useEffect } from 'react';
import { useHidePageOverflow } from '../../../utils/toggle-page-overflow';
import { useEscapePress } from '../../../utils/use-escape-press';

import { Container, ServicesTitle, Button } from '../..';

const servicesFeatures = [
  {
    title:
      'We specialize in crafting innovative and tailored solutions to bring your unique ideas to life. Whether it’s design, development, or creative strategy, our goal is to turn your vision into impactful realities that exceed expectations.',
    id: 'todo-list',
    card: Todo,
    visual: OtherVisual,
  },
  {
    title:
      'Transforming creative concepts into functional, tangible designs is our expertise. From initial brainstorming to final execution, we ensure every detail inspires and delivers exceptional value to your project.',
    id: 'colors',
    card: Colors,
    visual: OtherVisual,
  },
  {
    title:
      'We work closely with clients to create tailored strategies that deliver measurable results and exceed expectations, driving growth and success.',
    id: 'availability',
    card: Availability,
    visual: OtherVisual,
  },
  {
    title:
      'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti ad doloremque, aliquid quo cum praesentium. Quisquam fugiat, provident nihil porro temporibus cumque dolore iusto accusamus eveniet obcaecati vitae soluta reprehenderit.',
    id: 'music',
    card: Music,
    visual: MusicVisual,
  },
  {
    title:
      'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti ad doloremque, aliquid quo cum praesentium. Quisquam fugiat, provident nihil porro temporibus cumque dolore iusto accusamus eveniet obcaecati vitae soluta reprehenderit.',
    id: 'scheduling-links',
    card: SchedulingLinks,
    visual: OtherVisual,
  },
  {
    title:
      'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti ad doloremque, aliquid quo cum praesentium. Quisquam fugiat, provident nihil porro temporibus cumque dolore iusto accusamus eveniet obcaecati vitae soluta reprehenderit.',
    id: 'team',
    card: Team,
    visual: OtherVisual,
  },
];

const Services = () => {
  const [scope, animate] = useAnimate();
  const fullscreenFeature = useFeatureStore((state) => state.fullscreenFeature);
  const lastFullscreenFeature = useFeatureStore(
    (state) => state.lastFullscreenFeature
  );
  const setFullscreenFeature = useFeatureStore(
    (state) => state.setFullscreenFeature
  );

  const onEscapePress = () => {
    if (fullscreenFeature) setFullscreenFeature(null);
  };

  useEscapePress(onEscapePress);
  useHidePageOverflow(!!fullscreenFeature);

  useEffect(() => {
    if (fullscreenFeature) {
      animate([
        [
          '.feature-title',
          { opacity: 0, x: '-200px' },
          { duration: 0.3, delay: stagger(0.05) },
        ],
        [
          `.visual-${lastFullscreenFeature}`,
          { opacity: 1, scale: 1, pointerEvents: 'auto' },
          { at: '<' },
        ],
        ['.active-card .gradient', { opacity: 0, scale: 0 }, { at: '<' }],
        ['.active-card .show-me-btn', { opacity: 0 }, { at: '<' }],
        [
          '.back-to-site-btn',
          { opacity: 1, y: '0px' },
          { at: '<', duration: 0.3 },
        ],
      ]);
    } else {
      animate([
        [
          '.feature-title',
          { opacity: 1, x: '0px' },
          { duration: 0.3, delay: stagger(0.05) },
        ],
        [
          `.visual-${lastFullscreenFeature}`,
          { opacity: 0, scale: 0.75, pointerEvents: 'none' },
          { at: '<' },
        ],
        ['.active-card .gradient', { opacity: 1, scale: 1 }, { at: '<' }],
        [
          '.back-to-site-btn',
          { opacity: 0, y: '300px' },
          { at: '<', duration: 0.3 },
        ],
        ['.active-card .show-me-btn', { opacity: 1 }],
      ]);
    }
  }, [animate, fullscreenFeature, lastFullscreenFeature]);

  return (
    <section>
      <Container className="flex flex-col">
        <ServicesTitle />
        <div ref={scope}>
          {servicesFeatures.map((feature) => (
            <feature.visual id={feature.id} key={feature.id} />
          ))}
          <Button
            onClick={() => setFullscreenFeature(null)}
            className="back-to-site-btn fixed bottom-6 left-1/2 z-10 -translate-x-1/2 translate-y-[300%] rounded-full bg-black px-4 py-2 text-white opacity-0 shadow-lg"
          >
            Back to site
          </Button>
          <div className="flex w-full items-start gap-20">
            <div className="w-full py-[50vh]">
              <ul>
                {servicesFeatures.map((feature) => (
                  <li key={feature.id}>
                    <FeatureTitle id={feature.id}>{feature.title}</FeatureTitle>
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
