import {
  HeroParallaxImages,
  HeroProduction,
  MainProduction,
  ScrollHorizontalGallery,
  ScrollRevealProject,
  IGFeed,
} from "../components";

import { mainProductionData } from "../constants";
import { projectsHorizontalGallery } from "../constants/projects";

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
      <ScrollHorizontalGallery imageProjects={projectsHorizontalGallery} />
      <IGFeed />
      <ScrollRevealProject />
    </main>
  );
};

export default ProductionPage;
