import { glassRowHover } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import type { DbCell } from './cells';

export type DataTableColumn = {
  name: string;
  sqlType: string;
  primary: boolean;
  notNull: boolean;
};

/**
 * The raw-rows grid for /admin/database — a real `<table>` that scrolls
 * horizontally inside its own container (the page never scrolls sideways).
 * Takes plain, already-formatted data only (headers + `DbCell[][]` from
 * cells.ts), so it stays a dumb server component with no server-only imports.
 */
export default function DataTable({
  label,
  columns,
  rows,
}: {
  label: string;
  columns: DataTableColumn[];
  rows: DbCell[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{label} table</caption>
        <thead>
          <tr className="border-b border-white/40 dark:border-white/10">
            {columns.map((col) => (
              <th
                key={col.name}
                scope="col"
                title={`${col.sqlType}${col.primary ? ' · primary key' : ''}${col.notNull ? '' : ' · nullable'}`}
                className="px-4 py-2.5 text-left text-[0.65rem] font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase sm:px-5"
              >
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/40 dark:divide-white/10">
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex} className={glassRowHover}>
              {cells.map((cell, cellIndex) => (
                <Cell key={cellIndex} cell={cell} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CELL_BASE = 'whitespace-nowrap px-4 py-2.5 sm:px-5';

function Cell({ cell }: { cell: DbCell }) {
  switch (cell.kind) {
    case 'redacted':
      return (
        <td className={cn(CELL_BASE, 'text-muted-foreground/60 italic')}>
          {cell.text}
        </td>
      );
    case 'null':
      return (
        <td className={cn(CELL_BASE, 'text-muted-foreground/60')}>
          {cell.text}
        </td>
      );
    case 'id':
    case 'json':
      return (
        <td
          className={cn(CELL_BASE, 'font-mono text-xs text-muted-foreground')}
          title={cell.title}
        >
          {cell.text}
        </td>
      );
    case 'number':
    case 'date':
      return (
        <td className={cn(CELL_BASE, 'text-muted-foreground tabular-nums')}>
          {cell.text}
        </td>
      );
    case 'boolean':
      return (
        <td
          className={cn(
            CELL_BASE,
            'font-mono text-xs',
            cell.text === 'true'
              ? 'text-foreground'
              : 'text-muted-foreground/60',
          )}
        >
          {cell.text}
        </td>
      );
    case 'enum':
      return (
        <td className={CELL_BASE}>
          <span className="inline-flex items-center rounded-full border border-white/50 bg-white/40 px-2 py-0.5 text-[0.6rem] font-medium tracking-wide text-muted-foreground uppercase backdrop-blur-sm dark:border-white/12 dark:bg-white/10">
            {cell.text}
          </span>
        </td>
      );
    default:
      return (
        <td className={cn(CELL_BASE, 'text-foreground')} title={cell.title}>
          {cell.text}
        </td>
      );
  }
}
