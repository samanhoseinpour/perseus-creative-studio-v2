import type { IconType } from 'react-icons';
import {
  LuLocateFixed as LocateFixed,
  LuTelescope as Telescope,
  LuChartNoAxesGantt as ChartNoAxesGantt,
  LuBriefcase as Briefcase,
  LuNetwork as Network,
  LuSignature as Signature,
  LuCalendarCheck as CalendarCheck,
  LuPanelsTopLeft as PanelsTopLeft,
} from 'react-icons/lu';

/**
 * Content store for the `/about` route. Components in `src/components/About`
 * (plus `Team`) read their copy, icons, links, and media references from here
 * so the components themselves stay structural. Tailwind/presentation classes
 * remain in the components — only content lives in this file.
 */

// Shared shapes -------------------------------------------------------------

// Mirrors the required fields of <Heading> so these objects can be spread
// straight into the component: title + description are required, the rest
// optional.
export type HeadingContent = {
  seperatorTitle?: string;
  eyebrowRight?: string;
  title: string;
  titleAccent?: string;
  description: string;
};

export type AboutCtaLink = {
  label: string;
  href: string;
  icon: IconType;
  variant: 'primary' | 'secondary';
};

// Hero ----------------------------------------------------------------------

export const ABOUT_HERO_HEADING: HeadingContent = {
  seperatorTitle: 'About',
  eyebrowRight: 'Our Studio',
  title: 'About Perseus',
  titleAccent: 'Creative Studio',
  description:
    'We’re a creative marketing studio built on design, storytelling, and results — helping brands grow, connect, and become truly memorable through meaningful visuals.',
};

export const ABOUT_HERO_CTAS: AboutCtaLink[] = [
  {
    label: 'Start a Conversation',
    href: '/contact',
    icon: CalendarCheck,
    variant: 'primary',
  },
  {
    label: 'View Our Work',
    href: '/projects',
    icon: PanelsTopLeft,
    variant: 'secondary',
  },
];

export const ABOUT_PRINCIPLES_HEADING: HeadingContent = {
  seperatorTitle: 'Studio Principles',
  eyebrowRight: 'Core Values',
  title: 'How we think',
  titleAccent: 'Principles behind every project.',
  description:
    'A clear view of how we approach strategy, execution, collaboration, and long-term brand growth.',
};

export type AboutFeature = {
  feature: string;
  featureDesc: string;
  icon: IconType;
};

export const ABOUT_FEATURES: AboutFeature[] = [
  {
    feature: 'Mission',
    featureDesc:
      'We turn ideas into real, high-performing assets — websites, videos, and brand identities that push businesses forward. From the first strategy call to the final delivery, we ensure every step is built on intention: clean, custom code; visuals with meaning; and design that earns trust. No shortcuts, no templates — just purposeful work aligned with your goals.',
    icon: LocateFixed,
  },
  {
    feature: 'Vision',
    featureDesc:
      'Creativity should be infrastructure, not decoration. We envision a world where artistry, engineering, and business intelligence fuse together — so brands communicate clearly, convert consistently, and scale with confidence. As we grow, we push the boundaries of what a creative studio can do: deeper systems, richer storytelling, and solutions that last long after launch. ',
    icon: Telescope,
  },
  {
    feature: 'How We Work',
    featureDesc:
      'Our process is built on clarity and collaboration. It begins with discovery — understanding you, your business, your market, and your vision. We then translate strategy into execution: designing, developing, filming, and branding — all tied to concrete outcomes. Every decision we make links back to your goals, delivering work that feels polished, impactful, and authentic.',
    icon: ChartNoAxesGantt,
  },
  {
    feature: 'What We Do',
    featureDesc:
      'We excel in three core areas: custom website development (WordPress, Next.js, fully bespoke—no templates), professional media production (multi-camera video, drone cinematography, high-end photography, and storytelling for real estate, corporate, luxury, and lifestyle), and branding & identity (strategic visual systems, logos, and long-term brand guidelines).',
    icon: Briefcase,
  },
  {
    feature: 'Our Commitment',
    featureDesc:
      'We believe in doing the work right — not fast or easy, but with purpose and precision. Our clients trust us because we bring vision and thoughtful detail to every project, whether it’s a one-day shoot or a full-scale campaign. You’re not hiring a vendor — you’re partnering with creators invested in your brand’s success.',
    icon: Network,
  },
  {
    feature: 'What Sets Us Apart',
    featureDesc:
      'It’s not just about what we produce — it’s how deeply we engage. We’ve led international visual storytelling projects, launched digital platforms for global clients, and filmed high-stakes events and luxury properties. That level of ambition, experience, and care is what makes the difference.',
    icon: Signature,
  },
];

