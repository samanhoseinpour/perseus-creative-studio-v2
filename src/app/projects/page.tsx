import {
  HeroProduction,
  MainProduction,
  ScrollHorizontalGallery,
} from "../components";

import { mainProductionData } from "../constants";
import { projectsHorizontalGallery } from "../constants/projects";

const ProductionPage = () => {
  return (
    <main>
      <HeroProduction />

      <section className="grid grid-cols-1 mb-16 sm:mb-32">
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

      <ScrollHorizontalGallery imageProjects={projectsHorizontalGallery} />
    </main>
  );
};

export default ProductionPage;
