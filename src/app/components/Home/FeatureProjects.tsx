import { Heading, MasonryGallery } from "@/app/components";

const FeatureProjects = () => {
  return (
    <section className="mb-16 sm:mb-32">
      <Heading
        title="Feature Projects"
        seperatorTitle="Portfolio"
        seperatorTitleStyle="text-white"
        titleTag="h3"
        description="Real projects. Real results. Here’s a glimpse of the work we’ve created for our clients."
        titleStyle="text-white"
        descStyle="text-white/70"
        containerStyle="border-white"
      />
      <MasonryGallery />
    </section>
  );
};

export default FeatureProjects;
