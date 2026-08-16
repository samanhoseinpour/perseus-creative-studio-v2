import type { TaskPrioritySlug, TaskStatusSlug } from '@/lib/taskFields';

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
  /** '' when the account was deleted (snapshot name still renders). */
  assigneeId: string;
  assigneeName: string;
  /** null → initials monogram (deleted accounts included). */
  assigneeAvatar: RowAvatar | null;
  estimatedMinutes: number;
  actualMinutes: number | null;
  /** Unit-explicit input prefills ('1.5h', '45m'); actual is '' until logged. */
  estHours: string;
  actualHours: string;
  /** Raw YYYY-MM-DD for the editors; '' when unset. */
  startDate: string;
  startLabel: string;
  dueDate: string;
  dueLabel: string;
  /** Deadline pressure vs the render's Vancouver today — server-computed. */
  dueState: '' | 'overdue' | 'today';
  completedLabel: string;
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
  viewer: { id: string; name: string };
};
