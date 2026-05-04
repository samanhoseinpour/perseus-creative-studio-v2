import Link from 'next/link';
import {
  BarChart3,
  CalendarCheck,
  Check,
  Clapperboard,
  MousePointerClick,
  PanelsTopLeft,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components';

interface CtaContent {
  headline: string;
  highlights: string[];
  primaryLabel: string;
  primaryHref: string;
  primaryIcon: LucideIcon;
  secondaryLabel: string;
  secondaryHref: string;
  secondaryIcon: LucideIcon;
}

const ctaByCategory: Record<string, CtaContent> = {
  website: {
    headline: 'Want a website that actually converts?',
    highlights: [
      'Custom Next.js & WordPress builds',
      'SEO-ready structure from day one',
      'Designed to turn visitors into leads',
    ],
    primaryLabel: 'Get a Free Website Audit',
    primaryHref: '/contact',
    primaryIcon: MousePointerClick,
    secondaryLabel: 'See Website Work',
    secondaryHref: '/services/websites',
    secondaryIcon: PanelsTopLeft,
  },
  'digital-marketing': {
    headline: 'Turn your content into real leads',
    highlights: [
      'Google, Meta & LinkedIn Ads',
      'SEO & content that compounds',
      'Data-driven — no guesswork',
    ],
    primaryLabel: 'Get a Free Strategy Call',
    primaryHref: '/contact',
    primaryIcon: BarChart3,
    secondaryLabel: 'View Our Work',
    secondaryHref: '/projects',
    secondaryIcon: PanelsTopLeft,
  },
  'videography-and-photography': {
    headline: 'Elevate your brand with cinematic media',
    highlights: [
      'Commercial video & photography',
      'Drone & aerial production',
      'Content built for every platform',
    ],
    primaryLabel: 'Book a Production Call',
    primaryHref: '/contact',
    primaryIcon: Clapperboard,
    secondaryLabel: 'View Our Reel',
    secondaryHref: '/projects',
    secondaryIcon: PanelsTopLeft,
  },
};

const defaultCta: CtaContent = {
  headline: 'Ready to stand out in Vancouver?',
  highlights: [
    'Strategy, creative & production',
    'SEO-ready websites that convert',
    'Results you can actually measure',
  ],
  primaryLabel: 'Book a Free Consultation',
  primaryHref: '/contact',
  primaryIcon: CalendarCheck,
  secondaryLabel: 'View Our Work',
  secondaryHref: '/projects',
  secondaryIcon: PanelsTopLeft,
};

interface Props {
  categorySlug: string;
}

export default function SidebarCta({ categorySlug }: Props) {
  const cta = ctaByCategory[categorySlug] ?? defaultCta;

  return (
    <div className="rounded-2xl bg-black text-white p-5 flex flex-col gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
          Perseus Creative Studio
        </p>
        <h3 className="text-sm font-bold leading-snug">{cta.headline}</h3>
      </div>

      <ul className="space-y-1.5">
        {cta.highlights.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="w-3 h-3 mt-0.5 text-white/50 shrink-0" />
            <span className="text-xs text-white/60 leading-snug">{item}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2.5">
        <Link href={cta.primaryHref} className="flex w-full">
          <Button
            variant="secondary"
            size="small"
            icon={cta.primaryIcon}
            className="w-full bg-white font-semibold"
          >
            {cta.primaryLabel}
          </Button>
        </Link>

        <Link href={cta.secondaryHref} className="flex w-full">
          <Button
            variant="secondary"
            size="small"
            icon={cta.secondaryIcon}
            className="w-full bg-white font-semibold"
          >
            {cta.secondaryLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}
