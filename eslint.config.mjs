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
  // Every dropdown menu in the dashboard goes through ONE door, and this is
  // what keeps it one: Radix's DropdownMenu opens on `pointerdown` alone, and
  // on a machine that never passes that event to the page every menu built on
  // the raw primitive is dead while every click-driven button beside it works
  // (the 2026-08-27 "buttons don't work" report). `@/components/Admin/DropdownMenu`
  // wraps the Trigger with a click fallback and re-exports the rest unchanged —
  // see src/components/Admin/menuTrigger.ts. The blog editor directory is also
  // exempted here (it needs @tiptap/react, banned below), and the object
  // immediately after this one re-states the radix ban for that directory
  // alone — see its own comment for why.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/Admin/DropdownMenu.tsx', 'src/components/Admin/blogs/editor/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'radix-ui',
              importNames: ['DropdownMenu'],
              message:
                'Import DropdownMenu from @/components/Admin/DropdownMenu — the one dropdown door, whose Trigger also opens on click.',
            },
          ],
          patterns: [
            {
              group: ['@tiptap/react', '@tiptap/react/**'],
              message:
                'The public site renders through @tiptap/static-renderer on the server. @tiptap/react belongs to the /admin editor (step 2) only.',
            },
          ],
        },
      ],
    },
  },
  // The editor directory is exempted from the object above so it can import
  // @tiptap/react, but that exemption would silently switch off the radix
  // DropdownMenu ban too — and the editor's own toolbar is exactly where a raw
  // Radix dropdown would reintroduce the dead-trigger bug that ban exists to
  // prevent. In ESLint flat config, when two matching config objects both
  // configure the same rule, the LAST match replaces the earlier
  // configuration for that rule entirely rather than merging, so re-stating
  // the ban here — on a file set disjoint from the object above — is what
  // keeps it enforced for the editor.
  {
    files: ['src/components/Admin/blogs/editor/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'radix-ui',
              importNames: ['DropdownMenu'],
              message:
                'Import DropdownMenu from @/components/Admin/DropdownMenu — the one dropdown door, whose Trigger also opens on click.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
