import {
  Layers3 as IconVersions,
  Sparkles as IconAi,
  PanelsTopLeft as IconComponents,
  SunMedium as IconSolarElectricity,
  CircleDollarSign as IconClockDollar,
  Trophy as IconLaurelWreath,
} from 'lucide-react';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.perseustudio.com';

export const menuLinks = [
  {
    id: 1,
    title: 'Home',
    href: '/',
    src: 'https://cdn.cosmos.so/a5823557-2e5c-49fa-a1fa-5d0a549d406f?format=jpeg',
    altText:
      'Abstract, black and white photo of stark concrete architecture with sharply defined geometric stairs and dramatic diagonal shadows and lighting, used as a compelling background for a homepage.',
  },

  {
    id: 2,
    title: 'Services',
    href: '/services',
    src: '/navbar-contact.jpeg',
    altText:
      'Professional photography and video studio setup with white seamless background, multiple Profoto lights on C-stands, computer monitors on a central desk, and cables, suggesting a contact point for high-end production services.',
  },
  {
    id: 3,
    title: 'Projects',
    href: '/projects',
    src: '/navbar-projects-2.jpg',
    altText:
      'Close-up view of a camera operator holding a professional camera rig with an external monitor showing the live video feed from a film set or event, representing portfolio work and completed projects.',
  },
  {
    id: 4,
    title: 'Websites',
    href: '/services/websites',
    src: '/navbar-website.jpeg',
    altText:
      "Laptop screen displaying a dark, modern website with navigation for 'Work' and 'Exhibitions,' featuring a 3D rendered, shiny black humanoid figure, suggesting web design, digital art, or creative media services.",
  },

  {
    id: 5,
    title: 'Blogs',
    href: '/blogs',
    src: 'navbar-blogs.avif',
    altText:
      "Overhead shot of a folded newspaper or magazine with dramatic headlines like 'A Journey to the Bizarre and M...' and 'The Abyss and Mysterious Life,' suggesting content creation, journalism, or a company blog page.",
  },

  {
    id: 6,
    title: 'About',
    href: '/about',
    src: '/navbar-about-2.jpeg',
    altText:
      "Abstract, grainy, black and white image of a blurred, dark silhouette of a person against a bright background, suggesting an anonymous or artistic portrait for an 'About' page.",
  },

  {
    id: 7,
    title: 'Contact',
    href: '/contact',
    src: 'https://cdn.cosmos.so/e708c459-9118-42f1-a861-f8389c487ae9?format=jpeg',
    altText: 'Contact us image',
  },
];

