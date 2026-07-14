'use client';

import { useEffect, useState } from 'react';

/**
 * Object URL for a File, with the one StrictMode-correct lifecycle: create and
 * revoke are paired inside a single effect keyed on the file, so the simulated
 * mount→cleanup→mount cycle just creates/revokes/creates — never a dead or
 * leaked URL. Returns null until the effect has run (and whenever `file` is
 * null); callers render their non-preview fallback for that first frame.
 *
 * Note: revoking only blocks NEW fetches — an <img> that already decoded the
 * URL keeps displaying it, so the swap-on-replace never flashes broken.
 */
export function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    // set-state-in-effect is a deliberate `warn` in this repo — the URL must
    // live in state (not a memo) so cleanup can revoke exactly what it made.
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}
