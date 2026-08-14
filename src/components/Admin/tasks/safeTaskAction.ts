/**
 * The inbox safeAction, typed for the task actions' result unions: awaits a
 * server action with transport-level failures (offline, deploy mid-session,
 * unexpected 500) normalized to `{ ok: false }`, so optimistic callers have
 * exactly one failure path to roll back on. The `??` covers the
 * session-expired case: a `redirect()` inside the action resolves the client
 * promise without a value while the router navigates to login.
 */

export const TASK_TRANSPORT_ERROR = {
  ok: false,
  error: 'Something went wrong — try again.',
} as const;

export async function safeTaskAction<T extends { ok: boolean }>(
  action: Promise<T>,
): Promise<T | typeof TASK_TRANSPORT_ERROR> {
  try {
    return (await action) ?? TASK_TRANSPORT_ERROR;
  } catch {
    return TASK_TRANSPORT_ERROR;
  }
}
