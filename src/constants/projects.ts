// The projects archive registry — content for /projects and
// /projects/[category]. Mirrors the services registry contract in
// `src/constants/services.ts`: case-study summaries per category, and the
// `PROJECT_CATEGORIES` registry the hub and category pages consume.
//
// NOTE: the per-case-study DETAIL layer (content maps, `getProjectDetail`,
// `allProjectDetailParams`, and the `/projects/[category]/[project]` route) was
// torn down and is to be rebuilt later. Only summaries + categories remain.
// Types live in `src/components/Projects/types.ts`.

import { OG_IMAGE, SITE_URL } from '@/constants';
import type {
  ProjectCategoryContent,
  ProjectSummary,
} from '@/components/Projects/types';

// ───────────────────────────────────────────────────────────────────────────
// Shared cover placeholder + summary helper for every non-Websites project
// below (Production, Digital Marketing, Social, Branding). Each ships on the
// studio wordmark cover until real media lands, carries the 2025 work year, and
// derives a formulaic cover alt — so the registry stays to the columns that
// vary. Pass coverImageUrl / coverImageAlt / year to override per entry.
// ───────────────────────────────────────────────────────────────────────────

/** White studio wordmark — reads on the card's always-dark slate backdrop. */
const COVER_PLACEHOLDER = '/logo-white.png';

