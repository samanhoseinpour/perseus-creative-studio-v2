# Perseus Creative Studio v2

A motion-heavy marketing site — plus the studio's private admin dashboard — built with the Next.js 16 **App Router**. It blends cinematic visuals, scroll-driven storytelling, and an MDX-backed blog to showcase services, projects, and client work.

The app splits into two route groups. **`(marketing)`** is the public site: server-first and mostly static, with services/blog content code-defined in `src/constants/*` and `src/content/blogs/**/*.mdx` (no CMS). **`(admin)`** is a Better-Auth-protected dashboard where the team manages the portfolio (case studies, media, client roster), the contact/careers inbox, internal tickets, users, and article-feedback tallies. Data lives in **Neon Postgres** via **Drizzle ORM**; all mutations go through **server actions** (the only `/api` route is the Better Auth handler), and portfolio reads are cached + tag-invalidated so `/admin` edits go live **without a redeploy**.

## Tech Stack

- **[Next.js 16](https://nextjs.org/)** (App Router, Turbopack) + **[React 19](https://react.dev/)** with TypeScript — server components by default; `'use client'` only where needed. `src/proxy.ts` (Next 16's successor to `middleware.ts`) session-gates `/admin`.
- **[Tailwind CSS 4](https://tailwindcss.com/)** via `@tailwindcss/postcss`, with `@tailwindcss/typography`, `tw-animate-css`, and `clsx` + `tailwind-merge` (re-exported as `cn`). shadcn-style primitives (`new-york`) live in `src/components/ui`; `next-themes` powers the light/dark `ThemeProvider`.
- **Database:** Neon Postgres through **Drizzle ORM** (`src/db/` — app + Better Auth schemas, query modules; committed SQL migrations in `drizzle/`, managed with `drizzle-kit`). Portfolio content is read through `unstable_cache`-wrapped, tag-invalidated accessors in `src/lib/projectsStore.ts`.
- **Auth:** [Better Auth](https://better-auth.com) with email + password and **passkeys** (`@better-auth/passkey`). Public sign-up is disabled — team accounts are seeded (`npm run db:seed`), and per-area access lives on the user row.
- **Email & files:** **Resend** for contact/auth notification emails; **Vercel Blob** for uploads (career résumés, admin avatars, ticket screenshots, portfolio media) — private files are served only through authenticated streaming route handlers.
- **Animation:** `motion` (Framer Motion) and Lenis smooth-scrolling (desktop-only via `SmartLenis`).
- **3D / GL effects:** React Three Fiber (Three.js) for the shader work, plus `cobe` for the animated service-area globes. (`dotted-map` is a build-time generator only — `scripts/generate-dotted-map.mjs` — never shipped to the client.)
- **Content & MDX:** `next-mdx-remote/rsc` + `remark-gfm` + `gray-matter` for the blog.
- **Media:** Self-hosted AVIFs in `public/images`, served through `next/image` — the server-only `<Img>` wrapper (or `<ImgClient>` in client components) with a **custom loader** (`src/lib/imageLoader.ts`) that maps each requested width to pre-generated static variants (`-384/-640/-960`, built by `npm run image-variants` together with the blur-up placeholder map `src/lib/imageBlur.generated.json`). The runtime image optimizer is **off**. Unmigrated slots fall back to a shared placeholder via `resolveImageSrc` (`src/utils/images.ts`). Admin-uploaded media (portfolio imagery, avatars) lives in Vercel Blob and renders outside `next/image`. Video embeds use `YouTube` / `Instagram`; the About-page Instagram grid is a sandboxed Elfsight iframe (`IGFeed`).
- **Reviews:** the Google-reviews section is fetched server-side from the Places API (New) in `src/lib/googleReviews.ts` (`GOOGLE_PLACES_API_KEY`, never exposed to the client).
- **Icons:** `react-icons` (Lucide set via `react-icons/lu`, brand marks via `react-icons/si`).
- **Forms & UI:** the contact form posts through the `submitContact` **server action** with Zod validation, spam traps, and an IndexedDB offline outbox; `sonner` (toasts), `radix-ui` primitives, and `embla-carousel-react` (the shadcn carousel).
- **Analytics:** Google Analytics + GTM (`@next/third-parties`) and Microsoft Clarity — **consent-gated** through `ConsentGatedAnalytics`; Vercel Analytics + Speed Insights load unconditionally. All wired once in the `(marketing)` layout; `/admin` ships no trackers.

## Routes

Public routes live under `src/app/(marketing)/`, the dashboard under `src/app/(admin)/` (route groups don't affect URLs):

| Route | Notes |
| --- | --- |
| `/` | Home |
| `/about` | |
| `/services` | Services hub |
| `/services/[category]` | Category landing — categories driven by `src/constants` |
| `/services/[category]/[service]` | Service detail pages |
| `/projects` | Projects hub |
| `/projects/[category]` | Per-category case-study index — in-category pagination is `?page=` URL state |
| `/projects/[category]/[project]` | Case-study detail — DB-driven; only projects flagged with a detail page get deep links |
| `/blogs` | Listing — filters are **URL state** (`?category=`, `?page=`), not separate routes |
| `/blogs/[blog]` | Post detail, statically generated from `blogPosts` |
| `/blogs/authors`, `/blogs/authors/[author]` | Author index & profiles |
| `/contact`, `/contact/careers` | |
| `/frequently-asked-questions` | |
| `/license`, `/privacy-policy`, `/terms-of-service` | |
| `/offline` | PWA offline fallback (`noindex`; served by the service worker) |
| `/admin` | Dashboard home (protected, `noindex`) |
| `/admin/inquiries`, `/admin/applications` | Contact + careers inboxes: status triage, detail views, CSV exports, private résumé streaming |
| `/admin/tickets` | Internal tickets, with screenshot upload/streaming |
| `/admin/projects`, `/admin/clients` | Portfolio management: case studies + media, client roster / logo wall |
| `/admin/users` | Accounts & per-area access |
| `/admin/feedback` | "Was this article helpful?" vote tallies |
| `/admin/profile` | Self-service: avatar, name, password, passkeys, sessions |
| `/admin/login`, `/admin/reset-password` | The only unauthenticated admin paths (enforced by `src/proxy.ts`) |
| `/api/auth/[...all]` | Better Auth handler — the repo's only `/api` route |

Permanent redirects are defined in `next.config.ts` (e.g. `/web-development → /services/websites/website-development`, `/authors → /blogs/authors`).

## Project Structure

```
src/
├── app/
│   ├── (marketing)/          # public site + its layout (Navbar/Footer/Lenis/analytics/PWA chrome)
│   ├── (admin)/admin/        # login, reset-password, and the (protected)/ dashboard shell
│   ├── api/auth/[...all]/    # Better Auth route handler
│   ├── layout.tsx            # root: font, ConsentProvider → ThemeProvider, Toaster
│   └── manifest.json, sitemap.xml/ + sitemaps/*, robots.txt, globals.css
├── components/               # Shared components (barrel: components/index.ts — pages/layouts only)
│   ├── About/  Admin/  Blogs/  Contact/  Home/  Mdx/  Projects/  Services/
│   ├── Pwa/                  # service-worker registration + offline banner
│   └── ui/                   # shadcn-style primitives
├── constants/                # Code-defined content: services.ts, blogs.ts, projects.ts (category chrome), faq.ts, …
├── content/blogs/            # MDX post bodies, one folder per category slug
├── db/                       # Drizzle schemas (app + auth), db clients, admin/portfolio/ticket query modules
├── hooks/                    # Custom React hooks
├── lib/                      # projectsStore (cached portfolio reads), auth, admin helpers, contact schema/outbox,
│                             # image loader/variants/blur map, navigation data, sitemap builders, googleReviews, cn
├── proxy.ts                  # optimistic session-cookie gate for /admin
└── utils/                    # lenis wrapper, MDX/heading extraction, pagination, helpers
drizzle/                      # committed SQL migrations (never `drizzle-kit push`)
scripts/                      # image tooling + DB seeders (admins, clients, client bios)
```

The `@/*` path alias resolves to `src/*` — always import via `@/...`. The `@/components` barrel is for **pages/layouts only**; components import each other by direct path (`@/components/Button`, `./BlogCard`, …) so Turbopack's export-level tree-shaking keeps route chunks slim — see `CLAUDE.md`.

## Content & Data

- **Blog posts** have two coupled sources of truth, both required when adding a post:
  1. A metadata entry in `src/constants/blogs.ts` (`blogPosts`) — drives routing, sitemap, SEO/JSON-LD, author/category cross-refs, prev/next.
  2. An MDX body at `src/content/blogs/<category-slug>/<slug>.mdx`, rendered with `next-mdx-remote/rsc`.
- **Authors** are keyed by slug in `BLOG_AUTHORS` (`src/constants/blogs.ts`); every byline, profile page, and `Person`/`Organization` JSON-LD resolves through it.
- **Portfolio** splits between code and database: `src/constants/projects.ts` holds only category *chrome* (hero/FAQ/SEO copy and the site-wide category order), while case studies, their media, and the client roster live in Postgres (`projects`, `project_media`, `clients`) behind the cached accessors in `src/lib/projectsStore.ts`. The `/admin` actions invalidate by cache tag, so edits appear on the live site without a redeploy. The Partners logo marquee is DB-driven too (`getPartnerLogos`).
- **Contact inbox:** the `submitContact` server action (`src/app/(marketing)/contact/actions.ts`) validates with Zod, dedups retries on a client-generated `client_id`, stores rows in `contact_submissions` (spam is flagged, not dropped), uploads PDF résumés to private Vercel Blob, and emails notifications via Resend.
- **Article feedback:** the blog's "Was this article helpful?" widget upserts votes through a server action into `article_feedback`; tallies surface at `/admin/feedback`.
- **Sitemap** is a sitemap-index route handler at `src/app/sitemap.xml/route.ts` feeding child handlers in `src/app/sitemaps/{pages,blogs,authors,projects,services}.xml/route.ts`. The URL data (blog posts, authors, projects, services, and the static-pages list) is assembled in `src/lib/sitemap-sections.ts` using helpers in `src/lib/sitemap.ts` — **adding a top-level page means adding it to `CORE_PAGES` in `src/lib/sitemap-sections.ts`**. Query/fragment URLs are never emitted.
- **SEO / structured data:** per-page `generateMetadata` with self-referencing canonicals; the `Organization` identity is declared once and referenced by `@id` elsewhere. `breadcrumb` is emitted on `WebPage`-type nodes only.

## Admin dashboard

Better Auth (email + password, passkeys) on the same Neon database. There is **no public sign-up** — accounts are created by `npm run db:seed`, access is granted per area on the user row, and superadmin promotion happens only via SQL. `src/proxy.ts` optimistically bounces sessionless visitors to `/admin/login`; the real authorization boundary is the `(protected)/layout.tsx` server component, which validates every session against the database. All admin mutations are server actions under `src/app/(admin)/admin/(protected)/_actions/`; private uploads (résumés, avatars, ticket screenshots) are served only through authenticated streaming routes.

There is no in-app database viewer — browse/inspect the tables with **Drizzle Studio** (`npm run db:studio`).

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment** (`.env.local`)

   ```bash
   DATABASE_URL=postgres://…            # Neon — REQUIRED, even for `npm run build`
   BETTER_AUTH_SECRET=…                 # /admin session signing
   BETTER_AUTH_URL=http://localhost:3000
   RESEND_API_KEY=…                     # contact + auth notification emails
   BLOB_READ_WRITE_TOKEN=…              # Vercel Blob uploads
   GOOGLE_PLACES_API_KEY=…              # Google-reviews section (server-only)
   NEXT_PUBLIC_SITE_URL=https://www.perseustudio.com   # optional; this is the default
   ```

   Only `DATABASE_URL` is required to build and browse — prerendered pages read the portfolio at build time. The rest unlock their features (admin login, emails, uploads, reviews). On Vercel, `DATABASE_URL` comes from the Neon integration.
3. **Apply migrations & seed** (first run)
   ```bash
   npm run db:migrate
   npm run db:seed          # admin accounts (optional locally)
   npm run db:seed-clients  # logo-wall clients (optional)
   ```
4. **Start the dev server**
   ```bash
   npm run dev
   ```
   The site runs at [http://localhost:3000](http://localhost:3000) with Turbopack enabled.

## Available Scripts

- `npm run dev` — start the dev server with Turbopack.
- `npm run build` — create an optimized production build. This is where **type-checking** happens (no standalone `tsc` script); note it runs TypeScript only, **not** ESLint. Requires a reachable `DATABASE_URL`.
- `npm run start` — serve the production build.
- `npm run lint` — run ESLint directly (`eslint .`) using `eslint-config-next`'s native flat configs (`core-web-vitals` + `typescript`). `next lint` was removed in Next 16.
- `npm run optimize-images` — shrink any over-budget asset in `public/images` in place (`node scripts/optimize-images.mjs`, quality-safe).
- `npm run image-variants` — (re)generate the responsive `-384/-640/-960` image variants **and** the blur-placeholder map (`node scripts/generate-image-variants.mjs`, idempotent). Run it after adding images to `public/images` and commit the generated files.
- `npm run db:generate` / `npm run db:migrate` — drizzle-kit workflow for schema changes: edit `src/db/schema.ts` → `db:generate` → `db:migrate` → commit `drizzle/`. **Never `drizzle-kit push`** — the schema needs migration history.
- `npm run db:studio` — Drizzle Studio, the local read/write GUI over the Neon tables.
- `npm run db:seed` — seed the admin accounts (idempotent; prints one-time temp passwords).
- `npm run db:seed-clients` — seed the ~84 logo-wall clients with marquee membership/order.
- `npm run db:seed-bios` — fill missing client bios with researched drafts (internal reference copy).

> There is no test runner configured in this repo. Lint and type-check are two separate gates: `npm run lint` for ESLint, `npm run build` for types.

## Key Conventions

- **Server-first.** Only opt into `'use client'` for state, effects, or browser APIs.
- **Blog routing is URL state**, not routes — keep `/blogs?category=<slug>`; don't add `/blogs/category/<slug>` pages.
- **Images** go through `<Img>` (server) / `<ImgClient>` (client): store a `/images/...` path — anything else resolves to the shared placeholder — and run `npm run image-variants` after adding assets. For OG/JSON-LD URLs use `OG_IMAGE` / `resolveImageUrl` (`src/utils/images.ts`), and `SITE_URL` instead of hard-coding the domain.
- **Global chrome** is layered: the root layout holds providers (`ConsentProvider` → `ThemeProvider`, `Toaster`), while `src/app/(marketing)/layout.tsx` renders the public chrome — `SmartLenis`, Navbar, Footer, ScrollProgress, SpotLight, ConsentBanner, and the PWA components (OfflineBanner, ServiceWorkerRegister). Analytics are consent-gated via `ConsentGatedAnalytics` — extend there rather than re-adding per route. `/admin` has its own shell with none of this.
- **Database changes are migrations.** Edit the schema, `db:generate`, `db:migrate`, commit `drizzle/` — never `drizzle-kit push`.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture notes and contributor conventions.

## Progressive Web App / Offline

The site is an installable PWA with true offline support — not just an installable app shell.

- **Manifest:** `src/app/manifest.json` (served at `/manifest.json`, link auto-injected by Next) with `any` + `maskable` icons.
- **Service worker:** a hand-written `public/sw.js` (no `next-pwa`/`serwist` — Turbopack-safe, zero added dependencies). It precaches the app shell, serves visited pages network-first, hashed assets cache-first, and self-hosted images stale-while-revalidate, with versioned cache cleanup. Uncached routes fall back to a branded `/offline` page instead of the browser error. It **never touches `/admin` or `/api/*`** — the authenticated area is online-only and nothing from it lands in Cache Storage.
- **Offline writes:** the contact form queues submissions (résumé included) to IndexedDB when offline and replays them through the `submitContact` server action on reconnect (`src/lib/offlineDb.ts`, `src/lib/contactOutbox.ts`); a unique `client_id` makes replays idempotent. A slim top banner shows the offline state.
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

Deploys as a standard Next.js 16 app — built for Vercel, but runs anywhere supporting the App Router (Node 20.9+) **plus a reachable Postgres**: `npm run build` reads the portfolio through `src/lib/projectsStore.ts` while prerendering (on Vercel the Neon integration provides `DATABASE_URL`; the remaining secrets are set as project env vars). Static images are self-hosted under `public/images` as pre-generated AVIF variants served through a custom `next/image` loader — no runtime image optimization and no remote image hosts. `next.config.ts` also sets baseline security headers on every response (HSTS, nosniff, referrer/frame/permissions policies) and immutable caching for `/images/*`.

## License

This repository is private to Perseus Creative Studio. All rights reserved.
