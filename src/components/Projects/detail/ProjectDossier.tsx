import Container from '@/components/ui/Container';
import { SlateTag } from '../SlateTag';
import { pad2 } from '../utils';

interface ProjectDossierProps {
  /** Case-study copy from the store: plain text, blank-line paragraph breaks. */
  description: string;
}

/**
 * The case-study narrative as a numbered dossier ledger: each blank-line
 * paragraph of the stored copy becomes a ruled entry with its file index in
 * the margin — the same 01/02/03 register the archive uses everywhere. Plain
 * text only by design (no MDX); a single paragraph reads as a lone `01` entry.
 */
const ProjectDossier = ({ description }: ProjectDossierProps) => {
  const paragraphs = description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;

  return (
    <section className="pt-16 sm:pt-24">
      <Container>
        <div className="flex items-center gap-4">
          <SlateTag as="h2" size="md" className="whitespace-nowrap text-black/60">
            Case notes
          </SlateTag>
          <span aria-hidden className="h-px flex-1 bg-black/10" />
          <SlateTag className="whitespace-nowrap tabular-nums text-black/45">
            {pad2(paragraphs.length)}{' '}
            {paragraphs.length === 1 ? 'entry' : 'entries'}
          </SlateTag>
        </div>

        <div className="mt-4 max-w-3xl">
          {paragraphs.map((paragraph, i) => (
            <div
              key={i}
              className="flex gap-6 border-b border-black/10 py-6 last:border-b-0 sm:gap-10"
            >
              <SlateTag
                aria-hidden
                className="pt-0.5 tabular-nums text-black/40"
              >
                {pad2(i + 1)}
              </SlateTag>
              <p className="text-sm leading-relaxed text-black/75 sm:text-base">
                {paragraph}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default ProjectDossier;
