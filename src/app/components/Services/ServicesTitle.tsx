import { FadeIn, ImageKit } from "..";

const ServicesTitle = () => {
  return (
    <section className="flex flex-col justify-center w-5/5">
      <FadeIn>
        <h2 className="mb-12 font-heading text-5xl leading-5xl text-black font-bold dark:text-white">
          Industrial Photography.
          <br />
          <span className="text-black/30 dark:text-white/30">
            Schedule time for real estate, construction, and etc.
          </span>
        </h2>
        <div className="flex flex-row gap-8 items-stretch">
          <div className="relative w-2/5 min-h-[300px] h-full">
            <ImageKit
              src="/homeServices-1.JPG"
              alt="real estate image"
              loading="lazy"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-end w-3/5">
            <p className="text-black/30 text-xs font-semibold text-justify">
              <span className="text-black">At Perseus Creative Studio,</span> we
              believe that every project presents a unique challenge. We
              specialize in crafting innovative and tailored solutions to
              overcome those challenges and bring your vision to life. Our team
              works across various industries, offering expertise in digital
              design, web development, and creative strategy. Whether
              you&apos;re looking to design immersive websites, develop
              cutting-edge mobile apps, or create unique visual content, we
              approach each task with a combination of creativity, precision,
              and deep technical knowledge. From producing high-quality content
              for local businesses in British Columbia and Ontario to
              collaborating with international petroleum companies, we have
              proven our adaptability and expertise across various industries
              and projects. Whether working on personal branding for small
              businesses or spearheading major campaigns for development
              companies, our dedicated team excels in transforming ideas into
              compelling content. With creativity, precision, and an unwavering
              commitment to excellence, we ensure that each project leaves an
              unforgettable impression.
            </p>
          </div>
        </div>
      </FadeIn>
    </section>
  );
};

export default ServicesTitle;
