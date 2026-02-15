import { SITE_URL } from '@/app/constants';
import {
  Linkedin,
  Twitter,
  Facebook,
  Mail,
  Send,
  MessageCircle,
} from 'lucide-react';
import type { ComponentType } from 'react';

const toAbsoluteUrl = (urlOrPath: string): string => {
  try {
    return new URL(urlOrPath).toString();
  } catch {
    return new URL(
      urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`,
      SITE_URL,
    ).toString();
  }
};

type ShareBlogsProps = {
  title: string;
  slug: string;
  canonicalPath?: string;
};

const ShareBlogs = ({ title, slug, canonicalPath }: ShareBlogsProps) => {
  const canonicalUrl = toAbsoluteUrl(canonicalPath ?? `/blogs/${slug}`);
  const shareUrl = encodeURIComponent(canonicalUrl);
  const shareTitle = encodeURIComponent(title);

  const shareLinks = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
    x: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    telegram: `https://t.me/share/url?url=${shareUrl}&text=${shareTitle}`,
    imessage: `sms://;?&body=${encodeURIComponent(`${title}\n\n${canonicalUrl}`)}`,
    email: `mailto:?subject=${shareTitle}&body=${encodeURIComponent(
      `I thought you might like this:\n\n${canonicalUrl}`,
    )}`,
  };

  const buttonClass =
    'inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10';

  const items: Array<{
    key: 'linkedin' | 'x' | 'facebook' | 'telegram' | 'email' | 'imessage';
    href: string;
    label: string;
    Icon: ComponentType<{ className?: string }>;
    newTab: boolean;
  }> = [
    {
      key: 'linkedin',
      href: shareLinks.linkedin,
      label: 'Share on LinkedIn',
      Icon: Linkedin,
      newTab: true,
    },
    {
      key: 'x',
      href: shareLinks.x,
      label: 'Share on X',
      Icon: Twitter,
      newTab: true,
    },
    {
      key: 'facebook',
      href: shareLinks.facebook,
      label: 'Share on Facebook',
      Icon: Facebook,
      newTab: true,
    },
    {
      key: 'telegram',
      href: shareLinks.telegram,
      label: 'Share on Telegram',
      Icon: Send,
      newTab: true,
    },
    {
      key: 'email',
      href: shareLinks.email,
      label: 'Share via email',
      Icon: Mail,
      newTab: false,
    },
    {
      key: 'imessage',
      href: shareLinks.imessage,
      label: 'Share via iMessage',
      Icon: MessageCircle,
      newTab: false,
    },
  ];

  return (
    <section className="mt-6 flex flex-wrap items-center gap-3 text-white">
      <h3 className="text-sm leading-sm text-white">Share:</h3>

      {items.map(({ key, href, label, Icon, newTab }) => (
        <a
          key={key}
          href={href}
          {...(newTab
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : undefined)}
          aria-label={label}
          className={buttonClass}
        >
          <Icon className="h-3 w-3" />
        </a>
      ))}
    </section>
  );
};

export default ShareBlogs;
