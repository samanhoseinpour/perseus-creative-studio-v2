'use client';

import { useEffect, useState } from 'react';
import { LuShare2 as Share2 } from 'react-icons/lu';

// Native share-sheet button (navigator.share) — the highest-conversion share
// path on mobile. Mount-gated: server HTML and the client's first render both
// emit nothing (no hydration mismatch); the button pops in post-mount only
// where the API exists (mobile browsers, desktop Safari). The setState-in-
// effect is the intentional mount-gate pattern (warn-level rule, see
// eslint.config.mjs) — don't refactor it away.
const NativeShareButton = ({
  title,
  url,
  className,
}: {
  title: string;
  url: string;
  className?: string;
}) => {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof navigator.share === 'function') setSupported(true);
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      aria-label="Share via device"
      className={className}
      // Swallow AbortError — the user closing the share sheet isn't a failure.
      onClick={() => navigator.share({ title, url }).catch(() => {})}
    >
      <Share2 className="h-3 w-3 text-white" />
    </button>
  );
};

export default NativeShareButton;
