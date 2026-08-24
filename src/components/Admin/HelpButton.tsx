'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { LuInfo, LuX } from 'react-icons/lu';

import { glassChip } from '@/components/Admin/Glass';
import GlassDialog from '@/components/Admin/GlassDialog';
import type { AdminHelpTopic } from '@/lib/adminHelp';
import { cn } from '@/lib/utils';

/**
 * The ⓘ beside a section's page title — opens that section's plain-language
 * guide in a glass dialog.
 *
 * The topic arrives as a serializable prop from the server-rendered header:
 * this file must never import the ADMIN_HELP registry itself, or every admin
 * route's client chunk would carry every guide (the slim-props rule). The
 * `import type` above is erased at build and is the one allowed reference.
 */

/** The round chip recipe the ⓘ trigger and the dialog's ✕ share.
 *  `cursor-pointer` is spelled out even though globals.css restores it for
 *  every <button>: these two are the most-clicked controls in the dashboard,
 *  and a utility can't be lost to layer ordering or a stale base stylesheet. */
const chipButton =
  'inline-flex cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30';

function GuideGroup({ heading, bullets }: { heading: string; bullets: string[] }) {
  return (
    // break-inside-avoid-column: the body below is a two-column FLOW, and a
    // group split across the fold reads as two half-groups.
    <section className="mb-6 break-inside-avoid-column">
      <h3 className="text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {heading}
      </h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2.5 text-sm text-foreground">
            <span
              aria-hidden="true"
              className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-foreground/35"
            />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HelpButton({ topic }: { topic: AdminHelpTopic }) {
  const [open, setOpen] = useState(false);
  // `tips` is a section like any other once it has a heading, and the body
  // below only has to know how many groups there are — 11 of the 17 guides
  // are one section plus this, which is exactly the two-column case.
  const groups = topic.tips?.length
    ? [...topic.sections, { heading: 'Good to know', bullets: topic.tips }]
    : topic.sections;
  return (
    <>
      <button
        type="button"
        aria-label={topic.title}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(glassChip, chipButton, 'h-6 w-6 shrink-0')}
      >
        <LuInfo aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <GlassDialog
        open={open}
        onOpenChange={setOpen}
        maxWidth="48rem"
        header={
          <>
            <Dialog.Title className="pr-10 text-base font-semibold tracking-tight text-foreground">
              {topic.title}
            </Dialog.Title>
            <Dialog.Description className="mt-1 pr-10 text-sm text-muted-foreground">
              {topic.intro}
            </Dialog.Description>
          </>
        }
      >
        {/* Positioned against Dialog.Content (the panel), not the scroller or
            the header, so it stays put — and reachable — however far a long
            guide scrolls. */}
        <Dialog.Close asChild>
          <button
            type="button"
            aria-label="Close"
            className={cn(glassChip, chipButton, 'absolute right-4 top-4 z-20 h-7 w-7')}
          >
            <LuX aria-hidden="true" className="h-4 w-4" />
          </button>
        </Dialog.Close>
        {/* CSS columns rather than md:grid-cols-2. Grid is row-major, so the
            Tasks guide's 12-bullet "Good to know" would sit beside its
            4-bullet "Statuses" and leave a hole under the short one; columns
            balance by height and close it. The reading order (down the left,
            then the right) is the newspaper one, which is what a guide read
            top-to-bottom wants. Single column below md — phones unchanged.
            -mb-6 absorbs the last group's own margin. */}
        <div className={cn('-mb-6', groups.length > 1 && 'md:columns-2 md:gap-x-8')}>
          {groups.map((group) => (
            <GuideGroup
              key={group.heading}
              heading={group.heading}
              bullets={group.bullets}
            />
          ))}
        </div>
      </GlassDialog>
    </>
  );
}
