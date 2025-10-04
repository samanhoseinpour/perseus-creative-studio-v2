# Perseus Creative Studio v2

A motion-heavy marketing site for Perseus Creative Studio built with the Next.js App Router. The project blends cinematic visuals, scroll-driven storytelling, and rich media embeds to showcase services, projects, and client reviews across multiple routes.

## Highlights

- **Next.js 15 + React 19** App Router architecture with server components for fast navigation.
- **Smooth micro-interactions** powered by Framer Motion, GSAP, Lenis smooth-scrolling, and custom effects such as the Google Gemini CTA and Spotlight cursor.
- **Rich media delivery** via `@imagekit/next`, VideoKit wrappers, and third-party embeds for Instagram and Google Reviews.
- **Modular component library** covering hero sections, timelines, parallax copy, contact flows, and an interactive world map.
- **Route coverage** for Home, About, Services, Projects, Blogs, Assistant, and Contact pages, each assembled from reusable building blocks.

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router) with TypeScript
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/) + `tailwind-merge`
- [Framer Motion](https://www.framer.com/motion/) & [`motion`](https://motion.dev/) for animation primitives
- [GSAP](https://greensock.com/gsap/) and Lenis for advanced scroll/animation control
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + Drei and OGL for 3D/GL effects
- [Zustand](https://zustand-demo.pmnd.rs/) for localized state management when needed
- [Dotted Map](https://github.com/edent/dotted-map) for the animated service-area map

## Project Structure

```
src/
└── app/
    ├── about/                # About route composition (hero, parallax, process, CTA)
    ├── assistant/            # Interactive assistant page with animated background
    ├── blogs/                # Blog listing and dynamic post route ([blog])
    ├── components/           # Reusable UI building blocks grouped by domain
    ├── constants/            # Static data (navigation, copy blocks, metrics)
    ├── contact/              # Contact form & info sections with animated beam backdrop
    ├── data/                 # Timeline items, FAQs, and reusable content payloads
    ├── projects/             # Project showcase routes and dynamic project layout
    ├── services/             # Services landing and web-services sub-route
    ├── types/                # Shared TypeScript definitions
    ├── utils/                # Animation helpers, Lenis wrapper, utility hooks
    ├── layout.tsx            # Global layout, fonts, Lenis root, navbar/footer
    └── page.tsx              # Home route (hero, USP, theming showcase)
```

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the development server**

   ```bash
   npm run dev
   ```

   The site will be available at [http://localhost:3000](http://localhost:3000). TurboPack is enabled for faster HMR.

3. **Edit content**
   - Page entry points live under `src/app/*/page.tsx`.
   - Reusable sections/components are inside `src/app/components`.
   - Tailwind globals and CSS variables are defined in `src/app/globals.css`.

## Available Scripts

- `npm run dev` – start the dev server with TurboPack.
- `npm run build` – create an optimized production build.
- `npm run start` – serve the production build.
- `npm run lint` – run ESLint (Next.js preset).

## Key Implementation Notes

- **Smooth scrolling** is enabled globally through `ReactLenis` in `layout.tsx`. Disable or tweak it by editing `src/app/utils/lenis.ts` and the root layout.
- **Global chrome** (navbar, gradient background, spotlight cursor, footer, and scroll progress) is wired through `src/app/layout.tsx` so every route inherits the same framing.
- **Media handling** leverages ImageKit (`@imagekit/next`) for responsive images and videos. Update the `urlEndpoint` values in `ImageKit.tsx` and `VideoKit.tsx` if you host assets elsewhere.
- **Embeds**: The About page pulls in Instagram and Google Review iframes. If you replace those URLs, keep the iframe height and loading strategies in mind to preserve perceived performance.

## Production Build & Deployment

```bash
npm run build
npm run start
```

The app runs as a standard Next.js server. Deploy to Vercel or any platform that supports Next.js 15 (App Router). When deploying elsewhere, ensure the Node.js runtime matches Next.js requirements (Node 18.17+ or 20+).

## Contributing & Customization

- Components are written in TypeScript with minimal shared state; extend them by composing new blocks in `src/app/components` and exporting through `components/index.ts`.
- Animations are centralized through helper utilities (`src/app/utils/animation.ts`) and Framer Motion variants. Reuse these patterns to maintain consistent motion design.
- Update copy, imagery, and metadata to match your studio’s branding. SEO metadata lives in `src/app/layout.tsx` and route-level `metadata` exports.

## License

This repository is private to Perseus Creative Studio. All rights reserved.
