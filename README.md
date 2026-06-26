# Perseus Creative Studio v2

A motion-heavy marketing site for Perseus Creative Studio built with the Next.js 16 **App Router**. It blends cinematic visuals, scroll-driven storytelling, and an MDX-backed blog to showcase services, projects, and client work.

The site is **front-end only** — no API routes, no database, no backend. All content lives in `src/constants/*` and `src/content/blogs/**/*.mdx`, and the contact form posts directly to EmailJS from the browser.

## Tech Stack

- **[Next.js 16](https://nextjs.org/)** (App Router, Turbopack) + **[React 19](https://react.dev/)** with TypeScript — server components by default; `'use client'` only where needed.
- **[Tailwind CSS 4](https://tailwindcss.com/)** via `@tailwindcss/postcss`, with `@tailwindcss/typography`, `tw-animate-css`, and `clsx` + `tailwind-merge` (re-exported as `cn`). shadcn-style primitives (`new-york`) live in `src/components/ui`.
- **Animation:** Framer Motion / `motion`, GSAP (`@gsap/react`), and Lenis smooth-scrolling.
- **3D / GL effects:** React Three Fiber + Drei, OGL, and `cobe` + `dotted-map` for the animated service-area globe/map.
- **Content & MDX:** `next-mdx-remote/rsc` + `remark-gfm` + `gray-matter` for the blog; `fuse.js` for client-side search.
- **Media:** Self-hosted images in `public/images`, served through `next/image` (the `<Img>` wrapper); unmigrated slots fall back to a shared placeholder via `resolveImageSrc` (`src/utils/images.ts`). Video embeds use `YouTube` / `Instagram`.
- **Icons:** `react-icons` (Lucide set via `react-icons/lu`, brand marks via `react-icons/si`).
- **Forms & UI:** `@emailjs/browser` (contact form), `sonner` (toasts), `radix-ui` / `@radix-ui/react-tabs` / `@headlessui/react`, `embla-carousel-react`, `swiper`.
- **Analytics:** Google Analytics + GTM (`@next/third-parties`), Microsoft Clarity, and Contentsquare — **consent-gated** through `ConsentGatedAnalytics`; Vercel Analytics + Speed Insights load unconditionally. All wired once in `layout.tsx`.

## Routes

Routes live under `src/app/`:

| Route | Notes |
| --- | --- |
| `/` | Home |
| `/about` | |
| `/services` | Services hub |
| `/services/[category]` | Category landing — categories driven by `src/constants` |
| `/services/[category]/[service]` | Service detail pages |
| `/projects` | |
| `/blogs` | Listing — filters are **URL state** (`?category=`, `?query=`, `?page=`), not separate routes |
| `/blogs/[blog]` | Post detail, statically generated from `blogPosts` |
| `/blogs/authors`, `/blogs/authors/[author]` | Author index & profiles |
| `/contact`, `/contact/careers` | |
| `/frequently-asked-questions` | |
| `/license`, `/privacy-policy`, `/terms-of-service` | |
| `/offline` | PWA offline fallback (`noindex`; served by the service worker) |

Permanent redirects are defined in `next.config.ts` (e.g. `/web-development → /services`, `/authors → /blogs/authors`).

## Project Structure

```
src/
├── app/                  # App Router routes, layout.tsx, manifest.json, sitemap.xml + sitemaps/*, robots, globals.css
├── components/           # Shared components (barrel: components/index.ts)
│   ├── About/  Blogs/  Contact/  Home/  Projects/  Services/  Mdx/
│   ├── Pwa/              # service-worker registration + offline banner
│   ├── kokonutui/        # bento-grid and related showcase blocks
│   └── ui/               # shadcn-style primitives
├── constants/            # Static data: index.ts, blogs.ts, about.ts, projects.ts, website.ts
├── content/blogs/        # MDX post bodies, one folder per category slug
├── hooks/                # Custom React hooks
├── lib/                  # cn (utils), sitemap builders, offline outbox (offlineDb, contactOutbox)
├── types/                # Shared TypeScript definitions
└── utils/                # lenis wrapper, MDX/heading extraction, pagination, helpers
```

The `@/*` path alias resolves to `src/*` — always import via `@/...`, and pull shared components from `@/components`.

## Content & Data

- **Blog posts** have two coupled sources of truth, both required when adding a post:
  1. A metadata entry in `src/constants/blogs.ts` (`blogPosts`) — drives routing, sitemap, SEO/JSON-LD, author/category cross-refs, prev/next.
  2. An MDX body at `src/content/blogs/<category-slug>/<slug>.mdx`, rendered with `next-mdx-remote/rsc`.
- **Authors** are keyed by slug in `BLOG_AUTHORS` (`src/constants/blogs.ts`); every byline, profile page, and `Person`/`Organization` JSON-LD resolves through it.
- **Sitemap** is a sitemap-index route handler at `src/app/sitemap.xml/route.ts` feeding child handlers in `src/app/sitemaps/{pages,blogs,authors,services}.xml/route.ts`. The URL data (blog posts, authors, and the static-pages list) is assembled in `src/lib/sitemap-sections.ts` using helpers in `src/lib/sitemap.ts` — **adding a top-level route means editing `src/lib/sitemap-sections.ts`**. Query/fragment URLs are never emitted.
- **SEO / structured data:** per-page `generateMetadata` with self-referencing canonicals; the `Organization` identity is declared once in `layout.tsx` and referenced by `@id` elsewhere. `breadcrumb` is emitted on `WebPage`-type nodes only.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **(Optional) Configure environment**

   The only meaningful variable is the canonical site URL, used for canonicals, sitemap, and JSON-LD:
   ```bash
   # .env.local
   NEXT_PUBLIC_SITE_URL=https://www.perseustudio.com
   ```
   It defaults to `https://www.perseustudio.com` when unset. EmailJS uses public client IDs configured in the contact component.
3. **Start the dev server**
   ```bash
   npm run dev
   ```
   The site runs at [http://localhost:3000](http://localhost:3000) with Turbopack enabled.

## Available Scripts

- `npm run dev` — start the dev server with Turbopack.
- `npm run build` — create an optimized production build. This is where **type-checking** happens (no standalone `tsc` script); note it runs TypeScript only, **not** ESLint.
- `npm run start` — serve the production build.
- `npm run lint` — run ESLint directly (`eslint .`) using `eslint-config-next`'s native flat configs (`core-web-vitals` + `typescript`). `next lint` was removed in Next 16.

> There is no test runner configured in this repo. Lint and type-check are two separate gates: `npm run lint` for ESLint, `npm run build` for types.

## Key Conventions

- **Server-first.** Only opt into `'use client'` for state, effects, or browser APIs.
- **Blog routing is URL state**, not routes — keep `/blogs?category=<slug>`; don't add `/blogs/category/<slug>` pages.
- **Images** go through `<Img>` (`next/image`): store a `/images/...` path, and anything else resolves to the shared placeholder. For OG/JSON-LD URLs use `OG_IMAGE` / `resolveImageUrl` (`src/utils/images.ts`), and `SITE_URL` instead of hard-coding the domain.
- **Global chrome** is wired once in `src/app/layout.tsx` (`ConsentProvider` → Lenis root → `ThemeProvider`): Navbar, Footer, ScrollProgress, SpotLight, Toaster, ConsentBanner, and the PWA components (OfflineBanner, ServiceWorkerRegister). Analytics are consent-gated via `ConsentGatedAnalytics` — extend there rather than re-adding per route.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture notes and contributor conventions.

## Progressive Web App / Offline

The site is an installable PWA with true offline support — not just an installable app shell.

- **Manifest:** `src/app/manifest.json` (served at `/manifest.json`, link auto-injected by Next) with `any` + `maskable` icons.
- **Service worker:** a hand-written `public/sw.js` (no `next-pwa`/`serwist` — Turbopack-safe, zero added dependencies). It precaches the app shell, serves visited pages network-first, hashed assets cache-first, and self-hosted images stale-while-revalidate, with versioned cache cleanup. Uncached routes fall back to a branded `/offline` page instead of the browser error.
- **Offline writes:** the contact form queues inquiries to IndexedDB when offline and auto-sends them via EmailJS on reconnect (`src/lib/offlineDb.ts`, `src/lib/contactOutbox.ts`). A slim top banner shows the offline state.
- **Registration:** the SW registers **only in production** (`npm run build && npm run start`) — it's disabled in `npm run dev` so it doesn't fight Turbopack HMR.

Quick local test:

```bash
npm run build && npm run start   # then open http://localhost:3000
```

Load a few pages, switch DevTools → Network to **Offline**, and reload — the app still opens and visited pages navigate. See [`OFFLINE.md`](./OFFLINE.md) for the full test checklist, what is/isn't cached, and Lighthouse guidance.

## Deployment

```bash
npm run build
npm run start
```

Deploys as a standard Next.js 16 app — built for Vercel, but runs anywhere supporting the App Router (Node 20.9+). Images are self-hosted under `public/images` and optimized by `next/image`, so no remote image hosts are configured.

## License

This repository is private to Perseus Creative Studio. All rights reserved.
