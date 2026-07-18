/**
 * Seed the Partners logo wall: the ~84 clients that lived as logo records in
 * the retired src/constants/clientLogos.ts, imported into the `clients` table
 * with their marquee membership/order, home-rail flag, coin face, logo path,
 * and outbound link.
 *
 * Run:  node --env-file=.env.local --import tsx scripts/seed-clients.mts
 *   or: npm run db:seed-clients
 *
 * Requires migration 0009 (marquee columns) to be applied first.
 *
 * Idempotent by design:
 *  - A record whose slug (or, failing that, logo path — reported as a
 *    NEAR-MISS) matches an existing row never inserts a duplicate.
 *  - Matched rows already on the wall (marquee_sort set) are skipped
 *    entirely — after the first run, /admin owns the marquee columns, so
 *    re-running never clobbers an admin edit. (Corollary: a client an admin
 *    deliberately removed from the wall rejoins on a re-run.)
 *  - Off-wall matches get ONLY the marquee columns plus fill-if-null
 *    logo/instagram/website; name, industry, bio, and uploaded logos are
 *    never touched.
 *  - Rows never mentioned here (e.g. clients without a wall logo) are left
 *    alone, and wall members unknown to this seed are listed at the end for
 *    review.
 *
 * WALL order is the marquee order (sorts in steps of 10): the 26 featured
 * records first — the home page's two "Selected Clients" rails, byte-for-byte
 * the retired selectedClientImg/selectedClientImg2 order — then the rest of
 * the About wall in its old clientImg/clientImg2 order. Slugs were resolved
 * against the live rows on 2026-07-19, so historic slugs (cfr,
 * phantom-pest-control, …) that differ from slugify(name) match their row.
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, isNotNull } from 'drizzle-orm';

import { clients } from '@/db/schema';

type SeedClient = {
  name: string;
  slug: string;
  /** Filename under /images/shared/client-logos/shared-client-logos- */
  logo: string;
  /** Outbound link — instagram.com URLs store as `instagram`, the rest as
   *  `websiteUrl`. */
  href: string;
  disc?: 'light' | 'dark';
  /** Also on the home page's featured rail. */
  featured?: boolean;
};

const F = true; // featured shorthand — keeps the rows scannable

