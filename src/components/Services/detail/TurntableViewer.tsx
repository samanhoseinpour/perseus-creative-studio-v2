'use client';

import { useEffect, useRef } from 'react';
import { LuRotate3D } from 'react-icons/lu';

import ImgClient from '../../ImgClient';
import type { ProductionServiceContent } from '../types';

type Turntable = NonNullable<ProductionServiceContent['turntable']>;
// `blur` is looked up server-side by ProductionServiceDetail (blurFor) and
// threaded in — this client component must not import the blur map itself.
type TurntableViewerProps = Turntable & { blur?: string };

const LIMIT = 38; // degrees of swing each way — reads as 3D without the plane flipping away

/**
 * 2D & 3D signature — a drag-to-orbit turntable. The render gently rotates around
 * its Y axis on a dark stage and responds to drag, so it reads as inspectable 3D.
 * Rotation is applied straight to the DOM in a rAF loop (no per-frame React
 * re-render). Ink stage + radial glow + a grounding shadow; mono HUD.
 */
const TurntableViewer = ({
  imageUrl,
  imageAlt,
  chips,
  blur,
}: TurntableViewerProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const angle = useRef(-LIMIT * 0.5);
  const dir = useRef(1);
  const dragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (!dragging.current) {
        angle.current += dir.current * 0.18;
        if (angle.current > LIMIT || angle.current < -LIMIT) {
          dir.current *= -1;
          angle.current = Math.max(-LIMIT, Math.min(LIMIT, angle.current));
        }
      }
      if (stageRef.current) {
        stageRef.current.style.transform = `rotateY(${angle.current}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onMove = (x: number) => {
    if (!dragging.current) return;
    const next = angle.current + (x - lastX.current) * 0.4;
    angle.current = Math.max(-LIMIT, Math.min(LIMIT, next));
    lastX.current = x;
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-black">
      <div className="pointer-events-none absolute inset-0 bg-radial from-white/[0.07] to-transparent" />

      <div
        className="relative grid h-[24rem] cursor-grab touch-pan-y select-none place-items-center [perspective:1200px] active:cursor-grabbing sm:h-[28rem]"
        onPointerDown={(e) => {
          dragging.current = true;
          lastX.current = e.clientX;
        }}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => (dragging.current = false)}
      >
        <div className="relative [transform-style:preserve-3d]">
          <div ref={stageRef} className="[transform-style:preserve-3d]">
            <div className="relative size-52 overflow-hidden rounded-2xl sm:size-64">
              <ImgClient
                src={imageUrl}
                alt={imageAlt}
                fill
                sizes="320px"
                blur={blur}
                className="rounded-none object-cover"
              />
            </div>
          </div>
          {/* Grounding shadow */}
          <div className="absolute -bottom-6 left-1/2 h-5 w-44 -translate-x-1/2 rounded-[100%] bg-black/60 blur-md sm:w-56" />
        </div>
      </div>

      {/* HUD */}
      <div className="absolute left-5 top-5 flex items-center gap-2 eyebrow text-[10px] text-on-media/70">
        <LuRotate3D aria-hidden className="size-3.5" />
        Drag to orbit
      </div>

      {chips && chips.length > 0 && (
        <div className="absolute inset-x-5 bottom-5 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full bg-on-media/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-media/80 backdrop-blur-sm"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TurntableViewer;
