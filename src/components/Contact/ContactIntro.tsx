import Heading from '@/components/Heading';
import { cn } from '@/lib/utils';

/**
 * The heading half of the split /contact rail: the page's single H1 + intro
 * copy. Split out of the old `ContactAside` so the stacked mobile/tablet layout
 * can place the form *directly* beneath the heading (primary action first) and
 * drop the secondary contact details (`ContactDetails`) below the form — while
 * desktop keeps both halves together in the sticky left column. See the grid in
 * `app/contact/page.tsx` — the rail's stickiness is owned by the wrapper there
 * (which holds both intro and details), not by this component.
 *
 * Server component by design — static markup, no client JS.
 */
const ContactIntro = ({ className }: { className?: string }) => (
  <div className={cn(className)}>
    <Heading
      titleTag="h1"
      seperatorTitle="Contact"
      title="Let’s work together"
      titleAccent="Inquiries, or join the team."
      description="Tell us about your brand and goals — or the role you’re applying for. Our team reviews every submission and gets back to you shortly."
      containerStyle="px-0 md:px-0 w-full max-w-none"
      titleStyle="max-w-none text-3xl sm:text-4xl"
      descStyle="max-w-none"
    />
  </div>
);

export default ContactIntro;
