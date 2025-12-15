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

      <Container className="flex flex-col justify-start py-10">
        <div className="relative w-full overflow-hidden">
          <iframe
            title="Perseus Creative Studio Google Reviews"
            src="https://cbcdb1177dbf422aa37327393cf6f965.elf.site"
            height={900}
            loading="lazy"
            className="w-[calc(100%+12px)] md:w-full h-[1050px] md:h-[900px] "
            style={{ border: 0 }}
          />
        </div>
      </Container>
    </section>
  );
};

export default GoogleReviews;
