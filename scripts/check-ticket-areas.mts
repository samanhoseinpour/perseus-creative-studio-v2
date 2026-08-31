/**
 * Ticket-area self-check: who is offered which "Where did you see it?" chip.
 *
 * Run:  node --import tsx scripts/check-ticket-areas.mts
 *       node --env-file=.env.local --import tsx scripts/check-ticket-areas.mts --db
 *
 * The picker on /admin/tickets/new is derived from the nav map rather than
 * listed, so a new admin route becomes pickable with no edit. Every way that
 * derivation can be wrong is silent, and one of them has already happened: at
 * twenty one areas the old horizontal rail showed the first eleven and hid the
 * rest behind a scrollbar nobody could see, and the owner read the picker as
 * an access problem. So this pins what the offer IS, independently of how it
 * is drawn:
 *
 *  - EXHAUSTIVE: every ADMIN_ROUTES entry is claimed by exactly one section.
 *    The trailing "More" sweep is what guarantees it, and it is the whole
 *    reason a route added outside a rail group is still offered. A route in no
 *    section is unpickable, and nothing on screen would say so.
 *  - the flat door and the grouped door return the same areas, in the same
 *    order, because one is defined from the other
 *  - every offered slug is in TICKET_AREA_SLUGS, the server allow-list: a chip
 *    the schema then rejects is a form that refuses a legitimate answer
 *  - the offer for one viewer is EXACTLY the routes canSeeNavItem allows, plus
 *    the 'other' escape hatch, which is always last and always present. Swept
 *    over a viewer matrix, and the refusals are asserted as refusals: a member
 *    holding nothing must not be offered a gated page, or the picker leaks
 *    which surfaces exist.
 *  - no empty section is returned (a bare caption over no chips)
 *
 * With --db it runs the same assertions against the REAL accounts, which is
 * the question an owner actually asks ("does each member see the right
 * routes?"). It READS ONLY: no fixtures, no writes, nothing to sweep.
 *
 * Run it after touching src/lib/ticketFields.ts, ADMIN_NAV_GROUPS, or
 * canSeeNavItem.
 */
import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_TOP,
  ADMIN_ROUTES,
  canSeeNavItem,
  type NavAccess,
} from '@/lib/adminNav';
import { ADMIN_AREAS, sanitizeAreas, type AdminArea } from '@/lib/adminAreas';
import {
  TICKET_AREAS,
  TICKET_AREA_SLUGS,
  ticketAreaGroupsFor,
  ticketAreasFor,
  ticketAreaLabel,
} from '@/lib/ticketFields';

let failed = 0;
function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    console.log(`  ok  ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${label}${detail ? `\n      ${detail}` : ''}`);
  }
}
const eq = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** The slug ticketFields derives for a route, spelled out independently here. */
const slugFor = (href: string) =>
  href === '/admin' ? 'overview' : href.slice('/admin/'.length);

/** What a viewer SHOULD be offered, derived straight from canSeeNavItem. */
function expectedFor(access: NavAccess): string[] {
  return [
    ...ADMIN_ROUTES.filter((r) => canSeeNavItem(r, access)).map((r) =>
      slugFor(r.href),
    ),
    'other',
  ];
}

function assertOffer(who: string, access: NavAccess) {
  const groups = ticketAreaGroupsFor(access);
  const flat = ticketAreasFor(access);
  const slugs = flat.map((a) => a.slug);
  const expected = expectedFor(access);

  check(
    `${who}: offered exactly the routes they can see, plus 'other'`,
    eq(slugs, expected),
    `got      ${slugs.join(', ')}\n      expected ${expected.join(', ')}`,
  );
  check(
    `${who}: grouped and flat agree`,
    eq(groups.flatMap((g) => g.areas), flat),
  );
  check(`${who}: 'other' is last`, slugs[slugs.length - 1] === 'other');
  check(
    `${who}: 'other' appears once`,
    slugs.filter((s) => s === 'other').length === 1,
  );
  check(`${who}: no duplicate chip`, new Set(slugs).size === slugs.length);
  check(
    `${who}: no empty section`,
    groups.every((g) => g.areas.length > 0),
  );
  check(
    `${who}: every chip is in the server allow-list`,
    slugs.every((s) => TICKET_AREA_SLUGS.includes(s)),
    slugs.filter((s) => !TICKET_AREA_SLUGS.includes(s)).join(', '),
  );
  // The refusals, asserted as refusals — an offer that is a superset of the
  // rail would leak which surfaces exist to someone who cannot open them.
  const denied = ADMIN_ROUTES.filter((r) => !canSeeNavItem(r, access));
  check(
    `${who}: offers none of the ${denied.length} routes they cannot open`,
    denied.every((r) => !slugs.includes(slugFor(r.href))),
    denied
      .filter((r) => slugs.includes(slugFor(r.href)))
      .map((r) => r.href)
      .join(', '),
  );
  return slugs;
}

