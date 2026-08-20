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

/** The round chip recipe the ⓘ trigger and the dialog's ✕ share. */
const chipButton =
  'inline-flex items-center justify-center rounded-full transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30';

function GuideGroup({ heading, bullets }: { heading: string; bullets: string[] }) {
  return (
    <section>
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
      <GlassDialog open={open} onOpenChange={setOpen} maxWidth="30rem">
        {/* Positioned against Dialog.Content (the panel), not the scroller, so
            it stays put — and reachable — however far a long guide scrolls. */}
        <Dialog.Close asChild>
          <button
            type="button"
            aria-label="Close"
            className={cn(glassChip, chipButton, 'absolute right-4 top-4 z-20 h-7 w-7')}
          >
            <LuX aria-hidden="true" className="h-4 w-4" />
          </button>
        </Dialog.Close>
        <Dialog.Title className="pr-8 text-base font-semibold tracking-tight text-foreground">
          {topic.title}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {topic.intro}
        </Dialog.Description>
        <div className="mt-5 flex flex-col gap-5">
          {topic.sections.map((section) => (
            <GuideGroup key={section.heading} heading={section.heading} bullets={section.bullets} />
          ))}
          {topic.tips?.length ? <GuideGroup heading="Good to know" bullets={topic.tips} /> : null}
        </div>
      </GlassDialog>
    </>
  );
}
