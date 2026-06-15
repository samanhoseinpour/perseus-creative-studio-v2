// Icons for the project category filter rails (service + industry pills in
// CaseFileIndex). Mirrors the blog `categoryIcon.ts` pattern: a label → icon
// map with a neutral `LuTag` fallback so a new service/industry value still
// renders a pill (just with the generic tag glyph) until it's mapped here.

import type { IconType } from 'react-icons';
import {
  LuCamera,
  LuCodeXml,
  LuDumbbell,
  LuHardHat,
  LuHeartPulse,
  LuHouse,
  LuLayoutGrid,
  LuPaintbrush,
  LuPlane,
  LuSailboat,
  LuShoppingBag,
  LuShoppingCart,
  LuTag,
  LuVideo,
  LuWrench,
  LuZap,
} from 'react-icons/lu';

/** Neutral glyph for the "All" pill on either rail. */
export const ALL_FACET_ICON: IconType = LuLayoutGrid;

const SERVICE_ICON_MAP: Record<string, IconType> = {
  Videography: LuVideo,
  Aerial: LuPlane,
  Photography: LuCamera,
  'Web Development': LuCodeXml,
  'Website Redesign': LuPaintbrush,
  'E-Commerce': LuShoppingCart,
  'Website Maintenance': LuWrench,
};

const INDUSTRY_ICON_MAP: Record<string, IconType> = {
  'Real Estate': LuHouse,
  Construction: LuHardHat,
  'Construction & Trades': LuHardHat,
  Fitness: LuDumbbell,
  'Sports & Fitness': LuDumbbell,
  'Health & Wellness': LuHeartPulse,
  'Home Services': LuWrench,
  'Boats & Yachts': LuSailboat,
  'Retail & E-Commerce': LuShoppingBag,
  'Energy & Infrastructure': LuZap,
};

export const getServiceIcon = (label: string): IconType =>
  SERVICE_ICON_MAP[label] ?? LuTag;

export const getIndustryIcon = (label: string): IconType =>
  INDUSTRY_ICON_MAP[label] ?? LuTag;
