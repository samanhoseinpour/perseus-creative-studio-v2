// The studio's direct-contact channels — the single source of truth shared by
// the navbar (and available to the footer/contact page), mirroring the
// SocialLinks pattern so the numbers can't drift out of sync. The phone matches
// the footer's canonical line (+1 778 887 8363).
export const CONTACT = {
  phone: { label: '+1 (778) 887-8363', href: 'tel:+17788878363' },
  email: { label: 'info@perseustudio.com', href: 'mailto:info@perseustudio.com' },
  hours: {
    label: 'Open daily · 8 AM – 8 PM',
    // Live "Open now" thresholds, 24h, in the studio's local time.
    opensHour: 8,
    closesHour: 20,
    tz: 'America/Vancouver',
  },
} as const;