// Parallax content ----------------------------------------------------------

export type AboutParallaxBody = {
  eyebrow: string;
  eyebrowRight: string;
  heading: string;
  titleAccent: string;
  subHeading: string;
  desc: string;
  cta: string;
  linkTo: string;
  icon: IconType;
  variant: 'primary' | 'secondary';
};

export type AboutParallaxSection = {
  videoUrl: string;
  videoAlt: string;
  heading: string;
  subheading: string;
  body?: AboutParallaxBody;
};

export const ABOUT_PARALLAX_SECTIONS: AboutParallaxSection[] = [
  {
    videoUrl:
      'https://www.youtube.com/embed/kC3LPrq2fqY?autoplay=1&mute=1&loop=1&playlist=kC3LPrq2fqY&controls=0&modestbranding=1&playsinline=1&rel=0',
    videoAlt:
      '2025 Recap | Projects Across Vancouver, Toronto & Los Angeles | Perseus Creative Studio',
    subheading:
      'Where sharp strategy, cinematic craft, and digital systems meet.',
    heading: 'Built for Modern Momentum',
    body: {
      eyebrow: 'Vision & Mission',
      eyebrowRight: 'Studio Purpose',
      heading: 'Our Vision and Mission',
      titleAccent:
        'A creative partner built for speed, clarity, and results.',
      subHeading: 'Why Choose Perseus Creative Studio',
      desc: 'At Perseus Creative Studio, we’re defined by speed, creativity, flexibility — and above all, results. We deliver same-day video and photo work when needed, and move quickly on larger branding, web, or media projects without sacrificing quality. Our creative team adapts to your vision, shifts direction as needed, and always centers your objectives. You’re not just hiring a vendor — you’re gaining a partner committed to making your brand known, liked, and trusted. With us, every project is driven by purpose: beautiful visuals, compelling stories, and measurable outcomes.',
      cta: 'Explore What We Can Do for You',
      linkTo: '/contact',
      icon: CalendarCheck,
      variant: 'primary',
    },
  },
  {
    videoUrl:
      'https://www.youtube.com/embed/siYOgBYfgo4?autoplay=1&mute=1&loop=1&playlist=siYOgBYfgo4&controls=0&modestbranding=1&playsinline=1&rel=0',
    videoAlt:
      'Cinematic Real Estate Video | Custom Home Development in Encino, Los Angeles, California',
    heading: 'What We Create',
    subheading:
      'Brand systems, websites, photography, video, and campaigns designed to help modern businesses stand out.',
    body: {
      eyebrow: 'Beliefs & Values',
      eyebrowRight: 'Brand Systems',
      heading: 'What We Believe & Our Values',
      titleAccent: 'Principles that shape modern brand strategy.',
      subHeading:
        'Principles that power modern brand strategy and design',
      desc: 'We serve a wide range of clients — from real estate developers, luxury lifestyle brands, health & wellness studios, to construction, corporate, and tech startups — anyone who wants their brand to be meaningful and noticed. We don’t just make visuals; we build identity. Our expertise includes strategic branding and visual systems, custom web design using WordPress or Next.js, and cinematic media production — video, drone footage, and photography tailored to your story. For real estate clients, we offer MLS imagery, 3D floor plans, and virtual tours. We also devise content strategy and digital marketing for brands wanting to grow across channels. And for immersive experiences — events, luxury showcases, hospitality — we capture those moments in a way that resonates long after.',
      cta: 'See Our Work in Action',
      linkTo: '/projects',
      icon: PanelsTopLeft,
      variant: 'secondary',
    },
  },
  {
    videoUrl:
      'https://www.youtube.com/embed/Y9-V8-YECc4?autoplay=1&mute=1&loop=1&playlist=Y9-V8-YECc4&controls=0&modestbranding=1&playsinline=1&rel=0',
    videoAlt:
      'Cinematic Video Production for Real Estate, Construction & Gym| Marketing Agency | Sony FX3 Videos',
    heading: 'From Vision to Velocity',
    subheading:
      'A studio mindset shaped around clarity, movement, and work that performs beyond the first impression.',
    body: {
      eyebrow: 'Studio Origin',
      eyebrowRight: 'Why Perseus',
      heading: 'Why We Created Perseus Creative Studio ?',
      titleAccent: 'Built to close the gap between ideas and execution.',
      subHeading: 'Built to move modern brands forward',
      desc: 'Perseus Creative Studio was founded to close the gap between bold ideas and precise execution. Modern brands need an agile creative partner that understands business objectives, moves quickly, and never compromises on craft. Our studio is deliberately built around that mindset: senior-level strategy, streamlined production, and workflows that keep branding, web, and media tightly aligned. Every deliverable — from a full launch campaign to a single hero asset — is designed to perform, so your brand shows up consistently, confidently, and ahead of the curve.',
      cta: 'Let’s Build What’s Next',
      linkTo: '/contact',
      icon: CalendarCheck,
      variant: 'primary',
    },
  },
  {
    videoUrl:
      'https://www.youtube.com/embed/wle-h055HQ0?autoplay=1&mute=1&loop=1&playlist=wle-h055HQ0&controls=0&modestbranding=1&playsinline=1&rel=0',
    videoAlt:
      'Cinematic FX3 Real Estate Videography | High-End Media Agency Videos | Luxury Real Estate Films 2025',
    heading: 'Who We Serve',
    subheading:
      'We partner with real estate, lifestyle, wellness, construction, corporate, and emerging brands ready to grow with clarity.',
  },
];

