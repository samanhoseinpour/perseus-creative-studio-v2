# Perseus Creative Studio v2

A motion-heavy marketing site — plus the studio's private admin dashboard — built with the Next.js 16 **App Router**. It blends cinematic visuals, scroll-driven storytelling, and a database-backed blog to showcase services, projects, and client work.

The app splits into two route groups. **`(marketing)`** is the public site: server-first and mostly static, with services content code-defined in `src/constants/*`; the blog lives in Postgres and is written in the dashboard. **`(admin)`** is a Better-Auth-protected dashboard where the team runs the studio: a shared task board, per-client monthly reports (with tokenized share links), a leaderboard, internal tickets, the contact/careers inbox, the portfolio (case studies, media, client roster), the careers listings, the blog editor, payroll, an audit log, users & per-area access, and article-feedback tallies. Data lives in **Neon Postgres** via **Drizzle ORM**; all mutations go through **server actions** (the `/api` surface is just the Better Auth handler plus six `CRON_SECRET`-gated cron endpoints), and portfolio and blog reads are cached + tag-invalidated so `/admin` edits go live **without a redeploy**.

## Tech Stack

- **[Next.js 16](https://nextjs.org/)** (App Router, Turbopack) + **[React 19](https://react.dev/)** with TypeScript — server components by default; `'use client'` only where needed. `src/proxy.ts` (Next 16's successor to `middleware.ts`) session-gates `/admin`.
- **[Tailwind CSS 4](https://tailwindcss.com/)** via `@tailwindcss/postcss`, with `@tailwindcss/typography`, `tw-animate-css`, and `clsx` + `tailwind-merge` (re-exported as `cn`). shadcn-style primitives (`new-york`) live in `src/components/ui`; `next-themes` powers the light/dark `ThemeProvider`.
- **Database:** Neon Postgres through **Drizzle ORM** (`src/db/` — app + Better Auth schemas, query modules; committed SQL migrations in `drizzle/`, managed with `drizzle-kit`). Portfolio content is read through `unstable_cache`-wrapped, tag-invalidated accessors in `src/lib/projectsStore.ts`.
- **Auth:** [Better Auth](https://better-auth.com) with email + password and **passkeys** (`@better-auth/passkey`). Public sign-up is disabled — team accounts are seeded (`npm run db:seed`), and per-area access lives on the user row.
- **Email & files:** **Resend** for contact/auth notification emails; **Vercel Blob** for uploads — career résumés, avatars, and ticket screenshots are stored `private` and served only through authenticated streaming route handlers; portfolio/client imagery is `public` (it renders to anonymous visitors on the marketing site).
- **Animation:** `motion` (Framer Motion) and Lenis smooth-scrolling (desktop-only via `SmartLenis`).
- **3D / GL effects:** React Three Fiber (Three.js) for the shader work, plus `cobe` for the animated service-area globes. (`dotted-map` is a build-time generator only — `scripts/generate-dotted-map.mjs` — never shipped to the client.)
- **Blog body:** Tiptap JSON (`@tiptap/static-renderer` on the server; `@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/extension-table`). `remark-gfm` is a devDependency, used only by the MDX importer (`src/lib/mdxToTiptap.ts`).
- **Media:** Self-hosted AVIFs in `public/images`, served through `next/image` — the server-only `<Img>` wrapper (or `<ImgClient>` in client components) with a **custom loader** (`src/lib/imageLoader.ts`) that maps each requested width to pre-generated static variants (`-384/-640/-960/-1280`, built by `npm run image-variants` together with the blur-up placeholder map `src/lib/imageBlur.generated.json`). The runtime image optimizer is **off**. Unmigrated slots fall back to a shared placeholder via `resolveImageSrc` (`src/utils/images.ts`). Admin-uploaded media lives in Vercel Blob and bypasses `<Img>`: portfolio imagery renders through `ProjectMediaImage` (`next/image` with a per-instance loader over the Blob variant rungs generated at upload), avatars through a native `<img>`. Video embeds use `YouTube` / `Instagram`; the About-page Instagram grid is a sandboxed Elfsight iframe (`IGFeed`).
- **Reviews:** the Google-reviews section is fetched server-side from the Places API (New) in `src/lib/googleReviews.ts` (`GOOGLE_PLACES_API_KEY`, never exposed to the client).
- **Icons:** `react-icons` (Lucide set via `react-icons/lu`, brand marks via `react-icons/si`).
- **Forms & UI:** the contact form posts through the `submitContact` **server action** with Zod validation, spam traps, and an IndexedDB offline outbox; `sonner` (toasts), `radix-ui` primitives, and `embla-carousel-react` (the shadcn carousel).
- **Analytics:** Google Tag Manager (`@next/third-parties`), which is how GA4 loads — there is no separate `<GoogleAnalytics>`, that duplicated the gtag load — plus Microsoft Clarity. All **consent-gated** through `ConsentGatedAnalytics`; Vercel Analytics + Speed Insights load unconditionally. All wired once in the `(marketing)` layout; `/admin` ships no trackers.

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
| `/projects/[category]` | Per-category case-study index — filters (`?service=`/`?industry=`/`?location=`) and pagination (`?page=`) are URL state; filter chips navigate crawl-silently via `NavButton` |
| `/projects/[category]/[project]` | Case-study detail — DB-driven; only projects flagged with a detail page get deep links |
| `/blogs` | Listing — filters are **URL state** (`?category=`, `?page=`), not separate routes |
| `/blogs/[blog]` | Post detail, statically generated from the blog store |
| `/blogs/authors`, `/blogs/authors/[author]` | Author index & profiles — read from the blog store; the profile route renders at request time for its `?page=` |
| `/contact`, `/contact/careers` | Contact hub + job listings — the listings, the hero copy, the meta description, and the JobPosting schema are DB-driven from `/admin/careers` |
| `/frequently-asked-questions` | |
| `/license`, `/privacy-policy`, `/terms-of-service` | |
| `/offline` | PWA offline fallback (`noindex`; served by the service worker) |
| `/admin` | Dashboard home (protected, `noindex`) |
| `/admin/tasks` | The team's work log. One URL, two views — the board and `?view=digest` (last 7 days). `/admin/tasks/export` streams CSV |
| `/admin/leaderboard` | The team's monthly standing (`?month=`, `?range=month\|d30\|all`) |
| `/admin/reports` | Per-client monthly reporting: roster + 12-month trend. `/admin/reports/internal` is the studio's own month |
| `/admin/reports/[slug]` | One client's month, plus `/print` (A4 sheet) and `/export` (CSV), and the mint/revoke UI for share links |
| `/admin/tickets` | Internal tickets, with screenshot upload/streaming. Filing is an area grant; triage is superadmin-only |
| `/admin/inquiries`, `/admin/applications` | Contact + careers inboxes: status triage, detail views, CSV exports, private résumé streaming |
| `/admin/projects`, `/admin/clients` | Portfolio management: case studies + media, client roster / logo wall |
| `/admin/careers` | Job openings + categories behind `/contact/careers`: open / filled / draft, pay ranges, posting dates |
| `/admin/blogs` | The blog: posts list, authors and categories. `/[id]` is the editor (autosave + explicit saves), `/[id]/revisions` the saved versions, `/[id]/preview` the draft rendered as the public page (outside `(protected)`, so it carries the real marketing chrome; `noindex`, and gated in the page by `requireArea('blogs')`) |
| `/admin/feedback` | "Was this article helpful?" vote tallies |
| `/admin/payroll` | Monthly team pay: month screen, `/members` roster, `/[memberId]`, `/export`. Owner-granted sensitive area |
| `/admin/my-pay` | A member's own pay history — gated on their own payroll record, not on an area grant |
| `/admin/payroll/payslip/[memberId]/[month]` | Shared payslip; re-derives its audience from the session, so the id in the URL grants nothing |
| `/admin/users` | Accounts, roles & per-area access |
| `/admin/logs` | The site-wide audit trail. Owner-granted sensitive area |
| `/admin/profile` | Self-service: avatar, name, password, passkeys, sessions |
| `/admin/presence` | POST-only heartbeat that stamps the caller's own `last_seen_at` (a route handler, not an action — see `CLAUDE.md`) |
| `/admin/avatars/[userId]` | Authenticated avatar streaming out of the private Blob store |
| `/admin/login`, `/admin/reset-password` | The only unauthenticated admin paths (enforced by `src/proxy.ts`) |
| `/share/reports/[token]` | Tokenized, read-only public client report. Outside both route groups; `noindex`, `force-dynamic` so revocation bites immediately |
| `/api/auth/[...all]` | Better Auth handler |
| `/api/cron/*` | Six `CRON_SECRET`-gated endpoints — `recurring-tasks`, `weekly-digest`, `due-reminders`, `payroll-nudge`, `monitoring`, `blog-publish` — scheduled by `vercel.json` |

Permanent redirects are defined in `next.config.ts` (e.g. `/web-development → /services/websites/website-development`, `/authors → /blogs/authors`).

## Project Structure

```
src/
├── app/
│   ├── (marketing)/          # public site + its layout (Navbar/Footer/Lenis/analytics/PWA chrome)
│   ├── (admin)/admin/        # login, reset-password, and the (protected)/ dashboard shell
│   ├── share/reports/[token]/  # tokenized public client report — outside both route groups
│   ├── api/auth/[...all]/    # Better Auth route handler
│   ├── api/cron/             # recurring-tasks, weekly-digest, due-reminders, payroll-nudge,
│   │                         # monitoring, blog-publish
│   ├── layout.tsx            # root: font, ConsentProvider → ThemeProvider, Toaster
│   └── manifest.json, sitemap.xml/ + sitemaps/*, robots.txt, favicon.ico, globals.css
├── components/               # Shared components (barrel: components/index.ts — pages/layouts only)
│   ├── About/  Admin/  Blogs/  Contact/  Home/  Mdx/  Projects/  Services/
│   ├── Pwa/                  # service-worker registration + offline banner
│   └── ui/                   # shadcn-style primitives
├── constants/                # Code-defined content: services.ts, projects.ts (category chrome), faq.ts,
│                             # blogs.ts (the superseded importer registry, pending removal), …
├── content/blogs/            # MDX post bodies — the superseded importer corpus, pending removal
├── db/                       # Drizzle schemas (schema.ts + auth-schema.ts), db clients, and the query
│                             # modules: admin, portfolio, task, ticket, payroll, activity, blog
├── hooks/                    # Custom React hooks
├── lib/                      # ~60 modules on a one-door-per-concern rule: calendar (the only timezone door),
│                             # payrollAmounts (the only money door), mail, activityLog, adminAccess (the
│                             # authorization seam), projectsStore, URL-state contracts, zod schemas,
│                             # image loader/variants/blur map, sitemap builders — see CLAUDE.md for the map
├── instrumentation.ts        # onRequestError — catches every server throw, including post-stream ones
├── proxy.ts                  # optimistic session-cookie gate for /admin
└── utils/                    # lenis wrapper, MDX heading extraction (importer + legacy), pagination, helpers
drizzle/                      # committed SQL migrations (never `drizzle-kit push`)
scripts/                      # image tooling, DB seeders, the blog importer, the IndexNow + PSI
                              # runners, and a set of one-off .mts self-checks (see CLAUDE.md)
```

The `@/*` path alias resolves to `src/*` — always import via `@/...`. The `@/components` barrel is for **pages/layouts only**; components import each other by direct path (`@/components/Button`, `./BlogCard`, …) so Turbopack's export-level tree-shaking keeps route chunks slim — see `CLAUDE.md`.

## Content & Data

- **Blog posts** are rows in `blog_posts` + `blog_post_revisions`, read through `src/lib/blogStore.ts` (cached and tag-invalidated, like the portfolio); the body is Tiptap JSON rendered on the server. They are written at `/admin/blogs`. Three things about that are worth knowing before touching it: the editor writes a **working copy** while the public renders the **published revision**, so an explicit Save on a live post deliberately changes nothing a reader sees until you publish; autosave invalidates *no* cache at all (every prerendered marketing page carries the `blogs` tag, so a keystroke timer would re-render the whole public site); and status moves through its own doors, never through a save. `npm run db:import-blogs` is the superseded cutover path, still in the tree pending removal — a post the editor has touched is skipped by it for good, so it can never overwrite an edit.
- **Scheduled posts** are published by `/api/cron/blog-publish` every 15 minutes, so a post can go live up to that long after the minute the writer picked. It shares the monitoring slot on purpose (a scale-to-zero Neon database is already awake at that minute) and must invalidate through `invalidateBlogFromCron`: `updateTag` throws outside a server action, and `revalidateTag(tag, 'max')` is stale-while-revalidate rather than expire, which would serve `/blogs` its pre-publish snapshot. See `src/lib/blogInvalidate.ts`.
- **Authors** are `blog_authors` rows managed from the posts list; every byline, profile page, and `Person`/`Organization` JSON-LD resolves through the store. `src/lib/adminIdentity.ts` is deliberately **not** wired to them: a dashboard account and a blog byline are two different things.
- **Portfolio** splits between code and database: `src/constants/projects.ts` holds only category *chrome* (hero/FAQ/SEO copy and the site-wide category order), while case studies, their media, and the client roster live in Postgres (`projects`, `project_media`, `clients`) behind the cached accessors in `src/lib/projectsStore.ts`. The `/admin` actions invalidate by cache tag, so edits appear on the live site without a redeploy. The Partners logo marquee is DB-driven too (`getPartnerLogos`).
- **Contact inbox:** the `submitContact` server action (`src/app/(marketing)/contact/actions.ts`) validates with Zod, dedups retries on a client-generated `client_id`, stores rows in `contact_submissions` (spam is flagged, not dropped), uploads PDF résumés to private Vercel Blob, and emails notifications via Resend.
- **Article feedback:** the blog's "Was this article helpful?" widget upserts votes through a server action into `article_feedback`; tallies surface at `/admin/feedback`.
- **Sitemap** is a sitemap-index route handler at `src/app/sitemap.xml/route.ts` feeding child handlers in `src/app/sitemaps/{pages,blogs,authors,projects,services}.xml/route.ts`. The URL data (blog posts, authors, projects, services, and the static-pages list) is assembled in `src/lib/sitemap-sections.ts` using helpers in `src/lib/sitemap.ts` — **adding a top-level page means adding it to `CORE_PAGES` in `src/lib/sitemap-sections.ts`**. Query/fragment URLs are never emitted.
- **SEO / structured data:** per-page `generateMetadata` with self-referencing canonicals; the `Organization` identity is declared once and referenced by `@id` elsewhere. `breadcrumb` is emitted on `WebPage`-type nodes only.

## Admin dashboard

Better Auth (email + password, passkeys) on the same Neon database. There is **no public sign-up** — accounts are created by `npm run db:seed`.

**Access is three tiers plus per-area grants.** `owner` (exactly one account, holds every area implicitly) > `superadmin` (role privileges — the users page, ticket triage — *plus* stored area grants like everyone else) > `member` (stored grants only). **Role changes happen only via SQL/migration**, and the owner row refuses reset and delete from everyone, so a total lockout is structurally impossible.

Every admin surface is its own grantable area (`src/lib/adminAreas.ts`): `inquiries`, `applications`, `tickets`, `feedback`, `projects`, `clients`, `careers`, `blogs`, `tasks`, `leaderboard`, `reports`, `payroll`, `costs`, `logs`, `monitoring`. Four of them — **`payroll`, `costs`, `logs` and `monitoring`** — are *sensitive*: their chips render for anyone who can open `/admin/users`, but only the owner may flip them, enforced server-side, and they stay contiguous at the tail of the list because the toggles draw their divider before the first one. The pre-ticked set for a new account is an explicit curated list, not "all areas", so a future area can never silently pre-tick itself. `src/proxy.ts` optimistically bounces sessionless visitors to `/admin/login`; the real authorization boundary is the `(protected)/layout.tsx` server component, which validates every session against the database. All admin mutations are server actions under `src/app/(admin)/admin/(protected)/_actions/`; private uploads (résumés, avatars, ticket screenshots) are served only through authenticated streaming routes.

Three design rules shape the dashboard's data layer, and all three are load-bearing rather than stylistic:

- **Payroll has two query projections, and the split *is* the privacy mechanism.** `admin*` queries see every column for every member; `own*` queries are scoped to one member in SQL and never *select* the company's cost, the wire fee, or an admin's private notes. A column that was never selected can't leak through a spread or an RSC payload — so never widen an `own*` query to reuse it on an admin screen.
- **The audit log is payload-free by construction.** `activity_log` accepts scalars only (a `{...row}` spread is a type error), and a runtime denylist refuses secrets and every payroll figure. That is what makes the log safe to grant to a wider audience than payroll itself.
- **Every date a signed-in person reads resolves in their own timezone**, derived from the browser and stored on the user row — the studio spans Vancouver and Tehran, 11.5 hours apart. `src/lib/calendar.ts` is the only module allowed to name a timezone; a formatter with no `timeZone` option is a bug, not a viewer-local default, because on Vercel the runtime zone is UTC.

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
   RESEND_API_KEY=…                     # contact, ticket, task and cron emails
   BLOB_READ_WRITE_TOKEN=…              # PRIVATE blob store: résumés, avatars, ticket screenshots
   PUBLIC_BLOB_READ_WRITE_TOKEN=…       # PUBLIC blob store: client logos + project media
   GOOGLE_PLACES_API_KEY=…              # Google-reviews section (server-only)
   CRON_SECRET=…                        # Bearer token the six /api/cron endpoints require
   PSI_API_KEY=…                        # only for `npm run psi`
   NEXT_PUBLIC_SITE_URL=https://www.perseustudio.com   # optional; this is the default
   ```

   Only `DATABASE_URL` is required to build and browse — prerendered pages read the portfolio at build time. The rest unlock their features (admin login, emails, uploads, reviews, crons). On Vercel, `DATABASE_URL` comes from the Neon integration.

   **The two Blob tokens are not interchangeable.** A Vercel Blob store's access mode is fixed at creation, so this project uses two: private for anything that streams through an authenticated route (résumés, avatars, ticket screenshots) and public for imagery that renders to anonymous visitors (client logos, project media). `src/lib/publicBlob.ts` deliberately has **no fallback** to `BLOB_READ_WRITE_TOKEN` — without `PUBLIC_BLOB_READ_WRITE_TOKEN`, portfolio uploads are disabled rather than silently written to the wrong store. Server secrets are never `NEXT_PUBLIC_*`.
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
- `npm run image-variants` — (re)generate the responsive `-384/-640/-960/-1280` image variants **and** the blur-placeholder map (`node scripts/generate-image-variants.mjs`, idempotent). Run it after adding images to `public/images` and commit the generated files.
- `npm run db:generate` / `npm run db:migrate` — drizzle-kit workflow for schema changes: edit `src/db/schema.ts` → `db:generate` → `db:migrate` → commit `drizzle/`. **Never `drizzle-kit push`** — the schema needs migration history.
- `npm run db:studio` — Drizzle Studio, the local read/write GUI over the Neon tables.
- `npm run db:seed` — seed the admin accounts (idempotent; prints one-time temp passwords).
- `npm run db:seed-clients` — seed the ~84 logo-wall clients with marquee membership/order.
- `npm run db:seed-bios` — fill missing client bios with researched drafts (internal reference copy).
- `npm run db:import-blogs` — import `src/constants/blogs.ts` + `src/content/blogs/**` into the `blog_*` tables (dry-run by default; `-- --apply` writes). The blog content path until the /admin editor ships; invalidate the `blogs` cache tag afterwards, since a redeploy alone won't refresh the store.
- `npm run indexnow` — ping IndexNow (Bing, and through it Copilot / ChatGPT search grounding) with changed URLs. **Run it after a content change deploys** — `npm run indexnow -- /blogs/<slug>`, or `-- --sitemap services` after services copy. Never ping an unchanged URL; false freshness is a spam signal.
- `npm run psi` — PageSpeed Insights v5 against the **live production site** (Lighthouse scores, lab metrics, CrUX field data, mobile + desktop). Local changes don't move these numbers until deployed.

**Self-checks.** There is no test runner, but a set of one-off scripts pins the things whose failures would be silent. Run the relevant one after touching what it covers (CLAUDE.md's Commands section lists them all):

```bash
node --import tsx scripts/check-payroll.mts                              # money math, proration, status matrix
node --env-file=.env.local --import tsx scripts/verify-payroll-db.mts    # the same figures round-tripped through Neon
node --env-file=.env.local --import tsx scripts/check-activity-log.mts   # the audit-log redaction denylist
node --import tsx scripts/check-calendar.mts                             # the two-clocks timezone contract
node --import tsx scripts/check-blog-body.mts                            # the blog body vocabulary, href guard, renderer
node --import tsx scripts/check-blogs.mts                                # the blog editor: states, fingerprints, invalidation
node --conditions=react-server --import tsx scripts/check-releases.mts   # the changelog's ordering, audiences and links
```

Each is safe to re-run: the ones that touch the database prefix their rows and sweep them in a `finally`. Two caveats. `check-releases.mts` needs `--conditions=react-server` because the registry is `server-only`, and stripping that guard is the obvious wrong fix. And `check-blogs.mts --db` and `check-blog-body.mts --db` share the `zz-check-` fixture prefix, so never run both at once.

> There is no test runner configured in this repo. Lint and type-check are two separate gates: `npm run lint` for ESLint, `npm run build` for types.

## Key Conventions

- **Server-first.** Only opt into `'use client'` for state, effects, or browser APIs.
- **Blog routing is URL state**, not routes — keep `/blogs?category=<slug>`; don't add `/blogs/category/<slug>` pages.
- **Parameterised views are crawl-silent.** Filtered project views and contact prefills navigate through `NavButton` (`router.push`), never `<a href>`, so those URLs stay out of the crawl graph; `robots.txt` stays allow-all except `/admin` + `/api/`. Pagination and `/blogs?category=` remain real links — see `CLAUDE.md`.
- **Images** go through `<Img>` (server) / `<ImgClient>` (client): store a `/images/...` path — anything else resolves to the shared placeholder — and run `npm run image-variants` after adding assets. For OG/JSON-LD URLs use `OG_IMAGE` / `resolveImageUrl` (`src/utils/images.ts`), and `SITE_URL` instead of hard-coding the domain.
- **Global chrome** is layered: the root layout holds providers (`ConsentProvider` → `ThemeProvider`, `Toaster`), while `src/app/(marketing)/layout.tsx` renders the public chrome — `SmartLenis`, Navbar, Footer, ScrollProgress, SpotLight, ConsentBanner, and the PWA components (OfflineBanner, ServiceWorkerRegister). Analytics are consent-gated via `ConsentGatedAnalytics` — extend there rather than re-adding per route. `/admin` has its own shell with none of this.
- **Database changes are migrations.** Edit the schema, `db:generate`, `db:migrate`, commit `drizzle/` — never `drizzle-kit push`.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture notes and contributor conventions.

## Progressive Web App / Offline

The site is an installable PWA with true offline support — not just an installable app shell.

- **Manifest:** `src/app/manifest.json` (served at `/manifest.json`, link auto-injected by Next) with `any` + `maskable` icons.
- **Service worker:** a hand-written `public/sw.js` (no `next-pwa`/`serwist` — Turbopack-safe, zero added dependencies). It precaches the app shell, serves visited pages network-first, hashed assets cache-first, and self-hosted images stale-while-revalidate, with versioned cache cleanup. Uncached routes fall back to a branded `/offline` page instead of the browser error. It **never touches `/admin`, `/api/*`, or `/share/*`** — the authenticated area and the tokenized client-report links are online-only, so nothing from them lands in Cache Storage (a revoked share must not stay readable from cache).
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
