import {
  WebsiteHero,
  WebsiteFeatures,
  WebsiteStats,
  WebsiteIntegrations,
  WebsiteClients,
  WebsiteServices,
  WebsiteServicesBento,
  WebsiteTestimonials,
  WebsiteCta,
  ThreeDMarquee,
} from "@/app/components";

import { clientWebsiteImages } from "@/app/constants/website";

const WebsitesPage = () => {
  return (
    <main>
      <WebsiteHero />
      <WebsiteFeatures />
      <WebsiteServices />
      <WebsiteServicesBento />
      <ThreeDMarquee images={clientWebsiteImages} />
      <WebsiteStats />
      <WebsiteIntegrations />
      <WebsiteTestimonials />
      <WebsiteClients />
      <WebsiteCta />
    </main>
  );
};

export default WebsitesPage;
