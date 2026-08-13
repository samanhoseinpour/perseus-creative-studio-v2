'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Loaded lazily so three.js / @react-three/fiber stay out of the shared
// first-load bundle — they only download on the pages that render a shader.
const Shader5 = dynamic(
  () => import('@/components/ui/shader5').then((m) => m.Shader5),
  { ssr: false },
);
const Shader4 = dynamic(
  () => import('@/components/ui/shader4').then((m) => m.Shader4),
  { ssr: false },
);

// Shader4 mood: warm-white filament glow high-center on near-black.
const DARK_WASH =
  `radial-gradient(90% 60% at 50% 28%, rgba(255,255,255,0.14), transparent 65%),
   radial-gradient(50% 35% at 62% 42%, rgba(255,255,255,0.08), transparent 70%)`;
// Shader5 mood: electric cyan-blue neon washes on the bright field.
const LIGHT_WASH =
  `radial-gradient(80% 55% at 68% 22%, rgba(56,189,248,0.26), transparent 62%),
   radial-gradient(65% 45% at 25% 55%, rgba(125,211,252,0.18), transparent 68%),
   radial-gradient(100% 70% at 50% 35%, rgba(186,230,253,0.22), transparent 75%)`;

// Touch devices get this instead of the WebGL canvas: theme-keyed gradient
// washes over the page background. Theme selection is pure CSS (two stacked
// layers toggled by the `dark` variant), so it needs no mount gate and can be
// server-rendered — which matters: painted at hydration it re-painted the
// whole phone viewport seconds in, dragging Speed Index.
const ShaderStillBackdrop = ({ className }: { className?: string }) => (
  <div aria-hidden className={cn('absolute inset-0 h-screen w-full', className)}>
    <div
      className="absolute inset-0 dark:hidden"
      style={{ backgroundImage: LIGHT_WASH }}
    />
    <div
      className="absolute inset-0 hidden dark:block"
      style={{ backgroundImage: DARK_WASH }}
    />
  </div>
);

/**
 * Theme-aware shader background: the bright Shader5 in light mode, the dark
 * Shader4 in dark mode, gated to fine-pointer viewports ≥768px (same query as
 * SpotLightLazy) — everything else renders ShaderStillBackdrop, so three.js
 * never downloads on touch devices.
 *
 * Tiering: the `md:hidden` backdrop is in the server HTML, so phones paint it
 * at first paint with no hydration pop. The mount effect only decides what
 * ≥768px devices get — the WebGL canvas (fine pointer; rendered only after
 * mount so the resolved theme is known and the wrong-theme shader never
 * flashes) or a second backdrop for coarse-pointer tablets. Desktop's
 * pre-shader frames stay exactly as before: bare page background.
 */
const ThemedShader = () => {
  const { resolvedTheme } = useTheme();
  const [tier, setTier] = useState<'pending' | 'webgl' | 'static'>('pending');
  useEffect(() => {
    setTier(
      window.matchMedia('(min-width: 768px) and (pointer: fine)').matches
        ? 'webgl'
        : 'static',
    );
  }, []);

  return (
    <>
      <ShaderStillBackdrop className="md:hidden animate-in fade-in-0 duration-700" />
      {tier === 'static' && (
        <ShaderStillBackdrop className="max-md:hidden animate-in fade-in-0 duration-700" />
      )}
      {tier === 'webgl' &&
        (resolvedTheme === 'dark' ? (
          <Shader4 className="animate-in fade-in-0 duration-700" />
        ) : (
          <Shader5 className="animate-in fade-in-0 duration-700" />
        ))}
    </>
  );
};

export default ThemedShader;
