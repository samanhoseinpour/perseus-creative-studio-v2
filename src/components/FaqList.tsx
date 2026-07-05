'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import CustomBtn from '@/components/Button';
import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';

type Category =
  | 'Services'
  | 'About'
  | 'Projects'
  | 'Contracts'
  | 'Pricing'
  | 'Technical'
  | 'CRO'
  | 'Maintenance'
  | 'Industries';

export interface FAQItem {
  question: string;
  answer: string;
  category: Category;
}

const categories: Category[] = [
  'Services',
  'About',
  'Projects',
  'Contracts',
  'Pricing',
  'Technical',
  'CRO',
  'Maintenance',
  'Industries',
];

const TOP_PADDING = 300;

interface Faq12Props {
  className?: string;
  /** The full Q&A set, passed by the server page (constants/faq.ts). Taking it
   *  as a prop — instead of importing it here — keeps the whole FAQ copy out of
   *  the client bundle every route shares. */
  items: FAQItem[];
}

const FaqList = ({ className, items }: Faq12Props) => {
  const [activeCategory, setActiveCategory] = useState<Category>('Services');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isScrollingRef = useRef(false);
  const categoryRefs = useRef<Record<Category, HTMLDivElement | null>>({
    Services: null,
    About: null,
    Projects: null,
    Contracts: null,
    Pricing: null,
    Technical: null,
    CRO: null,
    Maintenance: null,
    Industries: null,
  });

  const setupObserver = useCallback(() => {
    observerRef.current?.disconnect();

    let debounceTimeout: NodeJS.Timeout;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Skip if we're programmatically scrolling
        if (isScrollingRef.current) return;

        // Clear any pending timeout
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
        }

        // Debounce the category update
        debounceTimeout = setTimeout(() => {
          const intersectingEntries = entries.filter(
            (entry) => entry.isIntersecting,
          );

          // Find the entry that's closest to being 100px from the top
          const entry = intersectingEntries.reduce(
            (closest, current) => {
              const rect = current.boundingClientRect;
              const distanceFromThreshold = Math.abs(rect.top - TOP_PADDING);
              const closestDistance = closest
                ? Math.abs(closest.boundingClientRect.top - TOP_PADDING)
                : Infinity;

              return distanceFromThreshold < closestDistance
                ? current
                : closest;
            },
            null as IntersectionObserverEntry | null,
          );

          if (entry) {
            const category = entry.target.getAttribute(
              'data-category',
            ) as Category;
            if (category) {
              setActiveCategory(category);
            }
          }
        }, 150);
      },
      {
        root: null,
        rootMargin: `-${TOP_PADDING}px 0px -100% 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    Object.entries(categoryRefs.current).forEach(([category, element]) => {
      if (element) {
        element.setAttribute('data-category', category);
        observerRef.current?.observe(element);
      }
    });

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, []);

  useEffect(() => {
    const cleanup = setupObserver();
    return () => {
      cleanup();
      observerRef.current?.disconnect();
    };
  }, [setupObserver]);

  const handleCategoryClick = (category: Category) => {
    setActiveCategory(category);
    isScrollingRef.current = true;

    const element = document.getElementById(`faq-${category.toLowerCase()}`);
    if (element) {
      element.style.scrollMargin = `${TOP_PADDING}px`;
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  };

  return (
    <section
      className={cn(
        'min-h-screen pt-28 sm:pt-32 pb-16 bg-background-contrast',
        className,
      )}
    >
      <Container className="container max-w-4xl">
        <Heading
          titleTag="h1"
          seperatorTitle="FAQ"
          eyebrowRight="Clear Answers"
          title="We&apos;ve got answers"
          titleAccent="Before we start."
          description="Clear answers on our services, process, timelines, pricing, and recent work."
          containerStyle="px-0 md:px-0 w-full max-w-none items-center text-center"
          titleStyle="max-w-4xl text-center text-4xl md:text-5xl"
          descStyle="max-w-2xl text-center"
        />

        <div className="mt-10 grid max-w-5xl gap-8 md:grid-cols-[200px_1fr] md:gap-12">
          {/* Sidebar */}
          <div className="sticky top-32 flex h-fit flex-col gap-2 max-md:hidden">
            {categories.map((category) => (
              <Button
                variant="ghost"
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`tracking-tighter justify-start text-left text-xl transition-colors ${
                  activeCategory === category
                    ? 'font-semibold'
                    : 'font-normal hover:opacity-75 text-black/70'
                }`}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* FAQ Items by Category */}
          <div className="space-y-6">
            {categories.map((category) => {
              const categoryItems = items.filter(
                (item) => item.category === category,
              );

              return (
                <div
                  key={category}
                  id={`faq-${category.toLowerCase()}`}
                  ref={(el) => {
                    categoryRefs.current[category] = el;
                  }}
                  className={cn(
                    `rounded-xl`,
                    activeCategory === category
                      ? 'bg-background'
                      : 'bg-background/40',
                    'px-6',
                  )}
                  style={{
                    scrollMargin: `${TOP_PADDING}px`,
                  }}
                >
                  <Accordion
                    type="single"
                    collapsible
                    // Each category is its own accordion, so open its OWN first
                    // question. (`categories[0]` here only ever matched inside
                    // the Services accordion — every other section rendered
                    // fully collapsed.)
                    defaultValue={`${category}-0`}
                    className="w-full"
                  >
                    {categoryItems.map((item, i) => (
                      <AccordionItem
                        key={i}
                        value={`${category}-${i}`}
                        className="border-b border-muted last:border-0"
                      >
                        <AccordionTrigger className="text-md tracking-tighter font-medium hover:no-underline">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm font-medium tracking-tighter text-black/70">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-8">
          <div className="relative overflow-hidden rounded-2xl border-black/10 bg-background p-8">
            <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_top,rgba(0,0,0,0.06),transparent_55%)]" />
            <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <p className="text-xs tracking-tighter text-black/70">
                  Need further information?
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tighter">
                  Talk to us about your project.
                </p>
                <p className="text-sm font-medium tracking-tighter text-black/70">
                  Share a few details and we’ll point you in the right
                  direction.
                </p>
              </div>

              <Link href="/contact">
                <CustomBtn>Contact us</CustomBtn>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export { FaqList };
