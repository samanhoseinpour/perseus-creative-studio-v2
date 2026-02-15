import { Container } from '@/app/components';

type BlogPostSkletonProps = {
  // number of cards to render
  count?: number;
  // show the category chip row skeleton
  showFilters?: boolean;
};

const Pill = () => (
  <div className="h-6 w-20 rounded-full bg-foreground/10" />
);

const Line = ({ w }: { w: string }) => (
  <div className={`h-3 ${w} rounded bg-foreground/10`} />
);

const BlogPostSkleton = ({
  count = 4,
  showFilters = false,
}: BlogPostSkletonProps) => {
  const cards = Array.from({ length: Math.max(0, Math.floor(count)) });

  return (
    <section
      className="pb-16"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading posts…</span>
      <Container>
        {showFilters && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2 animate-pulse">
              <Pill />
              <Pill />
              <Pill />
              <Pill />
              <Pill />
            </div>
            <hr className="my-4 border-border" />
          </>
        )}

        <div className="mt-8 grid grid-cols-1 items-stretch gap-x-8 gap-y-10 lg:grid-cols-4">
          {cards.map((_, idx) => (
            <div key={idx} className="animate-pulse">
              <article className="flex h-full flex-col items-start justify-start rounded-2xl backdrop-blur-2xl bg-background-contrast">
                {/* image */}
                <div className="relative w-full aspect-video sm:aspect-2/1 lg:aspect-3/2 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-foreground/10" />
                </div>

                <div className="max-w-xl flex min-h-0 flex-1 flex-col px-4 py-6 w-full">
                  {/* meta row */}
                  <div className="flex items-center gap-x-4 text-[8px]">
                    <div className="h-3 w-16 rounded bg-foreground/10" />
                    <div className="h-5 w-28 rounded-full bg-foreground/10" />
                  </div>

                  {/* title + description */}
                  <div className="mt-3 space-y-2 w-full">
                    <Line w="w-11/12" />
                    <Line w="w-8/12" />
                  </div>

                  <div className="mt-5 space-y-2 w-full">
                    <Line w="w-full" />
                    <Line w="w-10/12" />
                    <Line w="w-9/12" />
                  </div>

                  {/* author */}
                  <div className="relative mt-auto pt-6 flex items-center gap-x-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-foreground/10 shrink-0" />
                    <div className="space-y-2">
                      <div className="h-3 w-28 rounded bg-foreground/10" />
                      <div className="h-3 w-20 rounded bg-foreground/10" />
                    </div>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default BlogPostSkleton;