// prettier-ignore
const WALL: SeedClient[] = [
  // ── Featured (home rails 1 + 2, in rail order) ────────────────────────────
  { name: 'Study 2020', slug: 'study-2020', logo: 'study2020.avif', href: 'https://www.instagram.com/study2020.international/', featured: F },
  { name: 'Visa 2020', slug: 'visa-2020', logo: 'visa2020.avif', href: 'https://www.instagram.com/visa2020.official/', featured: F },
  { name: 'Cartocci Real Estate Group', slug: 'cartocci-real-estate-group', logo: 'cartocci.avif', href: 'https://www.instagram.com/cartoccirealestategroup/', featured: F },
  { name: 'Vicinity Mart', slug: 'vicinity-mart', logo: 'vicinity.avif', href: 'https://www.instagram.com/vicinity.mart/', featured: F },
  { name: 'Obsidian Athletic Club', slug: 'obsidian-athletic-club', logo: 'obsidian.avif', href: 'https://www.instagram.com/obsidian_athletic_club/', featured: F },
  { name: 'Vitality Fitness', slug: 'vitality-fitness', logo: 'vitality.avif', href: 'https://www.instagram.com/vitalityfitness.bc/', featured: F },
  { name: 'Diba Windows', slug: 'diba-windows', logo: 'dibawindows.avif', href: 'https://www.instagram.com/dibawindows/', disc: 'dark', featured: F },
  { name: 'Vanclose Real Estate Team', slug: 'vanclose-real-estate-team', logo: 'vanclose.avif', href: 'https://www.instagram.com/vanclose.ca/', featured: F },
  { name: 'Amin Meysami', slug: 'amin-meysami', logo: 'amin-meysami.avif', href: 'https://www.instagram.com/aminmeysami/', featured: F },
  { name: 'Salon Centric', slug: 'salon-centric', logo: 'salon-centric-canada.avif', href: 'https://www.instagram.com/saloncentriccanada/', featured: F },
  { name: 'NBAR Canada', slug: 'nbar-canada', logo: 'NBAR.avif', href: 'https://www.instagram.com/nbar.canada/', featured: F },
  { name: 'Phantom Pest Solutions', slug: 'phantom-pest-control', logo: 'phantompestsolutions.avif', href: 'https://www.instagram.com/phantompestsolutions/', featured: F },
  { name: 'Andonis Vancouver', slug: 'andonis-vancouver', logo: 'andonis.avif', href: 'https://www.instagram.com/andonisvancouver/', featured: F },
  { name: 'Kandovan Construction', slug: 'kandovan-construction', logo: 'kandovan.avif', href: 'https://www.instagram.com/kandovanconstruction/', featured: F },
  { name: 'Stan Glassworks Ltd.', slug: 'stan-glassworks', logo: 'stanglassworksbackground.avif', href: 'https://stanglassworks.com', featured: F },
  { name: 'Vela Homes', slug: 'vela-homes', logo: 'Velahomes.avif', href: 'https://www.instagram.com/veladesignbuild/', featured: F },
  { name: 'RS Foundation Systems', slug: 'rs-foundation', logo: 'rsfoundation.avif', href: 'https://www.instagram.com/r.s.foundationsystemsltd/', featured: F },
  { name: 'Faith Wilson Realty', slug: 'faith-wilson-group', logo: 'faithwilson.avif', href: 'https://faithwilson.com', featured: F },
  { name: 'Matchtour', slug: 'match-tour-11', logo: 'match-tour-11.avif', href: 'https://www.instagram.com/matchtour11/', disc: 'light', featured: F },
  { name: 'Happy Gilmore Golf Lounge', slug: 'happy-gilmore-golf-lounge', logo: 'gilmore.avif', href: 'https://www.instagram.com/happygilmoregolflounge/', featured: F },
  { name: 'Asanti Developments', slug: 'asanti-developments', logo: 'asanti.avif', href: 'https://www.instagram.com/asanti.homes/', featured: F },
  { name: 'Divan Events Canada', slug: 'divan-events-canada', logo: 'divanevents.avif', href: 'https://www.instagram.com/divanevents_canada/', featured: F },
  { name: 'Gym Curators', slug: 'gym-curator', logo: 'gym-curators.avif', href: 'https://www.instagram.com/gymcurators/', disc: 'light', featured: F },
  { name: 'Eivan', slug: 'eivan', logo: 'eivan-northvan.avif', href: 'https://www.instagram.com/eivan.northvan/', featured: F },
  { name: 'Valroc', slug: 'valroc', logo: 'valroc.avif', href: 'https://www.instagram.com/valrocdevelopmentltd/', featured: F },
  { name: 'Rocky Junk', slug: 'rocky-junk-removal', logo: 'rocky-junkremoval.avif', href: 'https://www.instagram.com/rocky_junkremoval/', featured: F },
  // ── The rest of the About wall (old clientImg order) ──────────────────────
  { name: 'Fitbodega Vancouver FC', slug: 'fitbodega', logo: 'fitbodega.avif', href: 'https://www.instagram.com/fitbodegavancouverfc/', disc: 'dark' },
  { name: 'Nani FC', slug: 'nani-fc', logo: 'nani-fc.avif', href: 'https://www.instagram.com/nanifc_tst/' },
  { name: 'Sam Amiralaei', slug: 'sam-amiralaei', logo: 'samAmiralaei.avif', href: 'https://www.sammyhomes.com' },
  { name: 'Taurus Fitness Club', slug: 'taurus-fitness-club', logo: 'taurus.avif', href: 'https://www.instagram.com/taurusfitness.club/' },
  { name: 'Art Build Construction', slug: 'art-build-construction', logo: 'artbuild.avif', href: 'https://www.instagram.com/artbuild_construction/' },
  { name: 'Kasraz Persian Rugs', slug: 'kasraz', logo: 'kasraz.avif', href: 'https://www.instagram.com/kasrazrugs/' },
  { name: 'Bargain Construction Corporation', slug: 'bargain-construction-corporation', logo: 'BCC.avif', href: 'https://www.instagram.com/bccorp.ca/' },
  { name: 'Private Coaching Co', slug: 'private-coaching-co', logo: 'privatecoachingco.avif', href: 'https://www.instagram.com/privatecoachingco/' },
  { name: 'A2 ProCon Developments', slug: 'a2-procon-developments', logo: 'a2procon.avif', href: 'https://www.a2procon.com' },
  { name: 'Dallas Dakota Realty', slug: 'dallas-dakota-realty', logo: 'dallasDakota.avif', href: 'https://www.instagram.com/dallasdakotarealty/' },
  { name: 'Diamond Pro - Fencing & Decking LTD', slug: 'diamond-pro-fencing-decking-ltd', logo: 'diamondFencing.avif', href: 'https://www.instagram.com/diamondprofd/' },
  { name: 'Parkway Motorsport Vancouver', slug: 'parkway-motorsport-vancouver', logo: 'parkwaysport.avif', href: 'https://www.instagram.com/parkway_motorsport/' },
  { name: 'Negin Javaheri Art', slug: 'negin-javaheri-art', logo: 'neginjavaheri.avif', href: 'https://www.instagram.com/negg.artt/' },
  { name: 'Lemon Currency Exchange', slug: 'lemon-currency-exchange', logo: 'lemoncurrencyexchange.avif', href: 'https://lemonexchange.ca' },
  { name: 'Iron Nation Surrey', slug: 'iron-nation-surrey', logo: 'ironnation.avif', href: 'https://www.instagram.com/iron.nation.surrey/', disc: 'dark' },
  { name: 'Helia Esmaeili', slug: 'helia-esmaeili', logo: 'heliaEsmaeili.avif', href: 'https://www.instagram.com/_heliaesmaeili_/' },
  { name: 'North Shore Sports Medicine', slug: 'north-shore-sports-medicine', logo: 'nssm.avif', href: 'https://nssm.ca' },
  { name: 'Mana Noori Real Estate', slug: 'mana-noori', logo: 'mananoori.avif', href: 'https://www.instagram.com/mana.noori.homes/' },
  { name: 'Aegis Dental Centre', slug: 'aegis-dental-centre', logo: 'aegisdentalcentre.avif', href: 'https://aegisdentalcentre.com' },
  { name: 'Hatam Restaurant West Vancouver', slug: 'hatam-restaurant-west-vancouver', logo: 'hatam.avif', href: 'https://www.instagram.com/hatamrestaurant.westvancouver/' },
  { name: 'Arani Construction', slug: 'arani-construction', logo: 'araniconstruction.avif', href: 'https://www.instagram.com/arani.construction/' },
  { name: 'Canada SCORES Vancouver', slug: 'canada-scores-vancouver', logo: 'canadascores.avif', href: 'https://www.canadascores.org/vancouver' },
  { name: 'West Coast Oral Surgery', slug: 'west-coast-oral-surgery', logo: 'west-coast-oral-surgey.avif', href: 'https://westcoastoralsurgery.ca', disc: 'light' },
  { name: 'Ignition Marine', slug: 'ignition-marine', logo: 'ignition-marine.avif', href: 'https://ignitionmarine.com', disc: 'light' },
  { name: 'Erin Price Emery', slug: 'erin-price-emery', logo: 'erin-price-emery.avif', href: 'https://www.erinpriceemery.ca', disc: 'light' },
  { name: 'Mehrnaz Kavoosi', slug: 'mehrnaz-kavoosi', logo: 'mehrnaz-kavoosi.avif', href: 'https://www.mehrnazkavoosi.com' },
  { name: 'Athlete Prep', slug: 'athlete-prep', logo: 'athlete-prep.avif', href: 'https://www.athleteprep.ca', disc: 'light' },
  // ── (old clientImg2 order) ────────────────────────────────────────────────
  { name: 'TST', slug: 'tst', logo: 'tst7v7.avif', href: 'https://www.instagram.com/tst7v7/' },
  { name: 'Canadian Flooring & Renovations', slug: 'cfr', logo: 'cfr.avif', href: 'https://flooringandrenovations.com' },
  { name: 'Streetball FC Canada', slug: 'streetball-fc-canada', logo: 'streetball.avif', href: 'https://www.instagram.com/streetball.fc/' },
  { name: 'Gal Senior Care Foundation', slug: 'gal-senior-care-foundation', logo: 'gsc.avif', href: 'https://gsc-foundation.org' },
  { name: 'Cindys Cafe', slug: 'cindys-cafe', logo: 'cindyscafe.avif', href: 'https://www.instagram.com/restaurantcindys/' },
  { name: 'Van Mens Club', slug: 'van-mens-club', logo: 'vmc.avif', href: 'https://www.instagram.com/vanmens.club/' },
  { name: 'West Vancouver Tennis Club', slug: 'west-vancouver-tennis-club', logo: 'westvancouvertennisclub.avif', href: 'https://www.instagram.com/westvantennisclub/' },
  { name: 'Sturdybee Renovations', slug: 'sturdybee-renovations', logo: 'sturdybee.avif', href: 'https://www.instagram.com/sturdybeerenovations/' },
  { name: 'Arshia Esmaeili Real Estate Services', slug: 'arshia-esmaeili-real-estate-services', logo: 'arshia-esmaeili.avif', href: 'https://www.instagram.com/arshiaesmaeili.realestate/', disc: 'light' },
  { name: 'Elitelife Skin Centre', slug: 'elite-life-skin-centre', logo: 'elitelife.avif', href: 'https://www.instagram.com/elitelife_skin_centre/' },
  { name: 'LubeTech | GSD', slug: 'lubetech-gsd', logo: 'lubetech.avif', href: 'https://www.lubetechtruckcrane.com' },
  { name: 'Dunns Menswear', slug: 'dunns-menswear', logo: 'dunnsmenswear.avif', href: 'https://www.instagram.com/dunnsmenswear/' },
  { name: 'Luxury Lane', slug: 'luxury-lane', logo: 'luxurylane.avif', href: 'https://www.instagram.com/luxurylane.ca/' },
  { name: 'Belcanto Dental', slug: 'belcanto-dental', logo: 'belcantoDental.avif', href: 'https://www.instagram.com/belcantodental/' },
  { name: 'Saffron Event', slug: 'saffron-event', logo: 'saffron.avif', href: 'https://www.instagram.com/thesaffronevents/' },
  { name: 'Rocky Demolishing', slug: 'rocky-demolition', logo: 'rocky.demolition.avif', href: 'https://www.instagram.com/rocky.demolition/' },
  { name: 'Doucette', slug: 'doucette-homes', logo: 'doucettehomes.avif', href: 'https://www.doucettehomes.ca' },
  { name: 'Erc Construction', slug: 'erc-construction', logo: 'erconstruction.avif', href: 'https://www.instagram.com/ercconstruction.ca/' },
  { name: 'GSD Crane', slug: 'gsd-crane', logo: 'gsdcraneltd.avif', href: 'https://www.instagram.com/gsdcranes/' },
  { name: 'Flow Space Construction', slug: 'flow-space-construction', logo: 'flowspaceconstruction.avif', href: 'https://www.flowspace.ca' },
  { name: 'Esperlus Event Space', slug: 'esperlus-event-space', logo: 'esperlus.avif', href: 'https://www.instagram.com/esperlus.ca/' },
  { name: 'Ace Brand Ltd.', slug: 'ace-brand-ltd', logo: 'acebrand.avif', href: 'https://www.instagram.com/ace_brand_construction/' },
  { name: 'Kirei Lash Co - WEST VAN LASHES', slug: 'kirei-lash-co-west-van-lashes', logo: 'kireilashco.avif', href: 'https://www.instagram.com/kireilashco/' },
  { name: 'Deeba Events', slug: 'deeba-events', logo: 'deebaevents.avif', href: 'https://www.instagram.com/deebaevents/' },
  { name: 'Watson Gym Equipment', slug: 'watson-gym-equipment', logo: 'watsongymequipment.avif', href: 'https://www.instagram.com/watsongymequipment/' },
  { name: 'City Scape Electrical Canada', slug: 'cityscape-electrical', logo: 'cityscape-electrical.avif', href: 'https://www.instagram.com/cityscape_electrical/' },
  { name: 'Ev Charge Inc', slug: 'evcharge', logo: 'evchageincbackground.avif', href: 'https://evchargeinc.com/' },
  { name: 'Bromley Estates Marbella', slug: 'bromley-estates-marbella', logo: 'bromley-estates.avif', href: 'https://bromleyestatesmarbella.com' },
  { name: '901 Bar & Grill', slug: '901-bar-grill', logo: '901-bar-grill.avif', href: 'https://www.901bar.com' },
  { name: 'Tina Heidari', slug: 'tina-heidari', logo: 'tina-heidari.avif', href: 'https://www.soldinvan.com' },
  { name: 'MFS Construction', slug: 'mfs-construction', logo: 'mfs-construction.avif', href: 'https://www.mfsconstruction.ca' },
];

