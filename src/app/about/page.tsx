import { TextShimmer, AboutBackground } from "../components";

const AboutPage = () => {
  return (
    <main className="relative overflow-hidden h-[100svh] flex justify-center items-center">
      <AboutBackground
        gridSize="10:10"
        className="absolute inset-0 z-0 pointer-events-none"
      />
      <TextShimmer>website is currently under maintenance.</TextShimmer>
    </main>
  );
};

export default AboutPage;
