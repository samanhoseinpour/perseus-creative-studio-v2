'use client';

import type { IconType } from 'react-icons';
import { FaApple, FaWindows, FaAndroid, FaLinux, FaUbuntu } from 'react-icons/fa6';
import { LuMonitor, LuSmartphone, LuTabletSmartphone } from 'react-icons/lu';

import type { IconKey } from '@/lib/deviceLabel';

/**
 * The glyph for a "Chrome · macOS" device row, shared by the two client lists
 * that render one (sessions and push devices).
 *
 * The MAP lives in a client module rather than in the deviceLabel leaf because
 * it holds React components, which a server component cannot hand across the
 * boundary — that is exactly why deviceLabel returns a serialisable `iconKey`
 * string instead of a component.
 */
const DEVICE_ICONS: Record<IconKey, IconType> = {
  apple: FaApple,
  windows: FaWindows,
  android: FaAndroid,
  linux: FaLinux,
  ubuntu: FaUbuntu,
  mobile: LuSmartphone,
  tablet: LuTabletSmartphone,
  desktop: LuMonitor,
};

export default function DeviceIcon({
  iconKey,
  className,
}: {
  iconKey: string;
  className?: string;
}) {
  // An unknown key degrades to a generic monitor rather than rendering
  // nothing — the resolveTagTone reflex.
  const Icon = DEVICE_ICONS[iconKey as IconKey] ?? LuMonitor;
  return <Icon className={className} aria-hidden="true" />;
}
