'use client';

import { LuPrinter } from 'react-icons/lu';

import Button from '@/components/Button';

/** The print page's only interactive element — hidden in the output itself. */
export default function PrintButton() {
  return (
    <div className="fixed top-4 right-4 z-10 print:hidden">
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
    </div>
  );
}
