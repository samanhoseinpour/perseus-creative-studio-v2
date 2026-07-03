import Link from 'next/link';
import {
  LuArrowUpRight as ArrowUpRight,
  LuCalendarCheck as CalendarCheck,
  LuCheck as Check,
  LuPanelsTopLeft as PanelsTopLeft,
} from 'react-icons/lu';
import Button from '@/components/Button';
import Img from '@/components/Img';
import { CATEGORIES, getServiceDetail } from '@/constants/services';

interface Props {
  categorySlug: string;
  // Curated per-post service (BlogPost.serviceSlug). Falls back to the
  // category's featuredServiceSlug when absent or stale.
  serviceSlug?: string;
}

// Defensive fallback for posts whose category has no matching service
// category in the registry. All current blog categories map 1:1 to service
// categories, so this only renders if a future category ships before its
// service pages do.
const defaultCta = {
  headline: 'Ready to stand out in Vancouver?',
  highlights: [
    'Strategy, creative & production',
    'SEO-ready websites that convert',
    'Results you can actually measure',
  ],
  primaryLabel: 'Book a Free Consultation',
  primaryHref: '/contact',
  secondaryLabel: 'View Our Work',
  secondaryHref: '/projects',
};

export default function SidebarCta({ categorySlug, serviceSlug }: Props) {
  const category = CATEGORIES[categorySlug];
  // Validate the curated slug through getServiceDetail — the same guard
  // lib/navigation.ts uses — so the card can never link to a 404.
  const preferred = serviceSlug ?? category?.featuredServiceSlug;
  const resolvedSlug =
    category && preferred && getServiceDetail(category.slug, preferred)
      ? preferred
      : category?.featuredServiceSlug;
  const detail =
    category && resolvedSlug
      ? getServiceDetail(category.slug, resolvedSlug)
      : null;
  const summary = category?.services.find((s) => s.slug === resolvedSlug);

  if (!category || !detail || !summary) {
    return (
      <div className="rounded-2xl bg-black text-white p-5 flex flex-col gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
            Perseus Creative Studio
          </p>
          <h3 className="text-sm font-bold leading-snug">
            {defaultCta.headline}
          </h3>
        </div>

        <ul className="space-y-1.5">
          {defaultCta.highlights.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="w-3 h-3 mt-0.5 text-white/50 shrink-0" />
              <span className="text-xs text-white/60 leading-snug">{item}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2.5">
          <Link href={defaultCta.primaryHref} className="flex w-full">
            <Button
              variant="secondary"
              size="small"
              icon={CalendarCheck}
              className="w-full bg-white font-semibold"
            >
              {defaultCta.primaryLabel}
            </Button>
          </Link>
          <Link href={defaultCta.secondaryHref} className="flex w-full">
            <Button
              variant="secondary"
              size="small"
              icon={PanelsTopLeft}
              className="w-full bg-white font-semibold"
            >
              {defaultCta.secondaryLabel}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const serviceHref = `/services/${category.slug}/${summary.slug}`;

  return (
    <div className="overflow-hidden rounded-2xl bg-black text-white shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
      <Link href={serviceHref} className="group relative block">
        <Img
          src={summary.imageUrl}
          alt={summary.imageAlt}
          width={440}
          height={264}
          className="h-32 w-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100"
        />
        <span
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"
          aria-hidden="true"
        />
        <span className="absolute bottom-2.5 left-5 text-[10px] font-bold uppercase tracking-widest text-white/60">
          Recommended Service
        </span>
      </Link>

      <div className="flex flex-col gap-4 p-5 pt-3">
        <div>
          <h3 className="text-sm font-bold leading-snug">
            <Link
              href={serviceHref}
              className="transition-opacity hover:opacity-80"
            >
              {summary.title}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-white/60 leading-snug">
            {summary.tagline}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Fixed label — long service titles (e.g. "Social Media
              Management") overflow the narrow sidebar button; the service
              name already heads the card. */}
          <Link href={serviceHref} className="flex w-full">
            <Button
              variant="secondary"
              size="small"
              icon={ArrowUpRight}
              className="w-full bg-white font-semibold"
            >
              Explore the Service
            </Button>
          </Link>

          {/* whitespace-normal: this label comes from the registry and varies
              in length — Button's base nowrap would clip the longer ones. */}
          <Link href={detail.cta.primaryHref} className="flex w-full">
            <Button
              variant="secondary"
              size="small"
              icon={CalendarCheck}
              className="w-full bg-white font-semibold whitespace-normal"
            >
              {detail.cta.primaryLabel}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
