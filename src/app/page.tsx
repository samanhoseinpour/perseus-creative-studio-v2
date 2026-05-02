import {
  Hero,
  Usps,
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
      <div className="relative z-10 bg-background">
        <Hero />
        <Usps />
      </div>
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
