import {
  AboutHero,
  AboutParallaxContent,
  GoogleReviews,
  IGFeed,
  Timeline,
  AboutCta,
  AboutMap,
} from "../components";

const AboutPage = () => {
  return (
    <main className="">
      <AboutHero />
      <AboutParallaxContent />
      <Timeline />
      <AboutMap />
      <IGFeed />
      <GoogleReviews />
      <AboutCta />
    </main>
  );
};

export default AboutPage;
