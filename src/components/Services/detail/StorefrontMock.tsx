'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LuCheck, LuPlus, LuShoppingBag } from 'react-icons/lu';

import ImageKit from '../../ImageKit';
import type { WebsiteServiceContent } from '../types';

type Storefront = NonNullable<WebsiteServiceContent['storefront']>;

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * E-commerce signature — an interactive storefront mock. Adding a product bumps
 * an animated cart count and flips the button to "Added", so the section *does*
 * the conversion flow instead of describing it. No prices (studio rule) — trust
 * chips carry the commerce signal. Built from studio tokens (browser-ish chrome,
 * hairline grid, ink buttons) so it sits inside the websites template natively.
 */
const StorefrontMock = ({
  storeName,
  products,
  features,
}: Storefront) => {
  const [count, setCount] = useState(0);
  const [added, setAdded] = useState<Record<number, boolean>>({});

  const add = (i: number) => {
    setCount((c) => c + 1);
    setAdded((prev) => ({ ...prev, [i]: true }));
    setTimeout(() => setAdded((prev) => ({ ...prev, [i]: false })), 1300);
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-background-contrast ring-1 ring-inset ring-black/10">
      {/* Store header with live cart */}
      <div className="flex items-center justify-between gap-4 border-b border-black/10 px-5 py-3.5 sm:px-6">
        <span className="text-sm font-semibold tracking-tight text-black/85">
          {storeName}
        </span>
        <div className="flex items-center gap-2">
          <LuShoppingBag aria-hidden className="size-4 text-black/55" />
          <span className="relative grid h-6 min-w-6 place-items-center rounded-full bg-black px-1.5 text-xs font-semibold tabular-nums text-white">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={count}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                {count}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-px bg-black/5 lg:grid-cols-4">
        {products.map((p, i) => (
          <div key={p.name} className="flex flex-col bg-background-contrast">
            <div className="relative aspect-square w-full bg-black">
              <ImageKit
                src={p.imageUrl}
                alt={p.imageAlt}
                fill
                sizes="(min-width: 1024px) 300px, 50vw"
                className="rounded-none object-cover"
              />
              <span className="absolute left-2.5 top-2.5 rounded-full bg-scrim/55 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-on-media/90 backdrop-blur-sm">
                {p.tag}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-3.5 sm:p-4">
              <p className="text-sm font-medium leading-snug tracking-tight text-black/80">
                {p.name}
              </p>
              <button
                type="button"
                onClick={() => add(i)}
                aria-label={`Add ${p.name} to cart`}
                className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-semibold tracking-tight text-white transition-transform active:scale-95"
              >
                {added[i] ? (
                  <>
                    <LuCheck aria-hidden className="size-3.5" /> Added
                  </>
                ) : (
                  <>
                    <LuPlus aria-hidden className="size-3.5" /> Add to cart
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Trust strip */}
      {features && features.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-black/10 px-5 py-3.5 sm:px-6">
          {features.map((f) => (
            <span
              key={f}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-black/50"
            >
              <span className="size-1.5 rounded-full bg-black/30" />
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default StorefrontMock;
