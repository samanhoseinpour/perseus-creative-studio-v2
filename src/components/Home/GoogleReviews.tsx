import { Container, Heading } from "../../components";

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

const GoogleReviews = ({ heading }: GoogleReviewsProps) => {
  const headingContent = {
    seperatorTitle: heading?.seperatorTitle ?? '08 — Google Reviews',
    eyebrowRight: heading?.eyebrowRight ?? 'Client Proof',
    title: heading?.title ?? 'Client Pulse on Google',
    titleAccent: heading?.titleAccent ?? 'Verified feedback from real projects.',
    description:
      heading?.description ??
      'Direct perspectives on outcomes, process, and partnership quality from clients who have worked with Perseus Creative Studio.',
  };

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

      <Container className="flex flex-col justify-start">
        <div className="relative w-full overflow-hidden">
          <iframe
            title="Perseus Creative Studio Google Reviews"
            src="https://cbcdb1177dbf422aa37327393cf6f965.elf.site"
            height={900}
            className="w-[calc(100%+12px)] md:w-full h-[1050px] md:h-[900px] "
            style={{ border: 0 }}
          />
        </div>
      </Container>
    </section>
  );
};

export default GoogleReviews;
