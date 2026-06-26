# `public/images/` — local image library

Self-hosted images for the site, organized to mirror the **route map**. The app
serves these through `next/image` (the `<Img>` wrapper in `src/components/Img.tsx`).
Any slot whose constant doesn't yet point at an `/images/...` path resolves to a
shared placeholder via `resolveImageSrc` (`src/utils/images.ts`) — drop the real
asset in here and update its constant to light it up. Folders may stay empty
until their assets land (kept in git by a `.gitkeep`).

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

## Where each asset lives

```
home/                          /
about/                         /about            (incl. team shots on About)
contact/  contact/careers/     /contact, /contact/careers
frequently-asked-questions/    /frequently-asked-questions
services/<category>/<service>/ /services/[category]/[service]
projects/<discipline>/         /projects/[category]   (category-level for now)
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