// What We Do ----------------------------------------------------------------

export const ABOUT_SERVICES_HEADING: HeadingContent = {
  seperatorTitle: 'What We Do',
  eyebrowRight: 'Five disciplines · One studio',
  title: 'Everything your brand needs,',
  titleAccent: 'run end to end in-house.',
  description:
    'Production, websites, digital marketing, social, and branding — one senior team carries the work from strategy to shipped. Pull a discipline open to see where it takes you.',
};

// Timeline ------------------------------------------------------------------

export const ABOUT_TIMELINE_HEADING: HeadingContent = {
  seperatorTitle: 'Studio Timeline',
  eyebrowRight: 'Growth Path',
  title: 'From Launch to Scale',
  titleAccent: 'The milestones behind our studio growth.',
  description:
    'Founded in January 2024, Perseus Creative Studio began with one mission — to help small businesses and personal brands stand out through creativity, strategy, and storytelling. What started as a handful of design and media projects quickly grew into a full-service creative agency working across industries and borders.',
};

export const ABOUT_TIMELINE_CTAS: AboutCtaLink[] = [
  {
    label: 'Explore Our Projects',
    href: '/projects',
    icon: PanelsTopLeft,
    variant: 'primary',
  },
  {
    label: 'Start a Conversation',
    href: '/contact',
    icon: CalendarCheck,
    variant: 'secondary',
  },
];

export type TimelineImage = { src: string; alt: string };
export type TimelineBlock = { heading: string; paragraphs: string[] };
export type AboutTimelineEntry = {
  title: string;
  subheading: string;
  blocks: TimelineBlock[];
  images: TimelineImage[];
};

