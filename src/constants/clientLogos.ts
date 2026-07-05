// Client-logo records for the Partners marquee. Split out of constants/index.ts
// so the constants module (in the client graph via utils/images -> Img) doesn't
// carry ~560 lines of logo data into every route's JS. Partners — already lazy
// behind DeferredPartners — is the only consumer; import from here, not '@/constants'.
// typing the arrays keeps the literal narrow instead of widening to `string`.
export type ClientLogo = {
  id: number;
  srcImg: string;
  altImg: string;
  href?: string;
  disc?: 'light' | 'dark';
};

export const selectedClientImg: ClientLogo[] = [
  {
    id: 1,
    srcImg: '/images/shared/client-logos/shared-client-logos-study2020.avif',
    altImg: 'Study 2020 Logo',
    href: 'https://www.instagram.com/study2020.international/',
  },
  {
    id: 2,
    srcImg: '/images/shared/client-logos/shared-client-logos-visa2020.avif',
    altImg: 'Visa 2020 Logo',
    href: 'https://www.instagram.com/visa2020.official/',
  },
  {
    id: 3,
    srcImg: '/images/shared/client-logos/shared-client-logos-cartocci.avif',
    altImg: 'Cartocci Real Estate Group Logo',
    href: 'https://www.instagram.com/cartoccirealestategroup/',
  },
  {
    id: 4,
    srcImg: '/images/shared/client-logos/shared-client-logos-vicinity.avif',
    altImg: 'Vicinity Mart Logo',
    href: 'https://www.instagram.com/vicinity.mart/',
  },
  {
    id: 5,
    srcImg: '/images/shared/client-logos/shared-client-logos-obsidian.avif',
    altImg: 'Obsidian Athletic Club Logo',
    href: 'https://www.instagram.com/obsidian_athletic_club/',
  },
  {
    id: 6,
    srcImg: '/images/shared/client-logos/shared-client-logos-vitality.avif',
    altImg: 'Vitality Fitness Logo',
    href: 'https://www.instagram.com/vitalityfitness.bc/',
  },
  {
    id: 7,
    srcImg: '/images/shared/client-logos/shared-client-logos-dibawindows.avif',
    altImg: 'Diba Windows Logo',
    href: 'https://www.instagram.com/dibawindows/',
    disc: 'dark',
  },
  {
    id: 8,
    srcImg: '/images/shared/client-logos/shared-client-logos-vanclose.avif',
    altImg: 'Vanclose Real Estate Team Logo',
    href: 'https://www.instagram.com/vanclose.ca/',
  },
  {
    id: 9,
    srcImg: '/images/shared/client-logos/shared-client-logos-amin-meysami.avif',
    altImg: 'Amin Meysami Logo',
    href: 'https://www.instagram.com/aminmeysami/',
  },
  {
    id: 10,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-salon-centric-canada.avif',
    altImg: 'Salon Centric Logo',
    href: 'https://www.instagram.com/saloncentriccanada/',
  },
  {
    id: 11,
    srcImg: '/images/shared/client-logos/shared-client-logos-NBAR.avif',
    altImg: 'NBAR Canada Logo',
    href: 'https://www.instagram.com/nbar.canada/',
  },
  {
    id: 12,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-phantompestsolutions.avif',
    altImg: 'Phantom Pest Solutions Logo',
    href: 'https://www.instagram.com/phantompestsolutions/',
  },
  {
    id: 13,
    srcImg: '/images/shared/client-logos/shared-client-logos-andonis.avif',
    altImg: 'Andonis Vancouver Logo',
    href: 'https://www.instagram.com/andonisvancouver/',
  },
];

