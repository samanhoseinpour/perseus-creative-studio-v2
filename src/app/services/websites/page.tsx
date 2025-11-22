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
  WebsiteBackground,
} from "@/app/components";

import { clientWebsiteImages } from "@/app/constants/website";

const WebsitesPage = () => {
  return (
    <main className="relative min-h-svh">
      <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
        <WebsiteBackground mouseRepulsion={false} mouseInteraction={false} />
      </div>
      <div className="relative z-10">
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
      </div>
    </main>
  );
};

export default WebsitesPage;
