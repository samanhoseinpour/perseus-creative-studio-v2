import { Button, Container, Heading } from '@/components';
import { getGoogleReviews } from '@/lib/googleReviews';
import GoogleGlyph from './GoogleGlyph';
import GoogleReviewsShelf from './GoogleReviewsShelf';
import Stars from './Stars';

type GoogleReviewsHeadingProps = {
  seperatorTitle?: string;
  eyebrowRight?: string;
  title?: string;
  titleAccent?: string;
  description?: string;
};

type GoogleReviewsProps = {
  heading?: GoogleReviewsHeadingProps;
};

const GoogleReviews = async ({ heading }: GoogleReviewsProps) => {
  const headingContent = {
    seperatorTitle: heading?.seperatorTitle ?? '08 — Google Reviews',
    eyebrowRight: heading?.eyebrowRight ?? 'Client Proof',
    title: heading?.title ?? 'Client Pulse on Google',
    titleAccent:
      heading?.titleAccent ?? 'Verified feedback from real projects.',
    description:
      heading?.description ??
      'Direct perspectives on outcomes, process, and partnership quality from clients who have worked with Perseus Creative Studio.',
  };

  const data = await getGoogleReviews();

  // No key/place configured, or the fetch failed with nothing to show → hide the
  // section entirely rather than render an empty shell.
  if (!data || data.userRatingCount === 0) return null;

  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle={headingContent.seperatorTitle}
        eyebrowRight={headingContent.eyebrowRight}
        title={headingContent.title}
        titleAccent={headingContent.titleAccent}
        description={headingContent.description}
        containerStyle="mb-10"
        titleStyle="max-w-4xl"
        descStyle="max-w-3xl"
      />

      <Container className="flex flex-col">
        {/* Aggregate rating block */}
        <div className="flex flex-col gap-6 rounded-3xl border border-foreground/10 bg-background p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-5">
            <span className="text-5xl font-semibold leading-none tabular-nums text-foreground">
              {data.rating.toFixed(1)}
            </span>
            <span aria-hidden className="h-12 w-px bg-foreground/10" />
            <div className="flex flex-col gap-1.5">
              <Stars value={data.rating} size={20} />
              <span className="text-sm text-foreground/70">
                {data.userRatingCount.toLocaleString()} Google reviews
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-2 text-sm text-foreground/60 md:inline-flex">
              <GoogleGlyph className="h-5 w-5" />
              Reviews from Google
            </span>
            {data.googleMapsUri && (
              <a
                href={data.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button size="small" shimmer={false}>
                  Read all on Google
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Review shelf */}
        <GoogleReviewsShelf reviews={data.reviews} />
      </Container>
    </section>
  );
};

export default GoogleReviews;