export const ABOUT_TIMELINE: AboutTimelineEntry[] = [
  {
    title: '2024',
    subheading: 'Launch & Momentum',
    blocks: [
      {
        heading:
          'Our first year was defined by bold projects and nonstop creativity.',
        paragraphs: [
          'In mid-2024, we traveled across Toronto, Ontario, and Raleigh, North Carolina, partnering with FitBodega Soccer Team to document their journey at the TST 7v7 $1 Million Soccer Tournament.',
          'Over a 45-day span, our team produced multiple videos daily, capturing every moment of competition, travel, and team spirit.',
          'By the end of 2024, Perseus had evolved from supporting personal brands and small businesses to managing high-scale productions, website design, and marketing strategy for corporate clients worldwide.',
        ],
      },
    ],
    images: [
      {
        src: '/images/about/about-perseus-creative-studio-medusa-brand-apparel.avif',
        alt: 'The Perseus Creative Studio Medusa emblem printed across a black t-shirt worn by a crew member — the studio’s founding brand identity.',
      },
      {
        src: '/images/about/about-videographer-gimbal-camera-luxury-kitchen.avif',
        alt: 'A Perseus Creative Studio videographer holds a gimbal-stabilised Sony camera over a marble countertop, filming the interior of a luxury kitchen.',
      },
      {
        src: '/images/about/about-luxury-home-exterior-real-estate-videography.avif',
        alt: 'A Perseus Creative Studio videographer films a modern glass-and-stone luxury home and pool from the deck, shooting real-estate content on a tripod outdoors.',
      },
      {
        src: '/images/about/about-filming-luxury-persian-rug-showroom.avif',
        alt: 'A Perseus videographer films a hand-knotted Persian rug in a showroom, capturing product detail for a retail client.',
      },
    ],
  },
  {
    title: '2025',
    subheading: 'Growth & Scale',
    blocks: [
      {
        heading:
          'Expanding Creative Impact Through Precision, Speed, and Global Reach.',
        paragraphs: [
          'Year two has been all about scale, structure, and polish. We expanded our custom website and content programs across real estate, retail, and hospitality, integrating faster post-production and performance tracking to help clients see measurable results.',
          'Our team also continued documenting architectural and construction projects, following full home builds from concept to completion — creating cinematic stories that show every stage of progress.',
          'With new systems, deeper collaboration, and a growing international presence, Perseus has entered a new phase: creative at scale, built to move fast and deliver lasting results.',
        ],
      },
    ],
    images: [
      {
        src: '/images/about/about-luxury-real-estate-interior-video-production.avif',
        alt: 'A Perseus Creative Studio videographer films the staircase and foyer of a luxury home, shooting real-estate content with a gimbal-stabilised camera.',
      },
      {
        src: '/images/about/about-automotive-dealership-car-cinematography.avif',
        alt: 'A Perseus videographer on a tripod films a silver sports car inside a dealership, producing cinematic automotive content.',
      },
      {
        src: '/images/about/about-gym-fitness-gimbal-videography.avif',
        alt: 'A Perseus Creative Studio videographer crouches with a gimbal-stabilised Sony camera to film fitness content in a gym, framing the weight floor.',
      },
      {
        src: '/images/about/about-videographer-ronin-gimbal-boutique-interior.avif',
        alt: 'A Perseus Creative Studio videographer, the studio’s Medusa logo across the back of his tee, films with a DJI Ronin-stabilised camera inside a bright, modern boutique interior.',
      },
    ],
  },
  {
    title: '2026',
    subheading: 'Reach & Reinvention',
    blocks: [
      {
        heading:
          'From production house to full-funnel marketing partner.',
        paragraphs: [
          'In 2026, Perseus moved beyond the camera. Search, paid media across Google, Meta, and LinkedIn, analytics, and conversion-rate work joined production as a core discipline — so every asset we create is now planned for exactly where it will live, and measured once it gets there.',
          'We also stood up a publishing engine. Our studio journal now ships regularly — practical playbooks for realtors and local brands on Reels, personal-brand video, and paid acquisition — turning hard-won experience into a compounding, searchable library.',
        ],
      },
      {
        heading:
          'A wider map, a rebuilt platform, and a new on-camera identity.',
        paragraphs: [
          'Our network now reaches across seven countries and four continents — from the Vancouver headquarters out to Madrid, Como, Manchester, and Dubai, the furthest leg of the studio at more than 11,700 km.',
          'We rebuilt perseustudio.com from the ground up as a faster, installable platform that keeps working even offline, and marked the year with a 2026 commercial that reintroduces the studio and the standard behind every project.',
        ],
      },
    ],
    images: [
      {
        src: '/images/about/about-perseus-creative-studio-branded-videographer-gimbal.avif',
        alt: 'A Perseus Creative Studio videographer in branded apparel carries a gimbal-mounted camera through a doorway while filming on location.',
      },
      {
        src: '/images/about/about-dji-ronin-gimbal-fitness-video-shoot.avif',
        alt: 'A Perseus videographer operates a DJI Ronin gimbal above a gym floor, capturing cinematic fitness content for a brand.',
      },
      {
        src: '/images/about/about-gym-fitness-video-production-crew.avif',
        alt: 'Two Perseus Creative Studio videographers film inside a gym, both operating gimbal-stabilised Sony cameras to capture fitness content.',
      },
      {
        src: '/images/about/about-on-location-construction-real-estate-shoot.avif',
        alt: 'A Perseus videographer films on a construction site behind protective sheeting, documenting a real-estate development in progress.',
      },
    ],
  },
];

