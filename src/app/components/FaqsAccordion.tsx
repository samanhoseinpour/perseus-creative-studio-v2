"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Container, Heading } from ".";

interface FaqsAccordionProps {
  title?: string;
  description?: string;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

const FaqsAccordion = ({
  title = "Perseus Creative Studio — FAQs",
  description = "Quick answers about our services, process, and how we help you ship brand‑defining digital experiences.",
  faqs = [
    {
      question: "What is Perseus Creative Studio?",
      answer:
        "Perseus is a design & engineering studio focused on high‑impact brand, website, and product experiences. We combine strategy, design, and code to move key metrics and make your product feel inevitable.",
    },
    {
      question: "Who is Perseus a fit for?",
      answer:
        "VC‑backed startups, scale‑ups, and modern enterprises that care about craft and speed. Typical engagements include launches, rebrands, site rebuilds, and critical product UX improvements.",
    },
    {
      question: "What services do you offer?",
      answer:
        "Brand identity, design systems, marketing sites (Next.js), product design (UX/UI), frontend engineering, and performance optimization. We also provide audits, roadmap shaping, and growth retainers.",
    },
    {
      question: "How does a project start and what does the process look like?",
      answer:
        "We begin with a short discovery to align on goals, constraints, and metrics. Then we run weekly sprints with demos, async updates, and a shared backlog. You get a dedicated lead and a small, senior team.",
    },
    {
      question: "How long do projects take?",
      answer:
        "Most brand or marketing site projects run 3–8 weeks. Product UX/UI and design system work can be 4–12 weeks depending on scope. Critical launches can be accelerated when decision paths are clear.",
    },
    {
      question: "What are your pricing options?",
      answer:
        "We offer fixed‑scope project pricing for clearly defined outcomes and monthly retainers for ongoing roadmap work. Both include transparent weekly reporting and access to our internal tooling.",
    },
    {
      question: "Who owns the work and IP?",
      answer:
        "You do. Upon final payment, all design files, source code, and documentation are transferred to your organization. We work in your repos when preferred and can sign NDAs/MSAs.",
    },
    {
      question: "What stack and tools do you use?",
      answer:
        "Next.js/React, TypeScript, Tailwind, Framer Motion, Node, and modern headless CMS (Sanity, Contentful). For design we use Figma with robust component libraries and tokenized theming.",
    },
    {
      question: "Do you provide maintenance and growth support?",
      answer:
        "Yes. Our retainers cover incremental experiments, A/B tests, accessibility & performance improvements, content updates, and ongoing component/system evolution.",
    },
  ],
}: FaqsAccordionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="mb-16">
      <Heading
        title={title}
        seperatorTitle={title}
        description={description}
        titleTag="h3"
      />

      <Container className="mt-8 max-w-7xl space-y-4">
        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="group overflow-hidden rounded-2xl border-t border-white/30 bg-background transition-all hover:border-brand hover:shadow-lg"
          >
            <motion.button
              onClick={() => toggleAccordion(index)}
              className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-background/50"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <h3 className="text-foreground text-lg leading-lg font-semibold pr-4">
                {faq.question}
              </h3>
              <motion.div
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="flex-shrink-0"
              >
                <svg
                  className="h-5 w-5 text-foreground/60"
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
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <motion.div
                    initial={{ y: -10 }}
                    animate={{ y: 0 }}
                    exit={{ y: -10 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="px-6 pb-6"
                  >
                    <p className="text-foreground/70">{faq.answer}</p>
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
