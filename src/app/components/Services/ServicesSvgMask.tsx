import { SvgMaskContainer } from "../";

const ServicesSvgMask = () => {
  return (
    <div className="flex h-140 w-full items-center justify-center overflow-hidden bg-white">
      <SvgMaskContainer
        revealText={
          <h3 className="mx-auto container px-6 text-center text-2xl leading-2xl sm:text-3xl sm:leading-3xl font-bold text-black/70">
            We work with real estate, construction, fitness facilities, and many
            more industries, delivering high-quality content, branding,
            advertising, social media management, and website design. From
            production to publishing, we build visuals and digital experiences
            held to a high standard across North America.
          </h3>
        }
        className="h-120 rounded-md text-white dark:text-black px-4"
      >
        We create end-to-end real estate content packages for agents,
        developers, and property brands—built to elevate every listing. From{" "}
        <span className="text-blue-500">Listing Photography</span> and{" "}
        <span className="text-blue-500">Cinematic Walkthrough Videos</span> to{" "}
        <span className="text-blue-500">Drone & Aerial Shots</span> and{" "}
        <span className="text-blue-500">Social-ready Edits</span>, we deliver
        polished visuals designed to attract attention, build trust, and help
        properties move faster.
      </SvgMaskContainer>
    </div>
  );
};

export default ServicesSvgMask;
