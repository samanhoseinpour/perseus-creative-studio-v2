'use client';

import { useState } from 'react';
import { LuPlay as Play } from 'react-icons/lu';

type YouTubeProps = {
  id: string;
  // Optional metadata consumed by the page-level VideoObject JSON-LD.
  // Authors don't have to set these — fallbacks come from the nearest
  // preceding H2/H3 and the article's publish date.
  title?: string;
  description?: string;
  uploadDate?: string;
  // When true, the page-level extractor skips emitting a VideoObject for
  // this embed. Use this for videos hosted on someone else's channel so
  // structured data doesn't falsely claim Perseus as the publisher.
  external?: boolean;
};

/**
 * Click-to-load facade: until the reader presses play, an embed is a single
 * static thumbnail — the full YouTube player (~1MB of third-party JS per
 * embed, ~30 embeds across the journal) only downloads on demand. Same idiom
 * as the home hero's reel modal. The page-level VideoObject JSON-LD is
 * extracted from the MDX *source*, so schema is unaffected by the lazy player.
 */
const YouTube = ({ id, title }: YouTubeProps) => {
  const [playing, setPlaying] = useState(false);
  const label = title ?? 'YouTube video';

  return (
    <div className="my-8 aspect-video w-full overflow-hidden rounded-2xl bg-scrim">
      {playing ? (
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${label}`}
          className="group relative block h-full w-full cursor-pointer"
        >
          {/* YouTube's own poster frame — a third-party asset, so a plain
              <img> outside the self-hosted image pipeline. object-cover crops
              hqdefault's 4:3 letterbox bars inside the 16:9 box. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt={label}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          {/* Video surface is always dark → fixed on-media tokens, no theme flip. */}
          <span className="absolute inset-0 bg-scrim/20 transition-colors group-hover:bg-scrim/35" />
          <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black text-white shadow-[0_0_0_4px_rgba(255,255,255,0.14)] transition-transform duration-300 group-hover:scale-105">
            <Play className="h-5 w-5 translate-x-px fill-current" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
};

export default YouTube;
