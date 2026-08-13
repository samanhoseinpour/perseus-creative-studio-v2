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

// Touch devices get this instead of the WebGL canvas: theme-keyed gradient
// washes over the page background (transparent stops, so light/dark stay
// correct by construction). Zero dependencies — three.js never downloads on
// phones, which was ~247 KB gz + ~4s of main-thread on a mid-range device.
const ShaderStillBackdrop = ({
  dark,
  className,
}: {
  dark: boolean;
  className?: string;
}) => (
  <div
    aria-hidden
    className={cn('absolute inset-0 h-screen w-full', className)}
    style={{
      backgroundImage: dark
        ? // Shader4 mood: warm-white filament glow high-center on near-black.
          `radial-gradient(90% 60% at 50% 28%, rgba(255,255,255,0.14), transparent 65%),
           radial-gradient(50% 35% at 62% 42%, rgba(255,255,255,0.08), transparent 70%)`
        : // Shader5 mood: electric cyan-blue neon washes on the bright field.
          `radial-gradient(80% 55% at 68% 22%, rgba(56,189,248,0.26), transparent 62%),
           radial-gradient(65% 45% at 25% 55%, rgba(125,211,252,0.18), transparent 68%),
           radial-gradient(100% 70% at 50% 35%, rgba(186,230,253,0.22), transparent 75%)`,
    }}
  />
);

/**
 * Theme-aware shader background: the bright Shader5 in light mode, the dark
 * Shader4 in dark mode. The resolved theme is only known on the client, so we
 * render nothing until mounted — that way the correct-theme page background
 * shows through for a frame instead of briefly flashing the wrong shader (which
 * looked like a jump on reload in dark mode). A short fade softens the pop-in.
 *
 * The WebGL canvas is gated to fine-pointer viewports ≥768px (same query as
 * SpotLightLazy): everything else renders ShaderStillBackdrop. Reading the
 * matchMedia inside the mount effect keeps SSR and the first client render
 * identical (both null), so there's no hydration mismatch.
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

  if (tier === 'pending') return null;

  const dark = resolvedTheme === 'dark';
  if (tier === 'static') {
    return (
      <ShaderStillBackdrop dark={dark} className="animate-in fade-in-0 duration-700" />
    );
  }

  const Shader = dark ? Shader4 : Shader5;
  return <Shader className="animate-in fade-in-0 duration-700" />;
};

export default ThemedShader;
