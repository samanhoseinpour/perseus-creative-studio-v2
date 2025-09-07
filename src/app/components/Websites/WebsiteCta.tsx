import { Button, TextEffect, AnimatedGroup, Container } from "@/app/components";
import Link from "next/link";

export default function ContentSection() {
  return (
    <section className="mb-16">
      <Container className="space-y-8 md:space-y-12">
        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <TextEffect as="h6" className="text-4xl font-semibold">
            Build modern, high-performing websites with ease.
          </TextEffect>
          <AnimatedGroup className="space-y-6">
            <TextEffect as="p" per="line" delay={0.5}>
              Our website solutions are designed to be fast, scalable, and
              tailored to your brand, helping you deliver outstanding
              experiences online.
            </TextEffect>

            <Link href="/websites">
              <Button size="medium" className="gap-1 pr-1.5">
                Get Started
              </Button>
            </Link>
          </AnimatedGroup>
        </div>
      </Container>
    </section>
  );
}