export const clientImg = [
  {
    id: 1,
    srcImg: 'fitbodega.png',
    altImg: 'Fitbodega Vancouver FC Logo',
  },
  {
    id: 2,
    srcImg: 'visa2020.png',
    altImg: 'Visa 2020 Logo',
  },
  {
    id: 3,
    srcImg: 'cartocci.png',
    altImg: 'Cartocci Real Estate Group Logo',
  },
  {
    id: 4,
    srcImg: 'nanifc.jpg',
    altImg: 'Nani FC Logo',
  },
  {
    id: 5,
    srcImg: 'samAmiralaei.png',
    altImg: 'Sam Amiralaei Logo',
  },
  {
    id: 6,
    srcImg: 'taurus.png',
    altImg: 'Taurus Fitness Club Logo',
  },
  {
    id: 7,
    srcImg: 'artbuild.jpg',
    altImg: 'Art Build Construction Logo',
  },
  {
    id: 8,
    srcImg: 'kasraz.png',
    altImg: 'Kasraz Persian Rugs Logo',
  },
  {
    id: 9,
    srcImg: 'BCC.jpg',
    altImg: 'Bargain Construction Corporation Logo',
  },
  {
    id: 10,
    srcImg: 'privatecoachingco.png',
    altImg: 'Private Coaching Co Logo',
  },
  {
    id: 11,
    srcImg: 'a2procon.png',
    altImg: 'A2 ProCon Developments Logo',
  },
  {
    id: 12,
    srcImg: 'vicinity.png',
    altImg: 'Vicinity Mart Logo',
  },
  {
    id: 13,
    srcImg: 'obsidian.jpg',
    altImg: 'Obsidian Athletic Club Logo',
  },
  {
    id: 14,
    srcImg: 'dibawindows.png',
    altImg: 'Diba Windows Logo',
  },
  {
    id: 15,
    srcImg: 'vanclose.png',
    altImg: 'Vanclose Real Estate Team Logo',
  },
  {
    id: 16,
    srcImg: 'dallasDakota.jpeg',
    altImg: 'Dallas Dakota Realty Logo',
  },
  {
    id: 17,
    srcImg: 'diamondFencing.png',
    altImg: 'Diamond Pro - Fencing & Decking LTD Logo',
  },
  {
    id: 18,
    srcImg: 'saloncentric.png',
    altImg: 'Salon Centric Logo',
  },
  {
    id: 19,
    srcImg: 'NBAR.jpg',
    altImg: 'NBAR Canada Logo',
  },
  {
    id: 20,
    srcImg: 'phantompestsolutions.png',
    altImg: 'Phantom Pest Solutions Logo',
  },
  {
    id: 21,
    srcImg: 'andonis.jpg',
    altImg: 'Andonis Vancouver Logo',
  },
  {
    id: 22,
    srcImg: 'parkwaysport.png',
    altImg: 'Parkway Motorsport Vancouver Logo',
  },
  {
    id: 23,
    srcImg: 'neginjavaheri.jpg',
    altImg: 'Negin Javaheri Art Logo',
  },
  {
    id: 24,
    srcImg: 'lemoncurrencyexchange.png',
    altImg: 'Lemon Currency Exchange Logo',
  },
  {
    id: 25,
    srcImg: 'ironnation.png',
    altImg: 'Iron Nation Surrey Logo',
  },
  {
    id: 26,
    srcImg: 'heliaEsmaeili.jpg',
    altImg: 'Helia Esmaeili Logo',
  },
  {
    id: 27,
    srcImg: 'nssm.png',
    altImg: 'North Shore Sports Medicine Logo',
  },
  {
    id: 28,
    srcImg: 'mananoori.png',
    altImg: 'Mana Noori Real Estate Logo',
  },
  {
    id: 29,
    srcImg: 'aegisdentalcentre.png',
    altImg: 'Aegis Dental Centre Logo',
  },
  {
    id: 30,
    srcImg: 'hatam.png',
    altImg: 'Hatam Restaurant West Vancouver Logo',
  },
  {
    id: 31,
    srcImg: 'araniconstruction.png',
    altImg: 'Arani Construction Logo',
  },
  {
    id: 32,
    srcImg: 'canadascores.png',
    altImg: 'Canada SCORES Vancouver Logo',
  },
  {
    id: 33,
    srcImg: 'kandovan.png',
    altImg: 'Kandovan Construction Logo',
  },
  {
    id: 34,
    srcImg: 'stanglassworksbackground.png',
    altImg: 'Stan Glassworks Ltd. Logo',
  },
];

