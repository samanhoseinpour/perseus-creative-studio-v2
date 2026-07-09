/**
 * Time-of-day salutation + first-name helpers, shared by the dashboard overview
 * greeting. Zero imports on purpose — keeps it out of any latency-sensitive
 * chunk and safe to import from a client leaf.
 *
 * Callers pass `new Date().getHours()`, which resolves in the *viewer's* local
 * timezone. An admin in Tehran (UTC+3:30) and one in Vancouver (UTC−8) each get
 * their own band with no server-side timezone plumbing.
 */

/** The hours at which the salutation changes. Must stay sorted ascending. */
const BOUNDARIES = [5, 12, 17, 22] as const;

export function greetingWord(hour: number): string {
  if (hour < 5) return 'Good night'; // 00:00–04:59
  if (hour < 12) return 'Good morning'; // 05:00–11:59
  if (hour < 17) return 'Good afternoon'; // 12:00–16:59
  if (hour < 22) return 'Good evening'; // 17:00–21:59
  return 'Good night'; // 22:00–23:59
}

/**
 * Milliseconds until the next boundary that actually changes the word, so a
 * long-open tab can re-render exactly once per band instead of polling. Past the
 * last boundary the next change is 05:00 tomorrow. Includes a second of slack so
 * the timer never fires a hair early and re-reads the same hour.
 */
export function msUntilNextGreetingChange(now: Date): number {
  const hour = now.getHours();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);

  const upcoming = BOUNDARIES.find((b) => b > hour);
  if (upcoming === undefined) {
    next.setDate(next.getDate() + 1);
    next.setHours(BOUNDARIES[0]);
  } else {
    next.setHours(upcoming);
  }

  return next.getTime() - now.getTime() + 1000;
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}
