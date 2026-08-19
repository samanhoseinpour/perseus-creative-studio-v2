/** The key chip used by the tasks + inbox shortcut legends and the shortcuts
 *  sheet. Tinted off `--foreground` rather than `white/*`: white is the
 *  `--surface` FLIP token, so a white wash reads as a lighter chip in light
 *  mode but paints ANOTHER pale layer on an already-dark panel (Glass.tsx's
 *  `glassField` gotcha). `font-sans` because the browser default for <kbd> is
 *  monospace, which sets these apart from the sentence they sit in. */
export default function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-foreground/15 bg-foreground/[0.06] px-1 font-sans text-[0.65rem] text-foreground">
      {children}
    </kbd>
  );
}
