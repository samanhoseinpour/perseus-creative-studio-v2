import { Children, isValidElement, type ReactNode } from 'react';
import { deriveStepIds } from '@/utils/extractHeadings';

// Step-by-step block for MDX how-to posts, rendered as a stepper rail (mono
// numerals on a hairline connector — echoes KeyTakeaways' idiom, not a generic
// numbered list). The visible block is also the schema source: extractHowTos
// in utils/extractHeadings regex-parses `<HowTo>`/`<Step title>` out of the
// raw MDX and the post page emits a schema.org HowTo node whose HowToStep
// `url` anchors point at the `<li id>`s stamped here — both sides derive ids
// through the shared deriveStepIds, so anchors can't drift.
//
// Authoring conventions (the extractor and the audits rely on them):
// - Place the block under a normal `##` markdown heading — that heading is
//   the TOC entry and the schema-name fallback (or pass `title` explicitly).
// - `<Step title="...">` is required; untitled steps are skipped in schema.
// - No markdown headings (##–####) inside step bodies — they'd TOC-link into
//   the card's internals. Keep step titles unique within a post.
// - Leave blank lines around block-level markdown inside <Step> so MDX
//   parses it (lists, paragraphs, links, <Image /> all work).
// - `totalTime` is an ISO 8601 duration (PT3H, PT90M) — schema.org totalTime.

type StepProps = {
  title: string;
  children?: ReactNode;
};

// Data carrier for <HowTo> — the parent reads `title`/`children` off each
// <Step> element and renders the markup itself. Standalone fallback (a <Step>
// authored outside <HowTo>) renders its body so content never disappears.
export function Step({ children }: StepProps) {
  return <>{children}</>;
}

type HowToProps = {
  /** Overrides the schema/display name (default: the section heading above). */
  title?: string;
  /** ISO 8601 duration, e.g. `PT3H`. Emitted as schema totalTime. */
  totalTime?: string;
  children?: ReactNode;
};

// "PT3H" → "3 h", "PT90M" → "90 min", "PT1H30M" → "1 h 30 min". Best-effort
// display of the totalTime prop; unparseable values just don't render.
function humanizeIsoDuration(iso: string): string | null {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!m || (!m[1] && !m[2])) return null;
  const parts: string[] = [];
  if (m[1]) parts.push(`${Number(m[1])} h`);
  if (m[2]) parts.push(`${Number(m[2])} min`);
  return parts.join(' ');
}

const stepBodyClass = [
  // The article-body prose selectors are direct-child scoped ([&>p], [&>ul])
  // and don't reach into this card, so step bodies style their own descendants.
  '[&_p]:mt-2 [&_p]:text-sm [&_p]:leading-sm [&_p]:text-black/80',
  '[&_a]:underline [&_a]:underline-offset-2 [&_a]:text-black',
  '[&_strong]:font-semibold [&_strong]:text-black',
  '[&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:leading-sm [&_ul]:text-black/80',
  '[&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-sm [&_ol]:leading-sm [&_ol]:text-black/80',
  '[&_li]:mt-1',
].join(' ');

export default function HowTo({ title, totalTime, children }: HowToProps) {
  const steps = Children.toArray(children).filter(
    (child): child is React.ReactElement<StepProps> =>
      isValidElement<StepProps>(child) &&
      child.type === Step &&
      Boolean(child.props.title?.trim()),
  );
  if (steps.length === 0) return null;

  const ids = deriveStepIds(steps.map((s) => s.props.title.trim()));
  const time = totalTime ? humanizeIsoDuration(totalTime) : null;

  return (
    <section
      aria-label={title ?? 'Step-by-step instructions'}
      className="my-10 rounded-2xl border border-black/10 p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60">
          Step-by-step
        </span>
        {time && (
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/40">
            ≈ {time}
          </span>
        )}
      </div>
      {/* Non-heading label on purpose — same reasoning as KeyTakeaways: the
          section heading above the block owns the TOC/heading-order slot. */}
      {title && (
        <span className="mt-2 block text-md font-semibold text-black">
          {title}
        </span>
      )}
      <ol className="relative mt-6 before:absolute before:bottom-4 before:left-[14px] before:top-4 before:w-px before:bg-black/10">
        {steps.map((step, i) => (
          <li
            key={ids[i]}
            id={ids[i]}
            className="grid scroll-mt-24 grid-cols-[28px_1fr] gap-x-4 py-4 first:pt-0 last:pb-0"
          >
            <span
              aria-hidden="true"
              className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black font-mono text-[11px] tabular-nums text-white"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <p className="pt-1 font-semibold text-black">
                {step.props.title}
              </p>
              <div className={stepBodyClass}>{step.props.children}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
