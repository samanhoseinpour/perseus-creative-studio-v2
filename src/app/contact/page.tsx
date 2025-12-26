import { Metadata } from 'next';
import { ContactForm, ContactInfo, Beam } from '../components';

export const metadata: Metadata = {
  title: 'Book Free Consultation - Perseus Creative Studio Vancouver',
  description:
    'Get in touch with Perseus Creative Studio team in Vancouver for free consultation, project inquiries and custom digital marketing strategies .',
  keywords: ['Vancouver Digital Marketing Agency'],

  openGraph: {
    title: 'Book Free Consultation - Perseus Creative Studio Vancouver',
    description:
      'Get in touch with Perseus Creative Studio team in Vancouver for free consultation, project inquiries and custom digital marketing strategies .',
    url: 'https://www.perseustudio.com',
    siteName: 'Perseus Creative Studio',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://ik.imagekit.io/perseus/logo-black.png',
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio Projects Page Preview',
      },
    ],
  },
};

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
