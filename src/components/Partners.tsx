import { twMerge } from 'tailwind-merge';
import { LuArrowUpRight } from 'react-icons/lu';
import { Container, Heading, Img } from '@/components';
import {
  clientImg,
  clientImg2,
  selectedClientImg,
  selectedClientImg2,
} from '@/constants';

type PartnersHeadingProps = {
  seperatorTitle?: string;
  eyebrowRight?: string;
  title?: string;
  titleAccent?: string;
  description?: string;
};

type PartnersProps = {
  heading?: PartnersHeadingProps;
  variant?: 'default' | 'home';
};

type Client = {
  id: number;
  srcImg: string;
  altImg: string;
  // The client's own page (website or social). When set, the coin becomes an
  // external link; when absent it renders as a plain, non-clickable coin.
  href?: string;
  // Opt-in coin face for transparent *wordmark* logos whose ink vanishes against
  // one theme: 'light' (near-white face) rescues dark ink in dark mode; 'dark'
  // rescues white/light ink in light mode. Leave unset for everything else —
  // opaque logos and colored marks cover or don't need a face, and adding one
  // makes the disc bleed at the clipped edge as a faint ring.
  disc?: 'light' | 'dark';
};

// Width of one rail cell. clamp() narrows the cells on small screens — more
// logos in view — and settles to a steady width on desktop.
const ITEM_WIDTH = 'clamp(8rem, 24vw, 10rem)';

// Seconds each cell is on screen. Derived so Home's 13-cell rail keeps its
// current pace; because every rail uses the same per-cell duration, all rails
// travel at an identical speed no matter how many logos they hold (About has
// far more than Home, so a fixed duration would race).
const SECONDS_PER_CELL = 100 / 14;

// Client alt text is authored as "<Name> Logo"; strip the suffix for a
// human-readable caption so visitors can recognize the brand (logos alone
// weren't legible — especially in motion).
const clientName = (altImg: string) => altImg.replace(/\s+logo$/i, '').trim();

// The round logo and its name. `className` styles the surrounding cell so the
// same coin works as a connected rail cell (shared border) or a standalone
// grid tile (full border) in the reduced-motion fallback.
const ClientCoin = ({
  client,
  className,
}: {
  client: Client;
  className?: string;
}) => {
  const name = clientName(client.altImg);
  // Link + face both live on the client object. Clients without an href stay
  // non-clickable coins.
  const href = client.href;
  // Only the few wordmarks that flag `disc` get a coin face (pinned, so it
  // doesn't flip with theme). Everything else stays a faceless coin so opaque
  // logos don't show a clip-edge ring.
  const disc = client.disc;
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
        <Img
          src={client.srcImg}
          alt={client.altImg}
          width={200}
          height={200}
          className="h-full w-full rounded-full object-contain"
        />
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

const Partners = ({ heading, variant = 'default' }: PartnersProps) => {
  const firstRowClients = variant === 'home' ? selectedClientImg : clientImg;
  const secondRowClients = variant === 'home' ? selectedClientImg2 : clientImg2;
  const rows = [
    { clients: firstRowClients, reverse: false },
    { clients: secondRowClients, reverse: true },
  ];

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
        {firstRowClients.map((client) => (
          <ClientCoin
            key={client.id}
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
                rowIndex === 0 && 'border-b border-black/10',
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
                    key={`${client.id}-${i}`}
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