export const clientImg2 = [
  {
    id: 1,
    srcImg: 'tst.png',
    altImg: 'TST Logo',
  },
  {
    id: 2,
    srcImg: 'study2020.png',
    altImg: 'Study 2020 Logo',
  },
  {
    id: 3,
    srcImg: 'cfr.png',
    altImg: 'Canadian Flooring & Renovations Logo',
  },
  {
    id: 4,
    srcImg: 'streetball.jpg',
    altImg: 'Streetball FC Canada Logo',
  },
  {
    id: 5,
    srcImg: 'gsc.jpg',
    altImg: 'Gal Senior Care Foundation Logo',
  },
  {
    id: 6,
    srcImg: 'cindys.png',
    altImg: 'Cindys Brunch Logo',
  },
  {
    id: 7,
    srcImg: 'vmc.jpg',
    altImg: 'Van Mens Club Logo',
  },
  {
    id: 8,
    srcImg: 'westvancouvertennisclub.png',
    altImg: 'West Vancouver Tennis Club Logo',
  },
  {
    id: 9,
    srcImg: 'sturdybee.png',
    altImg: 'Sturdybee Renovations Logo',
  },
  {
    id: 10,
    srcImg: 'Velahomes.png',
    altImg: 'Vela Homes Logo',
  },
  {
    id: 11,
    srcImg: 'arshiaEsmaeili.jpg',
    altImg: 'Arshia Esmaeili Real Estate Services Logo',
  },
  {
    id: 12,
    srcImg: 'elitelife.jpg',
    altImg: 'Elitelife Skin Centre',
  },
  {
    id: 13,
    srcImg: 'rsfoundation.png',
    altImg: 'RS Foundation Systems Logo',
  },
  {
    id: 14,
    srcImg: 'faithwilson.jpg',
    altImg: 'Faith Wilson Realty Logo',
  },
  {
    id: 15,
    srcImg: 'lubetech.jpg',
    altImg: 'LubeTech | GSD Logo',
  },
  {
    id: 16,
    srcImg: 'dunns.png',
    altImg: 'Dunns Menswear Logo',
  },
  {
    id: 17,
    srcImg: 'luxurylane.jpg',
    altImg: 'Luxury Lane Logo',
  },
  {
    id: 18,
    srcImg: 'belcantoDental.png',
    altImg: 'Belcanto Dental Logo',
  },
  {
    id: 19,
    srcImg: 'saffron.png',
    altImg: 'Saffron Event Logo',
  },
  {
    id: 20,
    srcImg: 'rockydemolishing.png',
    altImg: 'Rocky Demolishing Logo',
  },
  {
    id: 21,
    srcImg: 'doucettehomes.png',
    altImg: 'Doucette Logo',
  },
  {
    id: 22,
    srcImg: 'erconstruction.jpg',
    altImg: 'Erc Construction Logo',
  },
  {
    id: 23,
    srcImg: 'vitality.png',
    altImg: 'Vitality Fitness Logo',
  },
  {
    id: 24,
    srcImg: 'gsdcraneltd.png',
    altImg: 'GSD Crane Logo',
  },
  {
    id: 25,
    srcImg: 'flowspaceconstruction.png',
    altImg: 'Flow Space Construction Logo',
  },
  {
    id: 26,
    srcImg: 'gilmore.jpg',
    altImg: 'Happy Gilmore Golf Lounge Logo',
  },
  {
    id: 27,
    srcImg: 'esperlus.png',
    altImg: 'Esperlus Event Space Logo',
  },
  {
    id: 28,
    srcImg: 'asanti.png',
    altImg: 'Asanti Developments Logo',
  },
  {
    id: 29,
    srcImg: 'acebrand.jpg',
    altImg: 'Ace Brand Ltd. Logo',
  },
  {
    id: 30,
    srcImg: 'kireilashco.png',
    altImg: 'Kirei Lash Co - WEST VAN LASHES Logo',
  },
  {
    id: 31,
    srcImg: 'divanevents.png',
    altImg: 'Divan Events Canada Logo',
  },
  {
    id: 32,
    srcImg: 'deebaevents.png',
    altImg: 'Deeba Events Logo',
  },
  {
    id: 33,
    srcImg: 'watson.png',
    altImg: 'Watson Gym Equipment Logo',
  },
  {
    id: 34,
    srcImg: 'cityscapeelectricalca.webp',
    altImg: 'City Scape Electrical Canada Logo',
  },
  {
    id: 35,
    srcImg: 'evchageincbackground.png',
    altImg: 'Ev Charge Inc Logo',
  },
];

export const mainProductionData = [
  {
    id: 1,
    title: 'Real Estate',
    description:
      'Property listings, developments, brokerages, and new-build showcases.',
    videoSrc:
      'https://www.youtube.com/embed/rayEIwFozcY?autoplay=1&mute=1&loop=1&playlist=rayEIwFozcY&controls=0&modestbranding=1&playsinline=1&rel=0',
  },
  {
    id: 2,
    title: 'Construction & Renovation',
    description:
      'General contractors, design-build, flooring, windows, and renovation firms.',
    videoSrc:
      'https://www.youtube.com/embed/YSSWOh-tGDY?autoplay=1&mute=1&loop=1&playlist=YSSWOh-tGDY&controls=0&modestbranding=1&playsinline=1&rel=0',
  },
  {
    id: 3,
    title: 'Fitness & Sports',
    description:
      'Gyms, athletic clubs, teams, and performance coaching brands.',
    videoSrc:
      'https://www.youtube.com/embed/P2vkIx5royE?autoplay=1&mute=1&loop=1&playlist=P2vkIx5royE&controls=0&modestbranding=1&playsinline=1&rel=0',
  },
  {
    id: 4,
    title: 'Boats & Yachts',
    description:
      'Marinas, yacht charters, marine services, and waterfront lifestyle brands.',
    videoSrc:
      'https://www.youtube.com/embed/kAGF5m3L8AU?autoplay=1&mute=1&loop=1&playlist=kAGF5m3L8AU&controls=0&modestbranding=1&playsinline=1&rel=0',
  },
];

