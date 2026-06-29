import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The dotted survey frame around the services carousels — four hairline rules
 * with a filled dot at each corner. Shared by the paid-growth (`ServicesAds`)
 * and websites (`ServicesWebsites`) bands so both read identically.
 */
const DottedFrame = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn('relative', className)}>
    <div className="absolute top-4 -left-[12.5px] h-[1.5px] w-[110%] bg-background-contrast md:-left-20" />
    <div className="absolute bottom-4 -left-[12.5px] h-[1.5px] w-[110%] bg-background-contrast md:-left-20" />
    <div className="absolute -top-4 left-0 h-[110%] w-[1.5px] bg-background-contrast" />
    <div className="absolute -top-4 right-0 h-[110%] w-[1.5px] bg-background-contrast" />
    <div className="absolute top-[12.5px] left-[-3px] z-10 h-2 w-2 rounded-full bg-foreground" />
    <div className="absolute top-[12.5px] right-[-3px] z-10 h-2 w-2 rounded-full bg-foreground" />
    <div className="absolute bottom-[12.5px] left-[-3px] z-10 h-2 w-2 rounded-full bg-foreground" />
    <div className="absolute right-[-3px] bottom-[12.5px] z-10 h-2 w-2 rounded-full bg-foreground" />
    {children}
  </div>
);

export default DottedFrame;
