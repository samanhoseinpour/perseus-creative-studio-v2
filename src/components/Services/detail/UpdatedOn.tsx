/**
 * Micro "Updated <Month Year>" line rendered directly under the Breadcrumb on
 * every service detail hero. The date is the record's `seo.lastUpdated` — the
 * same value the sitemap <lastmod> and WebPage `dateModified` emit, so the
 * visible freshness signal and the machine-readable ones can't drift apart.
 * Tones mirror Breadcrumb's: flipping ink by default, fixed on-media over
 * imagery.
 */
export default function UpdatedOn({
  date,
  onMedia = false,
}: {
  /** ISO 'YYYY-MM-DD'. */
  date: string;
  onMedia?: boolean;
}) {
  // Anchor to midnight UTC so the rendered month never shifts with the
  // build machine's timezone.
  const label = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-CA', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <p
      className={`-mt-3 mb-4 text-xs tracking-tight ${
        onMedia ? 'text-on-media/60' : 'text-black/50'
      }`}
    >
      Updated <time dateTime={date}>{label}</time>
    </p>
  );
}
