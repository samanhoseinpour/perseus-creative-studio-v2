import { Metadata } from "next";

import {
  HeroParallaxImages,
  HeroProduction,
  MainProduction,
  ScrollRevealProject,
  IGFeed,
} from "../components";

import { mainProductionData } from "../constants";

export const metadata: Metadata = {
  title: "Featured Projects and Showcases - Perseus Creative Studio",
  description:
    "Explore Perseus Creative Studio projects and showcases. See how our digital marketing strategies helps businesses in different sectors grow and stand out.",
  keywords: ["Vancouver Digital Marketing Agency"],

  openGraph: {
    title: "Featured Projects and Showcases - Perseus Creative Studio",
    description:
      "Explore Perseus Creative Studio projects and showcases. See how our digital marketing strategies helps businesses in different sectors grow and stand out.",
    url: "https://www.perseustudio.com",
    siteName: "Perseus Creative Studio",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://ik.imagekit.io/perseus/logo-black.png",
        width: 1200,
        height: 630,
        alt: "Perseus Creative Studio Projects Page Preview",
      },
    ],
  },
};

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
