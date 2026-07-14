/**
 * A ~24-char URL-safe random temp password (the browser twin of the seed
 * script's `randomBytes(18).toString('base64url')`). Comfortably clears the
 * 12-char policy and the common-password blocklist.
 */
export function generateTempPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
