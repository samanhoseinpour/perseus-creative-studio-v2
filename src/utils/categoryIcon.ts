import { Globe, Megaphone, Tag, Video, type LucideIcon } from 'lucide-react';

// Per-blog-category icon mapping. Shared by the /blogs hub grid, the
// related-articles list, and the "Browse other topics" cards on detail
// pages — anywhere a category needs a visual marker.
//
// Unknown slugs fall back to a generic Tag icon.
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  website: Globe,
  'digital-marketing': Megaphone,
  'videography-and-photography': Video,
};

export function getCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICON_MAP[slug] ?? Tag;
}
