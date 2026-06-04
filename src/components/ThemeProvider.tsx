'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * App-wide theme provider. Sets `data-theme="light|dark"` on <html>, which is
 * the signal the `dark:` custom variant (see globals.css) and the token flips
 * react to. Defaults to the visitor's OS preference, falling back to light;
 * a manual toggle overrides and persists in localStorage. next-themes injects
 * a blocking pre-hydration script, so there is no flash of the wrong theme.
 */
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
};

export default ThemeProvider;
