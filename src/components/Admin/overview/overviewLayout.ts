/**
 * The overview bento's span packer. Every member sees a different subset of
 * modules (area grants), and the grid must close every row for ANY subset —
 * no holes, no orphan half-rows. The module set is fully known server-side,
 * so spans are assigned deterministically here instead of leaning on CSS
 * `grid-flow-dense` (which reorders visual placement away from DOM order and
 * still leaves end-of-grid holes).
 *
 * A zero-dependency leaf (the taskFilters pattern) so it stays trivially
 * testable and client-safe, though only the server page imports it today.
 *
 * Row model: lg is a 6-column grid, sm a 2-column one. Each module declares a
 * preferred span per breakpoint; rows fill left to right, and when the next
 * module doesn't fit the remainder the open row is closed by distributing the
 * leftover columns — equally when they divide evenly across the row's
 * members, otherwise onto the row's last member. Enumerated lg outcomes:
 * [3,3]→3|3 · [3,2]→3|3 · [2,2,2] stays · [2,2]→3|3 · [2,3]→2|4 · a lone
 * module → 6. No member can land on 5, so the class lookups below are total.
 */

export type OverviewModuleSpec<K extends string = string> = {
  key: K;
  /** Preferred lg span (of 6). */
  lg: 2 | 3;
  /** Preferred sm span (of 2). */
  sm: 1 | 2;
};

export type PackedModule<K extends string = string> = {
  key: K;
  /** Combined `sm:`/`lg:` col-span classes for this module's grid item. */
  className: string;
};

/**
 * Static literal lookups — Tailwind's scanner needs to SEE these classes, so
 * they can never be assembled from template strings.
 */
const LG_SPAN: Record<2 | 3 | 4 | 6, string> = {
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
};

const SM_SPAN: Record<1 | 2, string> = {
  1: '',
  2: 'sm:col-span-2',
};

/** Close one row: hand its leftover columns to its members. */
function closeRow(row: number[], capacity: number): number[] {
  const used = row.reduce((sum, span) => sum + span, 0);
  const leftover = capacity - used;
  if (leftover <= 0 || row.length === 0) return row;
  if (leftover % row.length === 0) {
    const each = leftover / row.length;
    return row.map((span) => span + each);
  }
  const grown = [...row];
  grown[grown.length - 1] += leftover;
  return grown;
}

/** Pack one breakpoint's spans into closed rows of `capacity`. */
function packSpans(spans: number[], capacity: number): number[] {
  const out: number[] = [];
  let row: number[] = [];
  let used = 0;
  for (const span of spans) {
    if (used + span > capacity) {
      out.push(...closeRow(row, capacity));
      row = [];
      used = 0;
    }
    row.push(span);
    used += span;
  }
  out.push(...closeRow(row, capacity));
  return out;
}

/**
 * Resolve the present modules' grid classes. Order is preserved (DOM order is
 * visual order); absent modules simply never enter the list.
 */
export function packModules<K extends string>(
  modules: OverviewModuleSpec<K>[],
): PackedModule<K>[] {
  const lg = packSpans(
    modules.map((m) => m.lg),
    6,
  ) as (2 | 3 | 4 | 6)[];
  const sm = packSpans(
    modules.map((m) => m.sm),
    2,
  ) as (1 | 2)[];
  return modules.map((m, i) => ({
    key: m.key,
    className: [SM_SPAN[sm[i]], LG_SPAN[lg[i]]].filter(Boolean).join(' '),
  }));
}
