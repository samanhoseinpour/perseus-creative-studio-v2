import { Button, Container } from "@/app/components";
import Link from "next/link";

export default function ContentSection() {
  return (
    <section className="mb-16">
      <Container className="space-y-8 md:space-y-12">
        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <h6 className="text-4xl font-semibold">
            Ready to level up your website and search performance?
          </h6>
          <div className="space-y-6">
            <p>
              Share your current site and goals, and we&apos;ll review your structure, UX, and SEO foundations, then outline practical improvements you can implement or build with us.
            </p>
            <Link href="/contact">
              <Button size="small">Request a Website &amp; SEO Review</Button>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
