import { SvgMaskContainer } from "../";

const ServicesSvgMask = () => {
  return (
    <div className="flex h-[40rem] w-full items-center justify-center overflow-hidden bg-white">
      <SvgMaskContainer
        revealText={
          <p className="mx-auto container px-6 text-center text-3xl leading-3xl sm:text-4xl sm:leading-4xl font-bold text-black/70">
            Full‑stack creative services: <span>Brand Strategy</span>,{" "}
            <span>Visual Identity</span>, <span>Web & Product UI</span>,{" "}
            <span>Content & Motion</span>, and <span>Growth Enablement</span>.
          </p>
        }
        className="h-[40rem] rounded-md text-white dark:text-black"
      >
        We deliver <span className="text-blue-500">Brand Strategy</span>,{" "}
        <span className="text-blue-500">Visual Identity</span>,{" "}
        <span className="text-blue-500">Web Design & Development</span>,{" "}
        <span className="text-blue-500">Product UI/UX</span>, and{" "}
        <span className="text-blue-500">Content & Motion</span> for
        venture‑backed startups and modern enterprises.
      </SvgMaskContainer>
    </div>
  );
};

export default ServicesSvgMask;
