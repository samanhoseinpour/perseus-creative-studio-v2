import {
  AboutHero,
  AboutParallaxContent,
  GoogleReviews,
  IGFeed,
  Timeline,
  AboutCta,
  AboutMap,
  AboutProcess,
} from "../components";

const AboutPage = () => {
  return (
    <main className="">
      <AboutHero />
      <AboutParallaxContent />
      <Timeline />
      <AboutProcess />
      <AboutMap />
      <IGFeed />
      <GoogleReviews />
      <AboutCta />
    </main>
  );
};

export default AboutPage;
