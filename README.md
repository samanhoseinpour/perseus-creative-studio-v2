# Perseus Creative Studio v2

A motion-heavy marketing site for Perseus Creative Studio built with the Next.js 15 **App Router**. It blends cinematic visuals, scroll-driven storytelling, and an MDX-backed blog to showcase services, projects, and client work.

The site is **front-end only** — no API routes, no database, no backend. All content lives in `src/constants/*` and `src/content/blogs/**/*.mdx`, and the contact form posts directly to EmailJS from the browser.

## Tech Stack

- **[Next.js 15](https://nextjs.org/)** (App Router) + **[React 19](https://react.dev/)** with TypeScript — server components by default; `'use client'` only where needed.
- **[Tailwind CSS 4](https://tailwindcss.com/)** via `@tailwindcss/postcss`, with `@tailwindcss/typography`, `tw-animate-css`, and `clsx` + `tailwind-merge` (re-exported as `cn`). shadcn-style primitives (`new-york`) live in `src/components/ui`.
- **Animation:** Framer Motion / `motion`, GSAP (`@gsap/react`), and Lenis smooth-scrolling.
- **3D / GL effects:** React Three Fiber + Drei, OGL, and `cobe` + `dotted-map` for the animated service-area globe/map.
- **Content & MDX:** `next-mdx-remote/rsc` + `remark-gfm` + `gray-matter` for the blog; `fuse.js` for client-side search.
- **Media:** ImageKit (`@imagekit/next`) through `<ImageKit>` / `<VideoKit>` wrappers (CDN endpoint `https://ik.imagekit.io/perseus`).
- **Icons:** `react-icons` (Lucide set via `react-icons/lu`, brand marks via `react-icons/si`).
- **Forms & UI:** `@emailjs/browser` (contact form), `sonner` (toasts), `radix-ui` / `@radix-ui/react-tabs` / `@headlessui/react`, `embla-carousel-react`, `swiper`.
- **Analytics:** Google Analytics + GTM (`@next/third-parties`), Vercel Analytics + Speed Insights, Microsoft Clarity, and Contentsquare — all wired once in `layout.tsx`.

## Routes

Routes live under `src/app/`:

| Route | Notes |
| --- | --- |
| `/` | Home |
| `/about` | |
| `/services` | Services hub |
| `/services/[category]` | Category landing (currently `production`) |
| `/services/[category]/[service]` | Service detail (currently `production/videography`) |
| `/projects` | |
| `/blogs` | Listing — filters are **URL state** (`?category=`, `?query=`, `?page=`), not separate routes |
| `/blogs/[blog]` | Post detail, statically generated from `blogPosts` |
| `/blogs/authors`, `/blogs/authors/[author]` | Author index & profiles |
| `/contact`, `/contact/careers` | |
| `/frequently-asked-questions` | |
| `/license`, `/privacy-policy`, `/terms-of-service` | |

Permanent redirects are defined in `next.config.ts` (e.g. `/web-development → /services`, `/authors → /blogs/authors`).

## Project Structure

```
src/
├── app/                  # App Router routes, layout.tsx, sitemap.ts, robots, globals.css
├── components/           # Shared components (barrel: components/index.ts)
│   ├── About/  Blogs/  Contact/  Home/  Projects/  Services/  Mdx/
│   ├── kokonutui/        # bento-grid and related showcase blocks
│   └── ui/               # shadcn-style primitives
├── constants/            # Static data: index.ts, blogs.ts, about.ts, projects.ts, website.ts
├── content/blogs/        # MDX post bodies, one folder per category slug
├── hooks/                # Custom React hooks
├── lib/                  # utils (cn, etc.)
├── types/                # Shared TypeScript definitions
└── utils/                # lenis wrapper, MDX/heading extraction, pagination, helpers
```

The `@/*` path alias resolves to `src/*` — always import via `@/...`, and pull shared components from `@/components`.

## Content & Data

- **Blog posts** have two coupled sources of truth, both required when adding a post:
  1. A metadata entry in `src/constants/blogs.ts` (`blogPosts`) — drives routing, sitemap, SEO/JSON-LD, author/category cross-refs, prev/next.
  2. An MDX body at `src/content/blogs/<category-slug>/<slug>.mdx`, rendered with `next-mdx-remote/rsc`.
- **Authors** are keyed by slug in `BLOG_AUTHORS` (`src/constants/blogs.ts`); every byline, profile page, and `Person`/`Organization` JSON-LD resolves through it.
- **Sitemap** (`src/app/sitemap.ts`) is generated from `blogPosts` + `BLOG_AUTHORS` + a hard-coded list of static pages — adding a top-level route means editing `sitemap.ts`.
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
   The site runs at [http://localhost:3000](http://localhost:3000) with TurboPack enabled.

## Available Scripts

- `npm run dev` — start the dev server with TurboPack.
- `npm run build` — create an optimized production build (also where type-checking happens; there is no standalone `tsc` script).
- `npm run start` — serve the production build.
- `npm run lint` — run ESLint (`next/core-web-vitals` + `next/typescript`).

> There is no test runner configured in this repo.

## Key Conventions

- **Server-first.** Only opt into `'use client'` for state, effects, or browser APIs.
- **Blog routing is URL state**, not routes — keep `/blogs?category=<slug>`; don't add `/blogs/category/<slug>` pages.
- **ImageKit assets** go through `<ImageKit>`; build CDN URLs with `IMAGEKIT_BASE` from `@/constants`, and use `SITE_URL` instead of hard-coding the domain.
- **Global chrome** (Navbar, Footer, ScrollProgress, SpotLight, Toaster, Lenis root, analytics) is wired once in `src/app/layout.tsx` — extend there rather than re-adding per route.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture notes and contributor conventions.

## Deployment

```bash
npm run build
npm run start
```

Deploys as a standard Next.js 15 app — built for Vercel, but runs anywhere supporting the App Router (Node 18.17+ or 20+). `next.config.ts` whitelists `ik.imagekit.io` as the only remote image host.

## License

This repository is private to Perseus Creative Studio. All rights reserved.