const LOGO_PREFIX = '/images/shared/client-logos/shared-client-logos-';

const isInstagram = (href: string): boolean => {
  try {
    return /(^|\.)instagram\.com$/.test(new URL(href).hostname);
  } catch {
    return false;
  }
};

// Guard against author typos before touching the DB.
{
  const slugs = new Set<string>();
  for (const seed of WALL) {
    if (slugs.has(seed.slug)) throw new Error(`duplicate seed slug: ${seed.slug}`);
    slugs.add(seed.slug);
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: { clients } });

const existing = await db.select().from(clients);
const bySlug = new Map(existing.map((r) => [r.slug, r]));
const byLogo = new Map(
  existing.flatMap((r) => (r.logoStaticPath ? [[r.logoStaticPath, r] as const] : [])),
);

let inserted = 0;
let updated = 0;
let skipped = 0;
let nearMiss = 0;
const processedSlugs = new Set<string>();

await db.transaction(async (tx) => {
  for (const [i, seed] of WALL.entries()) {
    const sort = (i + 1) * 10;
    const logoPath = `${LOGO_PREFIX}${seed.logo}`;
    const instagram = isInstagram(seed.href) ? seed.href : null;
    const websiteUrl = instagram ? null : seed.href;

    let row = bySlug.get(seed.slug);
    if (!row) {
      const pathMatch = byLogo.get(logoPath);
      if (pathMatch) {
        console.warn(
          `! NEAR-MISS: seed '${seed.slug}' matched existing '${pathMatch.slug}' by logo path — using the existing row`,
        );
        nearMiss++;
        row = pathMatch;
      }
    }

    if (!row) {
      await tx.insert(clients).values({
        name: seed.name,
        slug: seed.slug,
        logoStaticPath: logoPath,
        instagram,
        websiteUrl,
        marqueeSort: sort,
        marqueeFeatured: seed.featured === true,
        logoDisc: seed.disc ?? null,
      });
      processedSlugs.add(seed.slug);
      inserted++;
      console.log(`+ inserted: ${seed.slug}`);
      continue;
    }

    processedSlugs.add(row.slug);
    if (row.marqueeSort !== null) {
      // Already on the wall — /admin owns the marquee columns from here.
      skipped++;
      console.log(`• skip (already on the wall): ${row.slug}`);
      continue;
    }

    await tx
      .update(clients)
      .set({
        marqueeSort: sort,
        marqueeFeatured: seed.featured === true,
        logoDisc: seed.disc ?? null,
        // Fill-only: an admin-entered value (or uploaded logo) always wins.
        logoStaticPath: row.logoStaticPath ?? logoPath,
        instagram: row.instagram ?? instagram,
        websiteUrl: row.websiteUrl ?? websiteUrl,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, row.id));
    updated++;
    console.log(`~ joined the wall: ${row.slug}`);
  }
});

// Wall members this seed doesn't know about — informational (admin-added
// members are expected over time; a typo'd seed slug would also land here).
const wallNow = await db
  .select({ slug: clients.slug })
  .from(clients)
  .where(isNotNull(clients.marqueeSort));
const strays = wallNow.filter((r) => !processedSlugs.has(r.slug));
if (strays.length) {
  console.log(
    `\nOn the wall but not in this seed (admin-added, or check for typos):`,
  );
  for (const s of strays) console.log(`  - ${s.slug}`);
}

console.log(
  `\ndone: inserted ${inserted}, joined ${updated}, skipped ${skipped}, near-miss ${nearMiss} (seed ${WALL.length} records, DB had ${existing.length} rows)`,
);

await pool.end();
process.exit(0);
