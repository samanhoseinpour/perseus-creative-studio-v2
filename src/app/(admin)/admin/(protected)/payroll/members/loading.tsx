/**
 * Nothing, on purpose. This segment only redirects, but a `loading.tsx`
 * boundary covers NESTED segments too, so without this file
 * `payroll/loading.tsx` painted the whole payroll month skeleton before the
 * navigation to /admin/spend/commitments.
 */
export default function Loading() {
  return null;
}
