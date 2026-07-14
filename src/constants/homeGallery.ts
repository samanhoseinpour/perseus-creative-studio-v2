// Industry verticals for the home hero carousel. Lived in constants/projects.ts
// before that file became the projects registry — this is home-page content,
// not case-study data.
// NOTE: index 0 is the home LCP — Hero preloads it with fetchPriority=high, so the
// lead slide should stay a light-encoding image (Events ≈ 31KB at the 960 rung vs
// 90–95KB for the detail-dense aerials). Reorder deliberately, not alphabetically.
export const projectsHorizontalGallery = [
  {
    id: 4,
    imageSrc: '/images/home/home-events.avif',
    imageAlt:
      'Live corporate event in Vancouver captured during event videography coverage.',
    title: 'Events',
    href: '/projects/production?industry=hospitality-events',
    description:
      'Event highlight films and photography—corporate, private, and live experiences captured with fast turnarounds and polished storytelling.',
  },
  {
    id: 1,
    imageSrc: '/images/home/home-construction-v2.avif',
    imageAlt:
      'Aerial of an active Vancouver-area construction site with a piling rig during a contractor video production.',
    title: 'Construction',
    href: '/projects/production?industry=construction-trades',
    description:
      'Cinematic coverage of construction progress and finished builds—site storytelling, craftsmanship details, and before/after reveals for contractors and developers.',
  },
  {
    id: 2,
    imageSrc: '/images/home/home-real-estate.avif',
    imageAlt:
      'Bright, modern Vancouver property interior captured for a real estate listing film.',
    title: 'Real Estate',
    href: '/projects/production?industry=real-estate',
    description:
      'High-end listing films and photo coverage—interior walkthroughs, lifestyle moments, and aerials designed to elevate properties and attract buyers.',
  },
  {
    id: 3,
    imageSrc: '/images/home/home-fitness.avif',
    imageAlt:
      'Training session at a Vancouver fitness studio captured for a brand video.',
    title: 'Fitness',
    href: '/projects/production?industry=sports-fitness',
    description:
      'Dynamic fitness content—training sessions, brand commercials, and social-first edits that capture energy, community, and performance.',
  },
  {
    id: 5,
    imageSrc: '/images/home/home-boats-yachts.avif',
    imageAlt:
      'Luxury yacht on the water during a Vancouver marine video production.',
    title: 'Boats & Yachts',
    href: '/projects/production?industry=boats-yachts',
    description:
      'Luxury marine visuals—on-water cinematics, dockside tours, and lifestyle shots that showcase vessels with premium polish.',
  },
  // Slides 6–9 reuse project-registry covers (already laddered + in the blur
  // map) rather than bespoke home-* crops.
  {
    id: 6,
    imageSrc:
      '/images/projects/production/projects-production-como-1907-visit.avif',
    imageAlt:
      'Aerial view of the Como 1907 football stadium beside Lake Como during a Match Tour 11 trip.',
    title: 'Sports',
    href: '/projects/production?industry=sports-fitness',
    description:
      'Match-day films and athlete stories—tournaments, training camps, and team features edited with broadcast-level energy.',
  },
  {
    id: 7,
    imageSrc:
      '/images/projects/production/projects-production-samsung-store-richmond.avif',
    imageAlt:
      'Samsung storefront at a Richmond, BC shopping centre photographed for a completed retail build-out.',
    title: 'Retail',
    href: '/projects/websites?industry=retail-e-commerce',
    description:
      'Retail and e-commerce storytelling—store experiences, product-first visuals, and online storefronts built to turn browsers into buyers.',
  },
  {
    id: 8,
    imageSrc: '/images/projects/websites/projects-websites-elite-life-skin.avif',
    imageAlt:
      'Website for Elite Life Skin Centre, a Vancouver skin care and laser clinic, displayed in a soft spa-styled scene.',
    title: 'Health & Beauty',
    href: '/projects/websites?industry=health-wellness',
    description:
      'Polished visuals for clinics, salons, and wellness brands—treatment stories, self-care aesthetics, and websites that build trust at first glance.',
  },
  {
    id: 9,
    imageSrc:
      '/images/projects/production/projects-production-pho-anh-vu.avif',
    imageAlt:
      'Sunlit dining room of Pho Anh Vu restaurant in Richmond, BC photographed after its interior build-out.',
    title: 'Hospitality',
    href: '/projects/production?industry=hospitality-events',
    description:
      'Restaurant and venue storytelling—signature dishes, atmosphere-rich films, and social content that turns first-time guests into regulars.',
  },
];
