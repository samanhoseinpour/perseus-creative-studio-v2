import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';

interface CtaContent {
  headline: string;
  highlights: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
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
    secondaryLabel: 'See Website Work',
    secondaryHref: '/services/websites',
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
    secondaryLabel: 'View Our Work',
    secondaryHref: '/projects',
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
    secondaryLabel: 'View Our Reel',
    secondaryHref: '/projects',
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
  secondaryLabel: 'View Our Work',
  secondaryHref: '/projects',
};

interface Props {
  categorySlug: string;
}

export default function SidebarCta({ categorySlug }: Props) {
  const cta = ctaByCategory[categorySlug] ?? defaultCta;

  return (
    <div className="rounded-2xl bg-black text-white p-5 flex flex-col gap-4">
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
        <Link
          href={cta.primaryHref}
          className="flex items-center justify-center gap-2 w-full bg-white text-black text-xs font-bold py-3 px-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.18)] hover:shadow-[0_0_28px_rgba(255,255,255,0.28)] hover:bg-white/95 transition-all duration-200"
        >
          {cta.primaryLabel} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href={cta.secondaryHref}
          className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-white/70 py-2.5 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          {cta.secondaryLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
