import type { TaskPrioritySlug, TaskStatusSlug } from '@/lib/taskFields';
import type {
  TaskTagChipData,
  TaskTagOption,
  TaskTagType,
} from '@/lib/taskTagFields';

/** Resolved avatar props for <AdminAvatar> — resolveAdminAvatar's shape,
 *  serialized server-side (adminIdentity is server-only). */
export type RowAvatar = { src: string; blur?: string; mark?: boolean };

/**
 * The serialized row TasksListView hands the client table — every date/hour
 * already server-formatted to a string (hydration safety; see tasks/format.ts)
 * with just enough raw values riding along to seed the edit dialog and the
 * done-confirm prefill. Type-only leaf so the client graph shares shapes
 * without a server-module value import.
 */
export type TaskRowData = {
  id: string;
  title: string;
  /** '' when null — dialog seed value. Surfaced as "Description" in the UI. */
  notes: string;
  status: TaskStatusSlug;
  /** null = no priority (the default state). */
  priority: TaskPrioritySlug | null;
  /** '' = internal (no client). */
  clientId: string;
  /** Client name, or INTERNAL_CLIENT_LABEL for no-client work. */
  clientLabel: string;
  /** Resolved logo URL (blob ?? static); '' = none → initials fallback. */
  clientLogo: string;
  categoryId: string;
  categoryLabel: string;
  /** Vocabulary-ordered, `[]` when untagged. Attached by the tagsForTasks
   *  fan-in, not the row select. */
  tags: TaskTagChipData[];
  /** '' when the account was deleted (snapshot name still renders). */
  assigneeId: string;
  assigneeName: string;
  /** null → initials monogram (deleted accounts included). */
  assigneeAvatar: RowAvatar | null;
  estimatedMinutes: number;
  actualMinutes: number | null;
  /** Raw YYYY-MM-DD for the editors; '' when unset. */
  startDate: string;
  startLabel: string;
  dueDate: string;
  dueLabel: string;
  /** Deadline pressure vs the reader's today — server-computed. */
  dueState: '' | 'overdue' | 'today';
  /** Raw YYYY-MM-DD in the reader's zone, '' when not done — the completed
   *  cell editor's seed, and the twin of startDate/dueDate above. */
  completedDate: string;
  completedLabel: string;
  /** Signed actual-minus-estimate once the hours are confirmed ('' when they
   *  match, or while the task is still being worked). Server-formatted. */
  varianceLabel: string;
  /** Which way it went — 'over' is the one worth tinting. */
  varianceState: '' | 'over' | 'under';
  /** '' when none. */
  deliverableUrl: string;
};

/** The field-level patch the inline cells send through patchTask — a pre-parse
 *  mirror of patchTaskSchema (null clears where the schema allows it). */
export type TaskCellPatch = {
  title?: string;
  clientId?: string | null;
  categoryId?: string;
  assigneeId?: string;
  priority?: TaskPrioritySlug | null;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number;
  actualMinutes?: number;
};

export type PickerOption = {
  value: string;
  label: string;
  /** Assignee options: resolved face for menu rows (null → initials). */
  avatar?: RowAvatar | null;
  /** Client options: resolved logo URL (null → initials chip). */
  logo?: string | null;
  /** Client options: retainer burn ('14 h / 20 h this month'). */
  hint?: string;
  /** Over the retainer — the hint renders in the warn tone. */
  hintOver?: boolean;
  /** Sentinel rows ("All clients"): no initials coin, italic label — a fake
   *  monogram would read as a real client. */
  bare?: boolean;
  /** The Perseus internal option — render the wordmark coin. */
  mark?: boolean;
};

/** Everything the create/edit forms need, resolved server-side: id-valued
 *  option sets (forms write FKs; the FILTER bar's slug-valued options are a
 *  separate projection) plus the viewer for the assignee default. */
export type TaskFormOptions = {
  clients: PickerOption[];
  categories: PickerOption[];
  assignees: PickerOption[];
  /** The whole tag vocabulary, ARCHIVED INCLUDED — the picker filters by the
   *  chosen category client-side (a scoped list per category would be seven
   *  projections of the same 30 rows), and an archived tag still has to
   *  render on the tasks already carrying it. */
  tags: TaskTagOption[];
  /** The tag TYPES, section-ordered, ARCHIVED INCLUDED for the same reason
   *  the tags are: a picker still has to render what a task already carries.
   *  `sectionTags` drops any type with nothing under it, so an archived one
   *  contributes no heading. */
  tagTypes: TaskTagType[];
  viewer: { id: string; name: string };
  /** What history knows, so a new task can pre-fill instead of asking. Both
   *  maps are precomputed with the option sets — a default isn't worth a
   *  round trip on every client pick. Suggestions only ever fill fields the
   *  member has left alone; nothing here overwrites a choice. */
  clientDefaults: ClientTaskDefaults;
  estimates: EstimateHints;
};

/** Last category used per client id ('internal' keys Perseus work). */
export type ClientTaskDefaults = Record<string, { categoryId: string }>;

/** Typical minutes keyed `${clientId|'internal'}:${categoryId}`, with a bare
 *  `${categoryId}` fallback. `lookupEstimate` is the only reader. */
export type EstimateHints = Record<string, { minutes: number; sample: number }>;

/** Map a form's client value onto the key the history maps use. The forms'
 *  convention throughout: `null` = nothing picked yet, `''` = Perseus (the
 *  null-client studio row), anything else = a client uuid. */
export function clientHistoryKey(clientId: string | null): string | null {
  if (clientId === null) return null;
  return clientId === '' ? 'internal' : clientId;
}

/** The more specific key wins: this client's history for this kind of work,
 *  else the studio's history for that kind of work, else nothing. */
export function lookupEstimate(
  estimates: EstimateHints,
  clientId: string | null,
  categoryId: string,
): { minutes: number; sample: number } | null {
  if (!categoryId) return null;
  const key = clientHistoryKey(clientId);
  return (
    (key ? estimates[`${key}:${categoryId}`] : undefined) ??
    estimates[categoryId] ??
    null
  );
}
