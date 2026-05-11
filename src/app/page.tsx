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
  Partners,
  Container,
  GoogleReviews,
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
      <Partners />
      <GoogleReviews />
      <FaqsAccordion />
      <FromTheBlog />
    </main>
  );
}
