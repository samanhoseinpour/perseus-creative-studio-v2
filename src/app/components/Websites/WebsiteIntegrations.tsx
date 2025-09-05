import { Aperture } from "lucide-react";

import Link from "next/link";

import { cn } from "@/app/utils/aceternity";
import {
  ImageKit,
  InfiniteSlider,
  Button,
  Container,
  TextEffect,
  AnimatedGroup,
} from "../";

export default function IntegrationsSection() {
  return (
    <section className="mb-16">
      <Container>
        <div className="bg-muted/25 group relative mx-auto max-w-[22rem] items-center justify-between space-y-6 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] sm:max-w-md">
          <div
            role="presentation"
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:32px_32px] opacity-50"
          />
          <AnimatedGroup>
            <InfiniteSlider gap={24} speed={20} speedOnHover={10}>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
            </InfiniteSlider>
          </AnimatedGroup>

          <AnimatedGroup>
            <InfiniteSlider gap={24} speed={20} speedOnHover={10} reverse>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
            </InfiniteSlider>
          </AnimatedGroup>
          <AnimatedGroup>
            <InfiniteSlider gap={24} speed={20} speedOnHover={10}>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
              <IntegrationCard>
                <Aperture />
              </IntegrationCard>
            </InfiniteSlider>
          </AnimatedGroup>
          <div className="absolute inset-0 m-auto flex size-fit justify-center gap-2">
            <IntegrationCard
              className="shadow-black-950/10 bg-white/25 shadow-xl backdrop-blur-md backdrop-grayscale dark:border-white/10 dark:shadow-white/15"
              isCenter={true}
            >
              <ImageKit
                src="/logo-white.png"
                alt="Perseus Creative Studio Logo"
                width={80}
                height={80}
              />
            </IntegrationCard>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-lg space-y-6 text-center">
          <TextEffect as="h2" className="text-3xl font-semibold md:text-4xl">
            Integrate with your favorite tools
          </TextEffect>
          <TextEffect
            as="p"
            per="line"
            delay={0.5}
            className="text-muted-foreground"
          >
            Connect seamlessly with popular platforms and services to enhance
            your workflow.
          </TextEffect>

          <AnimatedGroup>
            <Link href="/contact" className="flex justify-center items-center">
              <Button size="medium">Get Started</Button>
            </Link>
          </AnimatedGroup>
        </div>
      </Container>
    </section>
  );
}

const IntegrationCard = ({
  children,
  className,
  isCenter = false,
}: {
  children: React.ReactNode;
  className?: string;
  position?:
    | "left-top"
    | "left-middle"
    | "left-bottom"
    | "right-top"
    | "right-middle"
    | "right-bottom";
  isCenter?: boolean;
}) => {
  return (
    <div
      className={cn(
        "bg-background relative z-20 flex size-12 rounded-full border",
        className
      )}
    >
      <div className={cn("m-auto size-fit *:size-5", isCenter && "*:size-8")}>
        {children}
      </div>
    </div>
  );
};
