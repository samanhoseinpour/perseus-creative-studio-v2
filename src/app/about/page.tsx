import {
  AboutHero,
  AboutParallaxContent,
  GoogleReviews,
  IGFeed,
  Timeline,
  AboutCta,
} from "../components";

const AboutPage = () => {
  return (
    <main className="">
      <AboutHero />
      <AboutParallaxContent />
      <Timeline />
      <IGFeed />
      <GoogleReviews />
      <AboutCta />
    </main>
  );
};

export default AboutPage;
