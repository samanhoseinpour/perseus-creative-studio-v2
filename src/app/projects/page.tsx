import { HeroProduction, MainProduction } from "../components";

import { mainProductionData } from "../constants";

const ProductionPage = () => {
  return (
    <main>
      <HeroProduction />

      <section className="grid grid-cols-1 md:grid-cols-3 mb-16 sm:mb-32">
        {mainProductionData.map(({ id, imageSrc, title, description }) => (
          <div key={id} className="">
            <MainProduction
              imageSrc={imageSrc}
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
