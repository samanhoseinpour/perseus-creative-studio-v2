import Container from '@/components/ui/Container';
import { SlateTag } from '../SlateTag';

interface ProjectFootnotesProps {
  /** Footnote texts in stats order — numbering matches ProjectHighlights'
   *  superscripts (both derive from the same filtered stats array). */
  footnotes: string[];
}

/**
 * The fine print under the highlights' superscripts — Apple's footnote block
 * in the archive's register. Quiet by design: a hairline rule, the Notes tag,
 * and small ink. Each item is a `#fn-N` anchor target; `scroll-mt-36` clears
 * the fixed navbar + local-nav ribbon on jump.
 */
const ProjectFootnotes = ({ footnotes }: ProjectFootnotesProps) => {
  if (footnotes.length === 0) return null;

  return (
    <section className="pt-16 sm:pt-24">
      <Container>
        <div className="max-w-3xl border-t border-black/10 pt-6">
          <SlateTag as="p" className="text-black/45">
            Notes
          </SlateTag>
          <ol className="mt-4 space-y-2">
            {footnotes.map((footnote, i) => (
              <li
                key={i}
                id={`fn-${i + 1}`}
                className="scroll-mt-36 text-xs leading-relaxed text-black/50"
              >
                <sup className="mr-1.5 tabular-nums">{i + 1}</sup>
                {footnote}
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
};

export default ProjectFootnotes;
