// Icons for the project category filter rails (service + industry + location
// pills in CaseFileIndex). Mirrors the blog `categoryIcon.ts` pattern: a label
// → icon map with a neutral `LuTag` fallback so a new service/industry value
// still renders a pill (just with the generic tag glyph) until it's mapped
// here. Location pills don't vary their glyph — they all carry the map pin.

import type { IconType } from 'react-icons';
import {
  LuBox,
  LuCamera,
  LuCodeXml,
  LuDumbbell,
  LuHardHat,
  LuHeartPulse,
  LuHouse,
  LuLayoutGrid,
  LuMapPin,
  LuMegaphone,
  LuPaintbrush,
  LuPalette,
  LuPartyPopper,
  LuPlane,
  LuRuler,
  LuSailboat,
  LuShare2,
  LuShoppingBag,
  LuShoppingCart,
  LuTag,
  LuVideo,
  LuWrench,
  LuZap,
} from 'react-icons/lu';

/** Neutral glyph for the "All" pill on every rail. */
export const ALL_FACET_ICON: IconType = LuLayoutGrid;

/** Single glyph for every Location pill — locations don't need per-value art. */
export const LOCATION_FACET_ICON: IconType = LuMapPin;

const SERVICE_ICON_MAP: Record<string, IconType> = {
  Videography: LuVideo,
  Aerial: LuPlane,
  Photography: LuCamera,
  'Floor Plan': LuRuler,
  Matterport: LuBox,
  'Meta Ads': LuMegaphone,
  'Social Media': LuShare2,
  Branding: LuPalette,
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
  'Hospitality & Events': LuPartyPopper,
  'Retail & E-Commerce': LuShoppingBag,
  'Energy & Infrastructure': LuZap,
};

export const getServiceIcon = (label: string): IconType =>
  SERVICE_ICON_MAP[label] ?? LuTag;

export const getIndustryIcon = (label: string): IconType =>
  INDUSTRY_ICON_MAP[label] ?? LuTag;
