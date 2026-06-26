'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  LuCalendar,
  LuChartNoAxesColumn,
  LuChartLine,
  LuLayoutGrid,
  LuUsers,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';

import type { WebsiteServiceContent } from '../types';

type Dashboard = NonNullable<WebsiteServiceContent['dashboardMock']>;
type View = Dashboard['views'][number];

const EASE = [0.22, 1, 0.36, 1] as const;

const ICON: Record<View['kind'], IconType> = {
  overview: LuLayoutGrid,
  customers: LuUsers,
  bookings: LuCalendar,
  reports: LuChartLine,
};

/**
 * Web Applications signature — an interactive app-UI dashboard, built from divs.
 * Each sidebar view renders a *different* interface (tiles + bar chart, a CRM
 * table, a capacity calendar, a line-chart report), so clicking through behaves
 * like real software, not the same panel re-numbered. Studio tokens — a contrast
 * sidebar, white cards, monochrome charts.
 */
const DashboardMock = ({ appName, views }: Dashboard) => {
  const [active, setActive] = useState(0);
  const view = views[active];

  return (
    <div className="overflow-hidden rounded-2xl bg-background-contrast">
      {/* Window chrome */}
      <div className="flex items-center gap-3 border-b border-black/10 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-black/15" />
          <span className="size-2.5 rounded-full bg-black/15" />
          <span className="size-2.5 rounded-full bg-black/15" />
        </div>
        <span className="font-mono text-[11px] tracking-tight text-black/50">
          {appName}
        </span>
      </div>

      {/* Mobile tab bar */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-black/10 p-3 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
        {views.map((v, i) => (
          <button
            key={v.name}
            type="button"
            onClick={() => setActive(i)}
            aria-current={i === active}
            className={[
              'shrink-0 rounded-lg px-3 py-1.5 text-sm tracking-tight transition-colors',
              i === active ? 'bg-black font-medium text-white' : 'text-black/60',
            ].join(' ')}
          >
            {v.name}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-[180px_1fr]">
        {/* Sidebar */}
        <nav className="hidden flex-col gap-1 border-r border-black/10 bg-black/[0.02] p-4 sm:flex">
          {views.map((v, i) => {
            const Icon = ICON[v.kind];
            return (
              <button
                key={v.name}
                type="button"
                onClick={() => setActive(i)}
                aria-current={i === active}
                className={[
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm tracking-tight transition-colors',
                  i === active
                    ? 'bg-black font-medium text-white'
                    : 'text-black/60 hover:bg-black/[0.04] hover:text-black/80',
                ].join(' ')}
              >
                <Icon aria-hidden className="size-3.5 opacity-70" />
                {v.name}
              </button>
            );
          })}
        </nav>

        {/* Main — re-keyed by view so it re-animates on switch */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="min-h-[300px] p-5 sm:p-6"
        >
          <ViewPanel view={view} />
        </motion.div>
      </div>
    </div>
  );
};

/* ───────────────────────── per-kind panels ───────────────────────── */

const ViewPanel = ({ view }: { view: View }) => {
  switch (view.kind) {
    case 'overview':
      return <OverviewPanel {...view} />;
    case 'customers':
      return <CustomersPanel {...view} />;
    case 'bookings':
      return <BookingsPanel {...view} />;
    case 'reports':
      return <ReportsPanel {...view} />;
  }
};

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl bg-white p-4">
    {children}
  </div>
);

const CardLabel = ({ icon: Icon, children }: { icon: IconType; children: string }) => (
  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">
    <Icon aria-hidden className="size-3.5" />
    {children}
  </span>
);

const OverviewPanel = ({
  stats,
  chart,
  chartLabel,
}: Extract<View, { kind: 'overview' }>) => (
  <>
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl bg-white p-3.5"
        >
          <p className="text-xl font-semibold leading-none tracking-tighter tabular-nums sm:text-2xl">
            {s.value}
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-black/45">
            {s.label}
          </p>
        </div>
      ))}
    </div>
    <div className="mt-3">
      <Card>
        <CardLabel icon={LuChartNoAxesColumn}>{chartLabel}</CardLabel>
        <div className="mt-4 flex h-28 items-end gap-1.5">
          {chart.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.04 }}
              className={`flex-1 rounded-t-sm ${
                i === chart.length - 1 ? 'bg-black' : 'bg-black/15'
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  </>
);

const CustomersPanel = ({ rows }: Extract<View, { kind: 'customers' }>) => (
  <Card>
    <CardLabel icon={LuUsers}>Recent customers</CardLabel>
    <ul className="mt-3 flex flex-col">
      {rows.map((r, i) => (
        <motion.li
          key={r.name}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: EASE, delay: i * 0.06 }}
          className="flex items-center gap-3 border-t border-black/[0.07] py-2.5 first:border-t-0"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black text-[11px] font-semibold text-white">
            {r.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium tracking-tight text-black/85">
              {r.name}
            </p>
            <p className="truncate font-mono text-[10px] text-black/40">
              {r.meta}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-black/[0.06] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-black/55">
            {r.status}
          </span>
        </motion.li>
      ))}
    </ul>
  </Card>
);

const BookingsPanel = ({ week }: Extract<View, { kind: 'bookings' }>) => (
  <Card>
    <CardLabel icon={LuCalendar}>This week · capacity</CardLabel>
    <div className="mt-4 grid grid-cols-7 gap-2">
      {week.map((d, di) => (
        <div key={d.day} className="flex flex-col items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-black/40">
            {d.day}
          </span>
          <div className="flex flex-col-reverse gap-1">
            {Array.from({ length: d.capacity }).map((_, si) => (
              <motion.span
                key={si}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.25,
                  ease: EASE,
                  delay: di * 0.05 + si * 0.03,
                }}
                className={`size-3 rounded-[3px] ${
                  si < d.booked ? 'bg-black' : 'bg-black/10'
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] tabular-nums text-black/45">
            {d.booked}/{d.capacity}
          </span>
        </div>
      ))}
    </div>
  </Card>
);

const ReportsPanel = ({
  series,
  seriesLabel,
  rows,
}: Extract<View, { kind: 'reports' }>) => {
  const W = 300;
  const H = 96;
  const pts = series.map((v, i) => ({
    x: (i / (series.length - 1)) * W,
    y: H - (Math.min(Math.max(v, 0), 100) / 100) * (H - 8) - 4,
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <>
      <Card>
        <CardLabel icon={LuChartLine}>{seriesLabel}</CardLabel>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="mt-4 h-28 w-full"
        >
          <motion.path
            d={area}
            fill="currentColor"
            className="text-black/[0.06]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-black"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        </svg>
      </Card>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {rows.map((r) => (
          <div
            key={r.label}
            className="rounded-xl bg-white p-3.5"
          >
            <p className="text-lg font-semibold leading-none tracking-tighter tabular-nums">
              {r.value}
            </p>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-black/45">
              {r.label}
            </p>
          </div>
        ))}
      </div>
    </>
  );
};

export default DashboardMock;
