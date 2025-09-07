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
} from "@/app/components";

const WebsitesPage = () => {
  return (
    <main>
      <WebsiteHero />
      <WebsiteFeatures />
      <WebsiteServices />
      <WebsiteServicesBento />
      <WebsiteStats />
      <WebsiteIntegrations />
      <WebsiteTestimonials />
      <WebsiteClients />
      <WebsiteCta />
    </main>
  );
};

export default WebsitesPage;
