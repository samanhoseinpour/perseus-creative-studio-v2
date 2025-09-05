import { Cpu, Lock, Sparkles, Zap } from "lucide-react";
import {
  ImageKit,
  Container,
  TextEffect,
  AnimatedGroup,
  BorderBeam,
} from "../";

export const FeaturesSectionData = [
  {
    id: 1,
    featureTitle: "Custom Website",
    featureDesc:
      "High-performance websites crafted for speed, usability, and impact.",
    featureLogo: <Zap />,
  },
  {
    id: 2,
    featureTitle: "AI Integration",
    featureDesc:
      "Integrate intelligent automation and agents into your workflows.",
    featureLogo: <Cpu />,
  },
  {
    id: 3,
    featureTitle: "Brand Identity",
    featureDesc: "Build a strong, consistent digital brand across platforms.",
    featureLogo: <Lock />,
  },
  {
    id: 4,
    featureTitle: "Creative Solutions",
    featureDesc:
      "Innovative strategies and tools to differentiate your business online.",
    featureLogo: <Sparkles />,
  },
];

export default function FeaturesSection({}) {
  return (
    <section className="mb-32">
      <Container className="space-y-12">
        <div className="relative z-10 grid items-center gap-4 md:grid-cols-2 md:gap-12">
          <TextEffect as="h2" className="text-4xl font-semibold">
            Build, Launch, and Scale with Perseus Creative Studio
          </TextEffect>
          <TextEffect
            as="p"
            per="line"
            delay={0.5}
            className="max-w-md sm:ml-auto"
          >
            From custom website design to AI-powered automation, Perseus helps
            your business stand out and grow with modern digital solutions
            tailored to your vision.
          </TextEffect>
        </div>
        <AnimatedGroup className="relative rounded-3xl p-3 md:-mx-8 lg:col-span-3">
          <div className="aspect-88/36 relative">
            <div className="bg-linear-to-t z-1 from-background absolute inset-0 to-transparent"></div>
            <ImageKit
              src="/website-hero.webp"
              alt="payments illustration"
              width={2797}
              height={1137}
            />
            <BorderBeam duration={12} size={200} />
          </div>
        </AnimatedGroup>
        <div className="relative mx-auto grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4">
          {FeaturesSectionData.map((feature) => (
            <div className="space-y-3" key={feature.id}>
              <div className="flex items-center gap-2">
                <AnimatedGroup preset="fade">
                  {feature.featureLogo}
                </AnimatedGroup>
                <TextEffect as="h3" className="text-sm font-medium">
                  {feature.featureTitle}
                </TextEffect>
              </div>
              <TextEffect
                as="p"
                per="line"
                delay={0.5}
                className="text-muted-foreground text-sm"
              >
                {feature.featureDesc}
              </TextEffect>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
