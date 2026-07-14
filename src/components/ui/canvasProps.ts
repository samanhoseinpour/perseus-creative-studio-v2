'use client';

import type { ComponentProps } from 'react';
import type { Canvas } from '@react-three/fiber';

type CanvasProps = ComponentProps<typeof Canvas>;

// Shared <Canvas> tuning for the full-screen background shaders (shader4/5).
//
// Left at r3f's defaults, a <Canvas> renders at window.devicePixelRatio with
// antialiasing and an uncapped rAF loop. On a DPR-3 phone that rasterizes ~9x
// the pixels of a DPR-1 buffer — and both shaders are `precision highp float`
// with per-pixel loops (shader5 raymarches a sphere), so the cost is per-pixel
// and lands squarely on the mobile GPU/main thread. Globe.tsx already clamps
// DPR and gates its loop for exactly this reason; the shaders never got it.

/** Cap the backing buffer. These are soft, blurred gradients — the extra
 *  device pixels are invisible and quadratically expensive. */
export const CANVAS_DPR: CanvasProps['dpr'] = [1, 1.5];

/** Antialiasing does nothing for a full-screen quad (there are no geometry
 *  edges to sample), and the depth/stencil buffers are unused. */
export const CANVAS_GL: CanvasProps['gl'] = {
  antialias: false,
  depth: false,
  stencil: false,
  powerPreference: 'low-power',
};

/**
 * `always` only while the canvas is on-screen and the tab is visible.
 *
 * `demand` renders a single static frame, which is what reduced-motion callers
 * get — the artwork still shows, it just doesn't animate. `never` renders
 * nothing at all, which is correct for an off-screen canvas: flipping back to
 * `always` resumes it when it scrolls into view.
 */
export function shaderFrameloop(
  active: boolean,
  reduceMotion: boolean,
): CanvasProps['frameloop'] {
  if (reduceMotion) return 'demand';
  return active ? 'always' : 'never';
}
