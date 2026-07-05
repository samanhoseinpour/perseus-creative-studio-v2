# `public/images/` — local image library

Self-hosted images for the site, organized to mirror the **route map**. The app
serves these through `next/image` (the `<Img>` wrapper in `src/components/Img.tsx`).
Any slot whose constant doesn't yet point at an `/images/...` path resolves to a
shared placeholder via `resolveImageSrc` (`src/utils/images.ts`) — drop the real
asset in here and update its constant to light it up. That placeholder is
`perseus-logo-black.avif` at the root of this folder; it doubles as the brand
mark, so `IMAGE_PLACEHOLDER` and `PERSEUS_LOGO` (`src/constants/index.ts`) point
at the same file. Folders appear as their first assets land (git doesn't track
the empty ones).

## Two conventions

1. **Folder name = route slug** (kebab-case), so a folder maps 1:1 to a route
   param. Sub-service folders use the exact `slug` from the registries:
   - services → `src/constants/services.ts`
   - project categories → `PROJECT_CATEGORIES` in `src/constants/projects.ts`
   - blog categories → `blogPosts[].category.slug` in `src/constants/blogs.ts`
   - authors → `BLOG_AUTHORS` in `src/constants/blogs.ts`

2. **File name = the path, flattened with hyphens.** A file restates its
   location so names are globally unique and self-documenting:
   ```
   services/production/videography/services-production-videography.avif
   services/production/2d-3d-models/services-production-2d-3d-models.avif
   ```

## Generated files: responsive variants + blur map

Every content image here has three **generated** siblings — `<base>-384`,
`<base>-640`, `<base>-960` (same format, never enlarged) — produced by
`npm run image-variants` (`scripts/generate-image-variants.mjs`). The custom
`next/image` loader (`src/lib/imageLoader.ts`, rung ladder shared via
`src/lib/imageVariants.ts`) maps each requested width onto one of them, so
images ship as static files with zero runtime optimization. The same run also
regenerates the blur-up placeholder map `src/lib/imageBlur.generated.json`.

- **Adding an image:** drop the unsuffixed original into the right folder, run
  `npm run image-variants`, and commit the variants + regenerated blur map
  along with it. (For big drops, run `npm run optimize-images` first to pull
  over-budget originals back under the size budget.)
- **Never hand-author `-384/-640/-960` files** — the suffix is reserved for the
  generator. It skips variants that are already up to date; `--force` rebuilds.
- **Never change an image's content in place.** `/images/*` is served with
  `Cache-Control: immutable` for a year (`next.config.ts`), so changed content
  needs a new filename.
- Exceptions: brand marks in `shared/logos/`, client marks in
  `shared/client-logos/`, and the root placeholder are **not** laddered (tiny,
  rendered small) — they get no variants and no blur entry. The rule lives in
  `isLaddered()` in `src/lib/imageVariants.ts`.

## Where each asset lives

```
home/                          /
about/                         /about            (incl. team shots on About)
contact/  contact/careers/     /contact, /contact/careers
frequently-asked-questions/    /frequently-asked-questions
services/<category>/<service>/ /services/[category]/[service]
projects/<discipline>/         /projects/[category]   (category-level for now)
categories/                    category cover images for /services/[category] + /projects/[category]
blogs/<category>/              blog posts by category
blogs/authors/                 /blogs/authors/[author]  (author profile images)
shared/logos/                  brand wordmarks / lockups
shared/og/                     default OG / social-card images
shared/client-logos/           client marks (the clientLogoUrl values)
```

**Asset-home rule (one home per asset):**
- Author / profile images → `blogs/authors/`.
- Brand logos, default OG, client marks → `shared/`.
- About-page team photos (if distinct from author profiles) → `about/`.

## Depth

`projects/` and `blogs/` stop at the **category** level. Per-project and
per-post subfolders are deferred until project detail routes return — add them
under the matching category folder when that work lands.

> Note: `public/**` is excluded from ESLint, so files here are never linted.
