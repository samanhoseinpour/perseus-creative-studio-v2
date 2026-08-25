/**
 * "Chrome · macOS" — one User-Agent parser for every device list on
 * /admin/profile.
 *
 * A pure, zero-dependency leaf. It was inlined in profile/page.tsx and its
 * IconKey union in SessionManager.tsx, which was fine while sessions were the
 * only list; there are now THREE — signed-in sessions, enrolled passkeys, and
 * push-subscribed devices — and three private copies is exactly how
 * Admin/menu.ts came to exist ("five bars had private copies and they
 * drifted"). The glyph MAP stays in the client components, because it holds
 * React components; only the parsing lives here.
 *
 * The three lists are deliberately NOT joined. A session, a passkey and a push
 * subscription are different things about the same physical device, connected
 * by nothing the server can trust — the UA string is a label, not an identity —
 * so a join would produce confident-looking wrong rows.
 */

export type IconKey =
  | 'apple'
  | 'windows'
  | 'android'
  | 'linux'
  | 'ubuntu'
  | 'mobile'
  | 'tablet'
  | 'desktop';

/**
 * Parse a User-Agent into a human "Browser · OS" label and a serialisable icon
 * key for the session list. OS brand marks take priority (Apple covers macOS +
 * iOS/iPadOS); an unknown OS falls back to a generic device-class glyph.
 */
export function deviceLabel(ua: string | null): { label: string; iconKey: IconKey } {
  if (!ua) return { label: 'Unknown device', iconKey: 'desktop' };

  const browser = /Edg/i.test(ua)
    ? 'Edge'
    : /OPR|Opera/i.test(ua)
      ? 'Opera'
      : /Chrome|CriOS/i.test(ua)
        ? 'Chrome'
        : /Firefox|FxiOS/i.test(ua)
          ? 'Firefox'
          : /Safari/i.test(ua)
            ? 'Safari'
            : 'Browser';

  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /iPhone/i.test(ua)
      ? 'iOS'
      : /iPad/i.test(ua)
        ? 'iPadOS'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /Android/i.test(ua)
            ? 'Android'
            : /Ubuntu/i.test(ua)
              ? 'Ubuntu'
              : /Linux/i.test(ua)
                ? 'Linux'
                : '';

  const deviceClass: IconKey =
    /iPad|Tablet/i.test(ua) || /Android(?!.*Mobile)/i.test(ua)
      ? 'tablet'
      : /Mobile|iPhone/i.test(ua)
        ? 'mobile'
        : 'desktop';

  const iconKey: IconKey =
    os === 'iOS' || os === 'iPadOS' || os === 'macOS'
      ? 'apple'
      : os === 'Windows'
        ? 'windows'
        : os === 'Android'
          ? 'android'
          : os === 'Ubuntu'
            ? 'ubuntu'
            : os === 'Linux'
              ? 'linux'
              : deviceClass;

  const label = os ? `${browser} · ${os}` : browser;
  return { label, iconKey };
}
