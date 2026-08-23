import type { IconType } from 'react-icons';
import {
  LuBriefcase,
  LuCamera,
  LuChartColumn,
  LuCode,
  LuGlobe,
  LuInstagram,
  LuMegaphone,
  LuPalette,
  LuPanelsTopLeft,
  LuPenLine,
  LuSearch,
  LuSparkles,
  LuUsers,
  LuVideo,
} from 'react-icons/lu';

import {
  isJobCategoryIconKey,
  JOB_CATEGORY_ICON_FALLBACK,
  type JobCategoryIconKey,
} from '@/lib/careerFields';

/**
 * Icon key → component for job categories (job_categories.icon). Shared by
 * the public careers cards (server) and the admin category picker (client);
 * fourteen lucide glyphs are negligible, but keep this a leaf — no data, no
 * store imports — so it can ride the admin chunk safely.
 */
export const JOB_CATEGORY_ICONS: Record<JobCategoryIconKey, IconType> = {
  briefcase: LuBriefcase,
  instagram: LuInstagram,
  chart: LuChartColumn,
  layout: LuPanelsTopLeft,
  search: LuSearch,
  video: LuVideo,
  camera: LuCamera,
  pen: LuPenLine,
  code: LuCode,
  megaphone: LuMegaphone,
  palette: LuPalette,
  globe: LuGlobe,
  sparkles: LuSparkles,
  users: LuUsers,
};

/** The component for a stored key; unknown/legacy values get the fallback. */
export function jobCategoryIcon(key: string): IconType {
  return JOB_CATEGORY_ICONS[
    isJobCategoryIconKey(key) ? key : JOB_CATEGORY_ICON_FALLBACK
  ];
}
