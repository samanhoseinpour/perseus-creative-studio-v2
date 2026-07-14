// The article's "Key takeaways" box — the answer-first summary AI answer
// engines and featured snippets lift verbatim (the same pattern Investopedia/
// NerdWallet ship, and Yoast sells as "AI Summarize"). Renders at the top of
// the post's content column; the bullets also feed the BlogPosting `abstract`
// and the box is flagged speakable, both wired in app/(marketing)/blogs/[blog].
// `id="key-takeaways"` is load-bearing: the speakable cssSelector targets it.

type KeyTakeawaysProps = {
  takeaways: string[];
};

const KeyTakeaways = ({ takeaways }: KeyTakeawaysProps) => {
  if (takeaways.length === 0) return null;

  return (
    <section
      id="key-takeaways"
      aria-label="Key takeaways"
      className="mb-10 scroll-mt-24 rounded-2xl bg-background-contrast p-6 sm:p-7"
    >
      {/* Non-heading label on purpose — a heading here would join the H1→H2
          order audit and demand a TOC entry; the box is a summary, not a
          section. */}
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60">
        Key takeaways
      </span>
      <ol className="mt-4 space-y-0">
        {takeaways.map((takeaway, i) => (
          <li
            key={takeaway}
            className="flex gap-4 border-t border-black/10 py-3 first:border-t-0 first:pt-0 last:pb-0"
          >
            <span
              aria-hidden="true"
              className="pt-px font-mono text-sm tabular-nums text-black/40"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="text-sm leading-sm text-black/90 sm:text-md sm:leading-md">
              {takeaway}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default KeyTakeaways;
