import { redirect } from 'next/navigation';

/**
 * The recurring-cost roster moved into the merged commitments roster, where
 * every plan sits beside every salary in one list sorted by monthly cost.
 *
 * Kept as a redirect rather than deleted: this path is in the team's history
 * and their bookmarks, and `?plan=` deep links are handed around. Both params
 * are carried across — the destination validates the id against its own gated
 * roster, so an unknown or foreign one is a silent no-op there.
 *
 * No loading.tsx beside this file on purpose: a redirect renders nothing, so a
 * skeleton would only flash before the navigation.
 */
export default async function CostPlansRedirect({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; q?: string }>;
}) {
  const { plan, q } = await searchParams;
  const params = new URLSearchParams();
  if (typeof plan === 'string' && plan) params.set('plan', plan);
  if (typeof q === 'string' && q) params.set('q', q);
  const query = params.toString();
  redirect(`/admin/spend/commitments${query ? `?${query}` : ''}`);
}
