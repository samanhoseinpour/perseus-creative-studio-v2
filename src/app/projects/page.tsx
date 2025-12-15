import {
  HeroParallaxImages,
  HeroProduction,
  MainProduction,
  ScrollRevealProject,
  IGFeed,
} from "../components";

import { mainProductionData } from "../constants";

const ProductionPage = () => {
  return (
    <main>
      <HeroProduction />

      <section className="grid grid-cols-1">
        {mainProductionData.map(({ id, videoSrc, title, description }) => (
          <div key={id}>
            <MainProduction
              videoSrc={videoSrc}
              title={title}
              description={description}
            />
          </div>
        ))}
      </section>

      <HeroParallaxImages />
      <IGFeed />
      <ScrollRevealProject />
    </main>
  );
};

export default ProductionPage;
