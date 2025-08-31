import { ContactForm, ContactInfo, Beam } from "../components";

const ContactPage = () => {
  return (
    <main className="relative">
      <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none">
        <Beam
          beamWidth={1}
          beamHeight={30}
          beamNumber={24}
          lightColor="#fcfcfc"
          speed={3}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={48}
        />
      </div>

      <ContactForm />
      <ContactInfo />
    </main>
  );
};

export default ContactPage;
