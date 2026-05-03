import { Heading } from "@/components";
import { featureProjectsHome } from "@/constants";
import { HoverExpand_001 } from "@/components/ui/skiper-ui/skiper52";

const FeatureProjects = () => {
  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle="05 — Featured Projects"
        eyebrowRight="Branding · Content · Web · Campaigns"
        title="Selected Work"
        titleAccent="Built to move brands forward."
        description="Real projects, real results — a focused look at the strategy, design, content, and digital systems we&apos;ve created for clients."
        containerStyle="mb-10"
      />
      {/* <MasonryGallery /> */}
      <HoverExpand_001 videos={featureProjectsHome} />
    </section>
  );
};

export default FeatureProjects;
