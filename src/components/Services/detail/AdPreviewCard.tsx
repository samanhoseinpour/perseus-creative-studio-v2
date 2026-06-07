'use client';

import { motion } from 'motion/react';
import {
  LuMessageCircle,
  LuRepeat2,
  LuSend,
  LuThumbsUp,
} from 'react-icons/lu';

import ImageKit from '../../ImageKit';
import type { MarketingServiceContent } from '../types';

type AdPreview = NonNullable<MarketingServiceContent['adPreview']>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

const PLATFORM_LABEL: Record<AdPreview['platform'], string> = {
  google: 'Google Search · Sponsored',
  meta: 'Meta Feed · Sponsored',
  linkedin: 'LinkedIn · Promoted',
};

/**
 * Paid-channel signature — a realistic native ad preview. One component, a
 * `platform` discriminant renders a Google search ad (sitelinks, no creative), a
 * Meta feed ad, or a LinkedIn sponsored post (avatar, creative, CTA, reactions).
 * Reused across google-ads / meta-ads / linkedin-ads so the build pays off three
 * times. Card rises in on scroll; chrome is faithful but rendered in studio
 * tokens (background-contrast surface, hairline rules, mono meta) — not raw
 * brand colours — so it stays on-theme.
 */
const AdPreviewCard = (props: AdPreview) => {
  const { platform } = props;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[0.7fr_1fr] lg:gap-12">
      {/* Context rail */}
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/45">
          {PLATFORM_LABEL[platform]}
        </span>
        <p className="mt-4 text-sm leading-relaxed text-black/60">
          A representative of the creative + targeting we ship — written for the
          click that follows, not just the impression.
        </p>
        {props.stats && props.stats.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {props.stats.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-black/55 ring-1 ring-inset ring-black/15"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* The ad */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.6, ease: EASE }}
        className="mx-auto w-full max-w-md"
      >
        {platform === 'google' ? (
          <GoogleAd {...props} />
        ) : (
          <SocialAd {...props} />
        )}
      </motion.div>
    </div>
  );
};

const GoogleAd = ({
  brand,
  displayUrl,
  headline,
  body,
  sitelinks,
}: AdPreview) => (
  <div className="rounded-2xl bg-background-contrast p-5 ring-1 ring-inset ring-black/10 sm:p-6">
    <div className="flex items-center gap-2">
      <span className="rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-black ring-1 ring-inset ring-black/40">
        Ad
      </span>
      <span className="truncate text-[13px] tracking-tight text-black/70">
        {brand}
      </span>
    </div>
    <p className="mt-1 font-mono text-[12px] tracking-tight text-black/45">
      {displayUrl}
    </p>
    <p className="mt-2 text-lg font-medium leading-snug tracking-tight text-black/85">
      {headline}
    </p>
    <p className="mt-1.5 text-sm leading-relaxed text-black/60">{body}</p>
    {sitelinks && sitelinks.length > 0 && (
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-black/10 pt-4">
        {sitelinks.map((link) => (
          <span
            key={link}
            className="text-[13px] font-medium tracking-tight text-black/75 underline decoration-black/20 underline-offset-2"
          >
            {link}
          </span>
        ))}
      </div>
    )}
  </div>
);

const SocialAd = ({
  platform,
  brand,
  displayUrl,
  headline,
  body,
  cta,
  imageUrl,
  imageAlt,
}: AdPreview) => (
  <div className="overflow-hidden rounded-2xl bg-background-contrast ring-1 ring-inset ring-black/10">
    {/* Author row */}
    <div className="flex items-center gap-3 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-black text-sm font-semibold text-white">
        {brand.charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight text-black/85">
          {brand}
        </p>
        <p className="font-mono text-[11px] tracking-tight text-black/45">
          {platform === 'linkedin' ? 'Promoted · ' : 'Sponsored · '}
          {displayUrl}
        </p>
      </div>
    </div>

    {/* Primary text */}
    <p className="px-4 pb-3 text-sm leading-relaxed text-black/75">{headline}</p>

    {/* Creative */}
    {imageUrl && (
      <div className="relative aspect-[1.91/1] w-full bg-black">
        <ImageKit
          src={imageUrl}
          alt={imageAlt ?? ''}
          fill
          sizes="(min-width: 1024px) 460px, 100vw"
          className="rounded-none object-cover"
        />
      </div>
    )}

    {/* CTA strip */}
    <div className="flex items-center justify-between gap-3 border-t border-black/10 bg-black/[0.03] px-4 py-3">
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-tight text-black/70">
        {body}
      </p>
      <span className="shrink-0 rounded-lg bg-black px-3.5 py-1.5 text-xs font-semibold tracking-tight text-white">
        {cta}
      </span>
    </div>

    {/* Engagement row */}
    <div className="flex items-center gap-6 border-t border-black/10 px-4 py-2.5 text-black/45">
      <LuThumbsUp aria-hidden className="size-4" />
      <LuMessageCircle aria-hidden className="size-4" />
      {platform === 'linkedin' ? (
        <LuRepeat2 aria-hidden className="size-4" />
      ) : null}
      <LuSend aria-hidden className="size-4" />
    </div>
  </div>
);

export default AdPreviewCard;
