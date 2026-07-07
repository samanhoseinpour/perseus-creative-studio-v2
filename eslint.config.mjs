import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

// Next 16 removed `next lint`, so we run ESLint directly. eslint-config-next now
// ships native flat configs (already scoping files and ignoring .next/out/build),
// so the old FlatCompat shim is no longer needed.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  // public/ holds static assets and the hand-written service worker (browser SW
  // globals, not an app module) — not source to lint. drizzle/ holds generated
  // migration artifacts (SQL + meta JSON) from drizzle-kit.
  { ignores: ['public/**', 'drizzle/**'] },
  // eslint-plugin-react-hooks v6 (bundled with Next 16) adds React-Compiler
  // readiness rules that flag working, intentional patterns across the existing
  // motion/3D code (e.g. mount-time setState, components defined in render).
  // Keep them as warnings for signal; the classic rules-of-hooks /
  // exhaustive-deps stay at their default error level.
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
];

export default eslintConfig;
