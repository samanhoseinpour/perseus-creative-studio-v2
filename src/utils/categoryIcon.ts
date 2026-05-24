import { LuGlobe, LuMegaphone, LuShare2, LuTag, LuVideo } from 'react-icons/lu';
import type { IconType } from 'react-icons';

// Per-blog-category icon mapping. Shared by the /blogs hub grid, the
// related-articles list, and the "Browse other topics" cards on detail
// pages — anywhere a category needs a visual marker.
//
// Unknown slugs fall back to a generic Tag icon.
export const CATEGORY_ICON_MAP: Record<string, IconType> = {
  website: LuGlobe,
  'digital-marketing': LuMegaphone,
  'videography-and-photography': LuVideo,
  social: LuShare2,
};

export function getCategoryIcon(slug: string): IconType {
  return CATEGORY_ICON_MAP[slug] ?? LuTag;
}
