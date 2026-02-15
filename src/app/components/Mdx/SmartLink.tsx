import Link from 'next/link';
import type { ComponentProps } from 'react';
import { SITE_URL } from '@/app/constants';

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

export default function SmartLink({ href = '', ...props }: AnchorProps) {
  // Schemes that must stay <a>
  if (
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('sms:') ||
    href.startsWith('javascript:')
  ) {
    return <a href={href} {...props} />;
  }

  if (isInternalHref(href)) {
    // Next.js <Link> forwards anchor attributes to the underlying <a>
    return <Link href={href} {...(props as any)} />;
  }

  // External
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props} />;
}
