import { redirect } from 'next/navigation';

/**
 * The payroll roster moved into the merged commitments roster, where every
 * member sits beside every recurring cost in one list sorted by monthly cost.
 * Every member field still lives in MemberDialog and TermDialog, unchanged.
 *
 * Kept as a redirect rather than deleted: this path is in the team's history
 * and their bookmarks. `?member=` is carried across so a link into one person's
 * editor keeps working; the destination validates the id against its own gated
 * roster, so a foreign one is a silent no-op there.
 *
 * There IS a loading.tsx beside this file, returning null: a `loading.tsx`
 * boundary covers nested segments, so `payroll/loading.tsx` was painting the
 * whole payroll month skeleton before this redirect ran.
 */
export default async function PayrollMembersRedirect({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; q?: string }>;
}) {
  const { member, q } = await searchParams;
  const params = new URLSearchParams();
  if (typeof member === 'string' && member) params.set('member', member);
  if (typeof q === 'string' && q) params.set('q', q);
  const query = params.toString();
  redirect(`/admin/spend/commitments${query ? `?${query}` : ''}`);
}
