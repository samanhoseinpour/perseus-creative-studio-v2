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
        We produce dedicated real estate media packages for agents, developers,
        and property brands — from {""}
        <span className="text-blue-500">Listing Photography</span>,{" "}
        <span className="text-blue-500">Cinematic Walkthrough Videos</span>,{" "}
        <span className="text-blue-500">Drone & Aerial Shots</span>, and
        <span className="text-blue-500">Social-ready Edits</span> that make
        every property stand out.
      </SvgMaskContainer>
    </div>
  );
};

export default ServicesSvgMask;
