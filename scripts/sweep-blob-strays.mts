/**
 * Stray sweep for the PUBLIC Blob store (perseus-public-assets).
 *
 * Run:  node --env-file=.env.local --import tsx scripts/sweep-blob-strays.mts
 *       node --env-file=.env.local --import tsx scripts/sweep-blob-strays.mts --delete
 *
 * A "stray" is any blob under projects/ or clients/ that NO database row
 * references: project_media.variants (full / w960 / w640 / w384 pathnames)
 * and clients.logo_blob_path are the only two places the app records a
 * public pathname, so anything else in the store is unreachable by every
 * reader and is never going to be cleaned up by the app itself. The known
 * source is the `w1280` rung that project uploads encoded, counted against
 * the 4 MB cap, uploaded, and then dropped on the floor (the schema never had
 * a slot for it — fixed 2026-08-22, `PROJECT_IMAGE_RUNGS` in
 * src/lib/portfolioFields.ts); a media insert that failed after its puts is
 * the other way a blob ends up here.
 *
 * DRY RUN BY DEFAULT. Nothing is deleted without --delete, and even then:
 *  - only projects/ and clients/ pathnames are ever considered (the token is
 *    scoped to the public store anyway, so private bytes are unreachable);
 *  - blobs uploaded in the last GRACE_MS are skipped, so an upload that is
 *    mid-flight in someone's /admin tab — puts done, row not yet inserted —
 *    cannot be swept out from under it. Run this when nobody is uploading.
 *
 * Uses @vercel/blob directly with PUBLIC_BLOB_READ_WRITE_TOKEN rather than
 * src/lib/publicBlob.ts, which is `server-only` and throws under plain node
 * (the verify-payroll-db.mts precedent). The prefix rule above is re-stated
 * here for the same reason.
 */
import { del, list } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { isNotNull } from 'drizzle-orm';

import { clients, projectMedia } from '@/db/schema';

const DELETE = process.argv.includes('--delete');
const PREFIXES = ['projects/', 'clients/'] as const;
const GRACE_MS = 60 * 60 * 1000;

const token = process.env.PUBLIC_BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('PUBLIC_BLOB_READ_WRITE_TOKEN is not set (add it to .env.local).');
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (add it to .env.local).');
  process.exit(2);
}

const db = drizzle(neon(process.env.DATABASE_URL));

// ── 1. Every pathname the database still points at ──────────────────────────
const referenced = new Set<string>();

const media = await db
  .select({ variants: projectMedia.variants })
  .from(projectMedia)
  .where(isNotNull(projectMedia.variants));
for (const row of media) {
  const v = row.variants;
  if (!v) continue;
  referenced.add(v.full.pathname);
  for (const rung of [v.w960, v.w640, v.w384]) {
    if (rung?.pathname) referenced.add(rung.pathname);
  }
}

const logos = await db
  .select({ path: clients.logoBlobPath })
  .from(clients)
  .where(isNotNull(clients.logoBlobPath));
for (const row of logos) if (row.path) referenced.add(row.path);

console.log(
  `database references ${referenced.size} public blobs (${media.length} media rows, ${logos.length} client logos)`,
);

// ── 2. Everything the store actually holds ──────────────────────────────────
type Blob = { pathname: string; url: string; size: number; uploadedAt: Date };
const stored: Blob[] = [];
for (const prefix of PREFIXES) {
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000, token });
    stored.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}
console.log(`store holds ${stored.length} blobs under ${PREFIXES.join(' + ')}`);

// ── 3. The difference ───────────────────────────────────────────────────────
const now = Date.now();
const strays = stored.filter((b) => !referenced.has(b.pathname));
const recent = strays.filter((b) => now - b.uploadedAt.getTime() < GRACE_MS);
const sweepable = strays.filter((b) => now - b.uploadedAt.getTime() >= GRACE_MS);

const fmt = (n: number) =>
  n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
const total = sweepable.reduce((s, b) => s + b.size, 0);
const w1280 = sweepable.filter((b) => /\/w1280\.[a-z0-9]+$/i.test(b.pathname));

// Newest first — the interesting ones are usually recent.
sweepable.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
for (const b of sweepable) {
  console.log(
    `  ${DELETE ? 'DELETE' : 'stray '}  ${b.pathname}  ${fmt(b.size)}  ${b.uploadedAt.toISOString().slice(0, 10)}`,
  );
}
if (recent.length > 0) {
  console.log(
    `  skipped ${recent.length} unreferenced blob(s) uploaded in the last hour — could be an upload in flight; re-run later`,
  );
}
console.log(
  `\n${sweepable.length} stray blob(s), ${fmt(total)} (${w1280.length} of them w1280 rungs)`,
);

if (sweepable.length === 0) {
  console.log('nothing to sweep');
  process.exit(0);
}

if (!DELETE) {
  console.log('dry run — re-run with --delete to remove them');
  process.exit(0);
}

// ── 4. Delete, in batches (del accepts an array) ────────────────────────────
const BATCH = 100;
let deleted = 0;
for (let i = 0; i < sweepable.length; i += BATCH) {
  const slice = sweepable.slice(i, i + BATCH);
  await del(
    slice.map((b) => b.url),
    { token },
  );
  deleted += slice.length;
  console.log(`  deleted ${deleted}/${sweepable.length}`);
}
console.log(`\nswept ${deleted} blob(s), ${fmt(total)} reclaimed`);
