import { Container, AnimatedGroup, TextEffect, BorderBeam } from "../";
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
    title: "Web Design",
    detail:
      "Modern, user-friendly designs tailored to your brand identity. We focus on aesthetics, usability, and accessibility to ensure visitors stay engaged and your brand leaves a lasting impression.",
  },
  {
    id: 2,
    icon: <Code2 />,
    title: "Web Development",
    detail:
      "Responsive, high-performance websites built with the latest technologies. From custom functionality to seamless integrations, we create solutions that scale with your business needs.",
  },
  {
    id: 3,
    icon: <ShoppingCart />,
    title: "E-Commerce Solutions",
    detail:
      "Custom online stores with secure checkout and seamless shopping experiences. We provide advanced features like product management, payment gateways, and user-friendly dashboards.",
  },
  {
    id: 4,
    icon: <Wrench />,
    title: "Website Maintenance",
    detail:
      "Ongoing support, updates, and monitoring to keep your site running smoothly. Our maintenance plans cover bug fixes, performance checks, backups, and security enhancements.",
  },
  {
    id: 5,
    icon: <Gauge />,
    title: "Performance Optimization",
    detail:
      "Faster load times and improved site performance for better user experience. We optimize images, code, and server configurations to deliver a seamless and efficient browsing experience.",
  },
  {
    id: 6,
    icon: <Server />,
    title: "Hosting & Domain Setup",
    detail:
      "Reliable hosting and domain configuration to get your site online quickly. We handle setup, security, and scaling to ensure your website is always accessible and protected.",
  },
];

const WebsiteServices = () => {
  return (
    <section className="mb-8">
      <Container>
        <div>
          <TextEffect as="h2" className="text-4xl font-semibold">
            Built to cover your needs
          </TextEffect>
          <TextEffect as="p" per="line" delay={0.5} className="mt-4">
            From wireframes to uptime, we cover the entire web lifecycle—design,
            development, e‑commerce, performance, security, hosting, and ongoing
            care—so you can launch faster and scale with confidence.
          </TextEffect>
        </div>
        <AnimatedGroup className="grid-cols-3 mt-8 grid gap-3 *:text-center md:mt-16 ">
          {websiteServicesData.map((service) => (
            <div
              className="rounded-lg shadow-sm group shadow-zinc-950/5 bg-background-contrast flex flex-col h-full"
              key={service.id}
            >
              <div className="flex flex-col gap-1.5 p-6 pb-3">
                <CardDecorator>{service.icon}</CardDecorator>

                <TextEffect
                  as="h3"
                  className="mt-6 text-lg leading-lg font-semibold"
                >
                  {service.title}
                </TextEffect>
              </div>

              <div className="p-6 pt-0 flex-1 flex items-start">
                <TextEffect as="p" per="line" delay={0.5} className="text-sm">
                  {service.detail}
                </TextEffect>
              </div>
              <BorderBeam size={200} duration={12} />
            </div>
          ))}
        </AnimatedGroup>
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
