import { LuArrowDown } from 'react-icons/lu';
import Heading from '@/components/Heading';
import { SocialLinks } from '@/constants/socials';
import StudioStatus from './StudioStatus';
import { GroupSectionLabel, InsetGroup } from './FormGroups';

/**
 * The sticky left rail of the split /contact layout: the page's single H1, the
 * deduped "direct line" contact block, the live studio status, a reply-time
 * promise, and the brand's social row. This replaces the old stacked, repetitive
 * `ContactInfo` section.
 *
 * Server component by design — everything here is static, so nothing but the
 * <StudioStatus/> island ships client JS. It reuses the form's own grouping
 * primitives (`InsetGroup` / `GroupSectionLabel`) so the rail and the form read
 * as one system, and pulls socials from the shared `SocialLinks` source of truth
 * so the rail can never drift from the footer.
 */

// Curated, brand-first subset of the shared social list (excludes WhatsApp —
// empty href, needs a client button — plus the Google Maps and Medium entries).
const RAIL_SOCIAL_LABELS = ['Instagram', 'LinkedIn', 'YouTube', 'TikTok', 'Facebook', 'Twitter'];
const railSocials = RAIL_SOCIAL_LABELS.map(
  (label) => SocialLinks.find((s) => s.label === label),
).filter((s): s is (typeof SocialLinks)[number] => Boolean(s?.href));

const socialIconClass =
  'flex size-9 items-center justify-center rounded-full border border-black/10 text-black/60 transition-colors duration-200 hover:border-black hover:bg-black hover:text-white';

const rowClass =
  'group flex items-center justify-between gap-3 px-4 py-3.5 transition-colors duration-200 hover:bg-black/[0.03] sm:px-5';

const RailRow = ({
  label,
  value,
  href,
  external,
}: {
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) => (
  <a
    href={href}
    className={rowClass}
    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
  >
    <span className="text-xs font-medium text-black/60">{label}</span>
    <span className="text-sm text-black/80 transition-colors duration-200 group-hover:text-black">
      {value}
    </span>
  </a>
);

const MAPS_HREF =
  'https://www.google.com/maps/search/?api=1&query=Perseus%20Creative%20Studio';

const ContactAside = () => (
  <aside className="lg:sticky lg:top-28 lg:self-start">
    <Heading
      titleTag="h1"
      seperatorTitle="Contact"
      title="Let’s work together"
      titleAccent="Start a project, or join the team."
      description="Tell us about your brand and goals — or the role you’re applying for. Our team reviews every submission and gets back to you shortly."
      containerStyle="px-0 md:px-0 w-full max-w-none"
      titleStyle="max-w-none text-3xl sm:text-4xl"
      descStyle="max-w-none"
    />

    {/* Phones stack the rail above the form; let visitors skip straight to it. */}
    <a
      href="#contact-form"
      className="mt-6 inline-flex items-center gap-1.5 text-sm text-black/60 transition-colors duration-200 hover:text-black lg:hidden"
    >
      Jump to the form
      <LuArrowDown className="size-4" aria-hidden="true" />
    </a>

    <GroupSectionLabel>Direct line</GroupSectionLabel>
    <InsetGroup>
      <RailRow label="Email" value="info@perseustudio.com" href="mailto:info@perseustudio.com" />
      <RailRow label="Call" value="(778) 887-8363" href="tel:+17788878363" />
      <RailRow label="Studio" value="North Vancouver · by appt." href={MAPS_HREF} external />
    </InsetGroup>
    <p className="mt-3 px-1 text-xs text-black/60">We reply within 1 business day.</p>

    <div className="mt-8">
      <StudioStatus />
      <p className="mt-2 text-xs text-black/60">
        Mon–Fri 8–6 PST · Sat by appointment
      </p>
    </div>

    <GroupSectionLabel>Follow along</GroupSectionLabel>
    <ul className="flex flex-wrap gap-2">
      {railSocials.map((social) => (
        <li key={social.label}>
          <a
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            className={socialIconClass}
          >
            {social.icon}
          </a>
        </li>
      ))}
    </ul>
  </aside>
);

export default ContactAside;
