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
  title = "FAQ",
  description = "We get a lot of great questions from clients — here are some of the most common ones, answered simply and honestly. If you’re curious about how we work, this is a great place to start.",
  faqs = [
    {
      question: "What is Perseus Creative Studio?",
      answer:
        "Perseus Creative Studio is a full-service creative marketing agency based in Vancouver, with teams in Los Angeles and Dubai. We help businesses grow through branding, website design, video production, photography, and digital strategy — creating work that drives attention and results.",
    },
    {
      question: "What kind of businesses do you work with?",
      answer:
        "We work with brands and companies of all sizes — from startups and personal brands to large corporations. Our experience spans real estate, construction, oil & gas, fitness, beauty, wellness, lifestyle, luxury, and hospitality.",
    },
    {
      question: "Do you only work in Vancouver?",
      answer:
        "No — while our headquarters is in Vancouver, we regularly work with clients across Canada, the U.S., and internationally. Our creative team operates globally to deliver consistent quality anywhere in the world.",
    },
    {
      question: "What services do you offer?",
      answer:
        "We offer a full range of creative and marketing services—including branding and design, website development (WordPress & Next.js), video production, photography, real estate marketing, social media management, and event coverage—handling everything from concept to delivery so you don’t have to manage multiple vendors.",
    },
    {
      question: "What equipment do you use for video production?",
      answer:
        "We use two Sony FX3 cinema-line cameras, multiple DJI Ronin stabilizers, and DJI drones for cinematic aerials. These are professional, Netflix-approved systems that produce ultra-high-quality 4K visuals with smooth, detailed motion.",
    },
    {
      question: "What software do you use for editing?",
      answer:
        "Our post-production team uses DaVinci Resolve, Final Cut Pro, Premiere Pro, and After Effects for color grading, editing, and motion design — ensuring every video meets broadcast-level standards.",
    },
    {
      question: "Do you offer same-day delivery?",
      answer:
        "Yes. For urgent projects like events, launches, or campaigns, we offer same-day video and photo delivery. For most projects, turnaround is typically within 2–3 days, depending on complexity.",
    },
    {
      question: "What makes your work different?",
      answer:
        "We focus on clarity, creativity, and performance. Every project is built around strategy and storytelling — making sure your brand looks great and connects with the right audience. Our visuals don’t just look cinematic; they convert attention into action.",
    },
    {
      question: "Do you provide raw footage or original files?",
      answer:
        "Yes, we can provide raw files upon request. You’ll always receive final high-resolution, optimized versions for web, print, and social use — and full ownership of your creative assets.",
    },
    {
      question: "What kind of websites do you build?",
      answer:
        "We build custom, high-performing websites using WordPress and Next.js — optimized for SEO, speed, and conversion. Every site is fully responsive, visually engaging, and designed to match your brand’s identity.",
    },
    {
      question: "How do you work with real estate clients?",
      answer:
        "We create full marketing packages for real estate professionals and developers—including cinematic property videos, drone footage, 360° tours, 3D floor plans, MLS photography, brochure and magazine design, and personal branding—delivering ultra-luxury visuals for properties across Vancouver and beyond.",
    },
    {
      question:
        "Do you handle marketing for construction and industrial companies?",
      answer:
        "Yes — we work with developers, construction firms, and industrial clients to create branding, corporate videos, and digital campaigns that communicate trust, scale, and professionalism.",
    },
    {
      question:
        "Do you offer services for beauty, wellness, and fitness brands?",
      answer:
        "Absolutely. We produce creative campaigns, social content, and brand visuals for gyms, salons, spas, wellness clinics, and personal trainers — helping them attract and retain loyal clients.",
    },
    {
      question:
        "Do you handle marketing for construction and industrial companies?",
      answer:
        "Yes — we work with developers, construction firms, and industrial clients to create branding, corporate videos, and digital campaigns that communicate trust, scale, and professionalism.",
    },
    {
      question: "Do you cover events and luxury lifestyle projects?",
      answer:
        "Yes — we provide event media coverage for brand launches, corporate events, and private functions. We also produce lifestyle visuals for luxury cars, yachts, fashion, and high-end experiences, designed for digital and social impact.",
    },
    {
      question: "How do you communicate during a project?",
      answer:
        "We keep communication simple and direct — through email and phone. You’ll always know what’s happening, what’s next, and when to expect delivery. No confusion, no long waits.",
    },
    {
      question: "Who leads the studio?",
      answer:
        "Perseus Creative Studio is led by Aryan Ghasemi (CEO & Founder), Saman Hoseinpour (CTO), and Arshia Farrahi (COO) — backed by a dedicated team of designers, filmmakers, developers, and strategists focused on innovation and creativity.",
    },
    {
      question: "Who owns the creative work once it’s finished?",
      answer:
        "You do. All final videos, photos, and designs are yours to use however you like. We’ll provide optimized exports so your content looks great across web, social, and print.",
    },
    {
      question: "Do you offer free consultations?",
      answer:
        "Yes, we do. You can contact us anytime to book a free consultation. We’ll talk through your goals, give you personalized advice, and help you find the best creative direction for your brand.",
    },
    {
      question: "How can we get in touch?",
      answer:
        "You can reach us however you prefer — email, phone, text, or contact form. Our team responds quickly, and we’re always open to new ideas, collaborations, and creative challenges.",
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
        seperatorTitle={title}
        description={description}
        titleTag="h3"
      />

      <Container className="mt-8 gap-4 grid grid-cols-1 md:grid-cols-2">
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
              <h3 className="text-foreground text-md leading-md font-semibold pr-4">
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
