import Link from 'next/link';
import { LuArrowRight } from 'react-icons/lu';

import HelpButton from '@/components/Admin/HelpButton';
import { adminLink } from '@/components/Admin/Glass';
import type { AdminHelpTopic } from '@/lib/adminHelp';
import { zonedFormat } from '@/lib/calendar';
import {
  RELEASE_KIND_LABELS,
  RELEASE_KIND_TONES,
  compareVersions,
  type Release,
} from '@/lib/releaseFields';
import { cn } from '@/lib/utils';

/**
 * One rendering of "what changed", shared VERBATIM by the notice dialog and the
 * profile card — so the note someone is interrupted with and the note they go
 * back to read later are the same words in the same shape.
 *
 * Deliberately NOT a client component. Rendered inside WhatsNewCard (a server
 * component) it runs on the server and costs nothing; rendered inside
 * ReleaseNotice ('use client') it is just markup in that chunk. It holds no
 * state either way.
 *
 * Entry titles are `<p>`, not headings. The dialog's own Dialog.Title and the
 * card's <h2> are the headings on their pages, and slotting an <h3> under one
 * but not the other is how a heading-order violation gets shipped to exactly
 * one of two surfaces.
 */

const DAY_OPTS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

/**
 * A release `date` is a calendar KEY — 'YYYY-MM-DD' with no instant behind it —
 * so it is pinned to UTC, never viewerZone(). Reading a bare date in a viewer's
 * own zone is the classic off-by-one: '2026-08-25' parsed as an instant and
 * rendered in Tehran is the 25th, and in Vancouver the 24th.
 */
function releaseDay(date: string): string {
  return zonedFormat('UTC', DAY_OPTS).format(new Date(`${date}T00:00:00Z`));
}

export default function ReleaseList({
  releases,
  helpTopics,
  newerThan,
  onNavigate,
  className,
}: {
  releases: Release[];
  /**
   * Called when a reader follows an entry's link. The notice dialog passes its
   * `dismiss` here — without it the modal survives the client navigation (the
   * layout that mounts it is preserved across routes), leaving the destination
   * behind a scroll-locked overlay, AND the watermark never advances so the
   * same note reopens later. The profile card passes nothing; it is not modal.
   * Optional and only ever supplied from the client path, so the server parent
   * never has to hand a function across a boundary.
   */
  onNavigate?: () => void;
  /**
   * A watermark: releases above it get an "Unread" marker, so a reader can
   * see where they left off. Deliberately NOT the word "New" — that is already
   * the `added` KIND chip 30px away, and two byte-identical pills meaning
   * different things is worse than no marker. Omitted by the dialog, where
   * everything shown is unread by definition.
   */
  newerThan?: string;
  /**
   * entry.id → the ⓘ guide that documents it. Built server-side by the profile
   * card; the dialog passes none, because serialising whole help topics into
   * the layout's RSC payload would bloat every admin render for a button that
   * belongs on the page you land on.
   */
  helpTopics?: Record<string, AdminHelpTopic>;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-7', className)}>
      {releases.map((release) => (
        <section key={release.version} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-foreground">
              {release.version}
            </p>
            <p className="text-xs text-muted-foreground">
              {releaseDay(release.date)}
            </p>
            {newerThan && compareVersions(release.version, newerThan) > 0 ? (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[0.65rem] font-medium',
                  RELEASE_KIND_TONES.added,
                )}
              >
                Unread
              </span>
            ) : null}
          </div>

          {release.headline ? (
            <p className="-mt-2 text-xs text-muted-foreground">
              {release.headline}
            </p>
          ) : null}

          <ul className="flex flex-col gap-5">
            {release.entries.map((entry) => {
              const topic = helpTopics?.[entry.id];
              return (
                <li key={entry.id} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[0.65rem] font-medium',
                        RELEASE_KIND_TONES[entry.kind],
                      )}
                    >
                      {RELEASE_KIND_LABELS[entry.kind]}
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {entry.title}
                    </p>
                    {topic ? <HelpButton topic={topic} /> : null}
                  </div>

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {entry.what}
                  </p>

                  {entry.steps?.length ? (
                    <ol className="mt-1 flex list-decimal flex-col gap-1 pl-4 text-xs leading-relaxed text-muted-foreground marker:text-foreground/40">
                      {entry.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  ) : null}

                  {entry.href ? (
                    <Link
                      href={entry.href}
                      onClick={onNavigate}
                      className={cn(
                        'mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-foreground',
                        adminLink,
                      )}
                    >
                      Take me there
                      <LuArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
