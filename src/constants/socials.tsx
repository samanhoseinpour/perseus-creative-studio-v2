import type { ReactNode } from 'react';
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaMediumM,
  FaGoogle,
  FaWhatsapp,
} from 'react-icons/fa';
import { FaTiktok, FaXTwitter } from 'react-icons/fa6';

export interface SocialLink {
  icon: ReactNode;
  /** Empty for WhatsApp — rendered via <WhatsAppChatButton> (no crawlable
   *  href), since wa.me 302s to a bot-blocking host and audits flag it. */
  href: string;
  label: string;
}

// The brand's social presence — the single source of truth shared by the
// footer and the mobile menu, so the two lists never drift out of sync. Order
// is the display order in both.
export const SocialLinks: SocialLink[] = [
  {
    icon: <FaInstagram className="size-4" />,
    href: 'https://www.instagram.com/perseustudio/',
    label: 'Instagram',
  },
  {
    icon: <FaFacebook className="size-4" />,
    href: 'https://www.facebook.com/p/Perseus-Creative-Studio-61559184362913/',
    label: 'Facebook',
  },
  {
    icon: <FaXTwitter className="size-4" />,
    href: 'https://x.com/Perseustudio1',
    label: 'Twitter',
  },
  {
    icon: <FaLinkedin className="size-4" />,
    href: 'https://linkedin.com/company/perseus-creative-studio',
    label: 'LinkedIn',
  },
  {
    icon: <FaYoutube className="size-4" />,
    href: 'https://www.youtube.com/@PerseusCreativeStudio',
    label: 'YouTube',
  },
  {
    icon: <FaTiktok className="size-4" />,
    href: 'https://www.tiktok.com/@perseustudio',
    label: 'TikTok',
  },
  {
    icon: <FaGoogle className="size-4" />,
    href: 'https://www.google.com/maps/search/?api=1&query=Perseus%20Creative%20Studio',
    label: 'Google Business Profile',
  },
  {
    icon: <FaWhatsapp className="size-4" />,
    href: '',
    label: 'WhatsApp',
  },
  {
    icon: <FaMediumM className="size-4" />,
    href: 'https://medium.com/@teamperseustudio',
    label: 'Medium',
  },
];
