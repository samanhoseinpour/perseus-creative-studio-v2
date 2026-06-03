import {
  Hero,
  FeatureProjects,
  Faqs,
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
      <Partners variant="home" />
      <GoogleReviews />
      <Faqs />
      <FromTheBlog />
    </main>
  );
}
