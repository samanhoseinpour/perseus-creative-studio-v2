import { Container, ImageKit } from "../";
import { clientImg, clientImg2 } from "../../constants";

const Partners = () => {
  return (
    <Container className="overflow-x-hidden">
      {/* First Marquee */}
      <div
        className="marquee fadeout-horizontal"
        style={{ "--numItems": 25 } as React.CSSProperties}
      >
        <div className="marquee-track grid grid-cols-3 w-max">
          {clientImg.map((client) => (
            <div
              className="marquee-item flex justify-center items-center rounded-xl aspect-[1/1.2]"
              key={client.id}
              style={
                { "--item-position": `${client.id}` } as React.CSSProperties
              }
            >
              <a
                href={client.href}
                target="_blank"
                className="w-1/2 rounded-full max-sm:w-24"
              >
                <ImageKit
                  src={client.srcImg}
                  alt={client.altImg}
                  loading="lazy"
                  width={200}
                  height={200}
                  className="w-full h-auto object-cover rounded-full"
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
            "--numItems": 23,
            "--direction": "reverse",
          } as React.CSSProperties
        }
      >
        <div className="marquee-track grid grid-cols-3 w-max">
          {clientImg2.map((client) => (
            <div
              className="marquee-item flex justify-center items-center rounded-xl aspect-[1/1.2] group last:group-last:bg-white"
              key={client.id}
              style={
                { "--item-position": `${client.id}` } as React.CSSProperties
              }
            >
              <a
                href={client.href}
                target="_blank"
                className="w-1/2 rounded-full max-sm:w-24"
              >
                <ImageKit
                  src={client.srcImg}
                  alt={client.altImg}
                  loading="lazy"
                  width={200}
                  height={200}
                  className="w-full h-auto object-cover rounded-full"
                />
              </a>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
};

export default Partners;
