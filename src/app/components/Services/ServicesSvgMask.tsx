import { SvgMaskContainer } from "../";

const ServicesSvgMask = () => {
  return (
    <div className="flex h-160 w-full items-center justify-center overflow-hidden bg-white">
      <SvgMaskContainer
        revealText={
          <h3 className="mx-auto container px-6 text-center text-3xl leading-3xl sm:text-4xl sm:leading-4xl font-bold text-black/70">
            Perseus Creative Studio specializes in real estate media packages:
            high-impact <span>Photography</span> and <span>Videography</span>
            crafted to present your properties at their absolute best.
          </h3>
        }
        className="h-160 rounded-md text-white dark:text-black px-4"
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
