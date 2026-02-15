import {
  Hero,
  Usps,
  FeatureProjects,
  FaqsAccordion,
  HomeTestimonials,
  FromTheBlog,
  HomeWelcome,
  Stats,
  Heading,
  BentoGrid,
  ServicesList,
} from './components';

export default function Home() {
  return (
    <main className="flex flex-col">
      <div className="relative z-10 bg-background">
        <Hero />
        <Usps />
      </div>
      <HomeWelcome />
      <Stats />
      <Heading
        titleTag="h2"
        title="All-in-One Solution"
        seperatorTitle="Perseus Services"
        description="Everything your brand needs — from strategy and design to content and digital marketing."
      />
      <ServicesList />
      <BentoGrid />
      <FeatureProjects />
      <HomeTestimonials />
      <FaqsAccordion />
      <FromTheBlog />
    </main>
  );
}
