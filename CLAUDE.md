# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server with TurboPack on http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — runs the ESLint CLI directly (`eslint .`) against `eslint-config-next`'s **native flat configs** (`core-web-vitals` + `typescript`) in `eslint.config.mjs`. `next lint` was removed in Next 16, so don't reintroduce it.
- `npm run optimize-images` — `node scripts/optimize-images.mjs`, shrinks any over-budget asset in `public/images` in place (quality-safe; wrapped by the `/optimize-images` skill). `scripts/` also holds one-off image tooling not wired to npm: `migrate-images-to-avif.mjs` (ImageKit → self-hosted AVIF, with `--max-dim` downscale), `reduce-images.mjs`, and `generate-dotted-map.mjs` (world-map dot data).
- `npm run image-variants` — `node scripts/generate-image-variants.mjs`: pre-generates the responsive `-384/-640/-960` rungs next to every laddered image in `public/images` **and** regenerates the blur-up LQIP map `src/lib/imageBlur.generated.json`. Idempotent (skips up-to-date variants; `--force` rebuilds, `--dry-run` previews, optional subfolder arg). **Run it whenever images are added and commit the generated files with them.** The rung ladder + "what gets variants" rule live in `src/lib/imageVariants.ts` and are mirrored by the script and `deviceSizes` in `next.config.ts` — keep all three in sync.

There is no test runner configured in this repo. **`next build` runs only TypeScript, not ESLint** — lint and type-check are two separate gates: `npm run lint` for ESLint, `npm run build` for types. There is no standalone `tsc` script.

ESLint notes: `public/**` is globally ignored (static assets + the hand-written `sw.js`, which uses service-worker globals). `eslint-plugin-react-hooks` v6 (bundled with Next 16) adds React-Compiler-readiness rules; the ones that flag working, intentional patterns in the existing motion/3D code — `set-state-in-effect`, `purity`, `static-components`, `immutability` — are deliberately set to `warn` in `eslint.config.mjs`. Don't "fix" those warnings by refactoring working code, and keep the classic `rules-of-hooks`/`exhaustive-deps` at error level.

## Architecture

Next.js 16 / React 19 marketing site using the **App Router** with TypeScript (Turbopack is the default bundler for both `dev` and `build`). All routes are server components by default; interactive pieces opt in with `'use client'`. The repo has **no API routes, no database, and no backend** — content lives in `src/constants/*` and `src/content/blogs/**/*.mdx`, and the contact form posts directly to EmailJS from the browser.

### Path aliases

`@/*` resolves to `src/*` (see `tsconfig.json`). Always import via `@/...`. There are two parallel component directories — `src/components` (the real one, surfaced through `src/components/index.ts`) and `src/app/components` referenced in the old README; the latter is stale. **Use `@/components`.**

### Route map

Routes live under `src/app/`:

- `/` — `app/page.tsx`
- `/about`, `/contact`, `/contact/careers`, `/frequently-asked-questions`, `/privacy-policy`, `/terms-of-service`, `/license`
- `/services` (hub) → `/services/[category]` → `/services/[category]/[service]` — category landing + service-detail pages, **statically generated**: the `[category]` route's `generateStaticParams()` enumerates `Object.keys(CATEGORIES)` and the `[service]` route's enumerates `allServiceDetailParams()`, both from `src/constants/services.ts`; unknown slugs `notFound()`. (`/services/websites` is now `category=websites` through the dynamic route — there is no static websites page or `Websites/` component dir anymore.)
- `/projects` (hub) → `/projects/[category]` — per-category case-study index enumerated from `Object.keys(PROJECT_CATEGORIES)` (`src/constants/projects.ts`). **Unlike `/blogs`, these are real routes**, but in-category pagination is `?page=N` URL state canonicalised back to the unsuffixed `/projects/<category>`. Note: despite `generateStaticParams()`, the category pages render **at request time** — both the page and `generateMetadata` read `searchParams` for the `?page=N` suffixed titles, which opts the route out of static prerendering. This is a deliberate trade (same as `/blogs`): paginated views keep unique metadata for duplicate-meta audits.
- `/blogs` — listing page; **URL state, not category landing pages.** Filters use `?category=<slug>` and `?page=N` on the same route. Each filter combination gets unique `<title>` and `<meta description>` via `CATEGORY_META` + pagination suffix in `generateMetadata` (so duplicate-meta audits stay clean). (On-page blog search was removed; a sitewide navbar search is planned separately.)
- `/blogs/[blog]` — post detail, statically generated via `generateStaticParams()` reading `blogPosts`
- `/blogs/authors`, `/blogs/authors/[author]`
- `/offline` — service-worker navigation fallback (see Offline / PWA below); `noindex`, excluded from the sitemap.
- Permanent redirects (in `next.config.ts`): `/visual-production → /projects`, `/authors → /blogs/authors`, `/sitemap` & `/sitemaps → /sitemap.xml`, plus legacy URLs remapped onto the current route shape — old flat service paths (`/web-development`, `/services/google-ads`, `/services/social-media-management`) now resolve to `/services/<category>/<service>`, several retired blog slugs redirect to their replacements, and renamed blog-category filter values (`?category=videography-and-photography` → `production`, `website` → `websites`) are query-matched redirects on `/blogs`.
- Response headers (also `next.config.ts` `headers()`): a baseline security set on every route — `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy`, HSTS without `preload` — deliberately **no CSP yet** (a real one needs a nonce strategy for GTM/GA/Clarity + the inline JSON-LD blocks; tracked as a follow-up). Plus `text/xsl` MIME for `public/sitemap.xsl` (the human-readable sitemap stylesheet) and `Cache-Control: immutable` for `/images/*`.

