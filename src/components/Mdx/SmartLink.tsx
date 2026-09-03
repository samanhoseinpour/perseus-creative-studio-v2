import Link from 'next/link';
import type { ComponentProps } from 'react';
import { SITE_URL } from '@/constants';
import { safeHref } from '@/lib/safeHref';

type AnchorProps = ComponentProps<'a'>;

const isInternalHref = (href: string) => {
  if (href.startsWith('/') || href.startsWith('#')) return true;
  try {
    return new URL(href).origin === new URL(SITE_URL).origin;
  } catch {
    return false;
  }
};

export default function SmartLink({ href: rawHref = '', ...props }: AnchorProps) {
  // safeHref is the one guard (validator, importer and render share it). A
  // refused href renders the link text with NO href rather than the raw URL:
  // `//evil.com` used to classify as internal and reach next/link.
  const href = safeHref(rawHref);
  if (href === null) {
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
