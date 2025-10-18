import { CustomCard, Container } from "..";

const AboutCard = () => {
  return (
    <section className="bg-white text-black pb-16 sm:pb-32">
      <Container className="border-t">
        <span className="-ml-6 -mt-3.5 block w-max bg-gray-50 px-6">
          What You Can Expect From Us
        </span>
        <h3 className="mt-12 sm:mt-24 font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl ">
          Agency Services
        </h3>
        <p className="text-sm font-semibold text-black/70 pb-4">
          Our operating rhythm is simple: align on outcomes fast, plan
          deliberately, build with focus, then launch and iterate based on
          signal—not noise.
        </p>
        <div className="grid max-lg:grid-cols-1 grid-cols-2 gap-4 mt-6">
          <CustomCard
            tintColor="background-contrast-white"
            title="Brand & Strategy"
            description="Positioning, identity, and go-to-market plans that set the foundation."
            detailContent="We help you define what your brand stands for and how it connects with people. From developing your visual identity to shaping your story, we align every element — logo, tone, messaging, and positioning — around a clear strategy. Our goal is simple: build a brand that people recognize, trust, and love. Whether you’re launching something new or refreshing your image, we make sure your brand stands out for the right reasons."
          ></CustomCard>
          <CustomCard
            tintColor="background-contrast-white"
            title="Website Design & Ads"
            description="High-performance websites and digital experiences."
            detailContent="Your website is your brand’s home, and we make sure it’s built to perform. We design and develop custom websites — no templates, no shortcuts — using WordPress or Next.js for speed, security, and style. Every page is designed to convert visitors into customers through clear structure, stunning visuals, and seamless user experience. Alongside that, our digital ad campaigns help you reach the right audience with data-driven targeting and creative that grabs attention and delivers results."
          ></CustomCard>
        </div>
        <div className="mt-4">
          <CustomCard
            tintColor="background-contrast-white"
            title="Visual Production"
            description="End-to-end film, photo, and motion for campaigns."
            detailContent="From cinematic storytelling to high-end photography, our visual production team brings your ideas to life with precision and creativity. We use Sony FX3 cinema cameras, DJI drones, and professional lighting setups to capture your story in stunning 4K. Whether it’s a real estate project, a brand campaign, or an event, we handle everything — directing, filming, editing, and color grading — to deliver visuals that look incredible and feel authentic."
          ></CustomCard>
        </div>
      </Container>
    </section>
  );
};

export default AboutCard;
