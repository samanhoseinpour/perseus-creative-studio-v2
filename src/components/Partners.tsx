import { twMerge } from 'tailwind-merge';
import { LuArrowUpRight } from 'react-icons/lu';
import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import ImgClient from '@/components/ImgClient';
import { isReadyImage } from '@/utils/images';

type PartnersHeadingProps = {
  seperatorTitle?: string;
  eyebrowRight?: string;
  title?: string;
  titleAccent?: string;
  description?: string;
};

/** One marquee coin, as shaped by projectsStore's getPartnerLogos: the
 *  client's display name, their logo (static /images path or admin-uploaded
 *  Blob URL), the outbound link (Instagram or website), and the optional coin
 *  face for transparent wordmarks whose ink vanishes against one theme —
 *  'light' rescues dark ink in dark mode; 'dark' rescues white ink in light
 *  mode. Unset = faceless coin (opaque logos don't need a face, and adding
 *  one bleeds a faint ring at the clipped edge). */
export type PartnerLogo = {
  name: string;
  src: string;
  href?: string;
  disc?: 'light' | 'dark';
};

/** The two opposite-drifting rails, pre-split in marquee order server-side. */
export type PartnerRails = {
  rail1: PartnerLogo[];
  rail2: PartnerLogo[];
};

export type PartnersProps = {
  heading?: PartnersHeadingProps;
  /** DB-driven: the server page fetches getPartnerLogos('home' | 'all') and
   *  threads the rails down through the deferred client wrapper. */
  logos: PartnerRails;
};

// Width of one rail cell. clamp() narrows the cells on small screens — more
// logos in view — and settles to a steady width on desktop.
const ITEM_WIDTH = 'clamp(8rem, 24vw, 10rem)';

// Seconds each cell is on screen. Derived so Home's 13-cell rail keeps its
// current pace; because every rail uses the same per-cell duration, all rails
// travel at an identical speed no matter how many logos they hold (About has
// far more than Home, so a fixed duration would race).
const SECONDS_PER_CELL = 100 / 14;

// The round logo and its name. `className` styles the surrounding cell so the
// same coin works as a connected rail cell (shared border) or a standalone
// grid tile (full border) in the reduced-motion fallback.
const ClientCoin = ({
  client,
  className,
}: {
  client: PartnerLogo;
  className?: string;
}) => {
  // Link + face both ride the logo record. Clients without an href stay
  // non-clickable coins.
  const { name, src, href, disc } = client;
  const boxClass = twMerge(
    'group/coin flex flex-col items-center justify-center text-center',
    className,
  );

  const inner = (
    <>
      <div
        className={twMerge(
          'relative size-16 overflow-hidden rounded-full sm:size-20',
          disc === 'dark' && 'bg-(--coin-face-dark)',
          disc === 'light' && 'bg-(--coin-face)',
        )}
      >
        {isReadyImage(src) ? (
          <ImgClient
            src={src}
            alt={`${name} logo`}
            width={200}
            height={200}
            className="h-full w-full rounded-full object-contain"
          />
        ) : (
          // Admin-uploaded Blob CDN logo: never route an absolute URL through
          // ImgClient — resolveImageSrc would silently swap in the placeholder.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`${name} logo`}
            width={200}
            height={200}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full rounded-full object-contain"
          />
        )}
      </div>
      <span
        aria-hidden="true"
        className="mt-2.5 line-clamp-2 min-h-[2.5em] max-w-[14ch] text-[10px] font-medium leading-tight tracking-tight text-balance text-black/55 transition-colors duration-300 group-hover/coin:text-black"
      >
        {name}
      </span>
    </>
  );

  // Clients with a known page link out in a new tab (nofollow + external); the
  // rest stay plain coins until a URL is supplied. The corner arrow signals
  // the cell is clickable.
  if (!href) {
    return <div className={boxClass}>{inner}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="external nofollow noopener noreferrer"
      aria-label={`${name} — opens in a new tab`}
      className={twMerge(boxClass, 'relative cursor-pointer')}
    >
      {inner}
      <LuArrowUpRight
        aria-hidden="true"
        className="absolute top-1.5 right-1.5 size-3.5 text-black/25 transition-colors duration-300 group-hover/coin:text-black"
      />
    </a>
  );
};

const Partners = ({ heading, logos }: PartnersProps) => {
  // The rendering pages already skip the deferred wrapper when the wall is
  // empty; this is the belt-and-suspenders for a direct render.
  if (logos.rail1.length === 0 && logos.rail2.length === 0) return null;

  const rows = [
    { clients: logos.rail1, reverse: false },
    { clients: logos.rail2, reverse: true },
  ].filter((row) => row.clients.length > 0);

  const headingContent = {
    seperatorTitle: heading?.seperatorTitle ?? 'Selected Clients',
    eyebrowRight: heading?.eyebrowRight ?? 'Client Work',
    title: heading?.title ?? 'Our Selected Clients',
    titleAccent:
      heading?.titleAccent ?? 'A curated look at recent partnerships.',
    description:
      heading?.description ??
      'A selected sample of clients and collaborators we’ve supported across branding, content, web, and digital marketing. The full client logo collection will live on the About page.',
  };

  return (
    <Container className="overflow-x-hidden py-16">
      <Heading
        titleTag="h2"
        seperatorTitle={headingContent.seperatorTitle}
        eyebrowRight={headingContent.eyebrowRight}
        title={headingContent.title}
        titleAccent={headingContent.titleAccent}
        description={headingContent.description}
        containerStyle="px-0 md:px-0 mb-10 w-full max-w-none"
        titleStyle="max-w-4xl"
        descStyle="max-w-3xl"
      />

      {/* Reduced-motion fallback — the same coins as a calm static grid. */}
      <div className="mx-auto hidden w-full max-w-5xl grid-cols-2 gap-3 min-[380px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 motion-reduce:grid">
        {logos.rail1.map((client) => (
          <ClientCoin
            key={client.name}
            client={client}
            className="rounded-2xl border border-black/10 px-2 py-4 transition-colors duration-300 hover:border-black/30"
          />
        ))}
      </div>

      {/* Seamless connected rail. Cells share edges (one continuous divided
          strip); two rows drift in opposite directions. Each row's duration
          scales with its logo count so every rail moves at the same speed.
          Hovering a row pauses it so a logo + name can be read. */}
      <div className="hidden motion-safe:block">
        <div className="fadeout-horizontal overflow-hidden border-y border-black/10">
          {rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={twMerge(
                'group/rail',
                rowIndex === 0 && rows.length > 1 && 'border-b border-black/10',
              )}
            >
              <div
                className="client-rail flex w-max group-hover/rail:paused"
                style={
                  {
                    '--cell-w': ITEM_WIDTH,
                    '--rail-duration': `${row.clients.length * SECONDS_PER_CELL}s`,
                    animationDirection: row.reverse ? 'reverse' : undefined,
                  } as React.CSSProperties
                }
              >
                {/* Rendered twice so the -50% slide loops without a seam. */}
                {[...row.clients, ...row.clients].map((client, i) => (
                  <ClientCoin
                    key={`${client.name}-${i}`}
                    client={client}
                    className="w-(--cell-w) shrink-0 border-r border-black/10 px-2 py-5 transition-colors duration-300 hover:bg-black/3"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
};

export default Partners;
