import { SITE_URL } from '@/constants';
import {
  LuLinkedin as Linkedin,
  LuTwitter as Twitter,
  LuFacebook as Facebook,
  LuMail as Mail,
  LuSend as Send,
  LuMessageCircle as MessageCircle,
} from 'react-icons/lu';
import type { ComponentType } from 'react';
import ShareIntentButton from './ShareIntentButton';
import CopyLinkButton from './CopyLinkButton';
import NativeShareButton from './NativeShareButton';

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
    'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-black/20 bg-black/90 hover:bg-black';

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
    <section className="mt-3 flex flex-wrap items-center gap-3 text-black">
      {/* Not a document heading — an <h3> here landed between the post H1 and
          its first H2, breaking heading order on every post. */}
      <span className="text-sm leading-sm text-black">Share:</span>

      {/* Web intents open via ShareIntentButton (click-time window.open) so
          audit crawlers never see the URLs — t.me/sharer endpoints fail for
          bots and get reported as broken external links. mailto:/sms: stay
          real anchors: protocol handlers, never audited. */}
      {items.map(({ key, href, label, Icon, newTab }) =>
        newTab ? (
          <ShareIntentButton
            key={key}
            href={href}
            label={label}
            className={buttonClass}
          >
            <Icon className="h-3 w-3 text-white" />
          </ShareIntentButton>
        ) : (
          <a key={key} href={href} aria-label={label} className={buttonClass}>
            <Icon className="h-3 w-3 text-white" />
          </a>
        ),
      )}

      {/* Copy-link always renders; the native share-sheet button mount-gates
          on navigator.share support, so it only appears where it works. */}
      <CopyLinkButton url={canonicalUrl} className={buttonClass} />
      <NativeShareButton
        title={title}
        url={canonicalUrl}
        className={buttonClass}
      />
    </section>
  );
};

export default ShareBlogs;
