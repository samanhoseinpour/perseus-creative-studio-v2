import Link from 'next/link';
import { LuCircleHelp as CircleHelp } from 'react-icons/lu';

import Button from '@/components/Button';
import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
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

// Default set used where no context-specific FAQ is supplied (e.g. home). The
// eight highest-intent questions a first-time visitor asks — deliberately a
// subset of the studio-wide set in `@/constants/faq`, kept in the same voice so
// the home answer and the FAQ-hub answer never contradict each other.
const DEFAULT_FAQS = [
  {
    question: 'What does Perseus Creative Studio do?',
    answer:
      'We’re a Vancouver marketing agency built around five in-house disciplines: production (video, photo, aerial, 3D and virtual tours), websites (design, development, e-commerce, landing pages, care), digital marketing (SEO, Google/Meta/LinkedIn Ads, tracking, CRO), social media (strategy, management, creator collaborations, reporting), and branding (strategy, identity, messaging, guidelines, creative direction). One senior team covers all five, so the brand, the site, the content, and the campaigns are planned together instead of handed between vendors.',
  },
  {
    question: 'Where are you based, and where do you work?',
    answer:
      'The studio is in North Vancouver, BC — visits by appointment — and we work throughout Metro Vancouver and the Sea-to-Sky corridor in person. Beyond that, our project archive spans Toronto, Edmonton, Kelowna, Los Angeles, Madrid, Marbella, Como, and the UK. Production travels; strategy, web, and marketing run remotely with scheduling set to your time zone.',
  },
  {
    question: 'What kinds of websites do you build?',
    answer:
      'Marketing sites, service-area and listing sites, e-commerce stores, conversion-focused landing pages, and custom web applications — on WordPress when a client-friendly CMS is the priority, or a modern stack (Next.js, React, TypeScript, Node) when performance and custom functionality are. Speed, search-ready structure, and analytics are part of the build, not a phase bolted on afterwards.',
  },
  {
    question: 'Do you produce video and photography, including drone?',
    answer:
      'Yes — videography, photography, aerial production, post-production, 3D models, and Matterport virtual tours, all in-house. Most engagements capture stills and motion in the same session and deliver both horizontal and vertical cuts, so your website, listings, ads, and social all draw from one coherent set of media.',
  },
  {
    question: 'Do you run SEO and paid ads like Google and Meta?',
    answer:
      'Yes — SEO, Google Ads, Meta Ads, LinkedIn Ads, tracking & analytics, and conversion rate optimization. Tracking is set up before spend, not after, so reporting shows which campaigns and pages actually create leads and bookings rather than which ones generate clicks.',
  },
  {
    question: 'How long do projects usually take?',
    answer:
      'Scope, feedback speed, and production complexity drive it, and exact milestones are dated in your proposal. As a guide: branding and design run a few weeks; website builds run several weeks to a few months depending on pages, features, and integrations; single-location productions run a few weeks from scope to delivery. SEO and paid programs are ongoing by nature.',
  },
  {
    question: 'How does pricing work?',
    answer:
      'Every engagement is scoped to your goals, deliverables, and timeline, so pricing is proposal-based rather than packaged. We give you options at different investment levels for the same objective, and if you have a defined budget we shape the scope around the highest-impact work and phase the rest.',
  },
  {
    question: 'How do we get started?',
    answer:
      'Send an inquiry with your goals and the kind of support you need — you can pick the specific services on the form. We reply with either a short list of questions or a time to talk, and the first call is a scoping conversation rather than a pitch. A written proposal with scope, milestones, and a timeline follows from there.',
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
