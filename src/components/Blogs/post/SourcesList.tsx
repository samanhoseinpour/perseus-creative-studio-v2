import SmartLink from '@/components/Mdx/SmartLink';

// The article's numbered "Sources" section — renders BlogPost.externalSources
// as visible citations (E-E-A-T / verifiability signal). The same list is
// emitted as schema.org `citation` on the BlogPosting node, and the section
// gets its own TOC entry; both are wired in app/(marketing)/blogs/[blog].
// `id="sources"` is load-bearing: the TOC anchor targets it.

type Source = {
  title: string;
  href: string;
  // Merged into the link's rel alongside SmartLink's external defaults.
  rel?: 'nofollow' | 'sponsored' | 'ugc';
};

type SourcesListProps = {
  sources: Source[];
};

const hostOf = (href: string): string | null => {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

const SourcesList = ({ sources }: SourcesListProps) => {
  if (sources.length === 0) return null;

  return (
    <section
      id="sources"
      aria-labelledby="sources-heading"
      className="mt-12 scroll-mt-24"
    >
      {/* Mirrors the article-body [&>h2] treatment — this heading lives
          outside that scoped wrapper, so the classes are applied directly. */}
      <h2
        id="sources-heading"
        className="mb-6 max-w-2xl border-l-3 border-black/20 pl-4 text-2xl font-bold text-black sm:text-3xl"
      >
        Sources
      </h2>
      <ol className="space-y-3">
        {sources.map((source, i) => {
          const host = hostOf(source.href);
          return (
            <li key={source.href} className="flex gap-4">
              <span
                aria-hidden="true"
                className="pt-px font-mono text-sm tabular-nums text-black/40"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-sm leading-sm">
                {/* Explicit rel wins over SmartLink's external defaults
                    (props spread after them), so per-source nofollow/
                    sponsored/ugc merges instead of being dropped. */}
                <SmartLink
                  href={source.href}
                  rel={`noopener noreferrer${source.rel ? ` ${source.rel}` : ''}`}
                  className="text-black underline underline-offset-4 hover:opacity-80"
                >
                  {source.title}
                </SmartLink>
                {host && <span className="text-black/50"> — {host}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default SourcesList;
