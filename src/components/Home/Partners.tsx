import { Container, Heading, ImageKit } from '../';
import {
  clientImg,
  clientImg2,
  selectedClientImg,
  selectedClientImg2,
} from '../../constants';

type PartnersHeadingProps = {
  seperatorTitle?: string;
  eyebrowRight?: string;
  title?: string;
  titleAccent?: string;
  description?: string;
};

type PartnersProps = {
  heading?: PartnersHeadingProps;
  variant?: 'default' | 'home';
};

const Partners = ({ heading, variant = 'default' }: PartnersProps) => {
  const firstRowClients = variant === 'home' ? selectedClientImg : clientImg;
  const secondRowClients = variant === 'home' ? selectedClientImg2 : clientImg2;
  const headingContent = {
    seperatorTitle: heading?.seperatorTitle ?? '07 - Selected Clients',
    eyebrowRight: heading?.eyebrowRight ?? 'Client Work',
    title: heading?.title ?? 'Our Selected Clients',
    titleAccent:
      heading?.titleAccent ?? 'A curated look at recent partnerships.',
    description:
      heading?.description ??
      'A selected sample of clients and collaborators we’ve supported across branding, content, web, and digital marketing. The full client logo collection will live on the About page.',
  };

  return (
    <Container className="overflow-x-hidden py-16">
      <Heading
        titleTag="h2"
        seperatorTitle={headingContent.seperatorTitle}
        eyebrowRight={headingContent.eyebrowRight}
        title={headingContent.title}
        titleAccent={headingContent.titleAccent}
        description={headingContent.description}
        containerStyle="px-0 md:px-0 mb-10 w-full max-w-none"
        titleStyle="max-w-4xl"
        descStyle="max-w-3xl"
      />

      {/* First Marquee */}
      <div
        className="marquee fadeout-horizontal"
        style={{ '--numItems': firstRowClients.length } as React.CSSProperties}
      >
        <div className="marquee-track grid grid-cols-3 w-max">
          {firstRowClients.map((client) => (
            <div
              className="marquee-item flex justify-center items-center rounded-xl aspect-[1/1.2]"
              key={client.id}
              style={
                { '--item-position': `${client.id}` } as React.CSSProperties
              }
            >
              <div className="w-1/2 rounded-full max-sm:w-24">
                <ImageKit
                  src={client.srcImg}
                  alt={client.altImg}
                  width={200}
                  height={200}
                  className="w-full h-auto object-cover rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reverse Marquee */}
      <div
        className="marquee fadeout-horizontal mt-[-140px]"
        style={
          {
            '--numItems': secondRowClients.length,
            '--direction': 'reverse',
          } as React.CSSProperties
        }
      >
        <div className="marquee-track grid grid-cols-3 w-max">
          {secondRowClients.map((client) => (
            <div
              className="marquee-item flex justify-center items-center rounded-xl aspect-[1/1.2] group"
              key={client.id}
              style={
                { '--item-position': `${client.id}` } as React.CSSProperties
              }
            >
              <div className="w-1/2 rounded-full max-sm:w-24">
                <ImageKit
                  src={client.srcImg}
                  alt={client.altImg}
                  width={200}
                  height={200}
                  className="w-full h-auto object-cover rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
};

export default Partners;