export const selectedClientImg2: ClientLogo[] = [
  {
    id: 1,
    srcImg: '/images/shared/client-logos/shared-client-logos-kandovan.avif',
    altImg: 'Kandovan Construction Logo',
    href: 'https://www.instagram.com/kandovanconstruction/',
  },
  {
    id: 2,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-stanglassworksbackground.avif',
    altImg: 'Stan Glassworks Ltd. Logo',
    href: 'https://stanglassworks.com',
  },
  {
    id: 3,
    srcImg: '/images/shared/client-logos/shared-client-logos-Velahomes.avif',
    altImg: 'Vela Homes Logo',
    href: 'https://www.instagram.com/veladesignbuild/',
  },
  {
    id: 4,
    srcImg: '/images/shared/client-logos/shared-client-logos-rsfoundation.avif',
    altImg: 'RS Foundation Systems Logo',
    href: 'https://www.instagram.com/r.s.foundationsystemsltd/',
  },
  {
    id: 5,
    srcImg: '/images/shared/client-logos/shared-client-logos-faithwilson.avif',
    altImg: 'Faith Wilson Realty Logo',
    href: 'https://faithwilson.com',
  },
  {
    id: 6,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-match-tour-11.avif',
    altImg: 'Matchtour Logo',
    href: 'https://www.instagram.com/matchtour11/',
    disc: 'light',
  },
  {
    id: 7,
    srcImg: '/images/shared/client-logos/shared-client-logos-gilmore.avif',
    altImg: 'Happy Gilmore Golf Lounge Logo',
    href: 'https://www.instagram.com/happygilmoregolflounge/',
  },
  {
    id: 8,
    srcImg: '/images/shared/client-logos/shared-client-logos-asanti.avif',
    altImg: 'Asanti Developments Logo',
    href: 'https://www.instagram.com/asanti.homes/',
  },
  {
    id: 9,
    srcImg: '/images/shared/client-logos/shared-client-logos-divanevents.avif',
    altImg: 'Divan Events Canada Logo',
    href: 'https://www.instagram.com/divanevents_canada/',
  },
  {
    id: 10,
    srcImg: '/images/shared/client-logos/shared-client-logos-gym-curators.avif',
    altImg: 'Gym Curators Logo',
    href: 'https://www.instagram.com/gymcurators/',
    disc: 'light',
  },
  {
    id: 11,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-eivan-northvan.avif',
    altImg: 'Eivan Logo',
    href: 'https://www.instagram.com/eivan.northvan/',
  },
  {
    id: 12,
    srcImg: '/images/shared/client-logos/shared-client-logos-valroc.avif',
    altImg: 'Valroc Logo',
    href: 'https://www.instagram.com/valrocdevelopmentltd/',
  },
  {
    id: 13,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-rocky-junkremoval.avif',
    altImg: 'Rocky Junk Logo',
    href: 'https://www.instagram.com/rocky_junkremoval/',
  },
];

