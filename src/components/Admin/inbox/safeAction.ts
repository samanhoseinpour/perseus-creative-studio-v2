import type { InboxActionResult } from '@/app/(admin)/admin/(protected)/_actions/inbox';

const TRANSPORT_ERROR: InboxActionResult = {
  ok: false,
  error: 'Something went wrong — try again.',
};

/**
 * Await a triage server action with transport-level failures (offline, deploy
 * mid-session, unexpected 500) normalized to `{ ok: false }`, so the
 * optimistic callers have exactly one failure path to roll back on instead of
 * an unhandled rejection that strands the UI. The `??` covers the
 * session-expired case: a `redirect()` inside the action resolves the client
 * promise without a value while the router navigates to the login page.
 */
export async function safeAction(
  action: Promise<InboxActionResult>,
): Promise<InboxActionResult> {
  try {
    return (await action) ?? TRANSPORT_ERROR;
  } catch {
    return TRANSPORT_ERROR;
  }
}
