'use client';

import type { ReactNode } from 'react';

// WhatsApp blocks audit crawlers (wa.me 302s to api.whatsapp.com, which
// rejects bots), so a plain <a href="https://wa.me/..."> is reported as a
// broken external link on every page that renders the footer. Opening the
// chat at click time keeps the CTA working for users while keeping the URL
// out of the crawlable DOM — even for crawlers that execute JS.
const WHATSAPP_CHAT_URL = 'https://wa.me/17788878363';

const WhatsAppChatButton = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-label="Chat with us on WhatsApp"
    className={className}
    onClick={() => window.open(WHATSAPP_CHAT_URL, '_blank', 'noopener,noreferrer')}
  >
    {children}
  </button>
);

export default WhatsAppChatButton;
