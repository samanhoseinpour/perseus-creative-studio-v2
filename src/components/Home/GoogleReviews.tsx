import { Container, Heading } from "../../components";

const GoogleReviews = () => {
  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle="09 — Google Reviews"
        eyebrowRight="Client Proof"
        title="Client Pulse on Google"
        titleAccent="Verified feedback from real projects."
        description="Direct perspectives on outcomes, process, and partnership quality from clients who have worked with Perseus Creative Studio."
        containerStyle="mb-10"
        titleStyle="max-w-4xl"
        descStyle="max-w-3xl"
      />

      <Container className="flex flex-col justify-start">
        <div className="relative w-full overflow-hidden">
          <iframe
            title="Perseus Creative Studio Google Reviews"
            src="https://cbcdb1177dbf422aa37327393cf6f965.elf.site"
            height={900}
            className="w-[calc(100%+12px)] md:w-full h-[1050px] md:h-[900px] "
            style={{ border: 0 }}
          />
        </div>
      </Container>
    </section>
  );
};

export default GoogleReviews;
