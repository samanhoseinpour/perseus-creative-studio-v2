import { twMerge } from 'tailwind-merge';

import Container from '@/components/ui/Container';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface HeadingProps {
  seperatorTitle?: string;
  seperatorTitleStyle?: string;
  /**
   * Element for the separator eyebrow. Heroes pass 'h1' so the descriptive
   * entity line is the page's real <h1> (Tailwind preflight keeps an h1
   * visually identical to the span) while the big slogan demotes to h2.
   */
  seperatorTitleTag?: 'span' | 'h1';
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
  seperatorTitleTag = 'span',
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
  const SeperatorTag = seperatorTitleTag;

  return (
    <Container className={twMerge('flex flex-col', containerStyle)}>
      {showSeparator && (
        <div className="flex items-center gap-4">
          {seperatorTitle && (
            <SeperatorTag
              className={twMerge(
                'eyebrow text-[11px] text-black/60',
                seperatorTitleStyle,
              )}
            >
              {seperatorTitle}
            </SeperatorTag>
          )}

          <span className="h-px flex-1 bg-black/10" />

          {eyebrowRight && (
            <span
              className={twMerge(
                'eyebrow text-[11px] text-black/60',
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
            {/* /50, not /40: large-text WCAG contrast (3:1) on the light
                theme — the two-tone heading keeps its lighter second line,
                one step stronger. */}
            <span className={twMerge('text-black/50', titleAccentStyle)}>
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
