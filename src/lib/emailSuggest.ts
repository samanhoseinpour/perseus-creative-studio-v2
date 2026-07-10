/**
 * "Did you mean name@gmail.com?" — a non-blocking suggestion for probably-
 * mistyped email domains, computed on blur in the contact form. Suggestion
 * only: z.email() stays the validator and structurally accepts 'gmail.con',
 * so this hint is often the only signal — a wrong guess costs one ignorable
 * tap, while a mistyped domain costs the lead (every reply bounces).
 *
 * Zero-import leaf; imported only by ContactHub (contact async chunk).
 */

// Popularity-ordered: edit-distance ties resolve to the earlier entry.
// hotmail.ca / live.ca are real legacy MSN-Canada domains — listing them
// keeps their users from being "corrected" to the .com sibling.
const COMMON_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.ca',
  'outlook.com',
  'yahoo.com',
  'yahoo.ca',
  'icloud.com',
  'live.com',
  'live.ca',
  'me.com',
  'aol.com',
  'msn.com',
  'proton.me',
  'protonmail.com',
  'shaw.ca',
  'telus.net',
];
const COMMON_SET = new Set(COMMON_DOMAINS);

// Legit providers within edit distance 2 of a list entry — never "correct"
// them toward the big providers (mail.com is one edit from gmail.com).
const NEVER_CORRECT = new Set([
  'mail.com',
  'ymail.com',
  'mac.com',
  'aim.com',
  'gmx.com',
  'web.de',
]);

// None of these are real TLDs, so rewriting them is always an improvement.
const TLD_SLIPS = /\.(con|cmo|vom)$/;

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3; // early-out past threshold
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/** Suggested full address for a probably-mistyped email, or null. */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  if (/\s/.test(local)) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || domain.length > 30 || /\s/.test(domain)) return null;
  if (COMMON_SET.has(domain) || NEVER_CORRECT.has(domain)) return null;

  // TLD slip first — and keep going afterwards, so 'hotmial.con' still lands
  // on hotmail.com via the distance pass below.
  const tldFixed = domain.replace(TLD_SLIPS, '.com');
  if (COMMON_SET.has(tldFixed)) return `${local}@${tldFixed}`;
  if (NEVER_CORRECT.has(tldFixed)) {
    // 'mail.con' means mail.com — fix the TLD, don't hijack to gmail.
    return tldFixed !== domain ? `${local}@${tldFixed}` : null;
  }

  // Distance 1 is near-certain; distance 2 only for longer domains, so short
  // custom domains ('sam.ca') can't match a list entry two edits away — and
  // only between similar lengths (substitution/transposition-class typos),
  // so 'acme.com' can't be truncation-hijacked to 'me.com'.
  const maxDist = tldFixed.length >= 8 ? 2 : 1;
  let best: string | null = null;
  let bestDist = maxDist + 1;
  for (const candidate of COMMON_DOMAINS) {
    // Edit distance is bounded below by the length difference, so a >1 gap
    // means distance ≥ 2 of exactly the truncation class we don't trust.
    if (Math.abs(tldFixed.length - candidate.length) > 1) continue;
    const dist = editDistance(tldFixed, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  if (best && bestDist <= maxDist) return `${local}@${best}`;

  // Unknown base with a fake TLD ('acme.con' → 'acme.com') — still worth
  // offering, .con is never right.
  if (tldFixed !== domain) return `${local}@${tldFixed}`;
  return null;
}
