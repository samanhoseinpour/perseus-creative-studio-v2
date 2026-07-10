/**
 * Selectable countries for the contact form's phone field — Canada, the US,
 * and the same 45 European countries whose dial codes the phone validator
 * allow-lists (geographic Europe incl. UK/EEA/CH/Balkans/UA; no RU/TR/
 * Caucasus). The picker shows flag + dial code and the input takes only the
 * national number, so visitors never type their own country code.
 *
 * Zero-import leaf: consumed by the client form (contact async chunk), the
 * shared validation in contactSchema.ts, and the /admin inbox — none of which
 * should drag anything extra along with this data.
 */

export interface PhoneCountry {
  /** ISO 3166-1 alpha-2 — the stored `country` value. */
  iso: string;
  name: string;
  /** Calling code without the '+'. */
  dial: string;
  /** Flag emoji derived from the ISO code (regional indicator pair). */
  flag: string;
}

/** 🇦 is U+1F1E6; a flag is the two regional indicators for the ISO pair. */
const flagEmoji = (iso: string): string =>
  String.fromCodePoint(
    ...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );

const country = (iso: string, name: string, dial: string): PhoneCountry => ({
  iso,
  name,
  dial,
  flag: flagEmoji(iso),
});

/** North America first (primary market), then Europe A→Z by display name. */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  country('CA', 'Canada', '1'),
  country('US', 'United States', '1'),
  country('AL', 'Albania', '355'),
  country('AD', 'Andorra', '376'),
  country('AT', 'Austria', '43'),
  country('BY', 'Belarus', '375'),
  country('BE', 'Belgium', '32'),
  country('BA', 'Bosnia and Herzegovina', '387'),
  country('BG', 'Bulgaria', '359'),
  country('HR', 'Croatia', '385'),
  country('CY', 'Cyprus', '357'),
  country('CZ', 'Czechia', '420'),
  country('DK', 'Denmark', '45'),
  country('EE', 'Estonia', '372'),
  country('FI', 'Finland', '358'),
  country('FR', 'France', '33'),
  country('DE', 'Germany', '49'),
  country('GI', 'Gibraltar', '350'),
  country('GR', 'Greece', '30'),
  country('HU', 'Hungary', '36'),
  country('IS', 'Iceland', '354'),
  country('IE', 'Ireland', '353'),
  country('IT', 'Italy', '39'),
  country('XK', 'Kosovo', '383'),
  country('LV', 'Latvia', '371'),
  country('LI', 'Liechtenstein', '423'),
  country('LT', 'Lithuania', '370'),
  country('LU', 'Luxembourg', '352'),
  country('MT', 'Malta', '356'),
  country('MD', 'Moldova', '373'),
  country('MC', 'Monaco', '377'),
  country('ME', 'Montenegro', '382'),
  country('NL', 'Netherlands', '31'),
  country('MK', 'North Macedonia', '389'),
  country('NO', 'Norway', '47'),
  country('PL', 'Poland', '48'),
  country('PT', 'Portugal', '351'),
  country('RO', 'Romania', '40'),
  country('SM', 'San Marino', '378'),
  country('RS', 'Serbia', '381'),
  country('SK', 'Slovakia', '421'),
  country('SI', 'Slovenia', '386'),
  country('ES', 'Spain', '34'),
  country('SE', 'Sweden', '46'),
  country('CH', 'Switzerland', '41'),
  country('UA', 'Ukraine', '380'),
  country('GB', 'United Kingdom', '44'),
];

export const PHONE_COUNTRY_BY_ISO: ReadonlyMap<string, PhoneCountry> = new Map(
  PHONE_COUNTRIES.map((c) => [c.iso, c]),
);

/** 'DE' → 'Germany (+49)'; unknown/legacy values ('EU') render raw. */
export const countryDisplay = (iso: string): string => {
  const c = PHONE_COUNTRY_BY_ISO.get(iso);
  return c ? `${c.name} (+${c.dial})` : iso;
};
