import Img from '../../Img';
import type { ProductionServiceContent } from '../types';

type ContactSheet = NonNullable<ProductionServiceContent['contactSheet']>;

/**
 * Photography signature — a film contact sheet. Frames sit on a dark proof sheet
 * with frame numbers and grease-pencil "selects" circled, sprocket strips top and
 * bottom — the photographer's edit, not a generic gallery. Static (server
 * component). Scrim/on-media tokens over media; mono frame numbers.
 */
const ContactSheet = ({ shots, selects = [], filmLabel }: ContactSheet) => (
  <div className="overflow-hidden rounded-2xl bg-scrim p-4 sm:p-6">
    {/* Top sprocket strip */}
    <div className="mb-3 flex items-center justify-between">
      <div className="flex gap-1.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="h-2 w-3 rounded-[1px] bg-on-media/15" />
        ))}
      </div>
      {filmLabel && (
        <span className="eyebrow text-[10px] text-on-media/50">
          {filmLabel}
        </span>
      )}
    </div>

    {/* Frames */}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {shots.map((s, i) => {
        const isSelect = selects.includes(i);
        return (
          <figure key={i} className="relative">
            <div className="relative aspect-4/3 overflow-hidden rounded-[3px] bg-black">
              <Img
                src={s.imageUrl}
                alt={s.imageAlt}
                fill
                sizes="(min-width: 1024px) 280px, 50vw"
                className="rounded-none object-cover"
              />
              {isSelect && (
                <span className="pointer-events-none absolute inset-1.5 rounded-full border-2 border-[#ffd84a]/85" />
              )}
            </div>
            <figcaption className="mt-1.5 flex items-center justify-between font-mono text-[10px] tabular-nums text-on-media/45">
              <span>
                {String(i + 1).padStart(2, '0')}
                {String.fromCharCode(65 + (i % 3))}
              </span>
              {isSelect && (
                <span className="text-[#ffd84a]/85">✓ select</span>
              )}
            </figcaption>
          </figure>
        );
      })}
    </div>

    {/* Bottom sprocket strip */}
    <div className="mt-3 flex gap-1.5">
      {Array.from({ length: 16 }).map((_, i) => (
        <span key={i} className="h-2 w-3 rounded-[1px] bg-on-media/15" />
      ))}
    </div>
  </div>
);

export default ContactSheet;
