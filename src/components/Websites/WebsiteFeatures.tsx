import { Cpu, Lock, Sparkles, Zap } from 'lucide-react';
import { ImageKit, Container, BorderBeam } from '../';

export const FeaturesSectionData = [
  {
    id: 1,
    featureTitle: 'Conversion-Driven Websites',
    featureDesc:
      'Fast, responsive sites designed to turn visitors into high-intent leads.',
    featureLogo: <Zap />,
  },
  {
    id: 2,
    featureTitle: 'Workflow Automation',
    featureDesc:
      'Automate handoffs between your website, CRM, email, and internal tools.',
    featureLogo: <Cpu />,
  },
  {
    id: 3,
    featureTitle: 'Experience-Led Design',
    featureDesc:
      'Clear journeys, strong visuals, and structure that guide users to action.',
    featureLogo: <Lock />,
  },
  {
    id: 4,
    featureTitle: 'Scalable Development',
    featureDesc:
      'Robust builds ready for new features, pages, and integrations as you grow.',
    featureLogo: <Sparkles />,
  },
];

const WebsiteFeatures = () => {
  return (
    <section className="mb-32">
      <Container className="space-y-12">
        <div className="relative z-10 grid items-center gap-4 md:grid-cols-2 md:gap-12">
          <h2 className="text-4xl font-semibold">
            Websites that convert, automate, and scale with you
          </h2>
          <p className="max-w-md sm:ml-auto">
            We combine design, development, and automation to build websites
            that look sharp, load fast, and plug into the systems your team
            already relies on.
          </p>
        </div>
        <div className="relative rounded-3xl p-3 md:-mx-8 lg:col-span-3">
          <div className="aspect-88/36 relative">
            <div className="bg-linear-to-t z-1 from-background absolute inset-0 to-transparent"></div>
            <ImageKit
              src="/website-hero.webp"
              alt="website design and automation preview"
              width={2797}
              height={1137}
            />
            <BorderBeam duration={12} size={300} />
          </div>
        </div>
        <div className="relative mx-auto grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4">
          {FeaturesSectionData.map((feature) => (
            <div className="space-y-3" key={feature.id}>
              <div className="flex items-center gap-2">
                <div>{feature.featureLogo}</div>
                <h3 className="text-sm leading-sm font-medium">
                  {feature.featureTitle}
                </h3>
              </div>
              <p className="text-sm leading-sm">{feature.featureDesc}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default WebsiteFeatures;
