'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { BlogSaveState } from '@/lib/blogEditorFields';

/**
 * The editor's save loop: one writer at a time, a debounce, a backoff, and one
 * rule about what a version conflict means.
 *
 * WHAT THIS OWNS. The timing, the in-flight mutex, the version, the dirty
 * baseline, the `beforeunload` guard and Cmd+S. What it deliberately does NOT
 * own is which door is called or what a refusal says: the caller hands it a
 * function of the current version and reads the outcome back, so publishing,
 * scheduling and trashing all ride the same mutex without this hook knowing
 * any of them exists.
 *
 * ONE WRITER AT A TIME, AND IT AWAITS RATHER THAN ABORTS. Every explicit
 * action goes through `run`, which waits for whatever is already in flight
 * before it sends. Aborting instead would leave the abandoned request racing
 * the new one on the server, and whichever lost would come back as a conflict
 * caused by nobody but us. Waiting costs the round trip an autosave was
 * already going to take.
 *
 * THE CONFLICT RULE, which is the reason this file is not four lines of
 * `setTimeout`. `updateWorkingCopy` guards on the version the editor last saw,
 * so a `conflict` means the row moved underneath us. There are two ways that
 * happens and they need opposite responses:
 *
 *  - WE moved it. A save that left before an earlier one landed carries the
 *    older version. Retrying with the fresh version is right, and saying
 *    anything to the writer would be a false alarm about their own typing.
 *    Detected by the EPOCH: every applied result bumps it, so a reply whose
 *    epoch no longer matches the one its request left with was overtaken by
 *    one of our own saves.
 *  - SOMEBODY ELSE moved it: a second tab, or the publish cron promoting a
 *    scheduled revision. Retrying here would overwrite their work with a
 *    document that never saw it. So autosave STOPS and the screen says to
 *    reload. That is the one state this hook refuses to leave on its own.
 *
 * With the mutex in place the first case should be unreachable, and that is
 * exactly why the discriminator is kept: if the mutex ever leaks, the failure
 * mode without it is a false "somebody else changed this" that stops autosave
 * and loses work. A guard whose whole job is to be redundant is cheap.
 */

/** What a save door did, in the only four shapes this hook reacts to. The
 *  caller maps its own result type onto this and handles the wording. */
export type SaveOutcome =
  | { kind: 'ok'; version: number }
  /** `own` says which of the two conflicts this was: true when one of our own
   *  saves overtook this one, false when somebody else wrote the row. Only the
   *  second is worth telling anybody about. */
  | { kind: 'conflict'; own: boolean }
  /** Refused for a reason the caller has already shown: a validation issue, a
   *  transition the door would not take, a server error. Not retried, because
   *  a deterministic refusal retried on a timer is an infinite loop. */
  | { kind: 'refused' }
  /** The request never completed: offline, a deploy mid-session, a promise
   *  that resolved with nothing. The one retryable outcome. */
  | { kind: 'transport' };

/** A save, as a function of the version the row is believed to be at. */
export type SaveCall = (version: number) => Promise<SaveOutcome>;

/** Roughly a pause in typing, coalesced: every keystroke restarts it, so a
 *  burst is one request rather than one per character. */
const DEBOUNCE_MS = 1500;

/** Backoff for a dropped request, in order. The last entry repeats. A dropped
 *  autosave is almost always a tab that went offline, so the ceiling is short
 *  enough to catch the reconnection without hammering. */
const BACKOFF_MS = [2_000, 5_000, 15_000, 30_000];

export type Autosave = {
  /** What the top bar shows. */
  state: BlogSaveState;
  /** Whether anything is unsaved, for the leave guard and the Save button. */
  dirty: boolean;
  /** A foreign write landed. Autosave has stopped and will not restart. */
  blocked: boolean;
  /** Run an explicit action behind the mutex. Resolves with its outcome, so
   *  the caller can navigate or toast only once it really landed. */
  run: (call: SaveCall) => Promise<SaveOutcome>;
  /** Save now, through the same door autosave uses. Bound to Cmd+S. */
  saveNow: () => Promise<SaveOutcome | null>;
};

