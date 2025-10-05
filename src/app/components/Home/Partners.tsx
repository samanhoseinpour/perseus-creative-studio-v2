import { Container, ImageKit, Heading } from '../';
import { clientImg, clientImg2 } from '../../constants';

const Partners = () => {
  return (
    <section className="mb-16 sm:mb-32">
      <Heading
        seperatorTitle="Partners"
        titleTag="h3"
        title="Trusted by bests worldwide"
        description="Lorem ipsum dolor sit amet consect adipisicing possimus."
        containerStyle="text-center"
      />

      {/* Marquee Rows */}
      <Container className="overflow-x-hidden">
        {/* First Marquee */}
        <div
          className="marquee fadeout-horizontal"
          style={{ '--numItems': 17 } as React.CSSProperties}
        >
          <div className="marquee-track grid grid-cols-3 w-max">
            {clientImg.map((client) => (
              <div
                className="marquee-item flex justify-center items-center rounded-xl aspect-[1/1.2]"
                key={client.id}
                style={
                  { '--item-position': `${client.id}` } as React.CSSProperties
                }
              >
                <a
                  href={client.href}
                  target="_blank"
                  className="w-1/2 rounded-full bg-white max-sm:w-24"
                >
                  <ImageKit
                    src={client.srcImg}
                    alt={client.altImg}
                    loading="lazy"
                    fill
                  />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Reverse Marquee */}
        <div
          className="marquee fadeout-horizontal mt-[-140px]"
          style={
            {
              '--numItems': 17,
              '--direction': 'reverse',
            } as React.CSSProperties
          }
        >
          <div className="marquee-track grid grid-cols-3 w-max">
            {clientImg2.map((client) => (
              <div
                className="marquee-item flex justify-center items-center rounded-xl aspect-[1/1.2] group last:group-last:bg-white"
                key={client.id}
                style={
                  { '--item-position': `${client.id}` } as React.CSSProperties
                }
              >
                <a
                  href={client.href}
                  target="_blank"
                  className="w-1/2 rounded-full bg-white max-sm:w-24"
                >
                  <ImageKit
                    src={client.srcImg}
                    alt={client.altImg}
                    loading="lazy"
                    fill
                  />
                </a>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Partners;
