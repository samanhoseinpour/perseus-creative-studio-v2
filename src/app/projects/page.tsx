import {
  HeroParallaxImages,
  HeroProduction,
  MainProduction,
  ScrollHorizontalGallery,
  ScrollRevealProject,
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
      <ScrollRevealProject />
    </main>
  );
};

export default ProductionPage;
