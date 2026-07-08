/**
 * Time-of-day salutation + first-name helpers, shared by the admin sidebar and
 * the dashboard overview greeting. Zero imports on purpose — keeps it out of any
 * latency-sensitive chunk and safe to import from a client leaf.
 */
export function greetingWord(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}
