import {
  WebsiteHero,
  WebsiteFeatures,
  WebsiteStats,
  WebsiteIntegrations,
  WebsiteClients,
  WebsiteServices,
  WebsiteServicesBento,
  WebsiteTestimonials,
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
      <WebsiteClients />
      <WebsiteTestimonials />
    </main>
  );
};

export default WebsitesPage;