### Services & projects content model

Services and projects are **code-defined content** (not MDX), and share the same five category slugs: `production`, `websites`, `digital-marketing`, `social`, `branding`.

- **Services** — `src/constants/services.ts` is the single (very large) source of truth. `CATEGORIES` holds the five category-landing records; the per-category service-detail records live in `PRODUCTION_SERVICES` / `WEBSITE_SERVICES` / `MARKETING_SERVICES` (the `digital-marketing` category) / `SOCIAL_SERVICES` / `BRANDING_SERVICES`. `getServiceDetail(category, service)` resolves a detail page; `allServiceDetailParams()` feeds the `[service]` route's `generateStaticParams()`. Every record carries its own `seo` block (`title`/`description`/`canonicalPath`) consumed by `generateMetadata`. Section media comes from a registry at `src/components/Services/visuals/` via `getServiceVisual(category, slug)` → `ServiceVisualCard` (bespoke code/SVG art — distinct from the photographic category cover slots).
- **Projects** — `src/constants/projects.ts`: `PROJECT_CATEGORIES` drives `/projects/[category]`. `getCategoryProjects`, `getServiceProjects`, and `getLatestAcrossCategories` are the cross-reference helpers that let service pages, project pages, and the home page surface each other's work.

### Blog content pipeline

A blog post has two coupled sources of truth and **both must be updated when adding a post**:

1. **Metadata entry** in `src/constants/blogs.ts` (`blogPosts` array) — drives routing, sitemap, SEO/JSON-LD, category/author cross-references, prev/next nav. The `slug` field maps to the URL (`/blogs/<slug>`), and `category.slug` selects the MDX subfolder.
2. **MDX body** at `src/content/blogs/<category-slug>/<slug>.mdx` — loaded at build time by `loadPostMdx()` in `app/blogs/[blog]/page.tsx`. Missing files fall back to `post.description` silently (no error in production, console.error in dev for non-ENOENT failures).

