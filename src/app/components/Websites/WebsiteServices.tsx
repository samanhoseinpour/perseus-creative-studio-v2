import { Container } from "../";
import {
  Palette,
  Code2,
  ShoppingCart,
  Wrench,
  Gauge,
  Server,
} from "lucide-react";
import { ReactNode } from "react";

export const websiteServicesData = [
  {
    id: 1,
    icon: <Palette />,
    title: "Website Strategy & UX",
    detail:
      "Clarify your goals, structure your pages, and design journeys that turn anonymous visitors into qualified leads.",
  },
  {
    id: 2,
    icon: <Code2 />,
    title: "Custom Website Development",
    detail:
      "Robust, scalable builds with clean, maintainable code and the integrations you need to connect your site to the rest of your stack.",
  },
  {
    id: 3,
    icon: <ShoppingCart />,
    title: "Marketing Sites & Funnels",
    detail:
      "Campaign pages, launch sites, and funnels tailored to your offer, designed to convert traffic into booked calls and inquiries.",
  },
  {
    id: 4,
    icon: <Wrench />,
    title: "Automation & Workflows",
    detail:
      "Turn form fills, signups, and inquiries into automated workflows that route data, notify teams, and reduce manual work.",
  },
  {
    id: 5,
    icon: <Gauge />,
    title: "Performance & Analytics",
    detail:
      "Fast load times, technical best practices, and tracking setups that show you what’s working and where to improve.",
  },
  {
    id: 6,
    icon: <Server />,
    title: "Care & Ongoing Support",
    detail:
      "Monitoring, updates, and iterative improvements so your website stays secure, fast, and aligned with your business as it evolves.",
  },
];

const WebsiteServices = () => {
  return (
    <section className="mb-8">
      <Container>
        <div>
          <h2 className="text-3xl leading-3xl sm:text-4xl sm:leading-4xl font-semibold">
            Services across the full website lifecycle
          </h2>
          <p className="w-[1/2]">
            From first concept to automated handoffs after launch, we cover strategy, design, development, and ongoing optimization—so your site becomes an active part of how you win and serve clients.
          </p>
        </div>
        <div className="grid-cols-1 md:grid-cols-3 mt-8 grid gap-3 *:text-center md:mt-16 ">
          {websiteServicesData.map((service) => (
            <div
              className="rounded-lg shadow-sm group shadow-zinc-950/5 bg-background-contrast flex flex-col h-full"
              key={service.id}
            >
              <div className="flex flex-col gap-1.5 p-6 pb-3">
                <CardDecorator>{service.icon}</CardDecorator>

                <h3 className="mt-6 text-lg leading-lg font-semibold">
                  {service.title}
                </h3>
              </div>

              <div className="p-6 pt-0 flex-1 flex items-start">
                <p className="text-sm">{service.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

const CardDecorator = ({ children }: { children: ReactNode }) => (
  <div className="relative mx-auto size-36 group">
    {/* Decorative background and grid */}
    <div
      className="
        absolute inset-0
        z-0
        [--color-border:rgba(255,255,255,0.15)]
        group-hover:[--color-border:rgba(255,255,255,0.20)]
      "
      aria-hidden
    >
      {/* Solid base background */}
      <div className="absolute inset-0 bg-background-contrast" />

      {/* Grid lines */}
      <div
        className="
          absolute inset-0
          bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)]
          bg-[size:24px_24px]
          pointer-events-none
        "
      />

      {/* Radial overlay for depth */}
      <div
        className="
          absolute inset-0
          bg-[radial-gradient(50%_50%_at_50%_50%,transparent,rgba(0,0,0,0.25)_75%)]
          pointer-events-none
        "
      />
    </div>

    {/* Content block */}
    <div className="absolute inset-0 z-10 m-auto flex size-12 items-center justify-center border-l border-t bg-background-contrast">
      {children}
    </div>
  </div>
);

export default WebsiteServices;
