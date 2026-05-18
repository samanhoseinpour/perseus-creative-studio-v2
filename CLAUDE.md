# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server with TurboPack on http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint (`next/core-web-vitals` + `next/typescript`)

There is no test runner configured in this repo. Type checking happens implicitly via `next build`; there is no standalone `tsc` script.

## Architecture

Next.js 15 / React 19 marketing site using the **App Router** with TypeScript. All routes are server components by default; interactive pieces opt in with `'use client'`. The repo has **no API routes, no database, and no backend** — content lives in `src/constants/*` and `src/content/blogs/**/*.mdx`, and the contact form posts directly to EmailJS from the browser.

### Path aliases

`@/*` resolves to `src/*` (see `tsconfig.json`). Always import via `@/...`. There are two parallel component directories — `src/components` (the real one, surfaced through `src/components/index.ts`) and `src/app/components` referenced in the old README; the latter is stale. **Use `@/components`.**

### Route map

Routes live under `src/app/`:

- `/` — `app/page.tsx`
- `/about`, `/contact`, `/contact/careers`, `/services`, `/services/websites`, `/projects`, `/frequently-asked-questions`
- `/blogs` — listing page; **URL state, not category landing pages.** Filters use `?category=<slug>` and `?query=...` on the same route. Search-result URLs are emitted with `robots: noindex` from `generateMetadata` so they don't compete with the hub in SERPs.
- `/blogs/[blog]` — post detail, statically generated via `generateStaticParams()` reading `blogPosts`
- `/blogs/authors`, `/blogs/authors/[author]`
- Permanent redirects (in `next.config.ts`): `/web-development → /services/websites`, `/visual-production → /projects`, `/authors → /blogs/authors`, plus one legacy blog URL.

### Blog content pipeline

A blog post has two coupled sources of truth and **both must be updated when adding a post**:

1. **Metadata entry** in `src/constants/blogs.ts` (`blogPosts` array) — drives routing, sitemap, SEO/JSON-LD, category/author cross-references, prev/next nav. The `slug` field maps to the URL (`/blogs/<slug>`), and `category.slug` selects the MDX subfolder.
2. **MDX body** at `src/content/blogs/<category-slug>/<slug>.mdx` — loaded at build time by `loadPostMdx()` in `app/blogs/[blog]/page.tsx`. Missing files fall back to `post.description` silently (no error in production, console.error in dev for non-ENOENT failures).

The MDX renderer is `next-mdx-remote/rsc` with `remarkGfm`. Custom components passed to MDX: `YouTube`, `Instagram`, `SmartLink` (for `a`), `Image` (for both `img` markdown syntax and explicit `<Image>` calls — switches to captioned `<figure>` mode when `caption`/`credit`/`size`/`priority` props are set), plus `h2/h3/h4` wrappers that slugify the heading text into an `id` so the in-page TOC anchors work. `extractHeadings`/`extractFaqs`/`countWords` in `src/utils/extractHeadings.ts` parse the raw MDX string to build the desktop/mobile TOC, FAQ JSON-LD, and reading time — they regex over the markdown source, so heavy JSX in MDX may not be counted.

The "Related Articles" + "Browse other topics" sections on a post page read every other category's MDX files at build time to compute aggregate reading minutes. This I/O is paid once per deploy.

### Authors

`BLOG_AUTHORS` in `src/constants/blogs.ts` is keyed by slug. Each post's `author.href` must be a `BLOG_AUTHORS[slug].href` — the author page (`/blogs/authors/[author]`) and JSON-LD `Person`/`Organization` graphs both resolve through this map.

### Media & SEO conventions

- **All ImageKit assets** are served through `<ImageKit>` (`src/components/ImageKit.tsx`), which hard-codes `urlEndpoint="https://ik.imagekit.io/perseus"`. When building CDN URLs by hand (OG images, JSON-LD `ImageObject` crops), use `IMAGEKIT_BASE` from `@/constants` — do not duplicate the string.
- `next.config.ts` whitelists `ik.imagekit.io` as the only remote image pattern.
- OG/JSON-LD images use ImageKit's `tr=w-...,h-...,cm-extract,fo-auto` query params. Article JSON-LD emits the 1:1, 4:3, and 16:9 crops Google asks for (`articleImageSet` in `app/blogs/[blog]/page.tsx`).
- The sitemap (`src/app/sitemap.ts`) is generated from `blogPosts` + `BLOG_AUTHORS` + a hard-coded list of static pages — **adding a top-level route requires editing `sitemap.ts`**.
- `SITE_URL` (from `@/constants`) reads `NEXT_PUBLIC_SITE_URL` and defaults to `https://www.perseustudio.com`. Use it instead of hard-coding the domain.

### Global chrome

`src/app/layout.tsx` wraps everything in `<ReactLenis root>` (Lenis smooth-scrolling, re-exported from `src/utils/lenis.ts`) and renders `Navbar`, `Footer`, `ScrollProgress`, `SpotLight`, and `<Toaster>` once. Analytics are wired here: Google Analytics + GTM via `@next/third-parties/google`, Vercel `Analytics` + `SpeedInsights`, Microsoft Clarity (`src/app/metrics/MicrosoftClarity.tsx`), and a Contentsquare script loaded with `strategy="lazyOnload"`. Adding analytics elsewhere will double-fire — extend the existing setup in `layout.tsx`.

### Component organization

`src/components/index.ts` is the **barrel export** every page imports from. New shared components should be added there. Domain-specific subfolders mirror routes (`Home/`, `About/`, `Blogs/`, `Services/`, `Projects/`, `Websites/`, `Contact/`, `Mdx/`). The shadcn-style primitives live under `src/components/ui/` (configured in `components.json`, style `new-york`, alias `@/components/ui`, `@/lib/utils`).

### Styling

Tailwind CSS 4 with `@tailwindcss/postcss`, `@tailwindcss/typography`, and `tw-animate-css`. Global tokens and CSS variables are in `src/app/globals.css`. Conditional class merging uses `clsx` + `tailwind-merge` (re-exported as `cn` from `src/lib/utils.ts`).

## Conventions to respect

- **Server-first.** Only mark a component `'use client'` when it needs state, effects, or browser APIs. The blog index page passes server-read `searchParams` down to `<BlogPost>` as `initialCategory`/`initialQuery` specifically to avoid a `useSearchParams()` CSR bailout so crawlers see article links in initial HTML — don't refactor that into pure client state.
- **Blog routing is URL state, not routes.** Do not propose `/blogs/category/<slug>` pages; keep `/blogs?category=<slug>`.
- **Don't run git commands.** The maintainer handles all git operations; suggest commit messages instead of executing them.
- UI/redesign work: avoid generic agency/SaaS aesthetics (glass tiles, grayscale hover, soft drop-shadows) — distinctive design is the bar.