export function useAutosave({
  snapshot,
  initialVersion,
  save,
  enabled = true,
}: {
  /** A stable serialization of exactly what would be sent. Anything that
   *  differs from the last SAVED one is unsaved work, so this must be built
   *  from the same function that builds the payload, and the body inside it
   *  must already be canonical: see BodyEditor's `onChange`, which strips the
   *  trailing paragraph its own extension appends, so opening a post and
   *  clicking into it does not read as an edit. */
  snapshot: string;
  initialVersion: number;
  /** The autosave door. Called with the current version. */
  save: SaveCall;
  /** False on a post nothing may write to (the bin), which stops the loop
   *  without pretending the screen is saved. */
  enabled?: boolean;
}): Autosave {
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const [inFlight, setInFlight] = useState(false);
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // Refs mirror the same values for the async paths, which run outside any
  // render and must read what is true NOW rather than what was true when the
  // closure was made.
  const savedRef = useRef(snapshot);
  const snapshotRef = useRef(snapshot);
  const versionRef = useRef(initialVersion);
  const blockedRef = useRef(false);
  const enabledRef = useRef(enabled);
  const saveRef = useRef(save);
  /** Bumped by every applied result. A reply whose epoch is stale was
   *  overtaken by one of our own saves. */
  const epochRef = useRef(0);
  /** The promise the mutex is waiting on. */
  const busyRef = useRef<Promise<SaveOutcome> | null>(null);
  const attemptRef = useRef(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The backoff re-enters the same function that scheduled it. Held in a ref
   *  rather than referenced directly, because a `useCallback` that names
   *  itself is a use-before-declare that the compiler lint reads as a value
   *  the closure can never see updated. Assigned in the effect below, long
   *  before any request could have failed. */
  const retryRunRef = useRef<(() => void) | null>(null);

  const dirty = snapshot !== savedSnapshot;

  const runCall = useCallback(
    async (call: SaveCall, retryable: boolean): Promise<SaveOutcome> => {
      // Queue behind anything already writing. A `while` rather than a single
      // await so two callers arriving together still serialize.
      while (busyRef.current) {
        await busyRef.current.catch(() => undefined);
      }
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }

      const sentSnapshot = snapshotRef.current;
      const sentEpoch = epochRef.current;
      setFailed(false);
      setInFlight(true);

      const pending = (async (): Promise<SaveOutcome> => {
        try {
          return await call(versionRef.current);
        } catch {
          return { kind: 'transport' };
        }
      })();
      busyRef.current = pending;

      let outcome: SaveOutcome;
      try {
        outcome = await pending;
      } finally {
        busyRef.current = null;
        setInFlight(false);
      }

      if (outcome.kind === 'ok') {
        versionRef.current = outcome.version;
        epochRef.current += 1;
        savedRef.current = sentSnapshot;
        setSavedSnapshot(sentSnapshot);
        attemptRef.current = 0;
        return outcome;
      }

      if (outcome.kind === 'conflict') {
        if (sentEpoch !== epochRef.current) {
          // Our own echo: one of our saves landed while this one was out, so
          // the version it carried was already spent. The current version is
          // right, the work is still unsaved, and the debounce below will send
          // it again. Nothing is said, because nothing went wrong.
          return { kind: 'conflict', own: true };
        }
        blockedRef.current = true;
        setBlocked(true);
        return { kind: 'conflict', own: false };
      }

      setFailed(true);
      if (outcome.kind === 'transport' && retryable) {
        const wait = BACKOFF_MS[Math.min(attemptRef.current, BACKOFF_MS.length - 1)];
        attemptRef.current += 1;
        retryRef.current = setTimeout(() => {
          retryRef.current = null;
          if (blockedRef.current || !enabledRef.current) return;
          if (snapshotRef.current === savedRef.current) return;
          retryRunRef.current?.();
        }, wait);
      }
      return outcome;
    },
    [],
  );

  const run = useCallback((call: SaveCall) => runCall(call, false), [runCall]);

  const saveNow = useCallback(async (): Promise<SaveOutcome | null> => {
    if (blockedRef.current || !enabledRef.current) return null;
    if (snapshotRef.current === savedRef.current) return null;
    return runCall(saveRef.current, false);
  }, [runCall]);

  // One effect owns both the mirrors and the debounce, so the timer can never
  // be scheduled against a snapshot the refs have not caught up with.
  useEffect(() => {
    snapshotRef.current = snapshot;
    saveRef.current = save;
    enabledRef.current = enabled;
    retryRunRef.current = () => {
      void runCall(saveRef.current, true);
    };
    if (!enabled || blocked) return;
    if (snapshot === savedSnapshot) return;
    const timer = setTimeout(() => {
      void runCall(saveRef.current, true);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [snapshot, save, enabled, blocked, savedSnapshot, runCall]);

  // Nothing in flight and nothing scheduled once the component goes away.
  useEffect(
    () => () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    },
    [],
  );

  /**
   * The leave guard. Modern browsers ignore any wording, so this only calls
   * `preventDefault`; the sentence is the browser's own. It covers an
   * IN-FLIGHT save as well as an unsaved one, because a request that has left
   * but not landed is work the writer would also lose.
   */
  useEffect(() => {
    if (!dirty && !inFlight) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, inFlight]);

  /** Cmd+S / Ctrl+S. Bound on the window rather than the form, because the
   *  caret is usually inside the body editor, which is a separate tree. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key !== 's' && event.key !== 'S') return;
      event.preventDefault();
      void saveNow();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saveNow]);

  const state: BlogSaveState = inFlight
    ? 'saving'
    : failed
      ? 'failed'
      : dirty
        ? 'unsaved'
        : 'saved';

  return { state, dirty, blocked, run, saveNow };
}
