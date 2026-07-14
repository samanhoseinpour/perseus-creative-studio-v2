'use client';

import { useEffect, useRef, useState } from 'react';
import { LuLink as LinkIcon, LuCheck as Check } from 'react-icons/lu';

// Copy-the-canonical-URL button for the share row. Sits alongside the network
// intents styled by the same circular buttonClass (the shared Button.tsx is
// the text-CTA pill primitive — no icon-only variant — so the row's own
// primitive is the right precedent here, same as ShareIntentButton).
const CopyLinkButton = ({
  url,
  className,
}: {
  url: string;
  className?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // Clipboard API needs a secure context + permission — fall back to the
      // classic off-screen-textarea trick (older Safari, http previews).
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        ok = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        ok = false;
      }
    }
    if (!ok) return;
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      aria-label={copied ? 'Link copied' : 'Copy link'}
      className={className}
      onClick={copy}
    >
      {copied ? (
        <Check className="h-3 w-3 text-white" />
      ) : (
        <LinkIcon className="h-3 w-3 text-white" />
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Link copied' : ''}
      </span>
    </button>
  );
};

export default CopyLinkButton;
