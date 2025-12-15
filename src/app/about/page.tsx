import {
  AboutHero,
  AboutParallaxContent,
  IGFeed,
  GoogleReviews,
  Timeline,
  AboutCta,
  AboutProcess,
  Team,
} from "../components";

const AboutPage = () => {
  return (
    <main className="">
      <AboutHero />
      <AboutParallaxContent />
      <Timeline />
      <Team />
      <AboutProcess />
      <IGFeed />
      <GoogleReviews />
      <AboutCta />
    </main>
  );
};

export default AboutPage;
