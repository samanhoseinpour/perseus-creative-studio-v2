import Link from 'next/link';
import type { ComponentProps } from 'react';
import { SITE_URL } from '@/constants';

type AnchorProps = ComponentProps<'a'>;

const isInternalHref = (href: string) => {
  // In-page anchors and relative/internal paths
  if (href.startsWith('/') || href.startsWith('#')) return true;

  // Treat same-origin absolute URLs as internal
  try {
    const url = new URL(href);
    const site = new URL(SITE_URL);
    return url.origin === site.origin;
  } catch {
    // Non-parseable hrefs are treated as external
    return false;
  }
};

// Script-y schemes to neutralize. MDX is author-authored (not end-user input),
// so this is defense-in-depth — but a `javascript:`/`data:`/`vbscript:` href is
// a live XSS primitive the moment authoring opens up (guest posts, a CMS), and
// there's no legitimate reason to emit one. Whitespace (incl. tabs/newlines) is
// stripped first so `java\tscript:` can't slip past the prefix check.
const DANGEROUS_SCHEME = /^(?:javascript|data|vbscript):/i;
const isDangerousHref = (href: string) =>
  DANGEROUS_SCHEME.test(href.replace(/\s+/g, ''));

export default function SmartLink({ href = '', ...props }: AnchorProps) {
  // Render the link text but drop the href entirely rather than let a script-y
  // URL into the DOM. (Just removing it from the allowlist below isn't enough —
  // it would fall through to the external branch and still emit the raw href.)
  if (isDangerousHref(href)) {
    return <a {...props} />;
  }

  // Schemes that must stay <a>
  if (
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('sms:')
  ) {
    return <a href={href} {...props} />;
  }

  if (isInternalHref(href)) {
    // Next.js <Link> forwards anchor attributes to the underlying <a>
    return (
      <Link href={href} {...(props as Omit<ComponentProps<typeof Link>, 'href'>)} />
    );
  }

  // External
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props} />;
}
