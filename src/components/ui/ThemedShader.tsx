'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

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

/**
 * Theme-aware shader background: the bright Shader5 in light mode, the dark
 * Shader4 in dark mode. The resolved theme is only known on the client, so we
 * render nothing until mounted — that way the correct-theme page background
 * shows through for a frame instead of briefly flashing the wrong shader (which
 * looked like a jump on reload in dark mode). A short fade softens the pop-in.
 */
const ThemedShader = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const Shader = resolvedTheme === 'dark' ? Shader4 : Shader5;
  return <Shader className="animate-in fade-in-0 duration-700" />;
};

export default ThemedShader;
