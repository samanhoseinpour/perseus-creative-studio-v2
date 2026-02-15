import { Container, FadeIn } from '../';

export const UspsData = [
  {
    id: 1,
    content:
      'Our team brings together strategy, storytelling, and design to build brands with meaning.',
  },
  {
    id: 2,
    content:
      'We dive deep into what makes your business unique, then translate it into branding, content, and digital experiences that people actually connect with.',
  },
  {
    id: 3,
    content:
      'We design and develop modern, high-performing websites that align with your brand, support your strategy, and turn visitors into customers.',
  },
  {
    id: 4,
    content:
      'From your logo to your online presence, from video production to web design and social campaigns, everything we create is designed to leave a lasting impression and drive real growth.',
  },
];

const Usps = () => {
  return (
    <Container className="relative z-10 max-w-[800px] space-y-12 py-36 text-xl leading-xl font-semibold text-black sm:text-2xl sm:leading-2xl">
      {UspsData.map((Usp) => (
        <FadeIn key={Usp.id}>
          <h2>{Usp.content}</h2>
        </FadeIn>
      ))}
    </Container>
  );
};

export default Usps;
