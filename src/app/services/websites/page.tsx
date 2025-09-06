import {
  WebsiteHero,
  WebsiteFeatures,
  WebsiteStats,
  WebsiteIntegrations,
  WebsiteClients,
  WebsiteServicesBento,
} from "@/app/components";

const WebsitesPage = () => {
  return (
    <main>
      <WebsiteHero />
      <WebsiteFeatures />
      <WebsiteServicesBento />
      <WebsiteStats />
      <WebsiteIntegrations />
      <WebsiteClients />
    </main>
  );
};

export default WebsitesPage;
