import { Container, TextEffect } from "../../components";

const GoogleReviews = () => {
  return (
    <section className="bg-white text-black">
      <Container className="border-t">
        <TextEffect
          as="span"
          className="-ml-6 -mt-3.5 block w-max bg-gray-50 px-6 dark:bg-gray-950"
        >
          Verified on Google
        </TextEffect>
        <TextEffect
          as="h3"
          className="mt-12 sm:mt-24 font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl "
        >
          Client Pulse on Google
        </TextEffect>
        <TextEffect
          as="p"
          per="line"
          delay={0.5}
          className="text-sm font-semibold text-black/70"
        >
          Direct perspectives on outcomes, process, and partnership quality.
        </TextEffect>
      </Container>
      <Container className="flex flex-col justify-start mt-10">
        <iframe
          src="https://cbcdb1177dbf422aa37327393cf6f965.elf.site"
          height={900}
        ></iframe>
      </Container>
    </section>
  );
};

export default GoogleReviews;
