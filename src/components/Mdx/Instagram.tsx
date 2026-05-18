import { FaInstagram } from 'react-icons/fa';

type InstagramType = 'p' | 'reel' | 'tv';

interface InstagramProps {
  id: string;
  type?: InstagramType;
  caption?: boolean;
}

// Instagram's embed iframe is cross-origin, so its internals can't be restyled.
// What we own is the frame around it — wrapper + caption row.
const Instagram = ({ id, type = 'p', caption = false }: InstagramProps) => {
  const src = `https://www.instagram.com/${type}/${encodeURIComponent(id)}/embed${
    caption ? '/captioned' : ''
  }/`;
  const postUrl = `https://www.instagram.com/${type}/${encodeURIComponent(id)}/`;
  const minHeight = type === 'reel' ? 940 : caption ? 1080 : 720;

  return (
    <figure className="my-10 mx-auto w-full max-w-[540px]">
      <div className="overflow-hidden rounded-2xl bg-white">
        <iframe
          src={src}
          title="Instagram embed"
          loading="lazy"
          scrolling="no"
          allow="encrypted-media; picture-in-picture; web-share"
          className="block w-full"
          style={{ minHeight, border: 0 }}
        />
      </div>

      <figcaption className="mt-3 flex items-center justify-between gap-4 px-1 text-xs leading-xs text-black/60">
        <span className="flex items-center gap-2">
          <FaInstagram className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="uppercase tracking-[0.14em]">From Instagram</span>
        </span>
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-black underline underline-offset-4 decoration-black/30 transition-colors hover:text-black/60 hover:decoration-black/60"
        >
          View original →
        </a>
      </figcaption>
    </figure>
  );
};

export default Instagram;
