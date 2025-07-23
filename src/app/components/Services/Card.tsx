import { twMerge } from "tailwind-merge";
import { useFeatureStore } from "./Store";

import Link from "next/link";

import { Button, ImageKit } from "..";

type FeatureCardProps = {
  children: React.ReactNode;
} & CardProps;

type CardProps = {
  id: number;
};

const FeatureCard = ({ children, id }: FeatureCardProps) => {
  const inViewFeature = useFeatureStore((state) => state.inViewFeature);

  return (
    <div
      className={twMerge(
        "absolute inset-0 h-full w-full rounded-lg transition-opacity duration-700",
        inViewFeature === id
          ? "active-card opacity-100"
          : "pointer-events-none opacity-0"
      )}
    >
      <div
        className={twMerge(
          "gradient absolute inset-0 origin-bottom-left rounded-lg bg-gradient-to-br"
        )}
      />
      {children}
      <Link href="/services">
        <Button size="medium" className="show-me-btn absolute bottom-6 right-6">
          CTA for book a services
        </Button>
      </Link>
    </div>
  );
};

export const Videography = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="services-videography.jpg"
        alt="Perseus statue of a classical figure holding and operating a professional video camera mounted on a tripod"
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const WebDevlopment = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="services-website-development.jpg"
        alt="Perseus statue of a classical figure at a desk using dual monitors displaying website wireframes"
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const Photography = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="services-photography.jpg"
        alt="Perseus statue of a classical figure adjusting a DSLR camera on a tripod with studio lights in the background"
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const ContentCreation = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="services-content-creation.jpg"
        alt="Perseus statue of a classical figure speaking into a studio microphone beside a camera setup."
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const Branding = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="services-branding.jpg"
        alt="Perseus statue of a classical figure reviewing a branding sheet with logo and color swatches while sketching a layout."
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const Advertising = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="services-ads.jpg"
        alt="Perseus statue of a classical figure at a desk comparing printed ad performance charts to digital marketing statistics on dual monitors."
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const Smm = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="services-smm.jpg"
        alt="Perseus statue of a classical figure checking social media analytics on a smartphone with floating engagement icons."
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const AerialProduction = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="services-aerial-production.jpg"
        alt="Perseus statue of a classical figure holding a quadcopter drone with a floating flight-path map interface."
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const FloorPlan = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="services-floor-plan.jpg"
        alt="Perseus statue of a classical figure sketching a floor plan with a 3D architectural model projection floating above the paper."
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const MatterPort = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="services-3d-martterport.png"
        alt="Perseus statue presenting a Matterport ‘3D & 360 Tour’ card in one hand and holding a VR headset in the other."
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};
