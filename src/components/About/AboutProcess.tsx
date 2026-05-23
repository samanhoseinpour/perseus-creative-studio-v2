import { Container, ImageKit, WobbleCard, Heading } from '..';
import { ABOUT_PROCESS_HEADING, ABOUT_PROCESS_CARDS } from '@/constants/about';

const AboutProcess = () => {
  const cards = ABOUT_PROCESS_CARDS;

  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        {...ABOUT_PROCESS_HEADING}
        containerStyle="mb-10"
        titleStyle="max-w-4xl"
        descStyle="max-w-3xl"
      />
      <Container>
        <div
          id="how-we-work"
          aria-label="our process — how we work"
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full"
        >
          {cards.map((card, idx) => (
            <WobbleCard key={idx} containerClassName={card.containerClassName}>
              {card.wrapperClass ? (
                <div className={card.wrapperClass}>
                  <h4
                    className={`text-white text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold ${
                      card.titleClass ?? ''
                    }`}
                  >
                    {card.title}
                  </h4>
                  <p
                    className={`mt-4 text-left text-sm text-white/70 ${
                      card.bodyClass ?? ''
                    }`}
                  >
                    {card.body}
                  </p>
                </div>
              ) : (
                <>
                  <h4
                    className={`text-white text-left text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold ${
                      card.titleClass ?? ''
                    }`}
                  >
                    {card.title}
                  </h4>
                  <p
                    className={`mt-4 text-left text-sm text-white/70 ${
                      card.bodyClass ?? ''
                    }`}
                  >
                    {card.body}
                  </p>
                </>
              )}

              {card.image && (
                <ImageKit
                  src={card.image.src}
                  width={card.image.width}
                  height={card.image.height}
                  alt={card.image.alt}
                  className={card.image.className}
                />
              )}
            </WobbleCard>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default AboutProcess;
