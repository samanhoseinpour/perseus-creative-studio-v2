'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Container, Heading } from '.';

interface FaqsAccordionProps {
  title?: string;
  description?: string;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

const FaqsAccordion = ({
  title = 'Frequently Asked Questions',
  description = 'We get a lot of great questions from clients — here are some of the most common ones, answered simply and honestly. If you’re curious about how we work, this is a great place to start.',
  faqs = [
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
  ],
}: FaqsAccordionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="mb-16 sm:mb-32">
      <Heading
        title={title}
        seperatorTitle="FAQ"
        description={description}
        titleTag="h3"
      />

      <Container className="mt-8 gap-4 grid md:grid-cols-2">
        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="group overflow-hidden rounded-2xl border-t border-border bg-background transition-all hover:border-brand hover:shadow-lg text-foreground"
          >
            <motion.button
              onClick={() => toggleAccordion(index)}
              className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-background/50"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <h3 className="text-md tracking-tighter pr-4 text-foreground">
                {faq.question}
              </h3>
              <motion.div
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="shrink-0"
              >
                <svg
                  className="h-5 w-5 text-foreground/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <motion.div
                    initial={{ y: -10 }}
                    animate={{ y: 0 }}
                    exit={{ y: -10 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="px-6 pb-6"
                  >
                    <p className="text-sm tracking-tighter text-black/70">
                      {faq.answer}
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </Container>
    </section>
  );
};

export default FaqsAccordion;
