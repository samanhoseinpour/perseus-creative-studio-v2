import { Container, CountUp, Heading } from '@/components';
import type { ProjectCategoryContent } from '../types';
import { yearSpan } from '../utils';
import { SlateTag } from '../SlateTag';

interface CategoryProofProps {
  data: ProjectCategoryContent;
}

/** Categories thinner than this aren't worth tallying — coming-soon and
 *  first-project categories skip the band. */
const MIN_FILES = 3;

type Tally = { label: string; count?: number; value?: string };

/**
 * The category's tally — proof before the offer, sitting above the services
 * shelf. Every figure is derived straight from the live projects (films,
 * the sectors they served, the disciplines on call, and the years on record),
 * so there's nothing hand-entered to drift or inflate: the band counts itself
 * as the category grows. Same hairline-divided, CountUp-animated treatment as
 * the case-study CaseResults row, framed with the archive's Heading. Renders
 * only once a category has enough projects to count.
 */
const CategoryProof = ({ data }: CategoryProofProps) => {
  const fileCount = data.projects.length;
  if (fileCount < MIN_FILES) return null;

  const sectors = new Set(data.projects.map((p) => p.industry)).size;
  const disciplines = new Set(
    data.projects.flatMap((p) => p.services ?? []),
  ).size;
  const years = yearSpan(data);

  const stats: Tally[] = [
    { label: `${data.proof?.unit ?? 'Projects'} on record`, count: fileCount },
    { label: data.proof?.sectorsLabel ?? 'Sectors served', count: sectors },
    ...(disciplines > 0
      ? [{ label: 'Disciplines on call', count: disciplines }]
      : []),
    ...(years > 0 ? [{ label: 'Years on record', count: years }] : []),
  ];

  return (
    <section className="pt-16 sm:pt-24">
      <Heading
        titleTag="h2"
        seperatorTitle="Proof"
        eyebrowRight="By the numbers"
        title={`${data.title}, by the numbers.`}
        titleAccent="Counted straight off the work."
        description="Every figure is the live project count — it updates as we publish more, so there’s nothing here to inflate."
        containerStyle="mb-10"
      />

      <Container>
        <dl className="grid grid-cols-2 border-y border-black/10 md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={[
                'px-1 py-7 md:px-6',
                // Column hairlines: skip the first cell of each row. Two-up on
                // mobile, four-up from md.
                i % 2 !== 0 ? 'border-l border-black/10' : '',
                i % 4 !== 0 ? 'md:border-l md:border-black/10' : 'md:border-l-0',
              ].join(' ')}
            >
              <SlateTag as="dt" tracking="18" className="text-black/50">
                {s.label}
              </SlateTag>
              <dd className="mt-3 text-4xl font-semibold leading-4xl tracking-tighter tabular-nums text-black">
                {s.count != null ? (
                  <CountUp from={0} to={s.count} separator="," duration={1.4} />
                ) : (
                  <span>{s.value}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
};

export default CategoryProof;
