import { JSX } from 'react';
import { Container, TextEffect } from '../components';
import { twMerge } from 'tailwind-merge';

interface HeadingProps {
  seperatorTitle: string;
  title: string;
  titleTag: keyof JSX.IntrinsicElements;
  description: string;
  containerStyle?: string;
}

const Heading = ({
  seperatorTitle,
  title,
  titleTag,
  description,
  containerStyle,
}: HeadingProps) => {
  return (
    <Container
      className={twMerge(
        'border-t border-black dark:border-white',
        containerStyle
      )}
    >
      <TextEffect
        as="span"
        className={`-ml-6 -mt-3.5 block w-max bg-[#fcfcfc] px-6 dark:bg-background text-black dark:text-white`}
      >
        {seperatorTitle}
      </TextEffect>
      <TextEffect
        as={titleTag}
        className="mt-12 sm:mt-24 font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl text-black dark:text-white"
      >
        {title}
      </TextEffect>
      <TextEffect
        as="p"
        per="line"
        delay={0.5}
        className="text-sm font-semibold text-black/70 dark:text-white/70 pb-8"
      >
        {description}
      </TextEffect>
    </Container>
  );
};

export default Heading;
