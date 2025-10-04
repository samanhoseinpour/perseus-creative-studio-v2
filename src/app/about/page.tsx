import {
  AboutHero,
  AboutParallaxContent,
  GoogleReviews,
  IGFeed,
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
      <AboutProcess />
      <Team />
      <IGFeed />
      <GoogleReviews />
      <AboutCta />
    </main>
  );
};

export default AboutPage;
