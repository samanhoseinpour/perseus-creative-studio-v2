import { SITE_URL } from '@/constants';

/**
 * The ONE href guard, shared by the body validator, the importer, SmartLink
 * and SourcesList (through SmartLink). Parse-based, not prefix-based:
 *
 *  - `#…` is allowed as is.
 *  - A path must not start with `//` (protocol-relative) or `/\` (the WHATWG
 *    relative-slash state turns a backslash after a slash into an authority
 *    delimiter for special schemes, so `/\evil.com` resolves to
 *    https://evil.com), and must resolve to OUR origin.
 *  - Anything else must parse with `new URL` to http, https, mailto, tel or
 *    sms. javascript:, data:, vbscript:, blob:, file:, ftp: and every
 *    percent- or unicode-obfuscated scheme either fail to parse or land on a
 *    scheme that is not listed.
 *  - Any C0 control character refuses outright (a `javascript:` behind a
 *    U+0001 slips past a whitespace-only strip).
 *
 * Zod-free and client-safe: SmartLink is rendered inside client trees.
 */
export const HREF_MAX = 2048;

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'sms:']);
const CONTROL_RE = /[\u0000-\u001f\u007f]/;
// Redundant second check kept on purpose (the old SmartLink rule): a
// deny-list that also refuses is cheap insurance against a parser quirk.
const DANGEROUS_SCHEME_RE = /^(?:javascript|data|vbscript):/i;

export function safeHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (raw.length === 0 || raw.length > HREF_MAX) return null;
  if (CONTROL_RE.test(raw)) return null;
  if (DANGEROUS_SCHEME_RE.test(raw.replace(/\s+/g, ''))) return null;
  if (raw.startsWith('#')) return raw;
  if (raw.startsWith('/')) {
    const second = raw.charAt(1);
    if (second === '/' || second === '\\') return null;
    try {
      const site = new URL(SITE_URL);
      if (new URL(raw, site).origin !== site.origin) return null;
    } catch {
      return null;
    }
    return raw;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  return ALLOWED_PROTOCOLS.has(url.protocol) ? raw : null;
}