export const clientImg: ClientLogo[] = [
  {
    id: 1,
    srcImg: '/images/shared/client-logos/shared-client-logos-fitbodega.avif',
    altImg: 'Fitbodega Vancouver FC Logo',
    href: 'https://www.instagram.com/fitbodegavancouverfc/',
    disc: 'dark',
  },
  {
    id: 2,
    srcImg: '/images/shared/client-logos/shared-client-logos-visa2020.avif',
    altImg: 'Visa 2020 Logo',
    href: 'https://www.instagram.com/visa2020.official/',
  },
  {
    id: 3,
    srcImg: '/images/shared/client-logos/shared-client-logos-cartocci.avif',
    altImg: 'Cartocci Real Estate Group Logo',
    href: 'https://www.instagram.com/cartoccirealestategroup/',
  },
  {
    id: 4,
    srcImg: '/images/shared/client-logos/shared-client-logos-nani-fc.avif',
    altImg: 'Nani FC Logo',
    href: 'https://www.instagram.com/nanifc_tst/',
  },
  {
    id: 5,
    srcImg: '/images/shared/client-logos/shared-client-logos-samAmiralaei.avif',
    altImg: 'Sam Amiralaei Logo',
    href: 'https://www.sammyhomes.com',
  },
  {
    id: 6,
    srcImg: '/images/shared/client-logos/shared-client-logos-taurus.avif',
    altImg: 'Taurus Fitness Club Logo',
    href: 'https://www.instagram.com/taurusfitness.club/',
  },
  {
    id: 7,
    srcImg: '/images/shared/client-logos/shared-client-logos-artbuild.avif',
    altImg: 'Art Build Construction Logo',
    href: 'https://www.instagram.com/artbuild_construction/',
  },
  {
    id: 8,
    srcImg: '/images/shared/client-logos/shared-client-logos-kasraz.avif',
    altImg: 'Kasraz Persian Rugs Logo',
    href: 'https://www.instagram.com/kasrazrugs/',
  },
  {
    id: 9,
    srcImg: '/images/shared/client-logos/shared-client-logos-BCC.avif',
    altImg: 'Bargain Construction Corporation Logo',
    href: 'https://www.instagram.com/bccorp.ca/',
  },
  {
    id: 10,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-privatecoachingco.avif',
    altImg: 'Private Coaching Co Logo',
    href: 'https://www.instagram.com/privatecoachingco/',
  },
  {
    id: 11,
    srcImg: '/images/shared/client-logos/shared-client-logos-a2procon.avif',
    altImg: 'A2 ProCon Developments Logo',
    href: 'https://www.a2procon.com',
  },
  {
    id: 12,
    srcImg: '/images/shared/client-logos/shared-client-logos-vicinity.avif',
    altImg: 'Vicinity Mart Logo',
    href: 'https://www.instagram.com/vicinity.mart/',
  },
  {
    id: 13,
    srcImg: '/images/shared/client-logos/shared-client-logos-obsidian.avif',
    altImg: 'Obsidian Athletic Club Logo',
    href: 'https://www.instagram.com/obsidian_athletic_club/',
  },
  {
    id: 14,
    srcImg: '/images/shared/client-logos/shared-client-logos-dibawindows.avif',
    altImg: 'Diba Windows Logo',
    href: 'https://www.instagram.com/dibawindows/',
  },
  {
    id: 15,
    srcImg: '/images/shared/client-logos/shared-client-logos-vanclose.avif',
    altImg: 'Vanclose Real Estate Team Logo',
    href: 'https://www.instagram.com/vanclose.ca/',
  },
  {
    id: 16,
    srcImg: '/images/shared/client-logos/shared-client-logos-dallasDakota.avif',
    altImg: 'Dallas Dakota Realty Logo',
    href: 'https://www.instagram.com/dallasdakotarealty/',
  },
  {
    id: 17,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-diamondFencing.avif',
    altImg: 'Diamond Pro - Fencing & Decking LTD Logo',
    href: 'https://www.instagram.com/diamondprofd/',
  },
  {
    id: 18,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-salon-centric-canada.avif',
    altImg: 'Salon Centric Logo',
    href: 'https://www.instagram.com/saloncentriccanada/',
  },
  {
    id: 19,
    srcImg: '/images/shared/client-logos/shared-client-logos-NBAR.avif',
    altImg: 'NBAR Canada Logo',
    href: 'https://www.instagram.com/nbar.canada/',
  },
  {
    id: 20,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-phantompestsolutions.avif',
    altImg: 'Phantom Pest Solutions Logo',
    href: 'https://www.instagram.com/phantompestsolutions/',
  },
  {
    id: 21,
    srcImg: '/images/shared/client-logos/shared-client-logos-andonis.avif',
    altImg: 'Andonis Vancouver Logo',
    href: 'https://www.instagram.com/andonisvancouver/',
  },
  {
    id: 22,
    srcImg: '/images/shared/client-logos/shared-client-logos-parkwaysport.avif',
    altImg: 'Parkway Motorsport Vancouver Logo',
    href: 'https://www.instagram.com/parkway_motorsport/',
  },
  {
    id: 23,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-neginjavaheri.avif',
    altImg: 'Negin Javaheri Art Logo',
    href: 'https://www.instagram.com/negg.artt/',
  },
  {
    id: 24,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-lemoncurrencyexchange.avif',
    altImg: 'Lemon Currency Exchange Logo',
    href: 'https://lemonexchange.ca',
  },
  {
    id: 25,
    srcImg: '/images/shared/client-logos/shared-client-logos-ironnation.avif',
    altImg: 'Iron Nation Surrey Logo',
    href: 'https://www.instagram.com/iron.nation.surrey/',
    disc: 'dark',
  },
  {
    id: 26,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-heliaEsmaeili.avif',
    altImg: 'Helia Esmaeili Logo',
    href: 'https://www.instagram.com/_heliaesmaeili_/',
  },
  {
    id: 27,
    srcImg: '/images/shared/client-logos/shared-client-logos-nssm.avif',
    altImg: 'North Shore Sports Medicine Logo',
    href: 'https://nssm.ca',
  },
  {
    id: 28,
    srcImg: '/images/shared/client-logos/shared-client-logos-mananoori.avif',
    altImg: 'Mana Noori Real Estate Logo',
    href: 'https://www.instagram.com/mana.noori.homes/',
  },
  {
    id: 29,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-aegisdentalcentre.avif',
    altImg: 'Aegis Dental Centre Logo',
    href: 'https://aegisdentalcentre.com',
  },
  {
    id: 30,
    srcImg: '/images/shared/client-logos/shared-client-logos-hatam.avif',
    altImg: 'Hatam Restaurant West Vancouver Logo',
    href: 'https://www.instagram.com/hatamrestaurant.westvancouver/',
  },
  {
    id: 31,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-araniconstruction.avif',
    altImg: 'Arani Construction Logo',
    href: 'https://www.instagram.com/arani.construction/',
  },
  {
    id: 32,
    srcImg: '/images/shared/client-logos/shared-client-logos-canadascores.avif',
    altImg: 'Canada SCORES Vancouver Logo',
    href: 'https://www.canadascores.org/vancouver',
  },
  {
    id: 33,
    srcImg: '/images/shared/client-logos/shared-client-logos-kandovan.avif',
    altImg: 'Kandovan Construction Logo',
    href: 'https://www.instagram.com/kandovanconstruction/',
  },
  {
    id: 34,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-stanglassworksbackground.avif',
    altImg: 'Stan Glassworks Ltd. Logo',
    href: 'https://stanglassworks.com',
  },
  {
    id: 35,
    srcImg: '/images/shared/client-logos/shared-client-logos-amin-meysami.avif',
    altImg: 'Amin Meysami Logo',
    href: 'https://www.instagram.com/aminmeysami/',
  },
  {
    id: 36,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-match-tour-11.avif',
    altImg: 'Matchtour Logo',
    href: 'https://www.instagram.com/matchtour11/',
    disc: 'light',
  },
  {
    id: 37,
    srcImg: '/images/shared/client-logos/shared-client-logos-gym-curators.avif',
    altImg: 'Gym Curators Logo',
    href: 'https://www.instagram.com/gymcurators/',
    disc: 'light',
  },
  {
    id: 38,
    srcImg: '/images/shared/client-logos/shared-client-logos-amin-meysami.avif',
    altImg: 'Amin Meysami Logo',
    href: 'https://www.instagram.com/aminmeysami/',
  },
  {
    id: 39,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-west-coast-oral-surgey.avif',
    altImg: 'West Coast Oral Surgery Logo',
    href: 'https://westcoastoralsurgery.ca',
    disc: 'light',
  },
  {
    id: 40,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-rocky-junkremoval.avif',
    altImg: 'Rocky Junk Logo',
    href: 'https://www.instagram.com/rocky_junkremoval/',
  },
  {
    id: 41,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-ignition-marine.avif',
    altImg: 'Ignition Marine Logo',
    href: 'https://ignitionmarine.com',
    disc: 'light',
  },
  {
    id: 42,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-erin-price-emery.avif',
    altImg: 'Erin Price Emery Logo',
    href: 'https://www.erinpriceemery.ca',
    disc: 'light',
  },
  {
    id: 43,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-mehrnaz-kavoosi.avif',
    altImg: 'Mehrnaz Kavoosi Logo',
    href: 'https://www.mehrnazkavoosi.com',
  },
  {
    id: 44,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-athlete-prep.avif',
    altImg: 'Athlete Prep Logo',
    href: 'https://www.athleteprep.ca',
    disc: 'light',
  },
];

