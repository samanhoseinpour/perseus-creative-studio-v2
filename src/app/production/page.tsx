import { HeroProduction, MainProduction } from '../components';

const ProductionPage = () => {
  return (
    <main>
      <HeroProduction />
      <MainProduction
        imageSrc="/logo-white.png"
        tag="Default Tag"
        title="Default Title"
        description="Default Description"
      />
      <MainProduction
        imageSrc="/logo-white.png"
        tag="Default Tag"
        title="Default Title"
        description="Default Description"
      />
      <MainProduction
        imageSrc="/logo-white.png"
        tag="Default Tag"
        title="Default Title"
        description="Default Description"
      />
      <MainProduction
        imageSrc="/logo-white.png"
        tag="Default Tag"
        title="Default Title"
        description="Default Description"
      />
    </main>
  );
};

export default ProductionPage;
