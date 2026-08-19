/**
 * The one print stylesheet every printable surface injects — the admin report
 * (`/admin/reports/[slug]/print`), the client's share link
 * (`/share/reports/[token]`), and the payslip. One constant rather than three
 * copies: the rule set below is subtle enough that a drifted copy is a silently
 * broken PDF, and nobody proofreads a PDF they didn't print.
 *
 * `print-color-adjust: exact` on `*` is the load-bearing line. Browsers strip
 * background colours when printing — "Background graphics" is off by default in
 * every one of them — which would erase every chart on the report, because those
 * bars are pure background-colour divs. But `*` also matches `html`, `body`, and
 * every layout wrapper above the sheet, so the same rule that rescues the charts
 * also faithfully paints whatever ground the page happens to be sitting on.
 *
 * Hence the two resets above it. `[data-theme]` does NOT lift at print time, so
 * a dark-theme admin hitting Print otherwise carries `--background: #0c0c0d`
 * onto the paper: a near-black A4 under `print:text-neutral-900` ink, i.e. the
 * entire document rendered invisible, and a client-facing one at that. The
 * ground has to be a LITERAL hex — `--background`, `--surface` and Tailwind's
 * own `white` (`--color-white: var(--surface)`, globals.css) are all FLIP
 * tokens here, so every "white" this codebase can name is #0c0c0d under the
 * dark theme. `color-scheme` is reset for the same reason: left at `dark` it
 * tints the UA's own canvas beneath the @page margin band.
 *
 * `!important` because globals.css paints `body` twice — once unlayered, once
 * inside `@layer base` — so this must win wherever the tag lands in the stream.
 *
 * The sheets themselves stay `print:bg-transparent`: the paper is the ground,
 * and with the ancestors neutralised there is nothing left to cover.
 */
export const PRINT_SHEET_CSS = `@media print {
  @page { size: A4; margin: 16mm }
  :root { color-scheme: light !important }
  html, body { background: #fff !important }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact }
}`;