export const clientImg2: ClientLogo[] = [
  {
    id: 1,
    srcImg: '/images/shared/client-logos/shared-client-logos-tst7v7.avif',
    altImg: 'TST Logo',
    href: 'https://www.instagram.com/tst7v7/',
  },
  {
    id: 2,
    srcImg: '/images/shared/client-logos/shared-client-logos-study2020.avif',
    altImg: 'Study 2020 Logo',
    href: 'https://www.instagram.com/study2020.international/',
  },
  {
    id: 3,
    srcImg: '/images/shared/client-logos/shared-client-logos-cfr.avif',
    altImg: 'Canadian Flooring & Renovations Logo',
    href: 'https://flooringandrenovations.com',
  },
  {
    id: 4,
    srcImg: '/images/shared/client-logos/shared-client-logos-streetball.avif',
    altImg: 'Streetball FC Canada Logo',
    href: 'https://www.instagram.com/streetball.fc/',
  },
  {
    id: 5,
    srcImg: '/images/shared/client-logos/shared-client-logos-gsc.avif',
    altImg: 'Gal Senior Care Foundation Logo',
    href: 'https://gsc-foundation.org',
  },
  {
    id: 6,
    srcImg: '/images/shared/client-logos/shared-client-logos-cindyscafe.avif',
    altImg: 'Cindys Cafe Logo',
    href: 'https://www.instagram.com/restaurantcindys/',
  },
  {
    id: 7,
    srcImg: '/images/shared/client-logos/shared-client-logos-vmc.avif',
    altImg: 'Van Mens Club Logo',
    href: 'https://www.instagram.com/vanmens.club/',
  },
  {
    id: 8,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-westvancouvertennisclub.avif',
    altImg: 'West Vancouver Tennis Club Logo',
    href: 'https://www.instagram.com/westvantennisclub/',
  },
  {
    id: 9,
    srcImg: '/images/shared/client-logos/shared-client-logos-sturdybee.avif',
    altImg: 'Sturdybee Renovations Logo',
    href: 'https://www.instagram.com/sturdybeerenovations/',
  },
  {
    id: 10,
    srcImg: '/images/shared/client-logos/shared-client-logos-Velahomes.avif',
    altImg: 'Vela Homes Logo',
    href: 'https://www.instagram.com/veladesignbuild/',
  },
  {
    id: 11,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-arshia-esmaeili.avif',
    altImg: 'Arshia Esmaeili Real Estate Services Logo',
    href: 'https://www.instagram.com/arshiaesmaeili.realestate/',
    disc: 'light',
  },
  {
    id: 12,
    srcImg: '/images/shared/client-logos/shared-client-logos-elitelife.avif',
    altImg: 'Elitelife Skin Centre',
    href: 'https://www.instagram.com/elitelife_skin_centre/',
  },
  {
    id: 13,
    srcImg: '/images/shared/client-logos/shared-client-logos-rsfoundation.avif',
    altImg: 'RS Foundation Systems Logo',
    href: 'https://www.instagram.com/r.s.foundationsystemsltd/',
  },
  {
    id: 14,
    srcImg: '/images/shared/client-logos/shared-client-logos-faithwilson.avif',
    altImg: 'Faith Wilson Realty Logo',
    href: 'https://faithwilson.com',
  },
  {
    id: 15,
    srcImg: '/images/shared/client-logos/shared-client-logos-lubetech.avif',
    altImg: 'LubeTech | GSD Logo',
    href: 'https://www.lubetechtruckcrane.com',
  },
  {
    id: 16,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-dunnsmenswear.avif',
    altImg: 'Dunns Menswear Logo',
    href: 'https://www.instagram.com/dunnsmenswear/',
  },
  {
    id: 17,
    srcImg: '/images/shared/client-logos/shared-client-logos-luxurylane.avif',
    altImg: 'Luxury Lane Logo',
    href: 'https://www.instagram.com/luxurylane.ca/',
  },
  {
    id: 18,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-belcantoDental.avif',
    altImg: 'Belcanto Dental Logo',
    href: 'https://www.instagram.com/belcantodental/',
  },
  {
    id: 19,
    srcImg: '/images/shared/client-logos/shared-client-logos-saffron.avif',
    altImg: 'Saffron Event Logo',
    href: 'https://www.instagram.com/thesaffronevents/',
  },
  {
    id: 20,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-rocky.demolition.avif',
    altImg: 'Rocky Demolishing Logo',
    href: 'https://www.instagram.com/rocky.demolition/',
  },
  {
    id: 21,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-doucettehomes.avif',
    altImg: 'Doucette Logo',
    href: 'https://www.doucettehomes.ca',
  },
  {
    id: 22,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-erconstruction.avif',
    altImg: 'Erc Construction Logo',
    href: 'https://www.instagram.com/ercconstruction.ca/',
  },
  {
    id: 23,
    srcImg: '/images/shared/client-logos/shared-client-logos-vitality.avif',
    altImg: 'Vitality Fitness Logo',
    href: 'https://www.instagram.com/vitalityfitness.bc/',
  },
  {
    id: 24,
    srcImg: '/images/shared/client-logos/shared-client-logos-gsdcraneltd.avif',
    altImg: 'GSD Crane Logo',
    href: 'https://www.instagram.com/gsdcranes/',
  },
  {
    id: 25,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-flowspaceconstruction.avif',
    altImg: 'Flow Space Construction Logo',
    href: 'https://www.flowspace.ca',
  },
  {
    id: 26,
    srcImg: '/images/shared/client-logos/shared-client-logos-gilmore.avif',
    altImg: 'Happy Gilmore Golf Lounge Logo',
    href: 'https://www.instagram.com/happygilmoregolflounge/',
  },
  {
    id: 27,
    srcImg: '/images/shared/client-logos/shared-client-logos-esperlus.avif',
    altImg: 'Esperlus Event Space Logo',
    href: 'https://www.instagram.com/esperlus.ca/',
  },
  {
    id: 28,
    srcImg: '/images/shared/client-logos/shared-client-logos-asanti.avif',
    altImg: 'Asanti Developments Logo',
    href: 'https://www.instagram.com/asanti.homes/',
  },
  {
    id: 29,
    srcImg: '/images/shared/client-logos/shared-client-logos-acebrand.avif',
    altImg: 'Ace Brand Ltd. Logo',
    href: 'https://www.instagram.com/ace_brand_construction/',
  },
  {
    id: 30,
    srcImg: '/images/shared/client-logos/shared-client-logos-kireilashco.avif',
    altImg: 'Kirei Lash Co - WEST VAN LASHES Logo',
    href: 'https://www.instagram.com/kireilashco/',
  },
  {
    id: 31,
    srcImg: '/images/shared/client-logos/shared-client-logos-divanevents.avif',
    altImg: 'Divan Events Canada Logo',
    href: 'https://www.instagram.com/divanevents_canada/',
  },
  {
    id: 32,
    srcImg: '/images/shared/client-logos/shared-client-logos-deebaevents.avif',
    altImg: 'Deeba Events Logo',
    href: 'https://www.instagram.com/deebaevents/',
  },
  {
    id: 33,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-watsongymequipment.avif',
    altImg: 'Watson Gym Equipment Logo',
    href: 'https://www.instagram.com/watsongymequipment/',
  },
  {
    id: 34,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-cityscape-electrical.avif',
    altImg: 'City Scape Electrical Canada Logo',
    href: 'https://www.instagram.com/cityscape_electrical/',
  },
  {
    id: 35,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-evchageincbackground.avif',
    altImg: 'Ev Charge Inc Logo',
    href: 'https://evchargeinc.com/',
  },
  {
    id: 36,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-eivan-northvan.avif',
    altImg: 'Eivan Logo',
    href: 'https://www.instagram.com/eivan.northvan/',
  },
  {
    id: 37,
    srcImg: '/images/shared/client-logos/shared-client-logos-valroc.avif',
    altImg: 'Valroc Logo',
    href: 'https://www.instagram.com/valrocdevelopmentltd/',
  },
  {
    id: 38,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-bromley-estates.avif',
    altImg: 'Bromley Estates Marbella Logo',
    href: 'https://bromleyestatesmarbella.com',
  },
  {
    id: 39,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-901-bar-grill.avif',
    altImg: '901 Bar & Grill Logo',
    href: 'https://www.901bar.com',
  },
  {
    id: 40,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-tina-heidari.avif',
    altImg: 'Tina Heidari Logo',
    href: 'https://www.soldinvan.com',
  },
  {
    id: 41,
    srcImg:
      '/images/shared/client-logos/shared-client-logos-mfs-construction.avif',
    altImg: 'MFS Construction Logo',
    href: 'https://www.mfsconstruction.ca',
  },
];
