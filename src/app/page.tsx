import {
  Hero,
  FeatureProjects,
  Faqs,
  HomeTestimonials,
  FromTheBlog,
  HomeWelcome,
  Stats,
  ServicesList,
  Partners,
  GoogleReviews,
} from '@/components';

export default function Home() {
  return (
    <main className="flex flex-col">
      <Hero />
      <HomeWelcome />
      <Stats />
      <ServicesList />
      <FeatureProjects />
      <HomeTestimonials />
      <Partners variant="home" />
      <GoogleReviews />
      <Faqs />
      <FromTheBlog />
    </main>
  );
}
