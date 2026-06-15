import { Button, Container, Heading } from '@/components';
import Link from 'next/link';

const BlogCta = () => {
  return (
    <section className="mb-16">
      <Container>
        <div className="relative overflow-hidden rounded-4xl bg-neutral-950 px-5 py-8 text-on-media shadow-2xl shadow-neutral-950/10 sm:px-6 md:px-8 md:py-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-on-media/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-on-media/5 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <Heading
                titleTag="h2"
                seperatorTitle="Next Step"
                eyebrowRight="Need Help"
                title="Need a hand putting this into practice?"
                titleAccent="Let’s turn the insight into action."
                description="We help Vancouver brands across websites, video, photography, and digital marketing. Tell us what you're trying to do and we'll point you in the right direction."
                containerStyle="px-0 md:px-0 w-full max-w-none [&>div:first-child>span]:text-on-media/50 [&>div:first-child>span:nth-child(2)]:bg-on-media/20"
                titleStyle="max-w-4xl text-on-media"
                titleAccentStyle="text-on-media/30"
                descStyle="max-w-3xl text-on-media/70"
              />
            </div>

            <div className="rounded-3xl border border-on-media/10 bg-on-media/6 p-4 backdrop-blur md:p-5">
              <p className="mb-4 text-sm leading-6 text-on-media/70">
                Share the goal, the deadline, and where things are stuck. We’ll
                help you define the cleanest next move.
              </p>

              <Link href="/contact" className="inline-flex w-full">
                <Button size="small" className="w-full justify-center">
                  Talk to us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default BlogCta;
