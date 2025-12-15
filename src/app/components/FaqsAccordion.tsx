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
  title = "Frequently Asked Questions",
  description = "We get a lot of great questions from clients — here are some of the most common ones, answered simply and honestly. If you’re curious about how we work, this is a great place to start.",
  faqs = [
    {
      question: "What kind of businesses do you work with?",
      answer:
        "We work with brands and companies of all sizes — from startups and personal brands to large corporations. Our experience spans real estate, construction, oil & gas, fitness, beauty, wellness, lifestyle, luxury, and hospitality.",
    },
    {
      question: "Where do you work?",
      answer:
        "We work with clients across Canada, the United States, and the Middle East. Our headquarters are based in Vancouver and Los Angeles, and we support projects locally, nationally, and internationally depending on project needs.",
    },
    {
      question: "What services do you offer?",
      answer:
        "We offer a full range of creative and marketing services—including branding and design, website development (WordPress & Next.js), video production, photography, real estate marketing, social media management, and event coverage—handling everything from concept to delivery so you don’t have to manage multiple vendors.",
    },
    {
      question: "What kind of websites do you build?",
      answer:
        "We build custom, high-performing websites using WordPress and Next.js — optimized for SEO, speed, and conversion. Every site is fully responsive, visually engaging, and designed to match your brand’s identity.",
    },
    {
      question: "Do you offer free consultations?",
      answer:
        "Yes, we do. You can contact us anytime to book a free consultation. We’ll talk through your goals, give you personalized advice, and help you find the best creative direction for your brand.",
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
        seperatorTitleStyle="text-white"
        titleStyle="text-white"
        descStyle="text-white/70"
        containerStyle="border-white"
      />

      <Container className="mt-8 gap-4 grid grid-cols-1">
        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="group overflow-hidden rounded-2xl border-t border-white/30 bg-background transition-all hover:border-brand hover:shadow-lg text-white"
          >
            <motion.button
              onClick={() => toggleAccordion(index)}
              className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-background/50"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <h3 className="text-md leading-md font-semibold pr-4 text-white">
                {faq.question}
              </h3>
              <motion.div
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="shrink-0"
              >
                <svg
                  className="h-5 w-5 text-white/70"
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
                    <p className="text-sm leading-sm">{faq.answer}</p>
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