export const servicesData = [
  {
    id: 1,
    title: 'Videography',
    src: '/navbar-services-2.jpeg',
    category: 'Cinematic commercials, promos, and event coverage.',
  },
  {
    id: 2,
    title: 'Website Development',
    src: '/navbar-website-2.jpeg',
    category: 'Custom, fast, SEO‑ready websites built with modern stacks.',
  },
  {
    id: 3,
    title: 'Photography',
    src: '/services-photography.jpeg',
    category: 'High‑end product, lifestyle, and event photography.',
  },
  {
    id: 4,
    title: 'Content Creation',
    src: '/services-contentcreation.jpeg',
    category: 'Short‑form and long‑form content tailored for social and web.',
  },
  {
    id: 5,
    title: 'Branding',
    src: '/services-branding.jpeg',
    category: 'Logos, visual identity systems, and brand guidelines.',
  },
  {
    id: 6,
    title: 'Advertising',
    src: '/services-ads.jpeg',
    category: 'Creative strategy, media buying, and campaign management.',
  },
  {
    id: 7,
    title: 'Social Media Management',
    src: '/services-smm.jpeg',
    category: 'Planning, publishing, community management, and analytics.',
  },
  {
    id: 8,
    title: 'Aerial Production',
    src: '/services-aerialproduction.jpeg',
    category: 'Drone photo and video for striking aerial perspectives.',
  },
  {
    id: 9,
    title: '2D, 3D Models & 360 Tours',
    src: '/services-3Dmodel.jpeg',
    category: '2D floorplans, 3D models, and 360° tours (Matterport)',
  },
];

export const youtubeEmbedIds = [
  { id: 1, embedId: '_H4sRIKE8CY' },
  { id: 2, embedId: 'wle-h055HQ0' },
  { id: 3, embedId: 'YSSWOh-tGDY' },
  { id: 4, embedId: 'T09VEdyk6cs' },
  { id: 5, embedId: 'SOXuGjtI_xE' },
  { id: 6, embedId: 'DE565Zp-BR4' },
  { id: 7, embedId: 'rT-yxZx9CL0' },
  { id: 8, embedId: 'FEWtKB5wz1Q' },
  { id: 9, embedId: 'kAGF5m3L8AU' },
];

export const masonryHomeGallery = [
  [
    {
      id: 'image-1',
      src: 'https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image.jpg',
      width: 610,
      height: 768,
      alt: '',
      href: '/contact',
      overlayTitle: 'Diba Windows Showroom',
      category: 'Construction',
    },
    {
      id: 'image-2',
      src: 'https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-1.jpg',
      width: 610,
      height: 500,
      alt: '',
      href: '/contact',
      overlayTitle: 'Arani Construction',
      category: 'Construction',
    },
    {
      id: 'image-3',
      src: 'https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-2.jpg',
      width: 610,
      height: 566,
      alt: '',
      href: '/contact',
      overlayTitle: 'Iron Nation Fitness',
      category: 'Construction',
    },
  ],
  [
    {
      id: 'image-4',
      src: 'https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-3.jpg',
      width: 610,
      height: 768,
      alt: '',
      href: '/contact',
      overlayTitle: 'Obsidian Athletic Club',
      category: 'Construction',
    },
    {
      id: 'image-5',
      src: 'https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-4.jpg',
      width: 610,
      height: 500,
      alt: '',
      href: '/contact',
      overlayTitle: 'Westbank',
      category: 'Construction',
    },
    {
      id: 'image-6',
      src: 'https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-5.jpg',
      width: 610,
      height: 566,
      alt: '',
      href: '/contact',
      overlayTitle: 'Cinematic Wedding',
      category: 'Construction',
    },
  ],
  [
    {
      id: 'image-7',
      src: 'https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-6.jpg',
      width: 610,
      height: 768,
      alt: '',
      href: '/contact',
      overlayTitle: 'Baseball Game',
      category: 'Construction',
    },
    {
      id: 'image-8',
      src: 'https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-7.jpg',
      width: 610,
      height: 500,
      alt: '',
      href: '/contact',
      overlayTitle: 'Diba Windows Showroom',
      category: 'Construction',
    },
    {
      id: 'image-9',
      src: 'https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-8.jpg',
      width: 610,
      height: 566,
      alt: '',
      href: '/contact',
      overlayTitle: 'Arani Construction',
      category: 'Construction',
    },
  ],
  [
    {
      id: 'image-10',
      src: 'https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-9.jpg',
      width: 610,
      height: 768,
      alt: '',
      href: '/contact',
      overlayTitle: 'Iron Nation Fitness',
      category: 'Construction',
    },
    {
      id: 'image-11',
      src: 'https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-10.jpg',
      width: 610,
      height: 500,
      alt: '',
      href: '/contact',
      overlayTitle: 'Obsidian Athletic Club',
      category: 'Construction',
    },
    {
      id: 'image-12',
      src: 'https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-11.jpg',
      width: 610,
      height: 566,
      alt: '',
      href: '/contact',
      overlayTitle: 'Westbank',
      category: 'Construction',
    },
  ],
];

