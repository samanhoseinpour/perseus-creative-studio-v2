import { Heading } from "@/app/components";
import { featureProjectsHome } from "@/app/constants";
import { HoverExpand_001 } from "@/components/ui/skiper-ui/skiper52";

const FeatureProjects = () => {
  return (
    <section className="mb-16 sm:mb-32">
      <Heading
        title="Feature Projects"
        seperatorTitle="Portfolio"
        titleTag="h3"
        description="Real projects. Real results. Here’s a glimpse of the work we’ve created for our clients."
      />
      {/* <MasonryGallery /> */}
      <HoverExpand_001 videos={featureProjectsHome} />
    </section>
  );
};

export default FeatureProjects;
