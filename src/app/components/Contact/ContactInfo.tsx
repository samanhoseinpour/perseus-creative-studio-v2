export type ContactMethod = {
  title: string;
  email?: string;
  phoneLabel?: string;
  phoneHref?: string;
};

export type OfficeInfoCard = {
  title: string;
  lines: string[];
};

export interface ContactInfoProps {
  heading?: string;
  description?: string;
  contactCards?: ContactMethod[];
  officeHeading?: string;
  officeDescription?: string;
  officeCards?: OfficeInfoCard[];
  className?: string;
}

export const DEFAULT_CONTACT_CARDS: ContactMethod[] = [
  {
    title: "Email",
    email: "info@perseustudio.com",
    phoneLabel: "(+1) 778-877-8363",
    phoneHref: "tel:+17788778363",
  },
  {
    title: "Partnerships",
    email: "info@perseustudio.com",
    phoneLabel: "(+1) 778-877-8363",
    phoneHref: "tel:+17788878363",
  },
  {
    title: "Media",
    email: "info@perseustudio.com",
    phoneLabel: "(+1) 778-877-8363",
    phoneHref: "tel:+17788878363",
  },
  {
    title: "Support",
    email: "info@perseustudio.com",
    phoneLabel: "(+1) 778-877-8363",
    phoneHref: "tel:+17788878363",
  },
];

export const DEFAULT_OFFICE_CARDS: OfficeInfoCard[] = [
  {
    title: "Company Address:",
    lines: ["998 Harbourside Dr, North Vancouver, BC V7N 1R2, Canada"],
  },
  {
    title: "Business Hours:",
    lines: [
      "Mon–Fri: 8:00 AM – 6:00 PM PST",
      "Sat: By Appointment",
      "Sun: Closed",
    ],
  },
];

export const DEFAULT_HEADINGS = {
  heading: "Get in touch",
  description:
    "Talk to our team about home, workplace, and fleet charging. We typically respond within one business day and can advise on design, installation, rebates, and ongoing support.",
  officeHeading: "Head Office",
  officeDescription:
    "Visit our Irvine headquarters during business hours. For consultations or site assessments, please schedule an appointment so we can connect you with the right specialist.",
} as const;

const ContactInfo = ({
  heading = DEFAULT_HEADINGS.heading,
  description = DEFAULT_HEADINGS.description,
  contactCards = DEFAULT_CONTACT_CARDS,
  officeHeading = DEFAULT_HEADINGS.officeHeading,
  officeDescription = DEFAULT_HEADINGS.officeDescription,
  officeCards = DEFAULT_OFFICE_CARDS,
  className,
}: ContactInfoProps) => {
  return (
    <section className={`mx-auto max-w-6xl px-6 lg:px-8 ${className ?? ""}`}>
      <div className="mx-auto max-w-2xl divide-y divide-gray-100 lg:mx-0 lg:max-w-none">
        {contactCards?.length > 0 && (
          <div className="grid grid-cols-1 gap-10 py-16 lg:grid-cols-3">
            <div>
              <h2 className="text-4xl font-semibold text-white">{heading}</h2>
              {description && (
                <p className="mt-4 text-background-contrast-white text-sm">
                  {description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-2 lg:gap-8">
              {contactCards.map(({ title, email, phoneLabel, phoneHref }) => (
                <div
                  key={title}
                  className="rounded-2xl bg-background-contrast-white/30 p-10"
                >
                  <h3 className="font-semibold text-white">{title}</h3>
                  <dl className="mt-3 space-y-1 text-sm/6">
                    {email && (
                      <div>
                        <dt className="sr-only">Email</dt>
                        <dd>
                          <a
                            href={`mailto:${email}`}
                            className="text-shadow-background-contrast-white"
                            aria-label={`Email ${title}`}
                          >
                            {email}
                          </a>
                        </dd>
                      </div>
                    )}
                    {phoneHref && phoneLabel && (
                      <div className="mt-1">
                        <dt className="sr-only">Phone number</dt>
                        <dd>
                          <a href={phoneHref} aria-label={`Call ${title}`}>
                            {phoneLabel}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        )}

        {officeCards?.length > 0 && (
          <div className="grid grid-cols-1 gap-10 py-16 lg:grid-cols-3">
            <div>
              <h2 className="text-4xl font-semibold text-white">
                {officeHeading}
              </h2>
              {officeDescription && (
                <p className="mt-4 text-background-contrast-white text-sm">
                  {officeDescription}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-2 lg:gap-8">
              {officeCards.map(({ title, lines }) => (
                <div
                  key={title}
                  className="rounded-2xl bg-background-contrast-white/30 p-10"
                >
                  <h3 className=" font-semibold text-white">{title}</h3>
                  <address className="mt-3 space-y-1 text-sm/6 text-background-contrast-white not-italic">
                    {lines.map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </address>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ContactInfo;
