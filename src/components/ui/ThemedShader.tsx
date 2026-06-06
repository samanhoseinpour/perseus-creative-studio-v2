'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

import { Shader5 } from '@/components/ui/shader5';
import { Shader4 } from '@/components/ui/shader4';

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
