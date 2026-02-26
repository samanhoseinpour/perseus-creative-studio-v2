import {
  Layers3 as IconVersions,
  Sparkles as IconAi,
  PanelsTopLeft as IconComponents,
  SunMedium as IconSolarElectricity,
  CircleDollarSign as IconClockDollar,
  Trophy as IconLaurelWreath,
} from 'lucide-react';
import { FAQItem } from '@/components/FaqList';

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
    title: '2D & 3D Models & 360 Tours',
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
  { id: 10, embedId: 'siYOgBYfgo4' },
  { id: 11, embedId: 'RqnQjd5UjG8' },
  { id: 12, embedId: 'pjDQN3riSKg' },
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

export const faqItems: FAQItem[] = [
  // Services Questions
  {
    category: 'Services',
    question: 'What services does Perseus Creative Studio offer?',
    answer:
      'Perseus Creative Studio brings together brand strategy and identity, website design/development, photo and video production, and also highlights SEO, Google Ads, Meta Ads, LinkedIn Ads, tracking/analytics, CRO, and social media management—so strategy, creative, performance, reporting, and multi-channel digital marketing.',
  },
  {
    category: 'Services',
    question: 'Do you provide brand strategy and positioning?',
    answer:
      'Yes, Perseus provides Brand Strategy & Identity and describes positioning work that clarifies what you sell, who you’re for, and why customers should choose you. The goal is consistency across your website, ads, and social presence, so brand decisions translate into measurable outcomes instead of disconnected creative. ',
  },
  {
    category: 'Services',
    question: 'Can you create a full brand identity (logo + guidelines)?',
    answer:
      'Perseus’s services include logo/visual identity and branding deliverables designed to keep your brand consistent everywhere it shows up. We also provide “visual identity systems” and brand guidelines—useful if you need a complete identity package rather than a single logo file.',
  },
  {
    category: 'Services',
    question: 'What types of websites do you build?',
    answer:
      'Perseus delivers custom website development across WordPress and modern stacks, such as Next.js/Node.js, with a focus on performance, conversion, SEO-ready structure, funnel optimization, automation/workflows, analytics, and ongoing support, so the site can function as a growth channel, not a static brochure.',
  },
  {
    category: 'Services',
    question: 'Do you handle UX and website strategy before design?',
    answer:
      'Yes. Perseus explicitly provides “Website Strategy & UX” as part of the website lifecycle, framing it as clarifying goals, structuring pages, and designing journeys that turn visitors into qualified leads.',
  },
  {
    category: 'Services',
    question: 'Do you offer SEO services?',
    answer:
      'Perseus lists SEO as one of its core marketing services and positions web builds as “SEO-ready,” incorporating clean URLs, metadata, and performance considerations. The SEO service itself focuses on keyword research, on-page optimization, technical SEO audits, and ongoing strategy to improve search rankings and organic traffic.',
  },
  {
    category: 'Services',
    question: 'Do you manage paid ads like Google Ads and Meta Ads?',
    answer:
      'Yes. Perseus’s Services page explicitly lists Google Ads, Meta Ads, and LinkedIn Ads under “SEO & Paid Ads,” alongside tracking/analytics, CRO, Data-driven optimization, audience targeting, and conversion-focused campaigns across digital platforms.',
  },
  {
    category: 'Services',
    question: 'Do you offer social media management?',
    answer:
      'Perseus lists Social Media Management and describes a structured approach: social strategy and content pillars, content calendars/scheduling, posting and community management, creator collaborations, and reporting/insights.',
  },
  {
    category: 'Services',
    question: 'Do you produce video and photography (including drone)?',
    answer:
      'Yes. Perseus promotes cinematic videography, photography, aerial production, and post-production services, positioning content as “built for distribution” across websites, ads, and social.',
  },
  {
    category: 'Services',
    question: 'Do you create 3D models and 360° tours (Matterport)?',
    answer:
      'Perseus offers “3D Models & 360 Tours” among production services, and specifically real-estate deliverables such as MLS imagery, 3D floor plans, and virtual tours.',
  },
  {
    category: 'Services',
    question: 'Do you set up analytics, tracking, and reporting?',
    answer:
      'Perseus sets up “Tracking & Analytics” on your Website and includes “Performance & Analytics” within the website lifecycle, positioning measurement as part of the build, not an afterthought.',
  },
  // About Questions
  {
    category: 'About',
    question: 'Where is Perseus based, and where do you work?',
    answer:
      'Perseus is based in Vancouver, with the studio available by appointment. We also operate through creative hubs in Los Angeles and Dubai, and we work with clients worldwide—either in person when it makes sense or fully remotely with clear scheduling across time zones.',
  },
  {
    category: 'About',
    question: 'When was Perseus founded?',
    answer:
      'Perseus was founded in January 2024. We started with a clear mission: helping small businesses and personal brands stand out through creativity, strategy, and storytelling—and we’ve grown from early design and media projects into broader, full-service work across industries and locations, including travel for production.',
  },
  {
    category: 'About',
    question: 'What industries do you work with?',
    answer:
      'We work across real estate, construction, fitness, events, hospitality, lifestyle and luxury, health and beauty/wellness, as well as retail and showroom brands—including specialized projects like boats and yachts, venues, and other service-based businesses.  ',
  },
  {
    category: 'About',
    question: 'What is your project process from start to finish?',
    answer:
      'Our process follows six clear phases: Discover, Strategize, Create, Develop, Refine, and Deliver & Support. We start by understanding your goals, audience, and brand, then build a strategy and scope with timelines and priorities. Next, we create the concepts and content, develop the final assets (like websites, campaigns, or media), and refine everything through structured feedback and approvals. After launch, we support delivery with updates, performance tracking, and ongoing optimization options so the work keeps improving—not just going live.',
  },
  // Projects Questions
  {
    category: 'Projects',
    question: 'Where can I see examples of your work?',
    answer:
      'You can see examples of our work in the Projects section, where we share curated highlights across industries like construction, real estate, fitness, events, and retail/showrooms. If you want examples tailored to your niche and the exact deliverables you need (web, media, branding, or ads), contact us and we’ll share the most relevant references.',
  },
  {
    category: 'Projects',
    question:
      'What deliverables do you typically provide for a website project?',
    answer:
      'For a typical website project, we deliver the full set of assets needed to plan, build, launch, and grow the site: sitemap and page structure, wireframes and UX flows, visual design (including a design system/components), fully developed pages, mobile optimization, SEO foundations, and analytics/tracking setup. We also provide a launch checklist and post-launch support, and if needed we can include automations and integrations like forms, CRM/email workflows, booking tools, and other third-party systems.',
  },
  {
    category: 'Projects',
    question: 'How long do projects usually take?',
    answer:
      'Timelines depend on scope, feedback speed, and production complexity, but we set clear ranges upfront and confirm exact milestones in your proposal. As a general guide: branding and design projects often take a few weeks; website builds typically take several weeks to a few months depending on pages, features, and integrations; and video/photo productions usually run a few weeks from planning through filming and post-production.',
  },
  {
    category: 'Projects',
    question: 'Do you share results, reporting, or performance outcomes?',
    answer:
      'Yes. We track performance based on what “results” mean for your goals—such as qualified leads and inquiries, bookings, sales actions, engagement, or conversion rate improvements. For campaigns and ongoing work, we share reporting on a regular cadence and translate the data into clear next steps. For websites, we also monitor post-launch behavior and use insights (traffic sources, drop-off points, form completion, and key actions) to guide refinements and conversion improvements over time.',
  },
  {
    category: 'Projects',
    question: 'Do you offer testimonials or client feedback references?',
    answer:
      'Yes. We can share client testimonials and feedback, and we can also provide relevant references when appropriate—matched to your industry and the type of work you’re considering (website, branding, media, or marketing).',
  },
  {
    category: 'Projects',
    question: 'Do you Services integration with other tools?',
    answer: 'We integrate with everything except the tools you actually use.',
  },
  // Contracts Questions
  {
    category: 'Contracts',
    question: 'How do we start a project with Perseus?',
    answer:
      'To start a project, send an inquiry with your goals and the type of support you need (branding/strategy, website, video/photo, social media, advertising, partnership, or hiring). After we review your request, we’ll follow up with the next steps and a tailored proposal aligned to your scope, timeline, and priorities.',
  },
  {
    category: 'Contracts',
    question: 'What information should we prepare before the first call?',
    answer:
      'Before the first call, it helps to have your goals (what you want to achieve), your target audience, your priorities and scope (what’s most important right now), your ideal timeline, and how you’ll measure success (leads, bookings, sales, engagement, etc.). If available, bring your website and social links, any brand guidelines or existing assets, access to current analytics/ads accounts, and a few competitor or reference examples you like (and what you like about them).',
  },
  {
    category: 'Contracts',
    question: 'How do proposals, scope, and deliverables get defined?',
    answer:
      'After discovery, we translate your goals into a defined scope that lists the exact deliverables, project milestones, timeline, and what’s included vs. out of scope. We also set clear approval points and acceptance criteria—so everyone agrees on what “done” means before production starts.',
  },
  {
    category: 'Contracts',
    question: 'How do revisions and approvals work?',
    answer:
      'We keep revisions structured and easy to manage. Feedback is collected in a single, consolidated place so it’s clear what’s changing and why, and approvals happen at defined checkpoints before anything goes live. Each project includes an agreed revision approach per deliverable (outlined in your proposal), and if new requests expand beyond the original scope, we flag it early and provide options for adjusting timeline and budget.',
  },
  {
    category: 'Contracts',
    question: 'Who owns the final deliverables and source files?',
    answer:
      'Ownership is defined clearly in your proposal/SOW. In most cases, you own the final approved deliverables we produce for you, while access to editable source files and raw materials is handled based on the agreed scope. Any third-party licensed elements (like fonts, plugins, stock assets, or music) remain subject to their original license terms.',
  },
  {
    category: 'Contracts',
    question: 'Can you work under an NDA or confidentiality requirements?',
    answer:
      'Yes. If your project requires an NDA or specific confidentiality terms, we can accommodate that as part of the engagement. We’ll confirm the requirements during discovery and include them in the written agreement, including any restrictions around sharing the work publicly (portfolio, case studies, or social media).',
  },
  // Pricing Questions
  {
    category: 'Pricing',
    question: 'Do you publish pricing or offer fixed packages?',
    answer:
      'We don’t publish fixed package pricing because every project is scoped to your goals, deliverables, and timeline. Pricing is proposal-based, and we can provide options at different investment levels so you can choose the scope that fits your priorities.',
  },
  {
    category: 'Pricing',
    question: 'What impacts the cost of a website project?',
    answer:
      'Website cost depends on scope and complexity—especially the number of pages/templates, the level of strategy and UX required, custom functionality, integrations (CRM, bookings, payments, email tools), automation/workflows, and performance or SEO requirements. Content readiness also matters: if copy, photos, or video need to be created, that changes the effort and timeline. Platform choice is based on your goals and how you’ll manage updates—some projects benefit from a flexible CMS setup, while others need a more custom build for speed, scalability, or unique features.',
  },
  {
    category: 'Pricing',
    question: 'What impacts the cost of video production?',
    answer:
      'Video production cost depends on the scope across three stages: pre-production (concept, scripting, shot list, scheduling), production (filming days, crew size, equipment, locations, talent, and any travel), and post-production (editing time, motion graphics, sound design, color grading, and the number of final deliverables/versions for different platforms). We scope everything transparently upfront so the budget matches the creative ambition and the distribution plan.',
  },
  {
    category: 'Pricing',
    question: 'How does paid ad spend work versus management fees?',
    answer:
      'Ad spend and management are separate. Ad spend is the budget paid directly to platforms like Google, Meta, or LinkedIn to run the ads. Our management fees cover strategy, campaign setup, creative and copy (if included), tracking and conversion setup, ongoing optimization, and reporting. We measure performance against business outcomes—like leads, bookings, purchases, or qualified inquiries—not just clicks.',
  },
  {
    category: 'Pricing',
    question: 'Do you offer monthly retainers for marketing or content?',
    answer:
      'Yes. We offer monthly retainers for ongoing marketing, content, and support—such as social media management, paid ads optimization, and website maintenance. A retainer typically includes an agreed monthly deliverable cadence, regular reporting, and continuous optimization, with priorities set each month based on results, seasonality, and your business goals.',
  },
  {
    category: 'Pricing',
    question: 'Can we bundle branding, website, and ongoing marketing?',
    answer:
      'Yes. We can bundle branding, website, and ongoing marketing into one integrated engagement. Bundling keeps the brand consistent across every touchpoint, speeds up iteration because the same team owns strategy and execution, and makes performance tracking more useful because web, ads, and social share the same analytics and goals. It also lets us reuse creative efficiently across channels—so your content works harder and stays aligned with the bigger brand story.',
  },

  // Technical Questions
  {
    category: 'Technical',
    question: 'What tech stack do you use for websites?',
    answer:
      'We build on WordPress for flexible, client-friendly content management, and we also develop custom sites using modern frameworks like Next.js and Node.js when you need higher performance, advanced functionality, or a more tailored build. The right stack depends on how you want to edit content, how fast the site needs to be, what features you need, and which integrations or automations (CRM, forms, email, booking, payments) are required.',
  },
  {
    category: 'Technical',
    question: 'Do you build automations, integrations, or AI workflows?',
    answer:
      'Yes. We build automations, integrations, and AI-enabled workflows when they improve speed and consistency—such as lead capture and routing, CRM handoffs, email/SMS notifications, booking flows, and internal task automation. For AI workflows (including chatbots where appropriate), we set clear guardrails around what data is used, how conversations are logged, and when a human handoff is required—so automation supports your team without compromising quality or control.',
  },
  {
    category: 'Technical',
    question: 'What security measures do you include on websites?',
    answer:
      'We include practical security measures that protect the site after launch, not just on day one. This typically includes SSL/TLS, hardened security headers, role-based admin access, regular backups, and ongoing updates/patching. The goal is to reduce exposure to common attacks, limit who can make changes, and ensure you can recover quickly if anything goes wrong.',
  },
  {
    category: 'Technical',
    question: 'How do you handle privacy and data protection?',
    answer:
      'We treat privacy and data protection as part of the build, not an afterthought. We review what personal data your site collects (forms, bookings, payments), what tracking is used (cookies, analytics, pixels), and how consent, retention, and access are handled. Then we implement practical safeguards—like secure form handling, minimal data collection where possible, and clear cookie/consent setups when required. If your business operates across regions, we align the setup to the applicable requirements and can coordinate with your legal counsel for final compliance language and policies.',
  },
  {
    category: 'Technical',
    question: 'Do you build accessible, mobile-friendly websites?',
    answer:
      'Yes. We build websites to be mobile-first, responsive, and performance-focused as a standard. We also follow accessibility best practices aligned with WCAG guidelines—so key pages, navigation, and interactive elements are usable for a wider range of people and devices.',
  },
  {
    category: 'Technical',
    question: 'Do you implement SEO fundamentals and structured data?',
    answer:
      'Yes. We implement core SEO foundations—clean site structure, optimized metadata, fast performance, and search-friendly URLs—along with structured data where it makes sense. Common schema setups include Organization or LocalBusiness, key service pages, and other relevant markup that matches what’s visibly on the site. If you publish an FAQ hub, we can also implement FAQ structured data in a way that follows search engine guidelines and stays consistent with on-page content.',
  },

  // CRO Questions
  {
    category: 'CRO',
    question: 'Do you build landing pages and funnels designed to convert?',
    answer:
      'Yes. We build high-converting landing pages and funnels tailored to your offer—designed to turn traffic into inquiries, booked calls, and purchases. We align strategy, copy and design, development, tracking, and (when needed) automations so the funnel performs as a measurable growth channel, not just a page.',
  },
  {
    category: 'CRO',
    question: 'How do you approach CRO after launch?',
    answer:
      'After launch, we treat CRO as an ongoing improvement loop. First, we define the conversion actions that matter to your business (qualified leads, booked calls, purchases, key form submissions) and ensure tracking is set up correctly. Then we review real user behavior—traffic sources, drop-off points, click paths, and form performance—to identify where conversions are being lost. From there, we prioritize the highest-impact opportunities, implement changes (copy, layout, UX, speed, CTAs, funnel steps), and measure results over time so optimization is tied to outcomes, not vanity metrics.',
  },
  {
    category: 'CRO',
    question: 'How do video and visuals improve conversion?',
    answer:
      'High-quality video and visuals increase conversion by building trust faster and reducing decision friction. They help people understand your offer quickly, show proof of quality (work, environment, process, results), and keep visitors engaged long enough to take action. When placed strategically—hero sections, key service explanations, testimonials, and calls-to-action—visuals guide users through the journey from interest to inquiry. We also optimize media delivery so strong visuals support performance without slowing down the site.',
  },

  // Maintenance Questions
  {
    category: 'Maintenance',
    question: 'Do you offer ongoing website maintenance after launch?',
    answer:
      'Yes. After launch, we offer ongoing maintenance to keep your site secure, fast, and up to date. This typically includes platform and plugin/framework updates, security patching, backups, uptime/basic monitoring, and performance checks—plus optional improvements and content updates as your business evolves.',
  },
  {
    category: 'Maintenance',
    question: 'What does “Care & Ongoing Support” typically include?',
    answer:
      '“Care & Ongoing Support” usually includes keeping the site reliable and improving it over time. That means ongoing updates and security hygiene, backups and monitoring for stability, performance checks to maintain speed, and a clear workflow for requests like content edits, new sections, or landing pages. We also use analytics signals—what people click, where they drop off, and which pages convert—to guide improvements so changes are driven by real user behavior, not guesswork.',
  },
  {
    category: 'Maintenance',
    question: 'Will our team be able to edit the website after launch?',
    answer:
      'Yes. Your team can edit website content after launch—things like text, images, basic pages, and updates—without breaking the site structure or SEO foundations. More advanced changes (new features, complex integrations, or structural redesigns) are handled as development work. We include a handover with the right access, a clear editing workflow, and basic guidance so you can update confidently.',
  },
  {
    category: 'Maintenance',
    question: 'How do you handle support requests and communication?',
    answer:
      'We keep communication simple and organized. You’ll have a primary point of contact, and requests are tracked in a shared system so tasks, feedback, and approvals stay clear—especially with multiple stakeholders. Turnaround depends on the request type: urgent issues (like security or site downtime) are prioritized immediately, while routine edits and updates are scheduled and delivered within an agreed timeframe based on scope and workload.',
  },

  // Industries Questions
  {
    category: 'Industries',
    question: 'Do you specialize in real estate marketing content?',
    answer:
      'Yes. We produce real estate marketing content such as high-end listing and walkthrough videos, MLS-ready photography, and virtual tour assets (including 3D floor plans where needed). Deliverables can be created in multiple formats—horizontal for websites/YouTube and vertical cutdowns for social—so your content performs across channels. We can also integrate the assets into listing pages and ad funnels to drive inquiries and booked showings with a clear turnaround plan set at the start of the project.',
  },
  {
    category: 'Industries',
    question: 'Do you work with construction and renovation companies?',
    answer:
      'Yes. We work with construction and renovation companies, creating content that highlights craftsmanship, process, progress, and before/after transformations—plus finished project coverage designed to build trust. When combined with an SEO-ready website and location-targeted service pages, this content also supports local discovery and helps turn searches into qualified inquiries.',
  },
  {
    category: 'Industries',
    question: 'Do you create fitness and sports content?',
    answer:
      'Yes. We create fitness and sports content designed to capture energy, community, and performance—ranging from brand commercials to social-first short-form edits. We also connect the content to conversion by pairing it with landing pages, clear booking or inquiry calls-to-action, and performance tracking for paid social and ads so you can measure what drives sign-ups.',
  },
  {
    category: 'Industries',
    question: 'Do you support local SEO and neighborhood targeting?',
    answer:
      'Yes. We support local SEO and neighborhood-level targeting by building service-area and location pages, aligning on-page information with your business listings, and adding relevant local structured data where appropriate. We also strengthen trust signals—clear service areas, proof of work, and review/social proof integration—so local searches translate into calls, bookings, and qualified inquiries.',
  },
  {
    category: 'Industries',
    question: 'Can you support multi-location businesses?',
    answer:
      'Yes. Your team can edit website content after launch—things like text, images, basic pages, and updates—without breaking the site structure or SEO foundations. More advanced changes (new features, complex integrations, or structural redesigns) are handled as development work. We include a handover with the right access, a clear editing workflow, and basic guidance so you can update confidently.',
  },
  {
    category: 'Industries',
    question: 'Do you support multilingual or multi-regional websites?',
    answer:
      'Yes. We can build multilingual and multi-regional websites with a structure that serves the right language and region to the right visitors. That typically includes dedicated URLs per language/region, hreflang implementation, translated page content, localized SEO metadata (titles, descriptions, headings), and region-appropriate policy/compliance language where needed. We also set a clear update workflow so content changes stay consistent across all versions over time.',
  },
];
