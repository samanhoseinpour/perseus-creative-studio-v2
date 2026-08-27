import type { MonitoringRange, OverallStatus } from '@/lib/monitoringFields';

/**
 * The row shapes /admin/monitoring renders. Split out of the `server-only`
 * monitoringData.ts (the costs/types.ts precedent) so a client leaf could take
 * one without dragging the query layer into a chunk. Every figure and every
 * time is a STRING already formatted in the reader's zone — the payrollData
 * contract: no date math and no number math outside the builder.
 */

export type ChipData = { label: string; tone: string };

export type MonitoringTile = {
  label: string;
  value: string;
  reading?: string;
  hint?: string;
  muted?: boolean;
};

export type SeriesColumn = {
  key: string;
  label: string;
  valueLabel: string;
  /** 0–100 against the tallest column; 0 draws the dashed baseline. */
  pct: number;
  current: boolean;
};

export type GroupRow = {
  key: string;
  title: string;
  sourceLabel: string;
  countLabel: string;
  firstSeenLabel: string;
  lastSeenLabel: string;
  /** The group's earliest bucket carries the build serving this page. */
  newInDeployment: boolean;
  code: string | null;
  componentLabel: string | null;
  digest: string | null;
  requestId: string | null;
  deployment: string | null;
};

export type RouteRow = {
  key: string;
  label: string;
  note: string | null;
  countLabel: string;
  pct: number;
};

export type DependencyRow = {
  key: string;
  label: string;
  hint: string;
  status: ChipData;
  detail: string | null;
  latencyLabel: string | null;
  checkedLabel: string;
  lastFailedLabel: string | null;
  streakLabel: string | null;
  observedLabel: string | null;
};

export type CronRow = {
  key: string;
  label: string;
  description: string;
  scheduleLabel: string;
  state: ChipData;
  lastRunLabel: string;
  durationLabel: string | null;
  summary: string | null;
  nextLabel: string;
  missed: boolean;
};

export type IncidentRow = {
  id: string;
  title: string;
  detail: string | null;
  kindLabel: string;
  severity: ChipData;
  open: boolean;
  startedLabel: string;
  lastSeenLabel: string;
  resolvedLabel: string | null;
  occurrenceLabel: string;
  alertedLabel: string;
  deployment: string | null;
  requestId: string | null;
  digest: string | null;
};

export type VercelLinkRow = { label: string; href: string; hint: string };

export type SloViewRow = {
  key: string;
  label: string;
  kindLabel: string;
  measuredLabel: string;
  targetLabel: string;
  sampleLabel: string;
  budgetLabel: string;
  status: ChipData;
  /** 0–100 for the bar; null when there is not enough data. */
  pct: number | null;
};

export type MonitoringView = {
  range: MonitoringRange;
  rangeLabel: string;
  environment: string;
  deployment: string | null;
  commit: string | null;
  status: { status: OverallStatus; chip: ChipData; reason: string };
  checkedLabel: string;
  nextCheckLabel: string;
  tiles: {
    errors: MonitoringTile;
    incidents: MonitoringTile;
    dependencies: MonitoringTile;
    crons: MonitoringTile;
  };
  series: { columns: SeriesColumn[]; totalLabel: string; hasErrors: boolean };
  groups: GroupRow[];
  routes: RouteRow[];
  dependencies: DependencyRow[];
  crons: CronRow[];
  incidents: { open: IncidentRow[]; recent: IncidentRow[] };
  vercel: VercelLinkRow[];
  slo: { rows: SloViewRow[]; windowLabel: string };
  /** Server-derived flags for the live-tail panel; the token itself never
   *  leaves the server. */
  tail: { configured: boolean; onVercel: boolean; seconds: number };
  /** Page reads that threw, by name — rendered as "couldn't load" panels. */
  sectionsFailed: string[];
};
