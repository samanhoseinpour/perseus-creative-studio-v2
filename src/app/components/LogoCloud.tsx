import { InfiniteSlider, ProgressiveBlur, ImageKit } from "./";

type Logo = {
  id: number;
  src: string;
  href: string;
  alt: string;
  height: number;
  width: number;
};

interface LogoCloudProps {
  slogan?: string;
  logos: Array<Logo>;
}

const LogoCloud = ({
  slogan = "Powering the best brands",
  logos,
}: LogoCloudProps) => {
  return (
    <section className="bg-background pb-16 md:pb-32">
      <div className="group relative m-auto max-w-6xl px-6">
        <div className="flex flex-col items-center md:flex-row">
          <div className="inline md:max-w-44 md:border-r md:pr-6">
            <p className="text-end text-sm">{slogan}</p>
          </div>
          <div className="relative py-6 md:w-[calc(100%-11rem)]">
            <InfiniteSlider speedOnHover={20} speed={40} gap={112}>
              {logos.map((logo) => (
                <a
                  href={logo.href}
                  target="_blank"
                  className="flex"
                  key={logo.id}
                >
                  <ImageKit
                    className="mx-auto h-7 w-fit brightness-0 invert-100"
                    src={logo.src}
                    alt={logo.alt}
                    height={logo.height}
                    loading="lazy"
                    width={logo.width}
                  />
                </a>
              ))}
            </InfiniteSlider>
            ⁄
            <div className="bg-linear-to-r from-background absolute inset-y-0 left-0 w-20"></div>
            <div className="bg-linear-to-l from-background absolute inset-y-0 right-0 w-20"></div>
            <ProgressiveBlur
              className="pointer-events-none absolute left-0 top-0 h-full w-20"
              direction="left"
              blurIntensity={1}
            />
            <ProgressiveBlur
              className="pointer-events-none absolute right-0 top-0 h-full w-20"
              direction="right"
              blurIntensity={1}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LogoCloud;
