import { Services, ServicesScrollVideoHero } from '../components';

const ServicesPage = () => {
  return (
    <main className="">
      <section className="min-h-[100svh] flex justify-center items-center bg-neutral-50">
        <h1 className="font-bold text-neutral-900 text-5xl">Hero section</h1>
      </section>
      <ServicesScrollVideoHero />
      <Services />
    </main>
  );
};

export default ServicesPage;
