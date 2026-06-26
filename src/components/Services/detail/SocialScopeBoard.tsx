'use client';

import { useState } from 'react';
import { motion } from 'motion/react';

import type { ServiceIncludedItem } from '../types';

/**
 * Social Scope signature — a managed-responsibilities board, not a generic grid.
 * "What we manage" renders as app-style modules, each with a real on/off toggle
 * (start fully managed; flip one to see what you'd own instead). The header keeps
 * a live count. The feed/app silhouette of the Social template — deliberately
 * distinct from Production's film call sheet even though both read from `included`.
 */
const SocialScopeBoard = ({ items }: { items: ServiceIncludedItem[] }) => {
  const [on, setOn] = useState<boolean[]>(() => items.map(() => true));
  const toggle = (i: number) =>
    setOn((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  const active = on.filter(Boolean).length;

  return (
    <div className="overflow-hidden rounded-3xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/10 px-6 py-4 sm:px-8">
        <span className="eyebrow text-[10px] text-black/45">
          Managed by Perseus
        </span>
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45 tabular-nums">
          <span
            className={`size-1.5 rounded-full transition-colors ${
              active > 0 ? 'bg-black/45' : 'bg-black/15'
            }`}
          />
          {String(active).padStart(2, '0')} of{' '}
          {String(items.length).padStart(2, '0')} on
        </span>
      </div>

      {/* Modules */}
      <div className="grid sm:grid-cols-2">
        {items.map((item, i) => {
          const isOn = on[i];
          return (
            <div
              key={item.title}
              className={[
                'flex items-start gap-4 border-b border-black/10 px-6 py-6 sm:px-8',
                i % 2 === 0 ? 'sm:border-r sm:border-black/10' : '',
              ].join(' ')}
            >
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={`Toggle ${item.title}`}
                onClick={() => toggle(i)}
                className={[
                  'mt-0.5 flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full px-0.5 transition-colors',
                  isOn ? 'justify-end bg-black' : 'justify-start bg-black/15',
                ].join(' ')}
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  className="size-4 rounded-full bg-white shadow-sm"
                />
              </button>
              <div className="min-w-0">
                <h3
                  className={`text-base font-semibold tracking-tight transition-colors ${
                    isOn ? 'text-black' : 'text-black/40'
                  }`}
                >
                  {item.title}
                </h3>
                <p
                  className={`mt-1.5 text-sm leading-relaxed transition-colors ${
                    isOn ? 'text-black/60' : 'text-black/30'
                  }`}
                >
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SocialScopeBoard;
