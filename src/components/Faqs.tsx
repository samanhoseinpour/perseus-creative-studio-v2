import Link from 'next/link';
import { LuCircleHelp as CircleHelp } from 'react-icons/lu';

import { Button, Container, Heading } from '.';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FaqsProps {
  title?: string;
  description?: string;
  faqs?: Array<{ question: string; answer: string }>;
  /** "View all FAQs" link; pass null to hide the button. */
  viewAllHref?: string | null;
}

// Default set used where no context-specific FAQ is supplied (e.g. home).
const DEFAULT_FAQS = [
  {
    question: 'What services does Perseus Creative Studio offer?',
    answer:
      'Perseus Creative Studio brings together brand strategy and identity, website design/development, photo and video production, and also highlights SEO, Google Ads, Meta Ads, LinkedIn Ads, tracking/analytics, CRO, and social media management—so strategy, creative, performance, reporting, and multi-channel digital marketing.',
  },
  {
    question: 'Where is Perseus based, and where do you work?',
    answer:
      'Perseus is based in Vancouver, with the studio available by appointment. We also operate through creative hubs in Los Angeles and Dubai, and we work with clients worldwide—either in person when it makes sense or fully remotely with clear scheduling across time zones.',
  },
  {
    question: 'What types of websites do you build?',
    answer:
      'Perseus delivers custom website development across WordPress and modern stacks, such as Next.js/Node.js, with a focus on performance, conversion, SEO-ready structure, funnel optimization, automation/workflows, analytics, and ongoing support, so the site can function as a growth channel, not a static brochure.',
  },
  {
    question: 'Do you produce video and photography (including drone)?',
    answer:
      'Yes. Perseus promotes cinematic videography, photography, aerial production, and post-production services, positioning content as “built for distribution” across websites, ads, and social.',
  },
  {
    question: 'Do you support local SEO and neighborhood targeting?',
    answer:
      'Yes. We support local SEO and neighborhood-level targeting by building service-area and location pages, aligning on-page information with your business listings, and adding relevant local structured data where appropriate. We also strengthen trust signals—clear service areas, proof of work, and review/social proof integration—so local searches translate into calls, bookings, and qualified inquiries.',
  },
  {
    question: 'Do you manage paid ads like Google Ads and Meta Ads?',
    answer:
      'Yes. Perseus’s Services page explicitly lists Google Ads, Meta Ads, and LinkedIn Ads under “SEO & Paid Ads,” alongside tracking/analytics, CRO, Data-driven optimization, audience targeting, and conversion-focused campaigns across digital platforms.',
  },
  {
    question: 'How long do projects usually take?',
    answer:
      'Timelines depend on scope, feedback speed, and production complexity, but we set clear ranges upfront and confirm exact milestones in your proposal. As a general guide: branding and design projects often take a few weeks; website builds typically take several weeks to a few months depending on pages, features, and integrations; and video/photo productions usually run a few weeks from planning through filming and post-production.',
  },
  {
    question: 'Do you build landing pages and funnels designed to convert?',
    answer:
      'Yes. We build high-converting landing pages and funnels tailored to your offer—designed to turn traffic into inquiries, booked calls, and purchases. We align strategy, copy and design, development, tracking, and (when needed) automations so the funnel performs as a measurable growth channel, not just a page.',
  },
];

/**
 * Embeddable FAQ section. Built on the same shadcn <Accordion> as the
 * standalone /frequently-asked-questions page (FaqList), so the accordion looks
 * and behaves identically everywhere. Pass context-specific `faqs` (services,
 * blog index) or omit for the default studio-wide set (home).
 */
const Faqs = ({
  title = 'Frequently Asked Questions',
  description = 'We get a lot of great questions from clients — here are some of the most common ones, answered simply and honestly. If you’re curious about how we work, this is a great place to start.',
  faqs = DEFAULT_FAQS,
  viewAllHref = '/frequently-asked-questions',
}: FaqsProps) => {
  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle="FAQ"
        eyebrowRight="Process · Scope · Timelines · Support"
        title={title}
        titleAccent="Clear answers before we start."
        description={description}
        containerStyle="mb-10"
      />

      <Container>
        <Accordion
          type="single"
          collapsible
          defaultValue="faq-0"
          className="grid w-full gap-x-10 md:grid-cols-2"
        >
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border-black/10 last:border-b"
            >
              <AccordionTrigger className="text-md font-medium tracking-tighter text-black hover:no-underline cursor-pointer">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm tracking-tighter text-black/70">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>

      {viewAllHref && (
        <Container className="mt-10 flex justify-center">
          <Link href={viewAllHref}>
            <Button variant="secondary" icon={CircleHelp}>
              View all FAQs
            </Button>
          </Link>
        </Container>
      )}
    </section>
  );
};

export default Faqs;
