import { IMAGEKIT_BASE } from '@/constants';

// Returns an ImageKit-relative path (with leading `/`) when the src is hosted
// on our ImageKit endpoint or is already a local `/...` path. Returns null for
// truly external sources (other CDNs, third-party hotlinks, etc).
export function toImageKitPath(src: string): string | null {
  if (!src) return null;

  if (src.startsWith('//')) return null;

  if (src.startsWith('/')) return src;

  if (src.startsWith(`${IMAGEKIT_BASE}/`)) {
    return src.slice(IMAGEKIT_BASE.length);
  }

  return null;
}
