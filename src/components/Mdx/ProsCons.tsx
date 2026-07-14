import { Children, isValidElement, type ReactNode } from 'react';

// Two-column pros/cons block for MDX comparison posts (Rank Math's signature
// block, kept visual-only — it emits no special schema there either). Stays
// monochrome ink/bone: mono +/− glyph markers instead of green/red, hairline
// rules instead of tinted panels, so it reads as part of the article's
// editorial system in both themes.
//
// Authoring: put markdown bullet lists inside <Pros>/<Cons> with blank lines
// around them so MDX parses them into real <ul><li> — inline markdown (bold
// lead-ins, links) works per item:
//
//   <ProsCons title="DIY listing videos">
//     <Pros>
//       - **Zero cash cost** — only your time
//     </Pros>
//     <Cons>
//       - Inconsistent exposure and audio
//     </Cons>
//   </ProsCons>

type ColumnProps = {
  children?: ReactNode;
};

const columnListClass = [
  // Article prose selectors are direct-child scoped and don't reach in here.
  '[&_ul]:m-0 [&_ul]:list-none [&_ul]:p-0',
  '[&_li]:relative [&_li]:border-t [&_li]:border-black/10 [&_li]:py-2.5 [&_li]:pl-6',
  '[&_li]:text-sm [&_li]:leading-sm [&_li]:text-black/85',
  '[&_li:first-child]:border-t-0',
  '[&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:font-mono [&_li]:before:text-black/40',
  '[&_strong]:font-semibold [&_strong]:text-black',
  '[&_a]:underline [&_a]:underline-offset-2 [&_a]:text-black',
  '[&_p]:text-sm [&_p]:leading-sm [&_p]:text-black/85',
].join(' ');

function Column({
  children,
  label,
  glyph,
  markerClass,
}: ColumnProps & { label: string; glyph: string; markerClass: string }) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full border border-black/20 font-mono text-[11px] leading-none text-black/60"
        >
          {glyph}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60">
          {label}
        </span>
      </div>
      <div className={`mt-3 ${columnListClass} ${markerClass}`}>{children}</div>
    </div>
  );
}

export function Pros({ children }: ColumnProps) {
  return (
    <Column label="Pros" glyph="+" markerClass="[&_li]:before:content-['+']">
      {children}
    </Column>
  );
}

export function Cons({ children }: ColumnProps) {
  return (
    <Column label="Cons" glyph="−" markerClass="[&_li]:before:content-['−']">
      {children}
    </Column>
  );
}

type ProsConsProps = {
  /** Optional strip above the columns naming what's being weighed. */
  title?: string;
  children?: ReactNode;
};

export default function ProsCons({ title, children }: ProsConsProps) {
  const columns = Children.toArray(children).filter(
    (child) =>
      isValidElement(child) && (child.type === Pros || child.type === Cons),
  );
  if (columns.length === 0) return null;

  return (
    <aside
      aria-label={title ? `Pros and cons: ${title}` : 'Pros and cons'}
      className="my-10 overflow-hidden rounded-2xl border border-black/10"
    >
      {/* Non-heading label on purpose — headings inside the card would join
          the H1→H2 order audit and demand TOC entries. */}
      {title && (
        <div className="border-b border-black/10 px-6 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/60">
            {title}
          </span>
        </div>
      )}
      <div className="grid sm:grid-cols-2 max-sm:[&>*+*]:border-t sm:[&>*+*]:border-l [&>*+*]:border-black/10">
        {columns}
      </div>
    </aside>
  );
}
