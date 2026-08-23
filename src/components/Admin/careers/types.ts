import type {
  JobEmploymentTypeField,
  JobPayUnitField,
  JobStatusField,
} from '@/lib/careerFields';

/**
 * The /admin/careers roster's slim, serializable row shapes — built by the
 * server page from `listAdminOpenings` / `listAdminCategories` and handed to
 * the client islands (the AdminClientItem precedent). Every date is either a
 * YYYY-MM-DD calendar KEY passed through as a string or a label the server
 * already formatted; nothing here ever needs `new Date()` in the browser.
 * Optional columns arrive as '' rather than null so the dialog can bind them
 * straight to inputs.
 */
export type AdminOpeningItem = {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  categoryName: string;
  location: string;
  employmentType: JobEmploymentTypeField;
  level: string;
  cadence: string;
  fit: string;
  summary: string;
  tags: string[];
  status: JobStatusField;
  /** Calendar keys, '' when unset. */
  datePosted: string;
  validThrough: string;
  /** Whole CAD dollars as typed-ready strings, '' when unset. */
  payMin: string;
  payMax: string;
  payUnit: JobPayUnitField | '';
  /** formatPay over the stored triple, '' when any part is missing. */
  payLabel: string;
  /** 'Aug 9, 2026' renderings of the two keys, '' when unset. */
  postedLabel: string;
  expiresLabel: string;
  /** Where validThrough sits against the viewer's today (server-computed). */
  expiresState: 'none' | 'ok' | 'soon' | 'expired';
  /** Applications stored against this slug, any status — what a delete would orphan. */
  applicationCount: number;
  /** Only the ones the Applications inbox tab lists (new + read) — the
   *  number the roster's link shows, so it matches what the link opens. */
  inboxApplicationCount: number;
  sortIndex: number;
  updatedLabel: string;
};

export type AdminCategoryItem = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  sortIndex: number;
  /** Listings under it (any status) — the delete guard's number. */
  openingCount: number;
};