console.log('\nSections');
{
  const sectioned = [
    ...ADMIN_NAV_TOP,
    ...ADMIN_NAV_GROUPS.flatMap((g) => g.items),
  ].map((r) => r.href);
  check(
    'no route is claimed by two rail sections',
    new Set(sectioned).size === sectioned.length,
  );
  // The widest possible viewer sees everything, so its grouping is the whole
  // sectioning. This is the assertion the "More" sweep exists to satisfy.
  const widest: NavAccess = {
    superadmin: true,
    areas: [...ADMIN_AREAS],
    payrollSelf: true,
  };
  const groups = ticketAreaGroupsFor(widest);
  const placed = groups.flatMap((g) => g.areas.map((a) => a.slug));
  const everyRoute = ADMIN_ROUTES.map((r) => slugFor(r.href));
  check(
    `every one of the ${everyRoute.length} routes lands in exactly one section`,
    everyRoute.every((s) => placed.filter((p) => p === s).length === 1),
    everyRoute.filter((s) => placed.filter((p) => p === s).length !== 1).join(', '),
  );
  check(
    'the sections cover the routes and add only \'other\'',
    eq(placed, [...everyRoute, 'other']),
  );
  check(
    'TICKET_AREAS is every route plus \'other\'',
    TICKET_AREAS.length === ADMIN_ROUTES.length + 1,
    `${TICKET_AREAS.length} vs ${ADMIN_ROUTES.length} + 1`,
  );
  check("'/admin' maps to 'overview', not an empty slug", slugFor('/admin') === 'overview');
  check(
    'a retired slug still renders as itself',
    ticketAreaLabel('some-retired-route') === 'some-retired-route',
  );
  console.log(
    `      ${groups.length} sections: ${groups
      .map((g) => `${g.label ?? '(none)'}=${g.areas.length}`)
      .join(', ')}`,
  );
}

console.log('\nViewer matrix');
const MATRIX: [string, NavAccess][] = [
  // The owner: every area materialized by getAccessProfile, so nothing is
  // hidden. This is the case that was misread as an access problem.
  ['owner', { superadmin: true, areas: [...ADMIN_AREAS], payrollSelf: true }],
  [
    'superadmin, every grant, no own pay',
    { superadmin: true, areas: [...ADMIN_AREAS], payrollSelf: false },
  ],
  [
    'superadmin, no grants',
    { superadmin: true, areas: [], payrollSelf: false },
  ],
  [
    'member, tasks + tickets, own pay',
    { superadmin: false, areas: ['tasks', 'tickets'], payrollSelf: true },
  ],
  [
    'member, one money grant only',
    { superadmin: false, areas: ['payroll'], payrollSelf: false },
  ],
  [
    'member, both money grants',
    { superadmin: false, areas: ['payroll', 'costs'], payrollSelf: false },
  ],
  ['member, nothing at all', { superadmin: false, areas: [], payrollSelf: false }],
];
for (const [who, access] of MATRIX) assertOffer(who, access);

// The two gates a single `area` field cannot express, checked at the seam that
// would silently get them backwards.
{
  const oneGrant: NavAccess = {
    superadmin: false,
    areas: ['payroll'],
    payrollSelf: false,
  };
  const bothGrants: NavAccess = {
    superadmin: false,
    areas: ['payroll', 'costs'],
    payrollSelf: false,
  };
  const one = ticketAreasFor(oneGrant).map((a) => a.slug);
  const both = ticketAreasFor(bothGrants).map((a) => a.slug);
  check(
    "Spend (areasAll) is withheld from one grant and offered to both",
    !one.includes('spend') && both.includes('spend'),
  );
  check(
    'Commitments (areasAny) is offered to one grant',
    one.includes('spend/commitments'),
  );
  check(
    'My pay (payrollSelf) follows the payroll record, not the grant',
    !one.includes('my-pay') &&
      ticketAreasFor({ superadmin: false, areas: [], payrollSelf: true })
        .map((a) => a.slug)
        .includes('my-pay'),
  );
}

if (process.argv.includes('--db')) {
  console.log('\nReal accounts');
  const { Pool } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const { sql } = await import('drizzle-orm');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  try {
    const rows = (
      await db.execute<{
        name: string | null;
        email: string;
        role: string | null;
        areas: unknown;
        payroll_self: boolean | null;
      }>(sql`
        select u.name, u.email, u.role, u.areas,
               (pm.id is not null and pm.self_view_enabled) as payroll_self
          from "user" u
          left join payroll_members pm on pm.user_id = u.id
         order by case u.role when 'owner' then 0 when 'superadmin' then 1 else 2 end,
                  u.name
      `)
    ).rows;
    check('there is exactly one owner', rows.filter((r) => r.role === 'owner').length === 1);
    for (const row of rows) {
      const owner = row.role === 'owner';
      const stored = sanitizeAreas(row.areas);
      const access: NavAccess = {
        superadmin: owner || row.role === 'superadmin',
        // getAccessProfile's own rule: the owner holds every area implicitly.
        areas: owner ? ([...ADMIN_AREAS] as AdminArea[]) : stored,
        payrollSelf: Boolean(row.payroll_self),
      };
      const slugs = assertOffer(`${row.name ?? row.email} (${row.role})`, access);
      console.log(
        `      grants: ${stored.join(', ') || '(none)'}${owner ? ' + owner holds all' : ''}\n` +
          `      offered ${slugs.length}: ${slugs.join(', ')}`,
      );
    }
  } finally {
    await pool.end();
  }
}

console.log(failed === 0 ? '\nAll checks passed.\n' : `\n${failed} check(s) FAILED.\n`);
process.exit(failed === 0 ? 0 : 1);
