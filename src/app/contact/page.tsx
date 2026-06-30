import { Metadata } from 'next';
import { ContactForm, ContactInfo } from '@/components';
import { OG_IMAGE } from '@/constants';

export const metadata: Metadata = {
  title: 'Book Free Consultation - Perseus Creative Studio Vancouver',
  description:
    'Get in touch with Perseus Creative Studio team in Vancouver for free consultation, project inquiries and custom marketing strategies.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/contact',
  },

  openGraph: {
    title: 'Book Free Consultation - Perseus Creative Studio Vancouver',
    description:
      'Get in touch with Perseus Creative Studio team in Vancouver for free consultation, project inquiries and custom marketing strategies.',
    url: 'https://www.perseustudio.com/contact',
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio — book a free consultation in Vancouver',
      },
    ],
  },
};

const ContactPage = () => {
  return (
    <main>
      <ContactForm />
      <ContactInfo />
    </main>
  );
};

export default ContactPage;
