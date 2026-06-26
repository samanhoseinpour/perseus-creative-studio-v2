'use client';

import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import type { IconType } from 'react-icons';
import {
  SiNextdotjs,
  SiReact,
  SiTailwindcss,
  SiWordpress,
  SiWebflow,
  SiFigma,
  SiHtml5,
  SiTypescript,
  SiNodedotjs,
  SiVercel,
  SiGraphql,
  SiShopify,
  SiWoocommerce,
  SiStripe,
  SiApplepay,
} from 'react-icons/si';
import {
  LuComponent,
  LuMousePointerClick,
  LuPanelsTopLeft,
  LuGauge,
  LuBraces,
  LuPersonStanding,
  LuSparkles,
  LuServer,
  LuActivity,
  LuType,
  LuPalette,
  LuLayoutGrid,
  LuSmartphone,
  LuFileCode,
  LuRepeat,
  LuTruck,
  LuDatabase,
  LuShieldCheck,
  LuRefreshCw,
  LuLock,
  LuBug,
  LuPencil,
  LuLifeBuoy,
  LuImage,
  LuZap,
  LuSearch,
  LuTags,
  LuLink,
  LuListChecks,
} from 'react-icons/lu';

import type { ServiceStackGroup } from '../types';

/**
 * Maps a stack item to a glyph — real brand marks where one exists, a Lucide
 * concept icon otherwise. Keyed on the exact content string; unknown items fall
 * back to a neutral mark so nothing renders icon-less.
 */
const STACK_ICONS: Record<string, IconType> = {
  Figma: SiFigma,
  'Design Systems': LuComponent,
  Prototyping: LuMousePointerClick,
  Wireframes: LuPanelsTopLeft,
  'Next.js': SiNextdotjs,
  React: SiReact,
  'Tailwind CSS': SiTailwindcss,
  WordPress: SiWordpress,
  Webflow: SiWebflow,
  'Core Web Vitals': LuGauge,
  'Semantic HTML': SiHtml5,
  'Accessibility (WCAG)': LuPersonStanding,
  'Structured Data': LuBraces,
  // Development stack
  TypeScript: SiTypescript,
  'Node.js': SiNodedotjs,
  Vercel: SiVercel,
  GraphQL: SiGraphql,
  'Headless CMS': LuServer,
  Analytics: LuActivity,
  // Design toolkit
  Typography: LuType,
  Color: LuPalette,
  'Layout Grid': LuLayoutGrid,
  Components: LuComponent,
  Responsive: LuSmartphone,
  Motion: LuActivity,
  'Dev-ready handoff': LuFileCode,
  // E-commerce
  Shopify: SiShopify,
  WooCommerce: SiWoocommerce,
  Stripe: SiStripe,
  'Apple Pay': SiApplepay,
  Subscriptions: LuRepeat,
  'Tax & Shipping': LuTruck,
  // Web applications
  Database: LuDatabase,
  Auth: LuShieldCheck,
  Monitoring: LuGauge,
  // Maintenance / care
  'Core & plugin updates': LuRefreshCw,
  'Dependency updates': LuRefreshCw,
  'Daily backups': LuDatabase,
  'Uptime monitoring': LuActivity,
  'Security monitoring': LuShieldCheck,
  'SSL & firewalls': LuLock,
  'Malware scans': LuShieldCheck,
  'Access control': LuLock,
  'Bug fixes': LuBug,
  'Content edits': LuPencil,
  'Speed checks': LuGauge,
  'Priority support': LuLifeBuoy,
  // Performance & SEO audit
  'Image optimization': LuImage,
  Caching: LuZap,
  Crawlability: LuSearch,
  Metadata: LuTags,
  Redirects: LuLink,
  'Best Practices': LuListChecks,
  Security: LuLock,
};

/**
 * Layered "stack" diagram — each group is a slab tucked behind the one above
 * it (a fanned deck). On desktop hover the deck fans open into a clean column;
 * on mobile it's a plain readable stack (no hover, so no overlap). Slabs reveal
 * with a staggered scroll entrance.
 */
const StackDiagram = ({ groups }: { groups: ServiceStackGroup[] }) => {
  return (
    <motion.div
      className="group relative flex flex-col gap-4 lg:gap-0"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{ show: { transition: { staggerChildren: 0.12 } } }}
    >
      {groups.map((group, i) => (
        <motion.div
          key={group.label}
          variants={{
            hidden: { opacity: 0, y: 28 },
            show: {
              opacity: 1,
              y: 0,
              transition: { type: 'spring', stiffness: 120, damping: 18 },
            },
          }}
          style={
            {
              '--mt': i === 0 ? '0px' : '-3.25rem',
              '--tx': `${-i * 1.5}rem`,
              '--gap': i === 0 ? '0px' : '0.75rem',
              zIndex: groups.length - i,
            } as CSSProperties
          }
          className={[
            'relative rounded-2xl border border-black/10 bg-background-contrast p-5 sm:p-6',
            'shadow-[0_14px_34px_-18px_rgba(20,20,20,0.28)]',
            'transition-[transform,margin-top] duration-500 ease-out',
            // Resting overlap + horizontal stagger (desktop only)
            'lg:mt-(--mt) lg:transform-[translateX(var(--tx))]',
            // Fan open on hover: slide into alignment + separate vertically
            'lg:group-hover:mt-(--gap) lg:group-hover:transform-[translateX(0px)]',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            <span className="eyebrow text-[11px] text-black/45">
              {group.label}
            </span>
            <span className="h-px flex-1 bg-black/10" />
            <span className="font-mono text-[11px] tabular-nums text-black/30">
              {String(group.items.length).padStart(2, '0')}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {group.items.map((item) => {
              const Icon = STACK_ICONS[item] ?? LuSparkles;
              return (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-background px-3 py-1.5 text-sm tracking-tight text-black/80 transition-colors duration-300 hover:border-black/30 hover:text-black"
                >
                  <Icon aria-hidden className="size-3.5 shrink-0 text-black/55" />
                  {item}
                </span>
              );
            })}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default StackDiagram;
