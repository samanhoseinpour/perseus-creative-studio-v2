'use client';

import { useRef } from 'react';
import emailjs from '@emailjs/browser';
import { Button, Container, TextShimmer } from '..';
import { toast } from 'sonner';

export type ServiceOption = { id: string; label: string };
export type SelectOption = { value: string; label: string };

export interface ContactFormProps {
  title?: string;
  description?: string;
  servicesOptions?: ServiceOption[];
  referralOptions?: SelectOption[];
  countryOptions?: SelectOption[];
  submitLabel?: string;
  className?: string;
}

export const DEFAULT_SERVICE_OPTIONS: ServiceOption[] = [
  { id: 'branding', label: 'Branding & Strategy' },
  { id: 'web', label: 'Website Design & Development' },
  { id: 'content', label: 'Video / Photo Production' },
  { id: 'social', label: 'Social Media Management' },
  { id: 'advertising', label: 'Advertising Campaigns' },
  { id: 'collabration', label: 'Collaboration / Partnership' },
  { id: 'hiring', label: 'Hiring or Joining the Team' },
  { id: 'somethingelse', label: 'Something Else' },
];

export const DEFAULT_COUNTRY_OPTIONS: SelectOption[] = [
  { value: 'CA', label: 'CA 🇨🇦' },
  { value: 'US', label: 'US 🇺🇸' },
  { value: 'EU', label: 'EU 🇪🇺' },
];

const ContactForm = ({
  title = 'Start a Project',
  description = 'Tell us about your brand, goals, and the services you’re seeking. Our team will review and get back with a tailored proposal.',
  servicesOptions = DEFAULT_SERVICE_OPTIONS,
  countryOptions = DEFAULT_COUNTRY_OPTIONS,
  submitLabel = 'Submit inquiry',
  className,
}: ContactFormProps) => {
  const form = useRef<HTMLFormElement | null>(null);

  const sendEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.current) return;

    emailjs
      .sendForm('service_qjag8bk', 'template_7mblhs8', form.current, {
        publicKey: 'dadBrt1bY5rxklS5j',
      })
      .then(
        () => {
          toast.success('Message sent', {
            description:
              'Thanks for reaching out — we’ve received your inquiry and will get back to you shortly.',
          });
          form.current?.reset();
        },
        (error) => {
          toast.error('Message not sent', {
            description:
              'Something went wrong while sending your inquiry. Please try again in a moment.',
          });
          console.log('FAILED...', error.text);
        },
      );
  };

  return (
    <section className={`isolate py-24 sm:py-48 ${className ?? ''}`}>
      <Container className="flex max-w-5xl flex-col items-center justify-center">
        <h1 className="text-4xl leading-4xl font-bold sm:text-5xl sm:leading-5xl">
          {title}
        </h1>
        <TextShimmer as="h2" className="mt-2 text-sm leading-sm text-center">
          {description}
        </TextShimmer>

        <div className="w-full">
          <form
            ref={form}
            onSubmit={sendEmail}
            className="mt-8 sm:mt-12 w-full"
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="user_name"
                  className="block text-sm/6 font-semibold"
                >
                  Full Name *
                </label>
                <div className="mt-2.5">
                  <input
                    id="user_name"
                    name="user_name"
                    type="text"
                    autoComplete="name"
                    placeholder="Jon Doe"
                    required
                    autoFocus
                    className="block w-full rounded-md bg-background-contrast px-3.5 py-2 text-sm text-black placeholder:text-black/30"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="user_email"
                  className="block text-sm/6 font-semibold"
                >
                  Email *
                </label>
                <div className="mt-2.5">
                  <input
                    id="user_email"
                    name="user_email"
                    type="email"
                    autoComplete="email"
                    placeholder="info@perseustudio.com"
                    required
                    className="block w-full rounded-md bg-background-contrast px-3.5 py-2 text-sm text-black placeholder:text-black/30"
                  />
                </div>
              </div>

              <div className="sm:col-span-1">
                <label
                  htmlFor="phone-number"
                  className="block text-sm/6 font-semibold"
                >
                  Phone number *
                </label>
                <div className="mt-2.5">
                  <div className="flex rounded-md bg-background-contrast">
                    <div className="grid shrink-0 grid-cols-1 focus-within:relative">
                      <select
                        id="user_country"
                        name="user_country"
                        autoComplete="country"
                        aria-label="Country"
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-transparent py-2 pr-7 pl-3.5 text-sm text-black sm:text-sm/6"
                      >
                        {countryOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <svg
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end/60 sm:size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                    <input
                      id="user_phoneNumber"
                      name="user_phoneNumber"
                      type="tel"
                      placeholder="(+1) 7788878363"
                      required
                      className="block min-w-0 grow bg-transparent py-1.5 pr-3 pl-1 text-sm text-black placeholder:text-black/30 focus:outline-none sm:text-sm/6"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="business_name"
                  className="block text-sm/6 font-semibold"
                >
                  Company
                </label>
                <div className="mt-2.5">
                  <input
                    id="business_name"
                    name="business_name"
                    type="text"
                    autoComplete="organization"
                    placeholder="Perseus Creative Studio"
                    className="block w-full rounded-md bg-background-contrast px-3.5 py-2 text-sm text-black placeholder:text-black/30"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="instagram_id"
                  className="block text-sm/6 font-semibold"
                >
                  Instagram
                </label>
                <div className="mt-2.5">
                  <input
                    id="instagram_id"
                    name="instagram_id"
                    type="text"
                    placeholder="perseustudio"
                    className="block w-full rounded-md bg-background-contrast px-3.5 py-2 text-sm text-black placeholder:text-black/30"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="website_name"
                  className="block text-sm/6 font-semibold"
                >
                  Website
                </label>
                <div className="mt-2.5">
                  <input
                    id="website_name"
                    name="website_name"
                    type="text"
                    placeholder="perseustudio.com"
                    className="block w-full rounded-md bg-background-contrast px-3.5 py-2 text-sm text-black placeholder:text-black/30"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm/6 font-semibold">
                  Inquiry Type *
                </label>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {servicesOptions.map(({ id, label }) => (
                    <label key={id} className="flex items-center gap-3">
                      <input
                        id="user_service"
                        name="user_service"
                        value={label}
                        type="checkbox"
                        className="size-4 rounded border-black/30"
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="user_message"
                  className="block text-sm/6 font-semibold"
                >
                  Tell us more about your inquiry.
                </label>
                <div className="mt-2.5">
                  <textarea
                    id="user_message"
                    name="user_message"
                    rows={4}
                    placeholder="Please tell us what you’re reaching out about and include any helpful details. We’ll respond as soon as possible."
                    className="block w-full rounded-md bg-background-contrast px-3.5 py-2 text-sm text-black placeholder:text-black/30"
                    defaultValue={''}
                  />
                </div>
              </div>
            </div>
            <div className="mt-10">
              <Button type="submit" className="w-full" size="medium">
                {submitLabel}
              </Button>
            </div>
          </form>
        </div>
      </Container>
    </section>
  );
};

export default ContactForm;
