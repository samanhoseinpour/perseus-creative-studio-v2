import { Container, CountUp, Heading, InfiniteSlider } from '@/components';
import type { ServiceCategoryContent } from './types';

interface CategoryStatsProps {
  data: ServiceCategoryContent;
}

/**
 * Credibility section: a Heading, the home-style stats row (short label on top,
 * big animated number below with grey prefix/suffix, hairline dividers), and a
 * slow keyword marquee underneath for texture + SEO surface area.
 */
const CategoryStats = ({ data }: CategoryStatsProps) => {
  const { stats, marquee } = data;
  if (!stats.length) return null;

  // Index where the last mobile row begins, so the bottom row drops its border.
  const lastRowStart = Math.floor((stats.length - 1) / 2) * 2;

  return (
    <section className="pb-16 sm:pb-24">
      <Heading
        titleTag="h2"
        seperatorTitle="By the numbers"
        eyebrowRight={data.title}
        title="Proof in the numbers."
        titleAccent="The standard behind every project."
        description={`A quick read on the scale and consistency behind our ${data.title.toLowerCase()} work.`}
        containerStyle="mb-10"
      />

      <Container>
        <dl className="grid grid-cols-2 border-y border-black/10 md:grid-cols-4">
          {stats.map((s, i) => {
            const isMobileOrphan =
              stats.length % 2 !== 0 && i === stats.length - 1;
            return (
              <div
                key={i}
                className={[
                  'px-1 py-7 md:px-6',
                  isMobileOrphan ? 'col-span-2 md:col-span-1' : '',
                  i !== stats.length - 1 ? 'md:border-r md:border-black/10' : '',
                  i % 2 === 0 && !isMobileOrphan
                    ? 'border-r border-black/10 md:border-r'
                    : '',
                  i < lastRowStart
                    ? 'border-b border-black/10 md:border-b-0'
                    : '',
                ].join(' ')}
              >
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">
                  {s.label}
                </dt>
                <dd className="mt-3 flex items-baseline gap-0.5 text-4xl font-semibold leading-4xl tracking-tighter tabular-nums text-black">
                  {s.prefix && <span className="text-black/30">{s.prefix}</span>}
                  {s.count != null ? (
                    <CountUp from={0} to={s.count} separator="," duration={1.4} />
                  ) : (
                    <span>{s.value}</span>
                  )}
                  {s.suffix && <span className="text-black/30">{s.suffix}</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      </Container>

      {marquee.length > 0 && (
        <div className="mt-12 [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
          <InfiniteSlider gap={56} speed={45} speedOnHover={16}>
            {marquee.map((word) => (
              <span
                key={word}
                className="flex items-center gap-14 whitespace-nowrap text-2xl font-medium tracking-tight text-black/25 sm:text-3xl"
              >
                {word}
                <span aria-hidden className="text-black/10">
                  ✦
                </span>
              </span>
            ))}
          </InfiniteSlider>
        </div>
      )}
    </section>
  );
};

export default CategoryStats;