// Real covers for the project() summaries (Production, Digital Marketing, Social,
// Branding), keyed by slug. The helper below uses these as the default cover +
// alt; an explicit coverImageUrl/coverImageAlt on a call still wins. Slugs with no
// entry fall back to the wordmark placeholder until their asset lands. Websites
// covers live on their own objects (WEBSITE_COVER_PLACEHOLDER), not here.
const PROJECT_COVERS: Record<string, { url: string; alt: string }> = {
  // Production · video & photo
  'mystica-80-skylounge': {
    url: '/images/projects/production/projects-production-mystica-80-skylounge.avif',
    alt: 'Ignition Marine’s Mystica 80 Skylounge luxury yacht cruising on the water off North Vancouver, filmed by Perseus Creative Studio.',
  },
  '2016-prestige-550-flybridge': {
    url: '/images/projects/production/projects-production-2016-prestige-550-flybridge.avif',
    alt: 'Aerial view of Technician Marine’s 2016 Prestige 550 Flybridge yacht under way on open water, shot by Perseus Creative Studio.',
  },
  'usmi-rhib': {
    url: '/images/projects/production/projects-production-usmi-rhib.avif',
    alt: 'Ignition Marine’s USMI rigid-hull inflatable boat speeding past an industrial port, captured in a performance shoot by Perseus Creative Studio.',
  },
  'obsidian-north-vancouver-tour': {
    url: '/images/projects/production/projects-production-obsidian-north-vancouver-tour.avif',
    alt: 'Wide interior of Obsidian Athletic Club’s North Vancouver gym floor packed with strength equipment, photographed by Perseus Creative Studio.',
  },
  'obsidian-edmonton-tour': {
    url: '/images/projects/production/projects-production-obsidian-edmonton-tour.avif',
    alt: 'Expansive strength-training floor at Obsidian Athletic Club’s Edmonton location, captured for a facility tour by Perseus Creative Studio.',
  },
  'vitality-fitness-tour': {
    url: '/images/projects/production/projects-production-vitality-fitness-tour.avif',
    alt: 'Modern cardio and training floor at Vitality Fitness with lit walkways and rows of equipment, filmed by Perseus Creative Studio.',
  },
  'andy-owusu': {
    url: '/images/projects/production/projects-production-andy-owusu.avif',
    alt: 'Match Tour 11 footballer Andy Owusu in a blue training kit on the pitch during a session, photographed by Perseus Creative Studio.',
  },
  'buckswood-madrid-trip': {
    url: '/images/projects/production/projects-production-buckswood-madrid-trip.avif',
    alt: 'Match Tour 11 squad posing on the pitch during the Buckswood Madrid trip, documented by Perseus Creative Studio.',
  },
  'como-1907-visit': {
    url: '/images/projects/production/projects-production-como-1907-visit.avif',
    alt: 'Aerial of Como 1907’s lakeside stadium during a Match Tour 11 visit, captured by Perseus Creative Studio.',
  },
  'cmfsc-roma-manchester-trip': {
    url: '/images/projects/production/projects-production-cmfsc-roma-manchester-trip.avif',
    alt: 'Match Tour 11 group on the pitch at Manchester City’s Etihad Stadium during the CMFSC Roma–Manchester trip, shot by Perseus Creative Studio.',
  },
  '1139-s-sherbourne': {
    url: '/images/projects/production/projects-production-1139-s-sherbourne.avif',
    alt: 'Aerial of the 1139 S Sherbourne multi-family building in Los Angeles, photographed for Michael Kamara Realtor by Perseus Creative Studio.',
  },
  '7050-waring': {
    url: '/images/projects/production/projects-production-7050-waring.avif',
    alt: 'Aerial view of the 7050 Waring multi-family residential property in Los Angeles, captured for Michael Kamara Realtor by Perseus Creative Studio.',
  },
  '14459-benefit-st-sherman-oaks': {
    url: '/images/projects/production/projects-production-14459-benefit-st-sherman-oaks.avif',
    alt: 'Aerial over the Sherman Oaks neighborhood showing the 14459 Benefit St property, captured for Michael Kamara Realtor by Perseus Creative Studio.',
  },
  '1059-s-corning-st': {
    url: '/images/projects/production/projects-production-1059-s-corning-st.avif',
    alt: 'Street view of the 1059 S Corning St apartment building in Los Angeles, photographed for Michael Kamara Realtor by Perseus Creative Studio.',
  },
  'salon-centric-appreciation-event': {
    url: '/images/projects/production/projects-production-salon-centric-appreciation-event.avif',
    alt: 'Candlelit appreciation dinner with a projected SalonCentric logo on the wall, event captured by Perseus Creative Studio.',
  },
  'kelowna-piling-project': {
    url: '/images/projects/production/projects-production-kelowna-piling-project.avif',
    alt: 'Excavator and stacked steel piling on the RS Foundation job site in Kelowna, documented by Perseus Creative Studio.',
  },
  'kamloops-cancer-centre': {
    url: '/images/projects/production/projects-production-kamloops-cancer-centre.avif',
    alt: 'Aerial of the RS Foundation construction site for the Kamloops cancer centre with a tower crane and deep excavation, captured by Perseus Creative Studio.',
  },
  'anmore': {
    url: '/images/projects/production/projects-production-anmore.avif',
    alt: 'Modern custom home in Anmore with a black-and-white facade and paver driveway, photographed for the listing by Perseus Creative Studio.',
  },
  'fitbodega-fc-toronto-tournament': {
    url: '/images/projects/production/projects-production-fitbodega-fc-toronto-tournament.avif',
    alt: 'Fitbodega FC players in green kit huddling on an outdoor pitch at the Toronto tournament, captured by Perseus Creative Studio.',
  },
  'fitbodega-fc-tst-7v7-trip': {
    url: '/images/projects/production/projects-production-fitbodega-fc-tst-7v7-trip.avif',
    alt: 'Fitbodega FC team huddle in green kit on an indoor turf pitch during the TST 7v7 trip, photographed by Perseus Creative Studio.',
  },
  'toronto-gym-launch': {
    url: '/images/projects/production/projects-production-toronto-gym-launch.avif',
    alt: 'Squat racks and equipment being installed during the Toronto gym launch buildout, documented by Perseus Creative Studio.',
  },
  'samsung-store-richmond': {
    url: '/images/projects/production/projects-production-samsung-store-richmond.avif',
    alt: 'Samsung retail store interior at a Richmond mall built by MFS Construction, photographed by Perseus Creative Studio.',
  },
  'alberni-by-kengo-kuma': {
    url: '/images/projects/production/projects-production-alberni-by-kengo-kuma.avif',
    alt: 'Penthouse interior with curved floor-to-ceiling glass and skyline views at Alberni by Kengo Kuma, captured by Perseus Creative Studio.',
  },
  'howler-head-event': {
    url: '/images/projects/production/projects-production-howler-head-event.avif',
    alt: 'Guests gathered on an outdoor deck at sunset during the Howler Head event at 901 Bar & Grill, captured by Perseus Creative Studio.',
  },
  'faith-wilson-client-appreciation': {
    url: '/images/projects/production/projects-production-faith-wilson-client-appreciation.avif',
    alt: 'Guests posing at a Faith Wilson Group | Christie’s step-and-repeat backdrop during a client appreciation event, shot by Perseus Creative Studio.',
  },
  'golf-lounge-tour': {
    url: '/images/projects/production/projects-production-golf-lounge-tour.avif',
    alt: 'Indoor golf simulator bays with swing screens and lounge seating at Happy Gilmore Golf Lounge, captured by Perseus Creative Studio.',
  },
  '1166-haywood-ave-west-vancouver': {
    url: '/images/projects/production/projects-production-1166-haywood-ave-west-vancouver.avif',
    alt: 'Wood-clad modern home with a covered carport on Haywood Ave in West Vancouver, built by Vela Homes and photographed by Perseus Creative Studio.',
  },
  '6148-gleneagles-west-vancouver': {
    url: '/images/projects/production/projects-production-6148-gleneagles-west-vancouver.avif',
    alt: 'Contemporary dark-clad home on a landscaped Gleneagles hillside in West Vancouver, captured for CityScape Electrical by Perseus Creative Studio.',
  },
  'forest-hill': {
    url: '/images/projects/production/projects-production-forest-hill.avif',
    alt: 'Luxury living room with a grand piano, fireplace, and mountain views in a Forest Hill home, photographed by Perseus Creative Studio.',
  },
  'pho-anh-vu': {
    url: '/images/projects/production/projects-production-pho-anh-vu.avif',
    alt: 'Interior of the Pho Anh Vu restaurant with warm lighting and banquette seating, built by MFS Construction and shot by Perseus Creative Studio.',
  },
  // Production · Matterport tours
  'mystica-miss-behaving': {
    url: '/images/projects/production/projects-production-mystica-miss-behaving.avif',
    alt: 'Matterport 3D virtual-tour view of Ignition Marine’s Mystica Miss Behaving yacht interior, produced by Perseus Creative Studio.',
  },
  '2016-prestige-55-550-flybridge': {
    url: '/images/projects/production/projects-production-2016-prestige-55-550-flybridge.avif',
    alt: 'Matterport 3D walkthrough of Ignition Marine’s Prestige 550 Flybridge yacht cabin, produced by Perseus Creative Studio.',
  },
  'construction-showroom': {
    url: '/images/projects/production/projects-production-construction-showroom.avif',
    alt: 'Matterport 3D tour of CFR’s flooring and renovation showroom, produced by Perseus Creative Studio.',
  },
  // Production · floor plans
  '303-3110-dayanee-springs-blvd-coquitlam': {
    url: '/images/projects/production/projects-production-303-3110-dayanee-springs-blvd-coquitlam.avif',
    alt: '2D floor plan of unit 303-3110 Dayanee Springs Blvd in Coquitlam, drafted by Perseus Creative Studio.',
  },
  '808-2020-fullerton-ave-north-vancouver': {
    url: '/images/projects/production/projects-production-808-2020-fullerton-ave-north-vancouver.avif',
    alt: '2D floor plan of unit 808-2020 Fullerton Ave in North Vancouver, drafted by Perseus Creative Studio.',
  },
  '110-1468-st-andrews-ave-north-vancouver': {
    url: '/images/projects/production/projects-production-110-1468-st-andrews-ave-north-vancouver.avif',
    alt: '2D floor plan of unit 110-1468 St. Andrews Ave in North Vancouver, drafted by Perseus Creative Studio.',
  },
  '4912-208a-st-langley': {
    url: '/images/projects/production/projects-production-4912-208a-st-langley.avif',
    alt: '2D floor plan of the home at 4912 208A St in Langley, drafted by Perseus Creative Studio.',
  },
  '195-normanby-crescent': {
    url: '/images/projects/production/projects-production-195-normanby-crescent.avif',
    alt: '2D floor plan of the home at 195 Normanby Crescent, drafted by Perseus Creative Studio.',
  },
  '575-lower-ganges-rd-salt-spring-island': {
    url: '/images/projects/production/projects-production-575-lower-ganges-rd-salt-spring-island.avif',
    alt: '2D floor plan of the property at 575 Lower Ganges Rd on Salt Spring Island, drafted by Perseus Creative Studio.',
  },
  // Digital Marketing · Meta ad previews
  'manchester-city-ad-campaigns': {
    url: '/images/projects/digital-marketing/projects-digital-marketing-manchester-city-ad-campaigns.avif',
    alt: 'Meta ad campaign preview for Match Tour 11’s Manchester City camps shown in Ads Manager, designed by Perseus Creative Studio.',
  },
  'player-management-ad-campaigns': {
    url: '/images/projects/digital-marketing/projects-digital-marketing-player-management-ad-campaigns.avif',
    alt: 'Meta ad campaign preview for Match Tour 11’s international player camps, designed by Perseus Creative Studio.',
  },
  'gym-grand-opening-sale-ads': {
    url: '/images/projects/digital-marketing/projects-digital-marketing-gym-grand-opening-sale-ads.avif',
    alt: 'Meta ad creative for Vitality Fitness’s grand-opening promotion shown in the Facebook feed, produced by Perseus Creative Studio.',
  },
  'golf-lounge-opening-sale-ads': {
    url: '/images/projects/digital-marketing/projects-digital-marketing-golf-lounge-opening-sale-ads.avif',
    alt: 'Meta ad creative for Happy Gilmore Golf Lounge’s opening promotion, produced by Perseus Creative Studio.',
  },
  'brand-awareness-ads': {
    url: '/images/projects/digital-marketing/projects-digital-marketing-brand-awareness-ads.avif',
    alt: 'Meta brand-awareness ad creative for Vela Homes shown in the Facebook feed, produced by Perseus Creative Studio.',
  },
  // Social · Instagram profile grids
  'phantom-pest-control': {
    url: '/images/projects/social/projects-social-phantom-pest-control.avif',
    alt: 'Instagram profile grid for Phantom Pest Control managed by Perseus Creative Studio, showing branded pest-control content.',
  },
  'vela-homes': {
    url: '/images/projects/social/projects-social-vela-homes.avif',
    alt: 'Instagram profile grid for Vela Homes managed by Perseus Creative Studio, showcasing custom home builds.',
  },
  'match-tour-11': {
    url: '/images/projects/social/projects-social-match-tour-11.avif',
    alt: 'Instagram profile grid for Match Tour 11 managed by Perseus Creative Studio, featuring football tours and camps.',
  },
  'fitbodega': {
    url: '/images/projects/social/projects-social-fitbodega.avif',
    alt: 'Instagram profile grid for Fitbodega managed by Perseus Creative Studio, featuring football and fitness content.',
  },
  'vitality-fitness': {
    url: '/images/projects/social/projects-social-vitality-fitness.avif',
    alt: 'Instagram profile grid for Vitality Fitness managed by Perseus Creative Studio, showing gym reels and member highlights.',
  },
  // Branding
  'kasraz-rugs': {
    url: '/images/projects/branding/projects-branding-kasraz-rugs.avif',
    alt: 'Kasraz Rugs brand logo on a clean backdrop, part of the visual identity developed by Perseus Creative Studio.',
  },
};

/**
 * Builds a project summary from the columns that vary, stamping in the shared
 * placeholder cover, the 2025 work year, and a formulaic cover alt. Any of
 * those defaults can be overridden per entry (e.g. pass `coverImageUrl` once a
 * real shot exists). Function declaration, so it's hoisted above the arrays.
 */
