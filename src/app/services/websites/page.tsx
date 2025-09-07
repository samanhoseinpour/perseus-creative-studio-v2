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
      <WebsiteClients />
      <WebsiteTestimonials />
      <WebsiteCta />
    </main>
  );
};

export default WebsitesPage;
