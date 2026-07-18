import Img from '@/components/Img';
import { isReadyImage } from '@/utils/images';

/**
 * A client's mark from either image pipeline: seeded `/images` assets ride
 * `<Img>` (static variant ladder), while /admin-uploaded Blob CDN URLs render
 * as a plain `<img>` — they live outside the self-hosted pipeline, and
 * `<Img>`'s resolveImageSrc would silently swap them for the wordmark
 * placeholder. Server component (Img is server-only); the wrapping disc and
 * its ground stay the call site's job.
 */
const ClientLogoImg = ({
  src,
  alt,
  size = 80,
  className = 'h-full w-full rounded-none object-contain',
}: {
  src: string;
  alt: string;
  /** Intrinsic square dimension hint for the static branch. */
  size?: number;
  className?: string;
}) =>
  isReadyImage(src) ? (
    <Img src={src} alt={alt} width={size} height={size} className={className} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className={className} />
  );

export default ClientLogoImg;