// Team ----------------------------------------------------------------------

export const ABOUT_TEAM_HEADING: HeadingContent = {
  seperatorTitle: 'Team',
  eyebrowRight: 'Studio Leads',
  title: 'Our Team',
  titleAccent: 'The people behind the work.',
  description:
    'Meet the strategists, operators, marketers, and creators shaping the work at Perseus Creative Studio.',
};

export type TeamMember = {
  name: string;
  role: string;
  avatar: string;
  link: string;
};

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Aryan Ghasemi',
    role: 'Founder - CEO',
    avatar: '/images/blogs/authors/blogs-authors-aryan-ghasemi.avif',
    link: '/blogs/authors/aryan-ghasemi',
  },
  {
    name: 'Saman Hoseinpour',
    role: 'Co-Founder - CTO',
    avatar: '/images/blogs/authors/blogs-authors-saman-hoseinpour.avif',
    link: '/blogs/authors/saman-hoseinpour',
  },
  {
    name: 'Arshia Farrahi',
    role: 'Chief Operating Officer',
    avatar: '/images/blogs/authors/blogs-authors-arshia-farahi.avif',
    link: '/blogs/authors/arshia-farahi',
  },
  {
    name: 'Sepehr Barzegari',
    role: 'Marketing Specialist',
    avatar: '/images/blogs/authors/blogs-authors-sepehr-barzegari.avif',
    link: '',
  },
  {
    name: 'Sajjad Hoseinpour',
    role: 'Post Production Specialist',
    avatar: '/images/blogs/authors/blogs-authors-sajad-hoseinpour.avif',
    link: '',
  },
  {
    name: 'Mehdi Ebrahimi',
    role: 'Post Production Specialist',
    avatar: '/images/blogs/authors/blogs-authors-mehdi-ebrahimi.avif',
    link: '',
  },
  {
    name: 'Stevens Mai',
    role: 'Videographer',
    avatar: '/images/blogs/authors/blogs-authors-stevens-mai.avif',
    link: '',
  },
];

// Page-level section headings (Partners / Google Reviews) -------------------

export const ABOUT_WHY_HEADING: HeadingContent = {
  seperatorTitle: 'Why Perseus',
  eyebrowRight: 'The Case, Plainly',
  title: 'Why brands choose us,',
  titleAccent: 'and why they stay.',
  description:
    'No mystery and no theatre — the practical reasons engagements start, and the working habits that keep them running long after the first launch.',
};

export type AboutWhyReason = { title: string; description: string };

export const ABOUT_WHY_REASONS: AboutWhyReason[] = [
  {
    title: 'One senior team, end to end',
    description:
      'Strategy, production, web, and growth live under one roof. No hand-offs between vendors, no telephone-game briefs — the people who plan the work are the people who ship it.',
  },
  {
    title: 'In-house production, not subcontracted',
    description:
      'Cameras, drones, editors, designers, and developers are on the team — not on someone else’s retainer. Quality stays consistent because the same hands touch every deliverable.',
  },
  {
    title: 'Built for distribution',
    description:
      'Nothing is made to sit in a folder. Every asset is planned for where it will actually live — your website, ads, social, and search — before a frame is shot or a line is written.',
  },
  {
    title: 'Measured, not guessed',
    description:
      'Tracking and reporting are wired in from day one, so decisions ride on signal — what was seen, clicked, and converted — not on taste alone.',
  },
  {
    title: 'A partner, not a vendor',
    description:
      'We learn the business, not just the brief. That’s why most relationships continue past the first project — the next campaign starts with context, not onboarding.',
  },
];

export const ABOUT_PARTNERS_HEADING = {
  seperatorTitle: 'Client Network',
  eyebrowRight: 'Studio Proof',
  title: 'Clients and collaborators',
  titleAccent: 'A broader look at the brands connected to our work.',
  description:
    'A wider view of clients, collaborators, and project partners across creative, marketing, web, production, and digital work.',
};

export const ABOUT_REVIEWS_HEADING = {
  seperatorTitle: 'Client Reviews',
  eyebrowRight: 'Google Proof',
  title: 'What clients say',
  titleAccent: 'Verified feedback from real partnerships.',
  description:
    'A closer look at client feedback from real projects across creative, marketing, web, media, and digital work.',
};
