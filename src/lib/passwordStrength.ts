/**
 * Password policy helpers for the admin auth forms — a genuine leaf (zero
 * imports) so it stays cheap wherever it lands. Two consumers with different
 * weights:
 *
 *   - `isCommonPassword` — the enforcement helper, imported by `authSchema.ts`
 *     (a zod `.refine`). Because `authSchema.ts` is also pulled into the
 *     latency-sensitive login chunk (via `signInSchema`), we keep the heavy
 *     part out of it: only this tiny function + the `COMMON_PASSWORDS` set
 *     reach that chunk. The scorer below has no side effects and is referenced
 *     only by the meter, so it tree-shakes out of the login path.
 *   - `passwordStrength` — the decorative scorer, imported only by the client
 *     `PasswordStrengthMeter`, which renders on the reset / change-password
 *     routes. It is UX, never a security control (zod + Better Auth enforce).
 *
 * Policy stance is NIST 800-63B / OWASP ASVS: length is the dominant signal,
 * character variety only nudges (no forced-composition rule), and obvious /
 * identity-derived passwords are penalised rather than a symbol quota imposed.
 */

// The most-abused passwords, lowercased. Enforcement rejects exact matches; the
// scorer also floors the score to 0 on a hit. Short on purpose — the goal is to
// catch the handful everyone reaches for, not to be a full breach corpus.
const COMMON_PASSWORDS = new Set<string>([
  'password',
  'password1',
  'password123',
  'passw0rd',
  'p@ssw0rd',
  '12345678',
  '123456789',
  '1234567890',
  '123123123',
  'qwerty',
  'qwertyui',
  'qwertyuiop',
  'qwerty123',
  'letmein',
  'welcome',
  'welcome1',
  'welcome123',
  'admin',
  'admin123',
  'administrator',
  'iloveyou',
  'monkey',
  'dragon',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'abc12345',
  'changeme',
  'trustno1',
  'starwars',
  'whatever',
  'perseus',
  'perseus1',
  'perseus123',
  'perseusstudio',
]);

/** True when `pw` is on the common-password blocklist (case/space-insensitive). */
export function isCommonPassword(pw: string): boolean {
  return COMMON_PASSWORDS.has(pw.trim().toLowerCase());
}

export type PasswordScore = {
  /** 0 (very weak) … 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Very weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  /** Human hints, strongest-actionable first. Empty when nothing to add. */
  suggestions: string[];
};

const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

/**
 * Score a candidate password for the strength meter. Length drives the base
 * score; mixing ≥3 character classes adds one (a reward, not a requirement, so
 * a long passphrase still scores well); common / identity-derived / heavily
 * repeated passwords are floored.
 */
export function passwordStrength(
  pw: string,
  ctx?: { email?: string; name?: string },
): PasswordScore {
  if (!pw) {
    return { score: 0, label: LABELS[0], suggestions: ['Use at least 12 characters.'] };
  }

  const len = pw.length;
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(pw),
  ).length;

  // Length-dominant base.
  let score = 0;
  if (len >= 8) score = 1;
  if (len >= 12) score = 2;
  if (len >= 16) score = 3;
  if (len >= 20) score = 4;
  // Reward variety without demanding it.
  if (variety >= 3 && score < 4) score += 1;

  const suggestions: string[] = [];
  const lc = pw.toLowerCase();
  const local = ctx?.email?.split('@')[0]?.toLowerCase();
  const nameParts = (ctx?.name?.toLowerCase().split(/\s+/) ?? []).filter(
    (p) => p.length >= 3,
  );
  const containsIdentity =
    (!!local && local.length >= 3 && lc.includes(local)) ||
    nameParts.some((p) => lc.includes(p));

  if (isCommonPassword(pw)) {
    score = 0;
    suggestions.push('This is a commonly used password.');
  } else if (containsIdentity) {
    score = Math.min(score, 1);
    suggestions.push('Avoid your name or email in the password.');
  }
  if (/(.)\1{2,}/.test(pw)) {
    score = Math.min(score, 2);
    suggestions.push('Avoid repeated characters.');
  }
  if (len < 12) suggestions.push('Use at least 12 characters.');
  else if (len < 16 && score < 4) suggestions.push('Longer passphrases are stronger.');
  if (variety < 3 && score < 4) suggestions.push('Mix in uppercase, numbers, or symbols.');

  const clamped = Math.max(0, Math.min(4, score)) as PasswordScore['score'];
  return { score: clamped, label: LABELS[clamped], suggestions };
}
