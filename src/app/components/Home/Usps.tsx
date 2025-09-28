import { Container, FadeIn } from "../";

export const UspsData = [
  {
    id: 1,
    content:
      "Perseus Creative Studio is a marketing agency that helps businesses grow through thoughtful design and strategic content.",
  },
  {
    id: 2,
    content:
      "We produce high-quality video and photography to showcase your story.",
  },
  {
    id: 3,
    content:
      "We build custom websites that are visually engaging and easy to use.",
  },
  {
    id: 4,
    content:
      "We craft strong brand identities and develop marketing that delivers real results.",
  },
];

const Usps = () => {
  return (
    <Container className="relative z-10 max-w-[800px] space-y-12 py-36 text-3xl font-bold text-white md:text-4xl md:leading-4xl">
      {UspsData.map((Usp) => (
        <FadeIn key={Usp.id}>
          <h2>{Usp.content}</h2>
        </FadeIn>
      ))}
    </Container>
  );
};

export default Usps;
