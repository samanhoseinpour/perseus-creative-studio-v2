import { twMerge } from 'tailwind-merge';
import { useFeatureStore } from './Store';

import Link from 'next/link';

import { Button, ImageKit } from '../../';

type FeatureCardProps = {
  children: React.ReactNode;
} & CardProps;

type CardProps = {
  id: string;
};

const FeatureCard = ({ children, id }: FeatureCardProps) => {
  const inViewFeature = useFeatureStore((state) => state.inViewFeature);

  return (
    <div
      className={twMerge(
        'absolute inset-0 h-full w-full rounded-lg transition-opacity duration-700',
        inViewFeature === id
          ? 'active-card opacity-100'
          : 'pointer-events-none opacity-0'
      )}
    >
      <div
        className={twMerge(
          'gradient absolute inset-0 origin-bottom-left rounded-lg bg-gradient-to-br'
        )}
      />
      {children}
      <Link href="/services">
        <Button size="medium" className="show-me-btn absolute bottom-6 right-6">
          CTA for book a photoshoot
        </Button>
      </Link>
    </div>
  );
};

export const Todo = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="homeServices-3.JPG"
        alt=""
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const Colors = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="homeServices-2.JPG"
        alt=""
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const Availability = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="homeServices-1.JPG"
        alt=""
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const Music = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="homeServices-2.JPG"
        alt=""
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const SchedulingLinks = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="homeServices-4.JPG"
        alt=""
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};

export const Team = ({ id }: CardProps) => {
  return (
    <FeatureCard id={id}>
      <ImageKit
        src="homeServices-1.JPG"
        alt=""
        fill
        loading="lazy"
        className="object-cover"
      />
    </FeatureCard>
  );
};
