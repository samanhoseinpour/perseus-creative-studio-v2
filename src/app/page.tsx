import {
  Hero,
  FeatureProjects,
  FaqsAccordion,
  HomeTestimonials,
  FromTheBlog,
  HomeWelcome,
  Stats,
  BentoGrid,
  ServicesList,
} from '@/components';

export default function Home() {
  return (
    <main className="flex flex-col">
      <Hero />
      <HomeWelcome />
      <Stats />
      <ServicesList />
      <BentoGrid />
      <FeatureProjects />
      <HomeTestimonials />
      <FaqsAccordion />
      <FromTheBlog />
    </main>
  );
}