The MDX renderer is `next-mdx-remote/rsc` with `remarkGfm`. Custom components passed to MDX: `YouTube`, `Instagram`, `SmartLink` (for `a`), `Image` (for both `img` markdown syntax and explicit `<Image>` calls — switches to captioned `<figure>` mode when `caption`/`credit`/`size`/`priority` props are set; falls back to a plain `<img>` at natural aspect when no `width`/`height` is supplied, so infographics aren't cropped by a forced 16:9 container — pass explicit dimensions to use Next/Image optimization), plus `h2/h3/h4` wrappers that slugify the heading text into an `id` so the in-page TOC anchors work. `extractHeadings`/`extractFaqs`/`extractVideos`/`extractImages`/`countWords` in `src/utils/extractHeadings.ts` parse the raw MDX string to build the desktop/mobile TOC, FAQ/VideoObject/ImageObject JSON-LD, and reading time — they regex over the markdown source (detecting both `key="value"` JSX attrs and bare boolean attrs like `<YouTube external />`), so heavy JSX in MDX may not be counted.

The "Related Articles" + "Browse other topics" sections on a post page read every other category's MDX files at build time to compute aggregate reading minutes. This I/O is paid once per deploy.

### Authors

`BLOG_AUTHORS` in `src/constants/blogs.ts` is keyed by slug. Each post sets `authorSlug` (a literal union: `'perseus-creative-studio' | 'aryan-ghasemi' | 'saman-hoseinpour' | 'arshia-farahi'`). Every consumer — blog card byline, author profile pages, JSON-LD `Person`/`Organization`, sitemap filtering — resolves through `BLOG_AUTHORS[post.authorSlug]`. Adding a new author = adding a key to `BLOG_AUTHORS` and extending the `BlogPostAuthorSlug` union.

### BlogPost fields

`BlogPost` requires `imageAlt` in addition to obvious fields. Optional fields with consumer behavior worth knowing:

- `faqs?: { question, answer }[]` — overrides MDX-extracted FAQs for FAQPage JSON-LD. MDX FAQ section still renders for human readers; JSON `faqs` only governs schema.
- `relatedPosts?: string[]` — when set, the "Related Articles" section renders these exact slugs in order via `<BlogPost forcedSlugs={...}>`. When unset, falls back to category-based picker (`forcedCategorySlug`).
- `excerpt?: string`, `externalSources?: { title, href, rel? }[]` — type only, not currently rendered.

### Media & SEO conventions

- **All images** are served through `<Img>` (`src/components/Img.tsx`), a thin `next/image` wrapper. Image slots store a `/images/...` path; **anything else resolves to `IMAGE_PLACEHOLDER` via `resolveImageSrc` (`src/utils/images.ts`)** — migrate a slot one at a time by pointing its constant at the real `/images/...` asset (public/images mirrors the route map; see `public/images/README.md`). When building OG/JSON-LD image URLs by hand, use `OG_IMAGE` / `resolveImageUrl` from `@/utils/images`, not a hand-built CDN string.
- **`<Img>` is server-only; client components use `<ImgClient>`.** `Img` auto-looks-up the blur-up placeholder from `src/lib/imageBlur.ts`, which imports the full generated base64 map and is guarded with `import 'server-only'` — a client component importing `Img` fails the build (that import used to ship the whole ~40 KB map in the shared client chunk on every route). `ImgClient` (`src/components/ImgClient.tsx`) renders identically but takes the placeholder as a `blur` prop: the server parent looks it up with `blurFor(src)` and threads it down (see Hero slides via `app/page.tsx`, navbar panels via `lib/navigation.ts`, services projections via `app/services/page.tsx`). Non-laddered marks (logos) have no blur entry — pass nothing.
- `next.config.ts` declares **no** remote image patterns — every image is a self-hosted AVIF under `public/images` — and the **runtime image optimizer is off**: `images.loader: 'custom'` (`src/lib/imageLoader.ts`) maps each requested width onto the pre-generated `-384/-640/-960` static variants (see `npm run image-variants` above), so there's no `/_next/image` transcode and no Vercel Image Optimization usage. Don't re-introduce the default optimizer, `formats`, or `unoptimized`. Because `/images/*` is served `Cache-Control: immutable`, changing an image's content requires a new filename, not an in-place overwrite.
- OG/JSON-LD images are self-hosted, so there's no on-the-fly cropping. Article JSON-LD (`articleImageSet` in `app/blogs/[blog]/page.tsx`) emits a single `ImageObject` at the resolved image URL rather than the 1:1/4:3/16:9 crop set; per-page OG images default to the shared placeholder until a real asset is wired in.
- The sitemap is a **sitemap-index route handler** at `src/app/sitemap.xml/route.ts` (Rank Math style, `dynamic: 'force-static'`, `revalidate: 3600`) pointing at five child handlers in `src/app/sitemaps/{pages,blogs,authors,projects,services}.xml/route.ts`. Those route files are thin — the logic lives in `src/lib/`: `sitemap.ts` holds the XML builders (`buildUrlSet`/`buildSitemapIndex`/`xmlResponse`) and enforces a **hard rule that no URL containing `?` or `#` is ever emitted** (so `?page=`/`?category=` views stay crawlable via on-page links but never appear in XML), while `sitemap-sections.ts` is the single source of truth: a `SitemapSection[]` both the index and each child derive from. **Adding a top-level page = add it to `CORE_PAGES` in `src/lib/sitemap-sections.ts`** (not the `pages.xml` route, which now just calls `pagesSection.build()`); adding a whole new child sitemap = one entry there plus a one-line route.
- `SITE_URL` (from `@/constants`) reads `NEXT_PUBLIC_SITE_URL` and defaults to `https://www.perseustudio.com`. Use it instead of hard-coding the domain.
- `public/llms.txt` is a **hand-maintained** AI-crawler index (positioning line, five service categories + sub-services, pillar-post reading list, contact email). It doesn't regenerate from the registries — update it when services, positioning copy, or flagship blog posts change, and bump its "Last updated" date.

### Structured data conventions

**Organization identity lives once.** `layout.tsx` declares the full `Organization` node with `@id: ${SITE_URL}/#organization`. Per-page schema (BlogPosting, CollectionPage) references it via `PERSEUS_PUBLISHER_REF = { '@id': '${SITE_URL}/#organization' }` exported from `src/constants/blogs.ts`. Don't inline the publisher object again — reference by `@id`.

**Video schema attribution.** `<YouTube id="..." external />` opts an embed out of VideoObject emission (videos on someone else's channel). Owned embeds carry an explicit `publisher: PERSEUS_PUBLISHER_REF`.

**Image license claims.** `creator` + `copyrightHolder` + `copyrightNotice` + `license` + `acquireLicensePage` only emit on ImageObjects when every embedded image is verified Perseus-owned or appropriately licensed. The `/license` page at `src/app/license/page.tsx` documents the terms. Two emission sites: `articleImageSet` (hero crops) and the inline `inlineImages.map(...)` block in `app/blogs/[blog]/page.tsx`.

### Global chrome

`src/app/layout.tsx` wraps everything in `<ConsentProvider>` → `<ReactLenis root>` (Lenis smooth-scrolling, re-exported from `src/utils/lenis.ts`) → `<ThemeProvider>`, and renders `Navbar`, `Footer`, `ScrollProgress`, `SpotLight`, `<Toaster>`, `ConsentBanner`, and the PWA components (`OfflineBanner`, `ServiceWorkerRegister`) once. Analytics are **consent-gated**: `ConsentGatedAnalytics` reads the `ConsentProvider` state (persisted to `localStorage` under `perseus.consent`) and only then loads Google Analytics + GTM and Microsoft Clarity; Vercel `Analytics` + `SpeedInsights` are always rendered. Adding analytics elsewhere will double-fire and bypass consent — extend `ConsentGatedAnalytics`, not individual pages.

`Navbar` (desktop mega-panels), `MobileMenu`, and `Footer` all read their link structure from one source of truth — `src/lib/navigation.ts` (`navItems` plus per-panel builders for the services/projects/blogs mega-panels). Edit destinations there, not in the individual chrome components, so desktop and mobile can't drift apart.

### Offline / PWA

The site is an installable PWA with real offline support, built **without** a PWA library (no `next-pwa`/`serwist`) because Next 16 builds with Turbopack, where their webpack plugins are unreliable. Pieces:

- **Service worker** — `public/sw.js`, a hand-written plain-JS file (not bundled/typed). All cache names are prefixed with a single `VERSION` constant; the `activate` handler deletes any cache not matching it, so **bumping `VERSION` is how you invalidate everything**. Strategies: precache app shell on install; navigations + RSC fetches network-first → cache → precached `/offline`; `/_next/static/*` cache-first (content-hashed = safe); self-hosted images (`/_next/image` + `/images/`) stale-while-revalidate (capped). Non-GET requests, the EmailJS API, and analytics are never cached (privacy).
- **Registration** — `src/components/Pwa/ServiceWorkerRegister.tsx` registers the SW **browser-only and production-only** (disabled in `npm run dev` so it doesn't cache HMR assets). Don't expect offline behavior in dev — verify with `npm run build && npm run start`.
- **Manifest** — `src/app/manifest.json` (Next metadata-file convention, served at `/manifest.json`, `<link rel="manifest">` auto-injected). `themeColor`/`appleWebApp` live in `layout.tsx`'s `viewport`/`metadata`.
- **Offline write outbox** — the contact form is the only client mutation. When offline (or a send drops mid-request), `src/components/Contact/ContactForm.tsx` queues the inquiry to IndexedDB via `src/lib/contactOutbox.ts` (EmailJS IDs are centralized here) on top of the zero-dependency wrapper `src/lib/offlineDb.ts`. `OfflineBanner` flushes the queue on the `online` event and on mount (`emailjs.send`, at-least-once, deleted only after confirmed send). See `OFFLINE.md` for the full strategy table and test checklist.

### Component organization

`src/components/index.ts` is the **barrel export** every page imports from. New shared components should be added there. Domain-specific subfolders mirror routes (`Home/`, `About/`, `Blogs/`, `Services/`, `Projects/`, `Contact/`, `Mdx/`, plus `Pwa/` for the service-worker / offline UI). The shadcn-style primitives live under `src/components/ui/` (configured in `components.json`, style `new-york`, alias `@/components/ui`, `@/lib/utils`).

**The barrel is for pages/layouts only — components must import each other by direct path** (`@/components/Button`, `./BlogCard`, …), never from `@/components`, `./`, or `..` resolving to the barrel. A component importing the barrel creates a components↔index cycle that defeats Turbopack's export-level tree-shaking: every client component that touched the barrel used to drag the re-exported *server* components — and through them the entire `services.ts`/`blogs.ts` registries — into one shared client chunk loaded by all 86 routes (~110 KB gzip of dead JS per page before the 2026-07 de-barreling). Same discipline for data: client components take slim server-derived props (see `blogFeed.ts`, `lib/navItems.ts` vs `lib/navigation.ts`, and the Services overview projections in `app/services/page.tsx`) instead of importing the content registries; verify with `rg -l "We align on goals" .next/static/chunks/` after a build — it must come back empty.

**Chunking reality (2026-07 audit):** Turbopack merges every *eagerly referenced* client module into one shared chunk group — all routes list the same script set, so anything a client component imports eagerly is paid by every page. Two consequences: (1) content data must never be a client value import — `faqItems` lives in `src/constants/faq.ts` (FAQ page passes it to `<FaqList items={…}>`), the Partners logo arrays in `src/constants/clientLogos.ts` (Partners-only), the home hero gallery in `src/constants/homeGallery.ts` (home page passes slides to `<Hero gallery={…}>`), and the about timeline entries flow through `<Timeline entries={…}>` — keep new content data in leaf modules imported only by server components. (2) Heavy page-specific client components are code-split with `next/dynamic` **keeping SSR** (cobe globes in `HomeWelcome`/`ServicesHero`, embla primitives in `ServicesAds`, the apple-cards carousel in `ServicesList`, the blog `TableOfContents`) — the async chunk loads only where the component renders; don't convert these back to static imports. three.js (`shader4/5` behind `ThemedShader`) and EmailJS already follow this pattern.

### Styling

Tailwind CSS 4 with `@tailwindcss/postcss`, `@tailwindcss/typography`, and `tw-animate-css`. Global tokens and CSS variables are in `src/app/globals.css`. Conditional class merging uses `clsx` + `tailwind-merge` (re-exported as `cn` from `src/lib/utils.ts`).

## Conventions to respect

- **Server-first.** Only mark a component `'use client'` when it needs state, effects, or browser APIs. The blog index page passes server-read `searchParams` down to `<BlogPost>` as `initialCategory`/`initialPage` specifically to avoid a `useSearchParams()` CSR bailout so crawlers see article links in initial HTML — don't refactor that into pure client state.
- **Blog routing is URL state, not routes.** Do not propose `/blogs/category/<slug>` pages; keep `/blogs?category=<slug>`.
- **Main content before sidebar in DOM.** On `app/blogs/[blog]/page.tsx`, the main content `<div>` is placed BEFORE the desktop sidebar `<aside>` in source order. CSS grid `col-start-1` / `col-start-2` puts the sidebar visually on the right. This DOM order is intentional — putting the sidebar first caused a heading-order violation (H1 → H3 from SidebarCta) that AI-search audits flag on every post.
- **No `#posts` fragment in pagination hrefs.** Blog pagination uses `<Link scroll={false} href={...}>` and a `useEffect` watching `initialPage` to scroll `#posts` into view. Crawlers like Semrush flag the fragment-bearing URL as canonicalised against the fragment-free canonical — keep the fragment behavior client-side only.
- **Don't run git commands.** The maintainer handles all git operations; suggest commit messages instead of executing them.
- UI/redesign work: avoid generic agency/SaaS aesthetics (glass tiles, grayscale hover, soft drop-shadows) — distinctive design is the bar.