export const featureProjectsHome = [
  {
    src: '/projects-realestate.mp4',
    alt: 'Perseus Creative Studio production hero reel',
    code: 'Cinematic North Vancouver Luxury Home Tour',
  },
  {
    src: '/velahomes-forming.mp4',
    alt: 'Vela Homes forming phase construction video',
    code: 'Vela Homes – Forming Phase',
  },
  {
    src: '/cfr-dev.mp4',
    alt: 'Canadian Flooring & Renovations development project video',
    code: 'CFR Development Project',
  },
  {
    src: '/taurus-commercial.mp4',
    alt: 'Taurus Fitness Club commercial video',
    code: 'Taurus Fitness Club Commercial',
  },
  {
    src: '/fitbodega-tv-news.mp4',
    alt: 'Fitbodega TV news feature video',
    code: 'Fitbodega TV News',
  },
  {
    src: '/velahomes-demolishing.mp4',
    alt: 'Vela Homes demolition phase construction video',
    code: 'Vela Homes – Demolition Phase',
  },
  {
    src: '/obsidian-gym-tour.mp4',
    alt: 'Obsidian Athletic Club gym tour video',
    code: 'Obsidian Gym Tour',
  },
  {
    src: '/projects-boats&yachts.mp4',
    alt: 'Boats and yachts lifestyle and marina showcase video',
    code: 'Ignition Marine - Boats & Yachts Showcase',
  },
];

export const whyPerseusServices = [
  {
    id: 1,
    name: 'A True Partner, Not Just a Service',
    description:
      'We work closely with our clients and treat every project like a partnership. We take the time to understand your goals and support you throughout the process, not just at delivery.',
    icon: IconVersions,
  },
  {
    id: 2,
    name: 'Proven Experience Across Industries and Cities',
    description:
      'We’ve worked with different industries and across multiple cities, which helps us adapt quickly and deliver confidently wherever the project is.',
    icon: IconAi,
  },
  {
    id: 3,
    name: 'High-Quality Work, Every Time',
    description:
      'Quality matters to us. From visuals to execution, we hold a high standard on every project, no matter the size.',
    icon: IconComponents,
  },
  {
    id: 4,
    name: 'Clear Communication',
    description:
      'We keep communication simple and direct. You’ll always know what’s happening, what’s next, and where things stand.',
    icon: IconSolarElectricity,
  },
  {
    id: 5,
    name: 'Attention to Detail',
    description:
      'The small details make a big difference. We pay close attention to every part of the work to ensure it’s clean, consistent, and well thought out.',
    icon: IconClockDollar,
  },
  {
    id: 6,
    name: 'Built for Long-Term Growth',
    description:
      'Our work is designed to last. We focus on building strong foundations that support your brand as it grows over time.',
    icon: IconLaurelWreath,
  },
];
