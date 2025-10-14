import { Button, Container } from "@/app/components";
import Link from "next/link";

export default function ContentSection() {
  return (
    <section className="mb-16">
      <Container className="space-y-8 md:space-y-12">
        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <h6 className="text-4xl font-semibold">
            Build modern, high-performing websites with ease.
          </h6>
          <div className="space-y-6">
            <p>
              Our website solutions are designed to be fast, scalable, and
              tailored to your brand, helping you deliver outstanding
              experiences online.
            </p>
            <Link href="/contact">
              <Button size="medium">Get Started</Button>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
