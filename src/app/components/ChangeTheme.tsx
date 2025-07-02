'use client';

import { useMotionValueEvent, useScroll } from 'framer-motion';
import { useRef } from 'react';

interface ChangeThemeProps {
  theme: string;
  setTheme: (theme: string) => void;
  children: React.ReactNode;
}

const ChangeTheme = ({ theme, setTheme, children }: ChangeThemeProps) => {
  const container = useRef(null);

  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start center', 'end center'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (value > 0 && value < 1) {
      setTheme(theme);
    }
  });

  return (
    <div
      className="bg-white dark:bg-background min-h-[100svh] flex flex-col webdev-transition"
      ref={container}
    >
      {children}
    </div>
  );
};

export default ChangeTheme;
