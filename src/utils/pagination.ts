// Shared pagination helpers used by:
//   - app/blogs/page.tsx        (server: canonical math)
//   - app/blogs/authors/[author]/page.tsx (server: canonical + slicing)
//   - components/Blogs/BlogPost.tsx       (client: grid slicing + nav)

export function firstParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function parsePage(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// Smart truncation for the page-number row:
//   1 2 3 4 5            (≤7 total, show all)
//   1 … 4 5 6 … 12       (current in the middle, neighbours ±1)
//   1 2 3 4 … 12         (near the start)
//   1 … 9 10 11 12       (near the end)
export function getPageNumbers(
  current: number,
  total: number,
): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);

  return pages;
}
