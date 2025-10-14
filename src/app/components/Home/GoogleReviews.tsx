import { Container, Heading } from "../../components";

const GoogleReviews = () => {
  return (
    <section className="bg-white text-black">
      <Heading
        seperatorTitle="Verified on Google"
        title="Client Pulse on Google"
        titleTag="h3"
        description="Direct perspectives on outcomes, process, and partnership quality."
      />

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
