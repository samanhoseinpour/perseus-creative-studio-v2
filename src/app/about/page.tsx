import {
  AboutHero,
  AboutParallaxContent,
  GoogleReviews,
  IGFeed,
  Timeline,
  AboutCta,
  AboutProcess,
} from "../components";

const AboutPage = () => {
  return (
    <main className="">
      <AboutHero />
      <AboutParallaxContent />
      <Timeline />
      <AboutProcess />
      <IGFeed />
      <GoogleReviews />
      <AboutCta />
    </main>
  );
};

export default AboutPage;
