import { HeroProduction, MainProduction } from "../components";

import { mainProductionData } from "../constants";

const ProductionPage = () => {
  return (
    <main>
      <HeroProduction />

      <section className="grid grid-cols-1 mb-16 sm:mb-32">
        {mainProductionData.map(({ id, videoSrc, title, description }) => (
          <div key={id} className="">
            <MainProduction
              videoSrc={videoSrc}
              title={title}
              description={description}
            />
          </div>
        ))}
      </section>
    </main>
  );
};

export default ProductionPage;