function project(
  fields: Pick<
    ProjectSummary,
    'slug' | 'title' | 'client' | 'industry' | 'summary' | 'services'
  > & {
    location?: string;
    clientLogoUrl?: string;
    coverImageUrl?: string;
    coverImageAlt?: string;
    year?: string;
  },
): ProjectSummary {
  return {
    ...fields,
    year: fields.year ?? '2025',
    coverImageUrl:
      fields.coverImageUrl ?? PROJECT_COVERS[fields.slug]?.url ?? COVER_PLACEHOLDER,
    coverImageAlt:
      fields.coverImageAlt ??
      PROJECT_COVERS[fields.slug]?.alt ??
      `${fields.title} — placeholder cover.`,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Production — video, photo, floor plans, and Matterport tours.
// ───────────────────────────────────────────────────────────────────────────

const PRODUCTION_PROJECT_SUMMARIES: ProjectSummary[] = [
  // Photos & videos
  project({
    slug: 'mystica-80-skylounge',
    title: 'Mystica 80 Skylounge',
    client: 'Ignition Marine',
    industry: 'Boats & Yachts',
    summary:
      'A luxury yacht commercial captured on the water for Ignition Marine. Showcasing the elegance and design of the Mystica 80 Skylounge through cinematic video and photography.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: '2016-prestige-550-flybridge',
    title: '2016 Prestige 550 Flybridge',
    client: 'Technician Marine',
    industry: 'Boats & Yachts',
    summary:
      'A full photo and video production for Technician Marine’s Prestige 550 Flybridge. A sleek, lifestyle-driven shoot capturing the vessel at its best.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'usmi-rhib',
    title: 'USMI RHIB',
    client: 'Ignition Marine',
    industry: 'Boats & Yachts',
    summary:
      'A dynamic shoot of Ignition Marine’s USMI RHIB vessel. Focused on performance and precision, captured through both video and photography.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'obsidian-north-vancouver-tour',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-obsidian.avif',
    title: 'Obsidian North Vancouver Tour',
    client: 'Obsidian Athletic Club',
    industry: 'Sports & Fitness',
    location: 'North Vancouver, BC',
    summary:
      'A full facility tour of Obsidian Athletic Club’s North Vancouver location. Shot to showcase the space, equipment, and atmosphere to prospective members.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'obsidian-edmonton-tour',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-obsidian.avif',
    title: 'Obsidian Edmonton Tour',
    client: 'Obsidian Athletic Club',
    industry: 'Sports & Fitness',
    location: 'Edmonton, AB',
    summary:
      'A cinematic walkthrough of Obsidian’s Edmonton location produced for their marketing efforts. Highlighting the club’s premium facilities and brand identity.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'vitality-fitness-tour',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-vitality.avif',
    title: 'Vitality Fitness Tour',
    client: 'Vitality',
    industry: 'Sports & Fitness',
    summary:
      'A facility tour produced for Vitality Fitness capturing the energy and environment of the gym. Designed to attract new members and strengthen brand presence.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'andy-owusu',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-match-tour-11.avif',
    title: 'Andy Owusu',
    client: 'Match Tour 11',
    industry: 'Sports & Fitness',
    summary:
      'A player profile video and photo shoot produced for Match Tour 11 featuring Andy Owusu. Created to support player management and recruitment efforts.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'buckswood-madrid-trip',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-match-tour-11.avif',
    title: 'Buckswood Madrid Trip',
    client: 'Match Tour 11',
    industry: 'Sports & Fitness',
    location: 'Madrid, Spain',
    summary:
      'A documentary-style recap of Buckswood’s football academy trip to Madrid, produced for Match Tour 11. Capturing the full experience from training sessions to matchday.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'como-1907-visit',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-match-tour-11.avif',
    title: 'Como 1907 Visit',
    client: 'Match Tour 11',
    industry: 'Sports & Fitness',
    location: 'Como, Italy',
    summary:
      'A behind-the-scenes production covering Match Tour 11’s visit to Como 1907 in Italy. Showcasing the club experience and the unique opportunity offered to players.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'cmfsc-roma-manchester-trip',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-match-tour-11.avif',
    title: 'CMFSC Roma Manchester Trip',
    client: 'Match Tour 11',
    industry: 'Sports & Fitness',
    location: 'Manchester, UK',
    summary:
      'A trip recap video and photo series documenting a football tour to Manchester. Produced for Match Tour 11 to highlight the experience for future participants.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: '1139-s-sherbourne',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-kamara-multi-family-group.avif',
    title: '1139 S Sherbourne',
    client: 'Michael Kamara Realtor',
    industry: 'Real Estate',
    location: 'Los Angeles, CA',
    summary:
      'A real estate video and photo production for a listing represented by Michael Kamara. Shot to present the property with a high-end, cinematic feel.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: '7050-waring',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-kamara-multi-family-group.avif',
    title: '7050 Waring',
    client: 'Michael Kamara Realtor',
    industry: 'Real Estate',
    location: 'Los Angeles, CA',
    summary:
      'A property shoot for Michael Kamara Realtor capturing a Los Angeles listing. Produced to elevate the property’s visual presence for marketing and listing purposes.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: '14459-benefit-st-sherman-oaks',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-kamara-multi-family-group.avif',
    title: '14459 Benefit St, Sherman Oaks',
    client: 'Michael Kamara Realtor',
    industry: 'Real Estate',
    location: 'Los Angeles, CA',
    summary:
      'A full video and photo production for a Sherman Oaks listing with Michael Kamara. Designed to highlight the home’s key features and appeal to qualified buyers.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: '1059-s-corning-st',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-kamara-multi-family-group.avif',
    title: '1059 S Corning St',
    client: 'Michael Kamara Realtor',
    industry: 'Real Estate',
    location: 'Los Angeles, CA',
    summary:
      'A real estate content shoot for a property listed by Michael Kamara in Los Angeles. Delivered with a clean, polished visual approach to support the listing.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'salon-centric-appreciation-event',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-salon-centric-canada.avif',
    title: 'Appreciation Event',
    client: 'Salon Centric',
    industry: 'Hospitality & Events',
    summary:
      'Event coverage for a Salon Centric supplier appreciation event. Capturing key moments, atmosphere, and brand presence throughout the day.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'kelowna-piling-project',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-rsfoundation.avif',
    title: 'Kelowna Piling Project',
    client: 'RS Foundation',
    industry: 'Construction & Trades',
    location: 'Kelowna, BC',
    summary:
      'A video and photo production documenting RS Foundation’s piling project in Kelowna. Showcasing the scale and precision of the work for the company’s portfolio.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'kamloops-cancer-centre',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-rsfoundation.avif',
    title: 'Kamloops Cancer Centre',
    client: 'RS Foundation',
    industry: 'Construction & Trades',
    location: 'Kamloops, BC',
    summary:
      'A meaningful production covering RS Foundation’s work on the Kamloops Cancer Centre. Capturing the significance of the project and the team behind it.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'encino-new-development',
    title: 'Encino New Development',
    client: 'Encino Development',
    industry: 'Construction & Trades',
    location: 'Los Angeles, CA',
    summary:
      'A full video and photo shoot of a new custom home development in Encino, Los Angeles. Produced to showcase the finished build and support the client’s marketing.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'fitbodega-fc-tst-7v7-trip',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-fitbodega.avif',
    title: 'Fitbodega FC TST 7v7 Trip',
    client: 'Fitbodega',
    industry: 'Sports & Fitness',
    summary:
      'A trip recap production covering Fitbodega FC’s participation in the TST 7v7 tournament. Capturing the team’s journey, matches, and experience throughout the event.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'fitbodega-fc-toronto-tournament',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-fitbodega.avif',
    title: 'Fitbodega FC Toronto Tournament',
    client: 'Fitbodega',
    industry: 'Sports & Fitness',
    location: 'Toronto, ON',
    summary:
      'Event video and photo coverage of Fitbodega FC’s tournament in Toronto. Documenting the competition and team moments for social media and brand content.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'toronto-gym-launch',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-gym-curators.avif',
    title: 'Toronto Gym Launch',
    client: 'Gym Curator',
    industry: 'Sports & Fitness',
    location: 'Toronto, ON',
    summary:
      'A launch event production for Gym Curator’s Toronto gym opening. Capturing the energy of the event and the new space to support their marketing rollout.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'samsung-store-richmond',
    title: 'Samsung Store Richmond',
    client: 'MFS Construction',
    industry: 'Construction & Trades',
    location: 'Richmond, BC',
    summary:
      'A photo and video production documenting MFS Construction’s completed Samsung Store build in Richmond. Showcasing the finished space as a portfolio piece for the construction company.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'alberni-by-kengo-kuma',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-mananoori.avif',
    title: 'Alberni by Kengo Kuma — 1550 Alberni St',
    client: 'Mana Noori',
    industry: 'Real Estate',
    location: 'Vancouver, BC',
    summary:
      'A photo and video production at one of Vancouver’s most iconic architectural landmarks. Shot at the Kengo Kuma-designed residential tower for client Mana Noori.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'faith-wilson-client-appreciation',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-faithwilson.avif',
    title: 'Faith Wilson Client Appreciation',
    client: 'Faith Wilson Group',
    industry: 'Real Estate',
    summary:
      'Event coverage of Faith Wilson Group’s client appreciation event. Capturing key moments and the firm’s commitment to their client relationships.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'faith-wilson-awards-ceremony',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-faithwilson.avif',
    title: 'Faith Wilson Awards Ceremony',
    client: 'Faith Wilson Group',
    industry: 'Real Estate',
    summary:
      'Photo and video coverage of Faith Wilson Group’s awards ceremony. Documenting the milestone and celebrating the team’s achievements.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'golf-lounge-tour',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-gilmore.avif',
    title: 'Golf Lounge Tour',
    client: 'Happy Gilmore Golf Lounge',
    industry: 'Sports & Fitness',
    summary:
      'A facility tour production for Happy Gilmore Golf Lounge. Showcasing the space and experience to drive brand awareness and attract new customers.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: '4476-parliament-crescent-demolition',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-Velahomes.avif',
    title: '4476 Parliament Crescent Demolition',
    client: 'Vela Homes',
    industry: 'Construction & Trades',
    location: 'North Vancouver, BC',
    summary:
      'A video and photo production documenting the demolition phase of Vela Homes’ project at Parliament Crescent, North Vancouver. Capturing the before stage ahead of a new custom home build.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: '2870-bellevue-ave-west-vancouver',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-cityscape-electrical.avif',
    title: '2870 Bellevue Ave, West Vancouver',
    client: 'CityScape Electrical',
    industry: 'Construction & Trades',
    location: 'West Vancouver, BC',
    summary:
      'A project shoot for CityScape Electrical at a West Vancouver residence. Documenting the completed electrical work for the company’s portfolio.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: '6148-gleneagles-west-vancouver',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-cityscape-electrical.avif',
    title: '6148 Gleneagles, West Vancouver',
    client: 'CityScape Electrical',
    industry: 'Construction & Trades',
    location: 'West Vancouver, BC',
    summary:
      'A photo and video production covering CityScape Electrical’s work at a Gleneagles property in West Vancouver. Produced to highlight the quality and scope of their services.',
    services: ['Videography', 'Photography'],
  }),
  project({
    slug: 'anmore',
    title: 'Anmore',
    client: 'Erin Price Emery',
    industry: 'Real Estate',
    location: 'Anmore, BC',
    summary:
      'A cinematic real estate production for a $12,750,000, 10,000 sq ft listing in Anmore, BC. Shot for top realtor Erin Price Emery with a high-end, detail-driven approach.',
    services: ['Videography', 'Photography'],
  }),
  // Video only
  project({
    slug: 'forest-hill',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-amin-meysami.avif',
    title: 'Forest Hill',
    client: 'Amin Meysami',
    industry: 'Real Estate',
    location: 'Toronto, ON',
    summary:
      'A video production shot for Amin Meysami at a Forest Hill property. Captured with a cinematic approach to showcase the home and its surroundings.',
    services: ['Videography'],
  }),
  project({
    slug: 'vision-hills',
    title: 'Vision Hills',
    client: 'Bromley Estates Marbella',
    industry: 'Real Estate',
    location: 'Marbella, Spain',
    summary:
      'A promotional video produced for Bromley Estates Marbella’s Vision Hills development on the Costa del Sol. Showcasing the luxury real estate project to an international audience.',
    services: ['Videography'],
  }),
  project({
    slug: '680-westhyde-place-north-vancouver',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-dibawindows.avif',
    title: '680 Westhyde Place, North Vancouver',
    client: 'Diba Windows',
    industry: 'Construction & Trades',
    location: 'North Vancouver, BC',
    summary:
      'A video production for Diba Windows at a North Vancouver residence. Highlighting the quality and design of their window installations in a high-end home setting.',
    services: ['Videography'],
  }),
  project({
    slug: '1166-haywood-ave-west-vancouver',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-Velahomes.avif',
    title: '1166 Haywood Ave, West Vancouver',
    client: 'Vela Homes',
    industry: 'Construction & Trades',
    location: 'West Vancouver, BC',
    summary:
      'A property video produced for Vela Homes at their West Vancouver custom build on Haywood Ave. Capturing the craftsmanship and detail of a finished luxury home.',
    services: ['Videography'],
  }),
  project({
    slug: '1925-russet-way-progress',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-Velahomes.avif',
    title: '1925 Russet Way Progress',
    client: 'Vela Homes',
    industry: 'Construction & Trades',
    summary:
      'A progress documentation video for Vela Homes’ ongoing project at 1925 Russet Way. Tracking the build process and milestones for the client’s records and marketing.',
    services: ['Videography'],
  }),
  project({
    slug: '4442-hoskins-rd-north-vancouver',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-Velahomes.avif',
    title: '4442 Hoskins Rd, North Vancouver',
    client: 'Vela Homes',
    industry: 'Construction & Trades',
    location: 'North Vancouver, BC',
    summary:
      'A video production for Vela Homes at their North Vancouver project on Hoskins Rd. Showcasing the completed build with a clean, professional visual approach.',
    services: ['Videography'],
  }),
  project({
    slug: '1384-hope-rd-north-vancouver',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-Velahomes.avif',
    title: '1384 Hope Rd, North Vancouver',
    client: 'Vela Homes',
    industry: 'Construction & Trades',
    location: 'North Vancouver, BC',
    summary:
      'A cinematic video shoot of Vela Homes’ custom build on Hope Rd, North Vancouver. Produced to highlight the home’s design and quality for marketing purposes.',
    services: ['Videography'],
  }),
  project({
    slug: 'howler-head-event',
    title: 'Howler Head Event',
    client: '901 Bar & Grill',
    industry: 'Hospitality & Events',
    location: 'Los Angeles, CA',
    summary:
      'Event video coverage of a Howler Head brand activation at 901 Bar & Grill in Los Angeles. Capturing the energy of the night and the brand experience throughout the event.',
    services: ['Videography'],
  }),
  // Photos only
  project({
    slug: 'pho-anh-vu',
    title: 'Pho Anh Vu',
    client: 'MFS Construction',
    industry: 'Construction & Trades',
    summary:
      'A photography shoot documenting MFS Construction’s completed work at Pho Anh Vu. Capturing the finished interior space as a portfolio piece for the construction team.',
    services: ['Photography'],
  }),
  // Floor plans
  project({
    slug: '1072-e-39th-ave',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-faithwilson.avif',
    title: '1072 E 39th Ave',
    client: 'Faith Wilson Realty',
    industry: 'Real Estate',
    location: 'Vancouver, BC',
    summary:
      'A floor plan produced for a Faith Wilson Realty listing on E 39th Ave. Delivered to support the property’s marketing and listing presentation.',
    services: ['Floor Plan'],
  }),
  project({
    slug: '303-3110-dayanee-springs-blvd-coquitlam',
    title: '303-3110 Dayanee Springs Blvd, Coquitlam',
    client: 'Mehrnaz Kavoosi',
    industry: 'Real Estate',
    location: 'Coquitlam, BC',
    summary:
      'A detailed floor plan for a Coquitlam property represented by Mehrnaz Kavoosi. Produced to complement the listing and provide buyers with a clear layout overview.',
    services: ['Floor Plan'],
  }),
  project({
    slug: '808-2020-fullerton-ave-north-vancouver',
    title: '808-2020 Fullerton Ave, North Vancouver',
    client: 'Mehrnaz Kavoosi',
    industry: 'Real Estate',
    location: 'North Vancouver, BC',
    summary:
      'A floor plan for a North Vancouver listing by Mehrnaz Kavoosi. Clean and precise, designed to strengthen the property’s presentation materials.',
    services: ['Floor Plan'],
  }),
  project({
    slug: '110-1468-st-andrews-ave-north-vancouver',
    title: '110-1468 St. Andrews Ave, North Vancouver',
    client: 'Tina Heidari',
    industry: 'Real Estate',
    location: 'North Vancouver, BC',
    summary:
      'A floor plan produced for a North Vancouver listing represented by Tina Heidari. Crafted to give prospective buyers a clear understanding of the property’s layout.',
    services: ['Floor Plan'],
  }),
  project({
    slug: '4912-208a-st-langley',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-cartocci.avif',
    title: '4912 208A St, Langley',
    client: 'Cartocci Real Estate Group',
    industry: 'Real Estate',
    location: 'Langley, BC',
    summary:
      'A floor plan for a Langley property listed by the Cartocci Real Estate Group. Delivered as part of a comprehensive marketing package for the listing.',
    services: ['Floor Plan'],
  }),
  project({
    slug: '195-normanby-crescent',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-cartocci.avif',
    title: '195 Normanby Crescent',
    client: 'Cartocci Real Estate Group',
    industry: 'Real Estate',
    summary:
      'A floor plan produced for Cartocci Real Estate Group’s listing at Normanby Crescent. Accurate and professionally presented to support the sales process.',
    services: ['Floor Plan'],
  }),
  project({
    slug: '575-lower-ganges-rd-salt-spring-island',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-doucettehomes.avif',
    title: '575 Lower Ganges Rd, Salt Spring Island',
    client: 'Doucette Homes',
    industry: 'Real Estate',
    location: 'Salt Spring Island, BC',
    summary:
      'A floor plan for a Salt Spring Island property listed by Doucette Homes. Capturing the layout of a unique property in one of BC’s most sought-after locations.',
    services: ['Floor Plan'],
  }),
  // Matterport
  project({
    slug: '2016-prestige-55-550-flybridge',
    title: "2016 Prestige 55' 550 Flybridge",
    client: 'Ignition Marine',
    industry: 'Boats & Yachts',
    summary:
      'An immersive 3D Matterport tour of Ignition Marine’s Prestige 550 Flybridge. Allowing prospective buyers to explore the vessel remotely with full spatial detail.',
    services: ['Matterport'],
  }),
  project({
    slug: 'mystica-miss-behaving',
    title: 'Mystica Miss Behaving',
    client: 'Ignition Marine',
    industry: 'Boats & Yachts',
    summary:
      'A Matterport virtual tour produced for Ignition Marine’s Mystica Miss Behaving yacht. Delivering a fully interactive 3D experience for remote buyers and brokers.',
    services: ['Matterport'],
  }),
  project({
    slug: 'construction-showroom',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-cfr.avif',
    title: 'Construction Showroom',
    client: 'CFR',
    industry: 'Construction & Trades',
    summary:
      'A 3D Matterport walkthrough of CFR’s construction showroom. Giving clients and partners the ability to explore the space virtually from anywhere.',
    services: ['Matterport'],
  }),
];

// ───────────────────────────────────────────────────────────────────────────
// Websites case-study summaries. Covers are a temporary placeholder (the studio
// wordmark) until real screenshots are dropped in — swap `coverImageUrl` /
// `viewport.imageUrl` per file when the shots are ready. Same summary objects
// feed the showcase grid, related lists, and the home shelf.
// ───────────────────────────────────────────────────────────────────────────

/** Stand-in cover until per-project screenshots land. White wordmark so it
 *  reads on the card's always-dark slate backdrop. */
const WEBSITE_COVER_PLACEHOLDER = '/logo-white.png';

const matchTour11Summary: ProjectSummary = {
  slug: 'match-tour-11',
  clientLogoUrl: '/images/shared/client-logos/shared-client-logos-match-tour-11.avif',
  title: 'Match Tour 11',
  client: 'Match Tour 11',
  industry: 'Sports & Fitness',
  year: '2026',
  summary:
    'A redesign for a FIFA-recognized football agency — tours, trials, and pro camps carried on a faster, more credible site.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Match Tour 11 website redesign — placeholder cover.',
  services: ['Website Redesign'],
  featured: true,
};

const dunnsMenswearSummary: ProjectSummary = {
  slug: 'dunns-menswear',
  clientLogoUrl: '/images/shared/client-logos/shared-client-logos-dunnsmenswear.avif',
  title: 'Dunn’s Menswear',
  client: 'Dunn’s Menswear',
  industry: 'Retail & E-Commerce',
  location: 'West Vancouver, BC',
  year: '2025',
  summary:
    'A heritage tailor since 1936, brought online — bespoke, made-to-measure, and ready-to-wear presented with the polish the name carries.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Dunn’s Menswear website — placeholder cover.',
  services: ['Web Development'],
  featured: true,
};

const kasrazRugsSummary: ProjectSummary = {
  slug: 'kasraz-rugs',
  clientLogoUrl: '/images/shared/client-logos/shared-client-logos-kasraz.avif',
  title: 'Kasraz — Persian Silk Rugs',
  client: 'Kasraz',
  industry: 'Retail & E-Commerce',
  location: 'Vancouver, BC',
  year: '2024',
  summary:
    'An e-commerce build for an authentic Persian silk rug house — collections, custom orders, and checkout, framed to sell craft.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Kasraz Persian silk rugs online store — placeholder cover.',
  services: ['E-Commerce'],
};

const phantomPestSummary: ProjectSummary = {
  slug: 'phantom-pest-control',
  clientLogoUrl: '/images/shared/client-logos/shared-client-logos-phantompestsolutions.avif',
  title: 'Phantom Pest Control',
  client: 'Phantom Pest Control',
  industry: 'Home Services',
  location: 'Vancouver, BC',
  year: '2026',
  summary:
    'A redesign for a licensed pest and wildlife control company — service areas, pest types, and fast booking made obvious.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Phantom Pest Control website redesign — placeholder cover.',
  services: ['Website Redesign'],
};

const araniConstructionSummary: ProjectSummary = {
  slug: 'arani-construction',
  clientLogoUrl: '/images/shared/client-logos/shared-client-logos-araniconstruction.avif',
  title: 'Arani Construction',
  client: 'Arani Construction Inc.',
  industry: 'Construction & Trades',
  location: 'North Vancouver, BC',
  year: '2025',
  summary:
    'A redesign for a certified renovation contractor — a project-led site that lets the work, not the brochure copy, do the selling.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Arani Construction website redesign — placeholder cover.',
  services: ['Website Redesign'],
};

const eliteLifeSkinSummary: ProjectSummary = {
  slug: 'elite-life-skin',
  clientLogoUrl: '/images/shared/client-logos/shared-client-logos-elitelife.avif',
  title: 'Elite Life Skin Centre',
  client: 'Elite Life Skin Centre',
  industry: 'Health & Wellness',
  location: 'West Vancouver, BC',
  year: '2025',
  summary:
    'A site for a medical aesthetics clinic — treatments, technology, and booking organized so prospective clients can self-qualify and reach out.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Elite Life Skin Centre website — placeholder cover.',
  services: ['Web Development'],
};

const dibaWindowsSummary: ProjectSummary = {
  slug: 'diba-windows',
  clientLogoUrl: '/images/shared/client-logos/shared-client-logos-dibawindows.avif',
  title: 'Diba Windows',
  client: 'Diba Windows Inc.',
  industry: 'Construction & Trades',
  location: 'North Vancouver, BC',
  year: '2025',
  summary:
    'A site for a high-performance aluminum glazing manufacturer — product systems and projects presented to architects, builders, and homeowners alike.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Diba Windows website — placeholder cover.',
  services: ['Web Development'],
};

const athletePrepSummary: ProjectSummary = {
  slug: 'athlete-prep',
  title: 'Athlete Prep',
  client: 'Athlete Prep Inc.',
  industry: 'Sports & Fitness',
  location: 'West Vancouver, BC',
  year: '2025',
  summary:
    'A site for a strength and athletic development studio — programs, camps, and coaching laid out to turn interest into booked sessions.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Athlete Prep website — placeholder cover.',
  services: ['Web Development'],
};

const stanGlassworksSummary: ProjectSummary = {
  slug: 'stan-glassworks',
  clientLogoUrl: '/images/shared/client-logos/shared-client-logos-stanglassworksbackground.avif',
  title: 'Stan Glassworks',
  client: 'Stan Glassworks Ltd.',
  industry: 'Construction & Trades',
  location: 'North Vancouver, BC',
  year: '2025',
  summary:
    'A redesign for a CWB-certified fabricator — custom staircases, railings, canopies, and architectural glass — built to let a decade of craftsmanship lead.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Stan Glassworks website redesign — placeholder cover.',
  services: ['Website Redesign'],
};

const cityscapeElectricalSummary: ProjectSummary = {
  slug: 'cityscape-electrical',
  clientLogoUrl: '/images/shared/client-logos/shared-client-logos-cityscape-electrical.avif',
  title: 'Cityscape Electrical',
  client: 'Cityscape Electrical',
  industry: 'Construction & Trades',
  location: 'West Vancouver, BC',
  year: '2025',
  summary:
    'A site for a full-service electrical contractor behind Vancouver’s custom and waterfront builds — built to match the calibre of the work.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Cityscape Electrical website — placeholder cover.',
  services: ['Web Development'],
};

const evchargeIncSummary: ProjectSummary = {
  slug: 'evcharge-inc',
  clientLogoUrl: '/images/shared/client-logos/shared-client-logos-evchageincbackground.avif',
  title: 'EVcharge Inc.',
  client: 'EVcharge Inc.',
  industry: 'Energy & Infrastructure',
  location: 'Irvine, CA',
  year: '2025',
  summary:
    'A site for a zero-emission infrastructure developer — fast charging, hydrogen, and renewable energy — built to carry the technology to operators and the returns to investors.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'EVcharge Inc. website — placeholder cover.',
  services: ['Web Development'],
};

const rockyDemolitionSummary: ProjectSummary = {
  slug: 'rocky-demolition',
  clientLogoUrl: '/images/shared/client-logos/shared-client-logos-rocky.demolition.avif',
  title: 'Rocky Demolition',
  client: 'Rocky Demolition',
  industry: 'Construction & Trades',
  year: '2026',
  summary:
    'Ongoing care for a demolition contractor’s site — updates, fixes, and upkeep that keep the work front-and-centre and the site reliable.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Rocky Demolition website maintenance — placeholder cover.',
  services: ['Website Maintenance'],
};

const rockyJunkRemovalSummary: ProjectSummary = {
  slug: 'rocky-junk-removal',
  clientLogoUrl: '/images/shared/client-logos/shared-client-logos-rocky-junkremoval.avif',
  title: 'Rocky Junk Removal',
  client: 'Rocky Junk Removal',
  industry: 'Home Services',
  year: '2026',
  summary:
    'Ongoing care for a junk removal company’s site — service areas, booking, and content kept current so the site stays fast and dependable.',
  coverImageUrl: WEBSITE_COVER_PLACEHOLDER,
  coverImageAlt: 'Rocky Junk Removal website maintenance — placeholder cover.',
  services: ['Website Maintenance'],
};

const WEBSITES_PROJECT_SUMMARIES: ProjectSummary[] = [
  matchTour11Summary,
  dunnsMenswearSummary,
  kasrazRugsSummary,
  phantomPestSummary,
  araniConstructionSummary,
  eliteLifeSkinSummary,
  dibaWindowsSummary,
  athletePrepSummary,
  stanGlassworksSummary,
  cityscapeElectricalSummary,
  evchargeIncSummary,
  rockyDemolitionSummary,
  rockyJunkRemovalSummary,
];

// ───────────────────────────────────────────────────────────────────────────
// Digital marketing, social, and branding — the remaining archive categories,
// built with the same `project()` helper and placeholder covers as Production.
// ───────────────────────────────────────────────────────────────────────────

const DIGITAL_MARKETING_PROJECT_SUMMARIES: ProjectSummary[] = [
  project({
    slug: 'manchester-city-ad-campaigns',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-match-tour-11.avif',
    title: 'Manchester City AD Campaigns',
    client: 'Match Tour 11',
    industry: 'Sports & Fitness',
    summary:
      'A series of Meta ad campaigns produced for Match Tour 11 promoting their exclusive Manchester City partnership. Designed to drive awareness and conversions across Facebook and Instagram.',
    services: ['Meta Ads'],
  }),
  project({
    slug: 'player-management-ad-campaigns',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-match-tour-11.avif',
    title: 'Player Management AD Campaigns',
    client: 'Match Tour 11',
    industry: 'Sports & Fitness',
    summary:
      'Targeted Meta ad campaigns for Match Tour 11’s player management services. Built to reach prospective players and families across key markets.',
    services: ['Meta Ads'],
  }),
  project({
    slug: 'gym-grand-opening-sale-ads',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-vitality.avif',
    title: 'Gym Grand Opening Sale ADs',
    client: 'Vitality Fitness',
    industry: 'Sports & Fitness',
    summary:
      'A Meta ad campaign produced for Vitality Fitness’s grand opening promotion. Driving local awareness and new memberships through targeted paid social.',
    services: ['Meta Ads'],
  }),
  project({
    slug: 'golf-lounge-opening-sale-ads',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-gilmore.avif',
    title: 'Golf Lounge Opening Sale ADs',
    client: 'Happy Gilmore Golf Lounge',
    industry: 'Sports & Fitness',
    summary:
      'A paid social campaign created for Happy Gilmore Golf Lounge’s opening promotion. Designed to generate buzz and drive foot traffic to the new venue.',
    services: ['Meta Ads'],
  }),
  project({
    slug: 'brand-awareness-ads',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-Velahomes.avif',
    title: 'Brand Awareness Ads',
    client: 'Vela Homes',
    industry: 'Construction & Trades',
    summary:
      'A brand awareness Meta ad campaign developed for Vela Homes. Positioning the custom home builder in front of a targeted audience across Vancouver’s North Shore.',
    services: ['Meta Ads'],
  }),
];

const SOCIAL_PROJECT_SUMMARIES: ProjectSummary[] = [
  project({
    slug: 'phantom-pest-control',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-phantompestsolutions.avif',
    title: 'Phantom Pest Control',
    client: 'Phantom',
    industry: 'Home Services',
    summary:
      'Ongoing social media management for Phantom Pest Control. Content creation and strategy designed to grow their online presence and generate leads.',
    services: ['Social Media'],
  }),
  project({
    slug: 'vela-homes',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-Velahomes.avif',
    title: 'Vela Homes',
    client: 'Vela',
    industry: 'Construction & Trades',
    summary:
      'Social media management for Vela Homes covering content creation, strategy, and posting. Building the brand’s presence across Instagram and other platforms.',
    services: ['Social Media'],
  }),
  project({
    slug: 'match-tour-11',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-match-tour-11.avif',
    title: 'Match Tour 11',
    client: 'Match Tour 11',
    industry: 'Sports & Fitness',
    summary:
      'Full social media management for Match Tour 11 covering content, strategy, and paid campaigns. Supporting their growth across football and travel audiences globally.',
    services: ['Social Media'],
  }),
  project({
    slug: 'fitbodega',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-fitbodega.avif',
    title: 'Fitbodega',
    client: 'Fitbodega',
    industry: 'Sports & Fitness',
    summary:
      'Social media management for Fitbodega covering content production and community building. Growing the brand’s presence across fitness and football audiences.',
    services: ['Social Media'],
  }),
  project({
    slug: 'vitality-fitness',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-vitality.avif',
    title: 'Vitality Fitness',
    client: 'Vitality',
    industry: 'Sports & Fitness',
    summary:
      'Ongoing social media management for Vitality Fitness. Focused on member engagement, brand awareness, and driving new membership inquiries.',
    services: ['Social Media'],
  }),
];

const BRANDING_PROJECT_SUMMARIES: ProjectSummary[] = [
  project({
    slug: 'kasraz-rugs',
    clientLogoUrl: '/images/shared/client-logos/shared-client-logos-kasraz.avif',
    title: 'Kasraz Rugs',
    client: 'Kasraz Rugs',
    industry: 'Retail & E-Commerce',
    summary:
      'A full branding project delivered for Kasraz Rugs. Developing a cohesive visual identity to position the brand effectively in the market.',
    services: ['Branding'],
  }),
];

// ───────────────────────────────────────────────────────────────────────────
// Categories — exactly the five service-registry slugs, so CategoryVisual
// art, services↔projects cross-links, and blog categories all line up.
// ───────────────────────────────────────────────────────────────────────────

export const PROJECT_CATEGORIES: Record<string, ProjectCategoryContent> = {
  production: {
    slug: 'production',
    title: 'Production',
    eyebrow: 'Selected work · Video · Photo · Aerial',
    heroTitle: 'Shot, cut, and',
    heroTitleAccent: 'shipped.',
    description:
      'Listing films, build series, commercials, and facility tours produced end-to-end in Vancouver. Every project here is real client work — from the first site walk to final delivery.',
    projects: PRODUCTION_PROJECT_SUMMARIES,
    proof: { unit: 'Productions', sectorsLabel: 'Sectors covered' },
    comingSoon: {
      headline: 'Case studies are on the way.',
      body: 'Production case studies are being written up as engagements wrap. In the meantime, the service page covers how we shoot.',
      inProduction: [
        { industry: 'Real Estate', stage: 'In post-production' },
        { industry: 'Hospitality', stage: 'Shoot scheduled' },
      ],
      serviceHref: '/services/production',
    },
    cta: {
      eyebrow: 'Start your project',
      headline: 'Have something worth filming?',
      description:
        'Tell us what you’re building, selling, or opening — we’ll scope the shoot and show you what the finished film looks like before a camera comes out.',
      primaryLabel: 'Start a Project',
      primaryHref: '/contact',
      secondaryLabel: 'Production Services',
      secondaryHref: '/services/production',
    },
    seo: {
      title: 'Production Projects in Vancouver | Perseus Creative Studio',
      description:
        'Real production work from Vancouver: listing films, construction build series, brand commercials, and facility tours — each documented as a full case study.',
      canonicalPath: `${SITE_URL}/projects/production`,
      ogImage: OG_IMAGE,
    },
    faqs: [
      {
        question: 'What kinds of production work do you take on?',
        answer:
          'Listing and architecture films, multi-visit construction build series, brand commercials, and facility or club tours — shot end-to-end across Vancouver and the Lower Mainland. If it needs to be filmed, edited, and delivered ready to publish, it belongs here.',
      },
      {
        question: 'Do you fly drones, and are you licensed for it?',
        answer:
          'Yes — aerial is part of most shoots, flown by an RPAS-certified pilot under Transport Canada rules. We handle the airspace checks and authorizations during pre-production, so the permitting never becomes your problem.',
      },
      {
        question:
          'How long does a typical production take from first call to final cut?',
        answer:
          'Most single-location films run a few weeks from scope to delivery; build series and multi-visit projects span the length of the build itself. We confirm exact shoot dates and a delivery window in the proposal before anything is booked.',
      },
      {
        question: 'What do we get at the end, and in what formats?',
        answer:
          'Final films graded and delivered in the resolutions you need (up to 4K/6K), plus platform-specific cutdowns for social and ads when the engagement calls for it. Where photography is in scope, stills from the shoot are delivered as a separate select set.',
      },
      {
        question: 'Can you work from our script, or do you handle that too?',
        answer:
          'Either. We can shoot to a script and shot list you bring, or build the creative from a single brief — most clients start with a goal ("sell this listing," "open this gym") and we scope the story from there.',
      },
      {
        question: 'Do you cover both video and photography on the same shoot?',
        answer:
          'Yes — most engagements capture stills and motion in the same session, so the listing, the site, and the ad campaign all draw from one coherent set of media rather than mismatched sources.',
      },
    ],
  },

  websites: {
    slug: 'websites',
    title: 'Websites',
    eyebrow: 'Selected work · Design · Development',
    heroTitle: 'Built to ship,',
    heroTitleAccent: 'built to rank.',
    description:
      'Design and development case studies — redesigns, custom builds, and e-commerce shipped for real Vancouver and Canada-wide clients. Every project here is live work you can visit.',
    projects: WEBSITES_PROJECT_SUMMARIES,
    proof: { unit: 'Sites' },
    comingSoon: {
      headline: 'Case studies are on the way.',
      body: 'Website case studies publish once each build has live performance numbers behind it — not launch-day screenshots. Three engagements are moving through the pipeline now.',
      inProduction: [
        { industry: 'Restaurant & Hospitality', stage: 'In build' },
        { industry: 'Real Estate', stage: 'Design approved' },
        { industry: 'Athletic Club', stage: 'Launch prep' },
      ],
      serviceHref: '/services/websites',
    },
    cta: {
      eyebrow: 'Start your project',
      headline: 'Need a site that earns its keep?',
      description:
        'These are live builds you can visit. Tell us what your site needs to do — the websites service page covers how we design, build, and measure, and a call covers the rest.',
      primaryLabel: 'Start a Project',
      primaryHref: '/contact',
      secondaryLabel: 'Website Services',
      secondaryHref: '/services/websites',
    },
    seo: {
      title: 'Website Projects in Vancouver | Perseus Creative Studio',
      description:
        'Website design and development case studies from Vancouver — build decisions, redesign comparisons, and measured Core Web Vitals. New case studies publishing soon.',
      canonicalPath: `${SITE_URL}/projects/websites`,
      ogImage: OG_IMAGE,
    },
    faqs: [
      {
        question: 'What kinds of sites do you build?',
        answer:
          'Marketing sites, listing and service-area sites, and conversion-focused landing pages — on WordPress or a modern stack (Next.js/Node) depending on what the project needs. Performance, SEO-ready structure, and analytics are built in, not bolted on.',
      },
      {
        question: 'Are these real, live websites?',
        answer:
          'Yes — every project here is a site we designed and built for a real client, and each one links to the live build you can visit. We add measured performance detail to a project as the numbers come in, but the work itself is shipped, not mocked up.',
      },
      {
        question: 'Do you redesign existing sites, or only build from scratch?',
        answer:
          'Both. A large share of our work is redesigns where the before/after and the measured speed gains are the whole story — which is exactly what these case studies will document.',
      },
      {
        question: 'Will I be able to update the site myself?',
        answer:
          'Yes. We build on editable foundations and hand over with the access and a walkthrough so your team can manage day-to-day content, with ongoing support available whenever you’d rather we handle it.',
      },
      {
        question: 'Do you handle hosting, domains, and the technical setup?',
        answer:
          'Yes — we can manage hosting, DNS, SSL, and the deployment pipeline end-to-end, or hand the build to your existing infrastructure. Either way, you’re never left to wire up the technical layer alone.',
      },
      {
        question:
          'Is the site built for SEO and Core Web Vitals from the start?',
        answer:
          'Always. Semantic structure, fast loads, and clean metadata are part of the build, not an afterthought — which is exactly why these case studies will lead with measured Core Web Vitals once they’re live.',
      },
    ],
  },

  'digital-marketing': {
    slug: 'digital-marketing',
    title: 'Digital Marketing',
    eyebrow: 'Selected work · SEO · Paid · Analytics',
    heroTitle: 'Campaigns with',
    heroTitleAccent: 'receipts.',
    description:
      'Search, paid media, and analytics engagements written up with the numbers attached — what ran, what changed, and what it returned. Case studies publish once results windows mature.',
    projects: DIGITAL_MARKETING_PROJECT_SUMMARIES,
    proof: { unit: 'Campaigns' },
    comingSoon: {
      headline: 'Numbers are still coming in.',
      body: 'Marketing case studies need a full results window before they’re worth your time — we publish measured outcomes, not launch announcements. Current engagements are mid-flight.',
      inProduction: [
        { industry: 'Home Services', stage: 'Results window maturing' },
        { industry: 'Real Estate', stage: 'Campaigns live' },
      ],
      serviceHref: '/services/digital-marketing',
    },
    cta: {
      eyebrow: 'Start your project',
      headline: 'Want results worth writing up?',
      description:
        'The digital marketing service page covers the levers we pull — SEO, paid channels, tracking — and what a measured engagement looks like.',
      primaryLabel: 'Start a Project',
      primaryHref: '/contact',
      secondaryLabel: 'Marketing Services',
      secondaryHref: '/services/digital-marketing',
    },
    seo: {
      title: 'Digital Marketing Projects | Perseus Creative Studio',
      description:
        'Digital marketing case studies from Vancouver — SEO, paid media, and analytics engagements documented with measured results. New case studies publishing soon.',
      canonicalPath: `${SITE_URL}/projects/digital-marketing`,
      ogImage: OG_IMAGE,
    },
    faqs: [
      {
        question: 'Which channels do you actually run?',
        answer:
          'Search (SEO and Google Ads), paid social (Meta and LinkedIn), and the tracking and analytics layer underneath — set up so every dollar is attributable. We scope to the channels that fit your funnel, not a fixed package.',
      },
      {
        question: 'Why no case studies on this page yet?',
        answer:
          'Marketing case studies need a full results window before they mean anything — we publish measured outcomes, not launch announcements. Current engagements are still maturing their numbers.',
      },
      {
        question: 'How do you measure and report results?',
        answer:
          'Every engagement starts with proper tracking — conversions, call and lead attribution, and a reporting view you can actually read. These case studies will show the before/after on the same traffic, with the numbers attached.',
      },
      {
        question: 'Do we need a big ad budget to work with you?',
        answer:
          'No — we scope to your stage. What matters more than budget size is that the tracking is honest and the spend is pointed at the channels your buyers actually use.',
      },
      {
        question: 'How soon will we see results?',
        answer:
          'SEO compounds over months while paid channels can move within weeks — we set honest expectations per channel up front and report against them, rather than promising overnight wins.',
      },
      {
        question: 'Do you work with our existing analytics and ad accounts?',
        answer:
          'Yes — we’d rather build on accounts you own so the data and history stay yours. We audit what’s already there, fix the tracking, and take it from there.',
      },
    ],
  },

  social: {
    slug: 'social',
    title: 'Social Media',
    eyebrow: 'Selected work · Content · Strategy · Growth',
    heroTitle: 'Feeds that do',
    heroTitleAccent: 'the work.',
    description:
      'Social engagements documented feed-first — the content cadence, the creative, and the account growth across the engagement. Case studies publish as programs mature.',
    projects: SOCIAL_PROJECT_SUMMARIES,
    proof: { unit: 'Accounts' },
    comingSoon: {
      headline: 'Programs are mid-flight.',
      body: 'Social case studies are written up across a full engagement arc — strategy, cadence, growth — not a single viral week. Current programs are still accumulating their numbers.',
      inProduction: [
        { industry: 'Real Estate', stage: 'Reels program live' },
        { industry: 'Fitness', stage: 'Cadence ramping' },
      ],
      serviceHref: '/services/social',
    },
    cta: {
      eyebrow: 'Start your project',
      headline: 'Want a feed that earns attention?',
      description:
        'The social media service page covers how we plan, produce, and report — strategy through posting cadence.',
      primaryLabel: 'Start a Project',
      primaryHref: '/contact',
      secondaryLabel: 'Social Media Services',
      secondaryHref: '/services/social',
    },
    seo: {
      title: 'Social Media Projects | Perseus Creative Studio',
      description:
        'Social media case studies from Vancouver — content programs, posting cadence, and account growth documented across full engagements. New case studies publishing soon.',
      canonicalPath: `${SITE_URL}/projects/social`,
      ogImage: OG_IMAGE,
    },
    faqs: [
      {
        question: 'What does a social engagement with you include?',
        answer:
          'Strategy, a content calendar, the creative (shot with the production team when needed), posting cadence, and reporting on growth — managed as a program across a full engagement, not a one-off burst.',
      },
      {
        question: 'Why are there no published case studies here yet?',
        answer:
          'Social case studies are written up across a full engagement arc — strategy, cadence, growth — not a single viral week. Current programs are still accumulating their numbers.',
      },
      {
        question: 'Which platforms do you manage?',
        answer:
          'The ones your audience is actually on — most often Instagram, TikTok, LinkedIn, and YouTube — with creative cut to fit each platform rather than the same post sprayed everywhere.',
      },
      {
        question: 'Do you create the content, or just schedule it?',
        answer:
          'We create it. Social plugs straight into the production team, so the feed is original photo and video built for the platform — not stock or reposts.',
      },
      {
        question: 'How often will you post?',
        answer:
          'Cadence is set by the strategy and your capacity to feed it — we commit to a calendar you can sustain and we can produce for, then report on what each format returns.',
      },
      {
        question: 'Do you handle community management and replies?',
        answer:
          'We can. Engagement and community management are available alongside the content so the account doesn’t go quiet between posts — scoped to how hands-on you want us to be.',
      },
    ],
  },

  branding: {
    slug: 'branding',
    title: 'Branding',
    eyebrow: 'Selected work · Identity · Strategy · Voice',
    heroTitle: 'Identities built',
    heroTitleAccent: 'to last.',
    description:
      'Brand engagements shown as delivered artifacts — strategy, identity systems, and the applications that carry them into the world. Case studies publish as identities launch.',
    projects: BRANDING_PROJECT_SUMMARIES,
    proof: { unit: 'Identities' },
    comingSoon: {
      headline: 'Identities in development.',
      body: 'Branding case studies publish when the identity is live in the world — signage up, site shipped, voice in use. Current engagements are in the design phase.',
      inProduction: [
        { industry: 'Marine Services', stage: 'Identity in design' },
        { industry: 'Hospitality', stage: 'Strategy phase' },
      ],
      serviceHref: '/services/branding',
    },
    cta: {
      eyebrow: 'Start your project',
      headline: 'Building a brand worth the name?',
      description:
        'The branding service page covers the full system — strategy, identity, messaging, and the guidelines that keep it coherent.',
      primaryLabel: 'Start a Project',
      primaryHref: '/contact',
      secondaryLabel: 'Branding Services',
      secondaryHref: '/services/branding',
    },
    seo: {
      title: 'Branding Projects | Perseus Creative Studio',
      description:
        'Branding case studies from Vancouver — strategy, identity systems, and brand applications documented as delivered artifacts. New case studies publishing soon.',
      canonicalPath: `${SITE_URL}/projects/branding`,
      ogImage: OG_IMAGE,
    },
    faqs: [
      {
        question: 'What’s included in a branding engagement?',
        answer:
          'Brand strategy, the identity system (logo, type, color, and usage), and the core applications that carry it — delivered as a system your team and ours can build on, not a single logo file.',
      },
      {
        question: 'Why aren’t there case studies on this page yet?',
        answer:
          'Branding case studies publish when the identity is live in the world — signage up, site shipped, voice in use. Current engagements are still in the design phase.',
      },
      {
        question: 'Do you handle the rollout, or just the logo?',
        answer:
          'The rollout is the point. Identity work plugs into our websites, production, and social teams, so the brand ships consistently across every surface it touches.',
      },
      {
        question: 'We already have a logo — can you work with it?',
        answer:
          'Yes. Not every engagement is a full rebuild; we also evolve and systematize an existing mark into a complete identity when the foundation is worth keeping.',
      },
      {
        question: 'How long does a branding engagement take?',
        answer:
          'Strategy and identity work typically runs a few weeks to a couple of months depending on scope and rollout — we confirm the milestones in the proposal before we start.',
      },
      {
        question: 'Do you deliver brand guidelines we can hand to others?',
        answer:
          'Yes — every identity ships with usage guidelines so future designers, printers, and developers apply the brand consistently without guessing.',
      },
    ],
  },
};
