import React from 'react';
import { twMerge } from 'tailwind-merge';

import { Container } from '../components';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface HeadingProps {
  seperatorTitle?: string;
  seperatorTitleStyle?: string;
  eyebrowRight?: string;
  eyebrowRightStyle?: string;
  title: string;
  titleAccent?: string;
  titleTag?: HeadingTag;
  description: string;
  containerStyle?: string;
  descStyle?: string;
  titleStyle?: string;
}

const Heading = ({
  seperatorTitle,
  title,
  titleAccent,
  titleTag = 'h2',
  description,
  containerStyle,
  seperatorTitleStyle,
  eyebrowRight,
  eyebrowRightStyle,
  descStyle,
  titleStyle,
}: HeadingProps) => {
  const TitleTag = titleTag;

  return (
    <Container className={twMerge('flex flex-col', containerStyle)}>
      <div className="flex items-center gap-4">
        {seperatorTitle && (
          <span
            className={twMerge(
              'font-mono text-[11px] tracking-[0.2em] uppercase text-black/50',
              seperatorTitleStyle,
            )}
          >
            {seperatorTitle}
          </span>
        )}

        <span className="h-px flex-1 bg-black/10" />

        {eyebrowRight && (
          <span
            className={twMerge(
              'font-mono text-[11px] tracking-[0.2em] uppercase text-black/50',
              eyebrowRightStyle,
            )}
          >
            {eyebrowRight}
          </span>
        )}
      </div>

      <TitleTag
        className={twMerge(
          'mt-8 text-3xl leading-3xl sm:text-4xl sm:leading-4xl font-semibold tracking-tighter max-w-3xl text-black',
          titleStyle,
        )}
      >
        {title}

        {titleAccent && (
          <>
            {/* Real space so the heading's text content reads "title accent"
                (not "titleaccent") for SEO/accessibility; <br> only breaks
                the line visually and adds no whitespace. */}
            {' '}
            <br />
            <span className="text-black/40">{titleAccent}</span>
          </>
        )}
      </TitleTag>

      <p
        className={twMerge(
          'mt-4 max-w-2xl text-sm text-black/60',
          descStyle,
        )}
      >
        {description}
      </p>
    </Container>
  );
};

export default Heading;
