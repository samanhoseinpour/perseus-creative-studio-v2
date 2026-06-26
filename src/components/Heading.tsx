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
  titleAccentStyle?: string;
  titleTag?: HeadingTag;
  description: string;
  containerStyle?: string;
  descStyle?: string;
  titleStyle?: string;
  /** Hide the top separator row (rule + eyebrows). Defaults on; turn off for
   *  subordinate sub-headers that shouldn't carry the section divider. */
  showSeparator?: boolean;
}

const Heading = ({
  seperatorTitle,
  title,
  titleAccent,
  titleAccentStyle,
  titleTag = 'h2',
  description,
  containerStyle,
  seperatorTitleStyle,
  eyebrowRight,
  eyebrowRightStyle,
  descStyle,
  titleStyle,
  showSeparator = true,
}: HeadingProps) => {
  const TitleTag = titleTag;

  return (
    <Container className={twMerge('flex flex-col', containerStyle)}>
      {showSeparator && (
        <div className="flex items-center gap-4">
          {seperatorTitle && (
            <span
              className={twMerge(
                'eyebrow text-[11px] text-black/50',
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
                'eyebrow text-[11px] text-black/50',
                eyebrowRightStyle,
              )}
            >
              {eyebrowRight}
            </span>
          )}
        </div>
      )}

      <TitleTag
        className={twMerge(
          'text-3xl leading-3xl sm:text-4xl sm:leading-4xl font-semibold tracking-tighter max-w-3xl text-black',
          showSeparator && 'mt-8',
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
            <span className={twMerge('text-black/40', titleAccentStyle)}>
              {titleAccent}
            </span>
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
