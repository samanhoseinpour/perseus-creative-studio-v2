import { cn } from '@/lib/utils';

/**
 * The tiny client identity chip beside client names — resolved logo when the
 * client has one (seeded wall clients / admin uploads), a two-letter initials
 * coin otherwise (quick-created clients are name-only). Native <img>, never
 * <Img>: logos can be public Blob CDN URLs, which the custom /images loader
 * can't serve (ClientsGrid / ReportClientPicker rule). Always a light face —
 * most marks are drawn for light backgrounds (the marquee's logoDisc concern,
 * solved the same way).
 */
export default function ClientMark({
  name,
  logo,
  size = 20,
  className,
}: {
  name: string;
  logo: string | null;
  size?: number;
  className?: string;
}) {
  if (logo) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white/85 dark:border-white/20 dark:bg-white/90',
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" className="h-full w-full object-contain p-0.5" />
      </span>
    );
  }
  const initials = name
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full border border-black/10 bg-white/50 font-medium text-muted-foreground dark:border-white/15 dark:bg-white/10',
        className,
      )}
    >
      {initials}
    </span>
  );
}
