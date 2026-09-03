'use client';

import { LuPrinter } from 'react-icons/lu';

import Button from '@/components/Button';

/**
 * The print pages' only interactive element — hidden in the output itself.
 *
 * A plain inline button: WHERE it sits is the caller's business, and it used to
 * carry its own `fixed top-4 right-4 z-10` wrapper, which was wrong in two
 * different ways at once. On the two standalone print sheets it parked the
 * button under the admin mobile top bar (`fixed inset-x-0 top-0 z-30`), so
 * below `lg` the only way to print was invisible and unclickable. And on the
 * payslip, which places it in a `justify-between` header row, `fixed` took it
 * out of flow entirely: it floated over the corner of the viewport instead of
 * sitting beside the back link, while the skeleton reserved the row slot it
 * never filled. Callers that DO want it floating now say so themselves.
 */
export default function PrintButton() {
  return (
    <Button
      type="button"
      size="small"
      icon={LuPrinter}
      iconPosition="left"
      shimmer={false}
      onClick={() => window.print()}
    >
      Print / Save PDF
    </Button>
  );
}
