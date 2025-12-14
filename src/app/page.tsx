import {
  Hero,
  Usps,
  FeatureProjects,
  FaqsAccordion,
  HomeTestimonials,
  FromTheBlog,
  HomeWelcome,
  GlobalImpact,
  Stats,
  Heading,
  ServicesList,
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
      <Heading
        titleTag="h2"
        title="All-in-One Solution"
        seperatorTitle="Perseus Services"
        description="Everything your brand needs — from strategy and design to content and digital marketing."
        seperatorTitleStyle="text-white"
        titleStyle="text-white"
        descStyle="text-white/70"
        containerStyle="border-white"
      />
      <ServicesList />
      <FeatureProjects />
      <HomeTestimonials />
      <FaqsAccordion />
      <FromTheBlog />
    </main>
  );
}
