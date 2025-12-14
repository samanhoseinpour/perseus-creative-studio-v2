import { Button, Container } from "..";

export type ServiceOption = { id: string; label: string };
export type SelectOption = { value: string; label: string };

export interface ContactFormProps {
  title?: string;
  description?: string;
  servicesOptions?: ServiceOption[];
  timelineOptions?: SelectOption[];
  referralOptions?: SelectOption[];
  countryOptions?: SelectOption[];
  action?: string;
  method?: "GET" | "POST";
  submitLabel?: string;
  className?: string;
}

export const DEFAULT_SERVICE_OPTIONS: ServiceOption[] = [
  { id: "branding", label: "Branding & Strategy" },
  { id: "web", label: "Website Design & Development" },
  { id: "content", label: "Video / Photo Production" },
  { id: "social", label: "Social Media Management" },
  { id: "advertising", label: "Advertising Campaigns" },
  { id: "collabration", label: "Collaboration / Partnership" },
  { id: "hiring", label: "Hiring or Joining the Team" },
  { id: "somethingelse", label: "Something Else" },
];

export const DEFAULT_TIMELINE_OPTIONS: SelectOption[] = [
  { value: "0-2", label: "0–2 weeks" },
  { value: "2-4", label: "2–4 weeks" },
  { value: "1-3m", label: "1–3 months" },
  { value: "3-6m", label: "3–6 months" },
  { value: "flexible", label: "Flexible / exploring options" },
];

export const DEFAULT_REFERRAL_OPTIONS: SelectOption[] = [
  { value: "search", label: "Search engine" },
  { value: "social", label: "Social media" },
  { value: "referral", label: "Referral" },
  { value: "event", label: "Event / conference" },
  { value: "ads", label: "Advertisement" },
  { value: "other", label: "Other" },
];

export const DEFAULT_COUNTRY_OPTIONS: SelectOption[] = [
  { value: "CA", label: "CA 🇨🇦" },
  { value: "US", label: "US 🇺🇸" },
  { value: "EU", label: "EU 🇪🇺" },
];

const ContactForm = ({
  title = "Start a Project",
  description = "Tell us more about your inquiry.",
  servicesOptions = DEFAULT_SERVICE_OPTIONS,
  timelineOptions = DEFAULT_TIMELINE_OPTIONS,
  referralOptions = DEFAULT_REFERRAL_OPTIONS,
  countryOptions = DEFAULT_COUNTRY_OPTIONS,
  action = "#",
  method = "POST",
  submitLabel = "Submit inquiry",
  className,
}: ContactFormProps) => {
  return (
    <section
      className={`min-h-[100svh] isolate py-24 sm:py-32 ${className ?? ""}`}
    >
      <Container className="flex max-w-5xl flex-col items-center justify-center">
        <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
        <p className="mt-2 text-md text-center">{description}</p>

        <div className="w-full">
          <form
            action={action}
            method={method}
            className="mt-8 sm:mt-12 w-full"
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="first-name"
                  className="block text-sm/6 font-semibold"
                >
                  First name *
                </label>
                <div className="mt-2.5">
                  <input
                    id="first-name"
                    name="first-name"
                    type="text"
                    autoComplete="given-name"
                    placeholder="Jane"
                    required
                    autoFocus
                    className="block w-full rounded-md bg-white px-3.5 py-2 text-sm text-black placeholder:text-black/30"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="last-name"
                  className="block text-sm/6 font-semibold"
                >
                  Last name *
                </label>
                <div className="mt-2.5">
                  <input
                    id="last-name"
                    name="last-name"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Doe"
                    required
                    className="block w-full rounded-md bg-white px-3.5 py-2 text-sm text-black placeholder:text-black/30"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="company"
                  className="block text-sm/6 font-semibold"
                >
                  Company / Brand *
                </label>
                <div className="mt-2.5">
                  <input
                    id="company"
                    name="company"
                    type="text"
                    autoComplete="organization"
                    placeholder="Perseus Creative Studio"
                    required
                    className="block w-full rounded-md bg-white px-3.5 py-2 text-sm text-black placeholder:text-black/30"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm/6 font-semibold"
                >
                  Work email *
                </label>
                <div className="mt-2.5">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="info@perseustudio.com"
                    required
                    className="block w-full rounded-md bg-white px-3.5 py-2 text-sm text-black placeholder:text-black/30"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="website"
                  className="block text-sm/6 font-semibold"
                >
                  Website / URL
                </label>
                <div className="mt-2.5">
                  <input
                    id="website"
                    name="website"
                    type="url"
                    placeholder="perseustudio.com"
                    className="block w-full rounded-md bg-white px-3.5 py-2 text-sm text-black placeholder:text-black/30"
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
                  <div className="flex rounded-md bg-white">
                    <div className="grid shrink-0 grid-cols-1 focus-within:relative">
                      <select
                        id="country"
                        name="country"
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
                      id="phone-number"
                      name="phone-number"
                      type="text"
                      placeholder="(+1) 7788878363"
                      required
                      className="block min-w-0 grow bg-transparent py-1.5 pr-3 pl-1 text-sm text-black placeholder:text-black/30 focus:outline-none sm:text-sm/6"
                    />
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm/6 font-semibold">
                  Services needed *
                </label>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {servicesOptions.map(({ id, label }) => (
                    <label key={id} className="flex items-center gap-3">
                      <input
                        id={`service-${id}`}
                        name="services"
                        value={id}
                        type="checkbox"
                        className="size-4 rounded border-black/30"
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="timeline"
                  className="block text-sm/6 font-semibold"
                >
                  Timeline
                </label>
                <div className="mt-2.5">
                  <select
                    id="timeline"
                    name="timeline"
                    className="block w-full rounded-md bg-white px-3.5 py-2 text-sm text-background"
                  >
                    {timelineOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="referral"
                  className="block text-sm/6 font-semibold"
                >
                  How did you hear about us?
                </label>
                <div className="mt-2.5">
                  <select
                    id="referral"
                    name="referral"
                    className="block w-full rounded-md bg-white px-3.5 py-2 text-sm text-background"
                  >
                    {referralOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="message"
                  className="block text-sm/6 font-semibold"
                >
                  Project goals / brief *
                </label>
                <div className="mt-2.5">
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="Please tell us what you’re reaching out about and include any helpful details. We’ll respond as soon as possible."
                    required
                    className="block w-full rounded-md bg-white px-3.5 py-2 text-sm text-background placeholder:text-black/30"
                    defaultValue={""}
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
