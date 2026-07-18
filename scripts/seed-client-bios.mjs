/**
 * Fill each client's bio with a researched draft (web-searched 2026-07-19,
 * one entry per logo-wall client that had no bio). The bios are internal
 * reference copy — nothing on the public site reads clients.bio yet.
 *
 * Run:  node --env-file=.env.local scripts/seed-client-bios.mjs
 *       (add --force to overwrite bios that already have text)
 *
 * Idempotent by design: a client whose bio is already non-empty is skipped
 * (so /admin edits are never clobbered on a re-run), rows missing from the
 * DB are reported and left alone, and nothing else on the row is touched
 * except updated_at.
 *
 * Review notes: entries below marked 'medium/low confidence' had thinner
 * public footprints — read those before running. One flagged REVIEW entry
 * resolved to a business outside Metro Vancouver; confirm it's the right
 * company before keeping its bio.
 */
import { Pool } from '@neondatabase/serverless';

const FORCE = process.argv.includes('--force');

const BIOS = {
  // REVIEW: Resolved to the Los Angeles USC bar behind 901bar.com — double-check this is the right client.
  "901-bar-grill":
    "901 Bar & Grill, known as \"The Nine-O,\" is a sports bar and grill on South Figueroa Street in Los Angeles, steps from the University of Southern California campus, where it has operated since 1947. It serves American bar fare — including its well-known wings and burgers — alongside cocktails and local craft beer, and doubles as a USC game-day and nightlife destination with multiple screens, live music, and DJ events.",

  "a2-procon-developments":
    "A2 ProCon Development Ltd. is a family-run construction company serving the Vancouver, BC area, providing project management alongside painting, finishing work, flooring installation, deficiency assessments, and pre-inspection quality control for residential and commercial projects. The company cites more than 16 years of construction-industry experience and emphasizes environmentally responsible practices.",

  // medium confidence
  "ace-brand-ltd":
    "Ace Brand Ltd. is a construction company based in North Vancouver, BC, working in custom and multi-family home building. Led by managing director Nami Abrand, it is a member of the Homebuilders Association Vancouver (HAVAN) and serves clients across Metro Vancouver.",

  "aegis-dental-centre":
    "Aegis Dental Centre is a family-focused dental clinic on Balsam Street in Vancouver's Kerrisdale neighbourhood. The practice offers family, cosmetic, sedation, and emergency dentistry — including fillings, root canal therapy, dental implants, crowns, Invisalign, and full-mouth rehabilitation — using digital and microscope-enhanced techniques.",

  "amin-meysami":
    "Amin Meysami is a Vancouver-based realtor operating as a Personal Real Estate Corporation with The Agency Vancouver and co-founder of the Vanclose Real Estate Team. He specializes in single-family homes, townhomes, and condos on the North Shore — including Edgemont, Forest Hills, Canyon Heights, Ambleside, and Dundarave — and is a multi-year Medallion Club member whose team ranks among the top producers at The Agency.",

  "andonis-vancouver":
    "Andonis Vancouver is a Greek-inspired restaurant and supper club at 1193 Granville Street in downtown Vancouver, BC. It serves upscale Mediterranean cuisine in a Grecian-styled dining room, with dinner service transitioning into late-night entertainment — live music, saxophonists, and dance performances — running into the early hours on weekends.",

  "arani-construction":
    "Arani Construction Inc. is a general contractor based in North Vancouver, BC, founded in 2011 and serving the North Shore and Greater Vancouver. The company handles residential, commercial, and industrial renovation work — full home remodels, kitchen and bathroom renovations, basement conversions, home additions, custom millwork, and tenant improvements — and reports more than 120 completed projects.",

  "arshia-esmaeili-real-estate-services":
    "Arshia Esmaeili is a licensed real estate agent with RE/MAX Masters Realty, based on Bellevue Avenue in West Vancouver, BC. Esmaeili assists buyers and sellers with residential properties — houses, townhomes, and condos — across West Vancouver and the Greater Vancouver area.",

  // medium confidence
  "art-build-construction":
    "Artbuild Construction Ltd. is a boutique construction contractor based in Vancouver, BC, focused on residential and commercial renovations and home improvement. The company works with clients from the initial property consultation through renovation planning and completion.",

  "asanti-developments":
    "Asanti Developments, operating as Asanti Homes, is a family-owned home builder based in Vancouver, BC, building custom homes in Vancouver and the Lower Mainland since 1978. The company designs and builds single-family residences and multiplex homes through an integrated design-build approach spanning custom construction, project management, and real estate development.",

  "athlete-prep":
    "Athlete Prep Inc. is a strength and conditioning company that develops youth athletes through small-group training in speed, agility, strength, movement fundamentals, and mental performance. It operates in Vancouver and Toronto, training out of Collingwood School's Morven campus in West Vancouver, and also runs a summer athlete development academy for teens alongside injury-rehabilitation and return-to-sport programming.",

  "bargain-construction-corporation":
    "Bargain Construction Corporation is a civil construction contractor based in West Vancouver, British Columbia, specializing in shoring, piling, and excavation. Its services include shotcrete shoring, micropile and sheet-piling systems, and site preparation and civil works for residential and commercial projects across the province.",

  "belcanto-dental":
    "Bel Canto Dental is a dental clinic on Marine Drive in West Vancouver, BC that has served the North Shore for about two decades. The mercury-free practice offers general and cosmetic dentistry, including implants, root canals, Invisalign, and crowns and bridges. Dr. Al Falsafi and Dr. Shima Khalaji became the clinic's owners in 2022.",

  "bromley-estates-marbella":
    "Bromley Estates Marbella is a real estate agency specializing in luxury apartments, villas, and townhouses on Spain's Costa del Sol. Operating from offices in Marbella's El Rosario and Elviria districts and in La Cala, it handles resale, new-development, and off-plan property sales with after-sales support, and its multilingual team reports selling roughly 400 homes a year.",

  "canada-scores-vancouver":
    "Canada SCORES Vancouver is the BC chapter of Canada SCORES, a registered charity established in 2013 that delivers free after-school programming combining soccer, poetry, and community service projects. Its 'poet-athlete' program runs in partner elementary and middle schools across Metro Vancouver's Lower Mainland, with events including the Winter Cup, SCORES Cup, and a Red Carpet Poetry Slam.",

  "cartocci-real-estate-group":
    "Cartocci Real Estate Group is a West Vancouver-based real estate team led by Paolo Cartocci, a realtor with RE/MAX Masters Realty. The group handles residential and commercial transactions, including homes, condos, and businesses, serving West Vancouver, North Vancouver, downtown Vancouver, East Vancouver, and Burnaby.",

  "cfr":
    "CFR (Canadian Flooring & Renovations) is a flooring retailer and renovation contractor located at 1903 West Broadway in Vancouver, BC. Its showroom carries carpet, including New Zealand wool lines, along with tile and laminate options, and its contractors handle flooring installation as well as kitchen and bathroom renovations.",

  "cindys-cafe":
    "Cindy's is a neighbourhood brunch cafe at 1850 Marine Drive in West Vancouver, BC. Open daily for breakfast and lunch, it serves eggs Benedict, Belgian waffles, French toast, and omelettes, with vegetarian and keto options, and offers a reservation-based afternoon high tea service.",

  "cityscape-electrical":
    "Cityscape Electrical Ltd is an electrical contractor serving Metro Vancouver, with locations listed in Langley and North Vancouver, BC. The company provides residential and commercial electrical work, including installations, renovations, and repairs for homes and businesses.",

  "dallas-dakota-realty":
    "Dallas Dakota Realty is the practice of Dallas Dakota, a North Vancouver realtor operating as a personal real estate corporation with Oakwyn Realty. Based in Edgemont Village on the North Shore, the group represents buyers and sellers across Metro Vancouver, with a focus on presale and new-development opportunities for both local and international clients.",

  "deeba-events":
    "Deeba Events is an event company that produces junior runway modeling contests and fashion showcase events in North Vancouver, BC, with recurring competitions held at the Pinnacle Hotel. Its shows pair a judged runway for child models with audience voting, professional photography for every participant, and family activities such as face painting and kids' spa stations.",

  "diamond-pro-fencing-decking-ltd":
    "Diamond Pro Fencing & Decking Ltd is a Surrey, BC outdoor construction contractor that installs cedar, metal, vinyl, and chain-link fencing along with custom decks, retaining walls, and pavers. It serves residential, commercial, and strata clients across the Lower Mainland, with work extending to Vancouver Island and the Okanagan.",

  "diba-windows":
    "Diba Windows is a North Vancouver, BC glazing company that fabricates high-performance thermal-break aluminium windows, doors, patio doors, and curtain walls, operating as an Alumil Supreme fabricator in Canada. It supplies custom residential, commercial, and architectural projects, with systems designed for large openings, minimal sightlines, and energy-efficient building envelopes.",

  "divan-events-canada":
    "Divan Events Canada is a Vancouver-based events agency that organizes art and fashion shows, wellness and mindfulness sessions, cultural celebrations such as Nowruz, and networking and marketing events. It has hosted gatherings in Vancouver and Toronto as well as internationally, working with more than 150 vendors and sponsors.",

  "doucette-homes":
    "Doucette Homes is the real estate practice of Victoria, BC realtor Elsbet Doucette, who helps clients buy and sell homes in Victoria and across Vancouver Island. Operating as a personal real estate corporation, she focuses on guiding families through the selling process with her low-stress \"Chaos to Calm\" listing method.",

  "dunns-menswear":
    "Dunn's Menswear & Bespoke is a West Vancouver, BC menswear boutique offering made-to-measure suiting, curated ready-to-wear, expert alterations, and personal styling. The shop traces its heritage to Dunn's Tailors, founded on Vancouver's Hastings Street in 1936, which grew to five locations across the city.",

  "eivan":
    "Eivan Restaurant and Bar is a modern Persian restaurant at 1615 Lonsdale Avenue in North Vancouver, BC, serving grilled kebabs, saffron rice, and seasonal plates. Its bar program features Iranian-inspired cocktails alongside a curated wine list.",

  "elite-life-skin-centre":
    "Elite Life Skin Centre is a medical aesthetics and wellness clinic on Marine Drive in West Vancouver, BC. It offers laser hair removal, microneedling, HydraFacial treatments, Botox, chemical peels, and non-surgical skin tightening using FDA-approved devices such as LaseMD Ultra and Darwin HIFU, alongside wellness services including massage therapy, osteopathy, and nutrition consultations.",

  // low confidence
  "encino-development":
    "Encino Development is a property development company; its name indicates a focus on real estate development and construction. Little verified public information about the firm, its projects, or its service area is available.",

  // medium confidence
  "erc-construction":
    "ERC Construction Ltd. is a home building and renovation contractor based in North Vancouver, British Columbia. The company takes on residential projects including kitchen, bathroom, and whole-home renovation work, and is a member of the Homebuilders Association Vancouver (HAVAN) through the Canadian Home Builders' Association, classified as both a builder and renovator.",

  "erin-price-emery":
    "Erin Price Emery is a Vancouver, British Columbia real estate agent with Oakwyn Realty and founder of The Collective Real Estate Team. With over a decade in the Vancouver market, she specializes in luxury residential sales, presales, new developments, and assignments across Greater Vancouver, with a marketing approach centred on video and social media.",

  "esperlus-event-space":
    "Esperlus is an event venue at 1661 Granville Street in Vancouver, British Columbia, tucked beneath the Granville Bridge with waterfront views toward Granville Island. The roughly 6,000-square-foot open-concept space hosts weddings, corporate events, birthdays, and graduation parties for up to 275 guests, with in-house furniture and decor and on-site parking.",

  "evcharge":
    "EVcharge Inc. is a clean-energy company headquartered in Irvine, California that develops, builds, and operates fast-charging infrastructure for medium- and heavy-duty electric vehicle fleets, including 400 kW DC fast chargers. It also runs zero-emission drayage trucks at the Ports of Los Angeles and Long Beach and develops renewable energy projects supporting California's zero-emission goals.",

  "faith-wilson-group":
    "Faith Wilson Group, operating as faithwilson | Christie's International Real Estate, is a luxury real estate brokerage headquartered in Vancouver, British Columbia, serving Vancouver, the Okanagan, and Whistler with residential and commercial services. Founded by realtor Faith Wilson in 2011, the firm has been affiliated with Christie's International Real Estate since 2017, showcasing its listings through the global Christie's network.",

  // medium confidence
  "fitbodega":
    "FitBodega Vancouver is a 7v7 soccer club from Vancouver, British Columbia that competes in TST (The Soccer Tournament), the winner-take-all $1 million championship held in Cary, North Carolina. The team made its TST debut in 2024, where it was drawn into Group C and reached the round of 32.",

  "flow-space-construction":
    "Flow Space Construction Inc. is a Vancouver-based renovation company serving the Lower Mainland of British Columbia, including Vancouver, North Vancouver, West Vancouver, Burnaby, and Coquitlam. The licensed and insured contractor specializes in residential remodeling, covering home, condo, kitchen, bathroom, and basement renovations.",

  "gal-senior-care-foundation":
    "The Gal Senior Care Foundation (GSC Foundation) is a registered Canadian charity, established in March 2024, dedicated to protecting seniors from financial fraud. It delivers fraud-awareness seminars, webinars, and community outreach programs across Canada, with locations in Vancouver, Toronto, and Winnipeg, and operates a recovery fund supporting fraud victims.",

  // medium confidence
  "gsd-crane":
    "GSD Cranes is a crane and heavy-lifting company operating under the LubeTech | GSD banner out of New Westminster, British Columbia. It provides mobile crane lifts up to 60 tons with reach up to 160 feet, Hiab crane and Moffett forklift work, rigging, and industrial equipment moves for projects across Metro Vancouver and Vancouver Island.",

  "gym-curator":
    "Gym Curators is a North Vancouver, British Columbia company that designs, plans, and equips fitness spaces for commercial and residential clients, from home and condo gyms to hotels, universities, and corporate wellness facilities. Its services span gym consulting, custom 2D and 3D design, and equipment supply in partnership with brands such as Matrix, Watson, and Rogers Athletic.",

  "happy-gilmore-golf-lounge":
    "Happy Gilmore Golf Lounge is an indoor golf simulator lounge on Lougheed Highway in Burnaby, British Columbia. The venue offers eight bays equipped with TrackMan iO technology, including fully enclosed private rooms, plus a full bar and kitchen, and hosts casual rounds, leagues, golf instruction, and private events for up to 85 guests.",

  "hatam-restaurant-west-vancouver":
    "Hatam Restaurant is a Persian restaurant at 1747 Marine Drive in West Vancouver, BC, serving traditional Iranian dishes such as koobideh, shishlik, and chicken kebabs alongside stews and rice specialties. The dining room pairs classic Persian cooking with a modern interior and licensed bar, and the restaurant also offers catering for weddings and private events.",

  // low confidence
  "helia-esmaeili":
    "Helia Esmaeili is an individual who maintains a personal presence on Instagram under the handle @_heliaesmaeili_. Publicly available information about her professional focus and location is limited.",

  // medium confidence
  "iron-nation-surrey":
    "Iron Nation Fitness Surrey is a strength-training gym at 13128 80 Avenue in Surrey, BC, outfitted with equipment from brands such as Panatta, Watson, and Hammer Strength alongside cardio and functional-training areas. Part of the BC-based Iron Nation Fitness brand, the location operates under ownership that changed hands in 2026.",

  "kandovan-construction":
    "Kandovan Construction Ltd. is a Coquitlam-based contractor serving Metro Vancouver with civil construction and landscaping services, including demolition, excavation, shoring installation, watermain and stormwater work, grading, and hardscape construction. The company draws on roughly two decades of industry experience and works with both residential and commercial clients.",

  "kasraz":
    "Kasraz is a Vancouver, BC rug company specializing in authentic Persian silk rugs handcrafted by artisans in Iran. It sells its certified-original collection online and locally, and also provides expert washing and finishing services to preserve silk rugs.",

  "kirei-lash-co-west-van-lashes":
    "Kirei Lash Co is an eyelash studio based in West Vancouver's Ambleside neighbourhood, specializing in lash extensions and Korean lash lifts, with additional weekly service days in Vancouver's Yaletown. The studio emphasizes lash health and long-lasting application, and also runs a three-day certification training program for aspiring lash technicians.",

  "lemon-currency-exchange":
    "Lemon Currency Exchange is a family-run currency exchange at 1449 Marine Drive in West Vancouver, BC, which states it has served the Vancouver area since 1990. It exchanges more than 90 currencies and offers international money transfers, travel-money buyback, cash and Interac e-Transfer transactions, and bulk-exchange solutions for local businesses.",

  "lubetech-gsd":
    "LubeTech Truck & Crane Ltd. is a government-certified Designated Inspection Facility and heavy-duty repair shop in Greater Vancouver, servicing trucks, trailers, and heavy vehicles with Red Seal certified technicians, plus fabrication, welding, and flatbed transport on weekly routes to Kelowna and Kamloops. Its affiliated division, GSD Lifting Solutions, operates a 60-ton mobile crane with 160-foot reach serving Metro Vancouver and Vancouver Island.",

  // low confidence
  "luxury-lane":
    "Luxury Lane is a Canadian brand active on Instagram as @luxurylane.ca; the name and handle indicate a luxury-goods-oriented business. Publicly available information about its specific offerings and location is limited.",

  "mana-noori":
    "Mana Noori is a Realtor with Sutton Group-West Coast Realty, operating as a Personal Real Estate Corporation from West Vancouver, BC. She works with buyers and sellers across West Vancouver, North Vancouver, and the wider Greater Vancouver area, including presale properties. She holds a Master's degree in architecture and is a Medallion Club member, a designation recognizing top-producing Greater Vancouver realtors.",

  "match-tour-11":
    "Match Tour 11 is an international football agency based in North Vancouver, BC that organizes European training camps, tournaments, friendly matches, player trials, and pre-season tours for youth and professional teams. It operates as the City Football Group's Canadian partner, delivering official Manchester City football camps across Canada, and also offers packages around the 2026 FIFA World Cup matches in Vancouver.",

  "mehrnaz-kavoosi":
    "Mehrnaz Kavoosi is a Realtor with RE/MAX Masters Realty serving the Greater Vancouver area. She works with newcomers, investors, and first-time home buyers, and serves clients in English, Farsi, and Spanish.",

  "mfs-construction":
    "MFS Construction is a design-build general contractor based at 2779 Lake City Way in Burnaby, BC, offering commercial and residential general contracting that manages projects from initial concept and design through construction completion. The firm serves the Vancouver market with an integrated in-house team of designers, project managers, and builders.",

  // low confidence
  "michael-kamara-realtor":
    "Michael Kamara is a licensed real estate agent who represents clients in the purchase and sale of homes.",

  "nani-fc":
    "Nani FC is a 7-a-side soccer team led by former Manchester United and Portugal winger Luís Nani that competes in The Soccer Tournament (TST), an annual winner-take-all 7v7 event in Cary, North Carolina. The team reached the TST men's final in 2024, finishing runner-up, and returned to compete in TST 2025.",

  "nbar-canada":
    "N.Bar Canada is the Canadian arm of N.Bar, an international nail salon and beauty spa brand. It operates two Metro Vancouver locations, on Marine Drive in West Vancouver and West Pender Street in downtown Vancouver, offering manicures, pedicures, nail art, waxing, threading, and facials.",

  // medium confidence
  "negin-javaheri-art":
    "Negin Javaheri is a Vancouver-based visual artist who works across painting, sculpture, and handcrafted pieces. With a background in architecture, she shares her work with a large audience on Instagram under the handle @negg.artt.",

  "north-shore-sports-medicine":
    "North Shore Sports Medicine is a multidisciplinary rehabilitation practice in North Vancouver, BC, with clinics in Deep Cove and on Brooksbank Avenue near Park & Tilford. Its physiotherapists, massage therapists, chiropractors, acupuncturists, and kinesiologists treat sports injuries and everyday pain, and the practice grew from a Deep Cove clinic opened more than 30 years ago.",

  "obsidian-athletic-club":
    "Obsidian Athletic Club is a family-run athletic club in North Vancouver, BC, operating a facility of more than 20,000 square feet on West 3rd Street. It offers extensive free-weight, machine, and cardio training areas plus amenities such as saunas, tanning, and red light therapy, and houses Obsidian Boxing Club, a BC Boxing-affiliated boxing gym.",

  "parkway-motorsport-vancouver":
    "Parkway Motorsport is an independent used car dealership on the Fraser Highway in Langley, BC, serving buyers across Metro Vancouver. It sells pre-owned cars, trucks, and SUVs and arranges financing for its customers.",

  "phantom-pest-control":
    "Phantom Pest Control (Phantom Pest Solutions Ltd.) is a locally owned and operated pest control company based in downtown Vancouver, BC. It provides residential, commercial, and industrial pest management across Metro Vancouver and the Lower Mainland, handling rodents, carpenter ants, bed bugs, wasps, and other common pests with inspection-led treatment plans.",

  "private-coaching-co":
    "Private Coaching Co is a youth sports coaching company founded in North Vancouver, BC by Owen McBride during the Covid-19 pandemic. It offers one-on-one, small-group, and team training across soccer, basketball, and other sports, emphasizing fundamental movement skills, fun, and confidence over early specialization, and has grown into a network of young coaches working with families, schools, and community groups.",

  "rocky-demolition":
    "Rocky Demolition & Asbestos Removal is a Burnaby, BC-based contractor providing residential, commercial, and industrial demolition alongside asbestos testing, abatement, and removal across Vancouver and the Lower Mainland. The licensed and WorkSafeBC-certified team manages permits, assessments, and excavation backfilling, and recycles demolition material where possible.",

  "rocky-junk-removal":
    "Rocky Junk Removal is a Burnaby, BC-based junk removal and bin rental company operating under the same brand as Rocky Demolition. It serves homes, offices, retail spaces, and construction sites across Burnaby, Vancouver, and the Lower Mainland, offering same-day and scheduled pickups and working with local recycling depots to divert material from landfills.",

  "rs-foundation":
    "R.S. Foundation Systems Ltd. is a design-build deep foundation contractor established in 2008, specializing in shoring, piling, anchors, micropiles, screw piles, and underpinning. Headquartered in Calgary with a BC office in New Westminster, it serves residential, commercial, industrial, and infrastructure projects across Western Canada, including work on UBC's Biomedical Engineering Building and BC Hydro's Site C project.",

  // medium confidence
  "saffron-event":
    "The Saffron Events is a Vancouver, BC-based event organizer that produces community and cultural gatherings, including a Nowruz (Persian New Year) and International Women's Day celebration held in Vancouver in March 2025.",

  "salon-centric":
    "SalonCentric Canada, a subsidiary of L'Oréal Canada headquartered in Mississauga, Ontario, is a national distributor of professional beauty products, supplying haircare, skincare, nail, and styling brands such as Redken, Joico, and OPI to licensed stylists, barbers, and salon owners across Canada. It expanded its Canadian footprint by acquiring Alternative Beauty Services in 2023 and Icon Salon Systems in 2024, and supports the industry with education and business resources.",

  "sam-amiralaei":
    "Sam Amiralaei is a licensed real estate agent (PREC) with RE/MAX Masters Realty in West Vancouver, BC. Through his site sammyhomes.com he serves buyers and sellers across Greater Vancouver, with a focus on houses and condos on the North Shore, including Lower Lonsdale, Central Lonsdale, and Lynn Valley in North Vancouver.",

  "stan-glassworks":
    "Stan Glassworks Ltd. is a North Vancouver, BC company that designs, fabricates, installs, and repairs custom glass and metal work, including railings, staircases, canopies, fences and gates, glass partitions, and shower enclosures. With CWB-certified fabrication, it serves residential, multi-family, and commercial projects across the Lower Mainland, Squamish, and Whistler.",

  "streetball-fc-canada":
    "Streetball FC is a Vancouver, BC not-for-profit soccer organization and indoor turf training facility focused on youth development and creative, street-style play, led by former professional player Duvan Souza with sport-science expert Randy Celebrini. Its Streetball FC Canada teams compete at The Soccer Tournament (TST) 7v7 event in North Carolina, where it has fielded the lone Canadian women's side and reached the semifinals.",

  "study-2020":
    "Study2020 Consulting Group is an immigration and international-education consultancy headquartered in Vancouver, BC, first established in Malaysia in 2005. It assists clients with international student recruitment for Canada, the US, and Europe, as well as Express Entry, start-up visa, investment, and visitor-visa programs, with licensed immigration consultants and certified educational counselors on staff.",

  // medium confidence
  "sturdybee-renovations":
    "Sturdybee Renovations is a renovation and handyman company based in North Vancouver, BC, serving residential and commercial clients across Metro Vancouver. Its work spans home repairs, interior and exterior painting, drywall, carpentry, plumbing fixes, and general renovation projects.",

  "taurus-fitness-club":
    "Taurus Fitness Club is a personal-training fitness studio on Bellevue Avenue in West Vancouver, BC. It offers one-on-one personal training, small-group interval-training classes, youth and teen fitness programs, and nutrition coaching from a private studio serving the North Shore.",

  "tina-heidari":
    "Tina Heidari is a real estate advisor with Engel & Völkers in West Vancouver, BC, specializing in luxury and investment properties. Operating as a Personal Real Estate Corporation under the SoldInVan brand, she serves buyers and sellers in Downtown Vancouver, North Vancouver, West Vancouver, and the surrounding Coquitlam area in both English and Farsi.",

  "tst":
    "TST (The Soccer Tournament) is an annual winner-take-all 7v7 soccer event held at WakeMed Soccer Park in Cary, North Carolina, created by the team behind The Basketball Tournament and first played in 2023. It stages men's and women's competitions with $1 million prizes, drawing professional players, celebrity-backed clubs, and teams from around the world.",

  "valroc":
    "Valroc Development Ltd. is a general contracting and construction company based in the Surrey-Langley area of Metro Vancouver, BC, in operation since 2012. It delivers complete build packages along with concrete, asphalt, excavation, drainage, and hardscape work for residential, strata, light-industrial, and municipal clients across the region.",

  "van-mens-club":
    "Van Mens Club is a men's barbershop on Capilano Road in North Vancouver, BC, founded in 2021 by a master barber with certifications from Turkey and Canada. It blends traditional barbering with a modern salon experience, offering haircuts and grooming services alongside barbering training sessions.",

  "vanclose-real-estate-team":
    "Vanclose is a Vancouver, BC real estate team whose agents include Amin Meysami and Pooyan Tasdighi. The team helps clients buy and sell condos, view homes, and single-family properties across the North Shore and central Vancouver neighbourhoods such as Ambleside, Lynn Valley, Coal Harbour, Yaletown, and Kitsilano, and has been part of the Greater Vancouver Medallion Club from 2019 to 2023.",

  "vela-homes":
    "Vela Homes (Vela Design Build Ltd.) is a design-build custom home builder based in North Vancouver, BC, operating since 2011. The company designs and constructs luxury custom homes across the Lower Mainland as a licensed builder and is a HAVAN Awards winner for housing excellence.",

  "vicinity-mart":
    "Vicinity Mart is a Persian grocery store on Marine Drive in North Vancouver, BC, which opened its first physical location in June 2024 after roughly three years operating online. It combines specialty Persian groceries with an in-house bakery, butchery, and cafe, and ships products across North America.",

  // medium confidence
  "visa-2020":
    "Visa 2020 is the Start-Up Visa arm of Study2020 Consulting Group, a Vancouver-based Canadian immigration advisory firm. It assists entrepreneurs pursuing Canadian permanent residence through the federal Start-Up Visa program, connecting founders with designated organizations, and serves a largely Farsi-speaking clientele through its Persian-language channels.",

  "vitality-fitness":
    "Vitality Fitness is a gym in Burnaby, BC, operating a roughly 28,000-square-foot facility on Edmonds Street in Metro Vancouver. Open seven days a week, it offers memberships, visit-based passes, and personal training, with strength and cardio equipment from brands such as Panatta and Cybex.",

  "watson-gym-equipment":
    "Watson Gym Equipment is a specialist strength-equipment manufacturer based in Frome, Somerset, in the United Kingdom, founded in 1998 by Simon Watson. The company hand-builds heavy-duty training equipment to order in the UK, including dumbbells, plates, racks, benches, and plate-loaded machines, and exports the majority of its output to gyms worldwide.",

  "west-coast-oral-surgery":
    "West Coast Oral and Maxillofacial Surgery is a specialist oral surgery practice serving BC's Lower Mainland from clinics in Vancouver's Yaletown, North Vancouver, and Port Coquitlam, with roots tracing back to the 1960s. Led by certified oral and maxillofacial surgeons Dr. Sadeghi and Dr. Barr, it provides wisdom-tooth removal, dental implant placement, bone grafting, and corrective jaw surgery.",

  "west-vancouver-tennis-club":
    "West Vancouver Tennis Club is a members' tennis club in West Vancouver, BC, established in 1925. Located near the waterfront on 21st Street, the club operates five courts and offers programs and league play for adult and junior players of all levels, hosting events such as its annual Club Championship.",
};

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set — run with node --env-file=.env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query(
  `select slug, (bio is not null and length(trim(bio)) > 0) as has_bio
     from clients`,
);
const hasBio = new Map(rows.map((r) => [r.slug, r.has_bio]));

let updated = 0;
let skipped = 0;
let missing = 0;
for (const [slug, bio] of Object.entries(BIOS)) {
  if (!hasBio.has(slug)) {
    console.warn(`  no such client row: ${slug}`);
    missing += 1;
    continue;
  }
  if (hasBio.get(slug) && !FORCE) {
    skipped += 1;
    continue;
  }
  await pool.query(
    'update clients set bio = $1, updated_at = now() where slug = $2',
    [bio, slug],
  );
  updated += 1;
}

console.log(
  `bios: ${updated} updated, ${skipped} skipped (already written), ` +
    `${missing} missing${FORCE ? ' [force]' : ''}`,
);
await pool.end();
