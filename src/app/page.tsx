import {
  Hero,
  Usps,
  ServicesCarousel,
  FeatureProjects,
  FaqsAccordion,
  HomeTestimonials,
  FromTheBlog,
  HomeWelcome,
  GlobalImpact,
  Stats,
} from "./components";

export default function Home() {
  return (
    <main className="flex flex-col">
      <div className="relative z-10 bg-background">
        <Hero />
        <Usps />
      </div>
      <HomeWelcome />
      <GlobalImpact />
      <Stats />
      <ServicesCarousel />
      <FeatureProjects />
      <HomeTestimonials />
      <FaqsAccordion />
      <FromTheBlog />
    </main>
  );
}
