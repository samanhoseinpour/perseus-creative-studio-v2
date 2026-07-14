'use client';

import type { ReactNode } from 'react';

// Share-intent endpoints block or fail for audit crawlers (Semrush flagged
// t.me/share as a broken external link on every post), so the web share
// targets render as buttons that open at click time — same pattern as
// WhatsAppChatButton — keeping the URLs out of the crawlable DOM.
const ShareIntentButton = ({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    className={className}
    onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
  >
    {children}
  </button>
);

export default ShareIntentButton;
