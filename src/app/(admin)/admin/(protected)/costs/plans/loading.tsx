/**
 * Nothing, on purpose. This segment only redirects, but a `loading.tsx`
 * boundary covers NESTED segments too, so without this file `costs/loading.tsx`
 * painted the whole Bills month skeleton — header, tiles, the charges table —
 * before the navigation to /admin/spend/commitments.
 */
export default function Loading() {
  return null;
}
