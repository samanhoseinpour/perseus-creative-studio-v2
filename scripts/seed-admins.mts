/**
 * Seed the studio's admin accounts. There is no public sign-up (see
 * emailAndPassword.disableSignUp in src/lib/auth.ts), so team accounts are
 * created here, once, via Better Auth's internal adapter — the same code path
 * the sign-up route uses, minus the disabled-endpoint guard.
 *
 * Run:  node --env-file=.env.local --import tsx scripts/seed-admins.mts
 *   or: npm run db:seed
 *
 * Idempotent: an email that already exists is skipped. Each new account gets a
 * strong random temp password printed ONCE below — share it securely, or just
 * have the teammate use "Forgot password" on /admin/login. On first sign-in
 * they should enroll a passkey.
 *
 * Note: this builds its own minimal Better Auth instance rather than importing
 * src/lib/auth.ts, because that module is `server-only`-guarded and throws
 * outside a React Server context. Password hashing uses Better Auth's default
 * scrypt (salt stored in the hash, no dependency on the secret), so the hashes
 * created here verify against the runtime auth instance.
 */
import { randomBytes } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { Pool } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';

import {
  user,
  session,
  account,
  verification,
  passkey,
} from '@/db/auth-schema';
import { ADMIN_AREAS, type AdminArea } from '@/lib/adminAreas';
// From the LEAF, never src/lib/adminReleases.ts — that carries `import
// 'server-only'`, which throws under plain node and would take this seeder
// down before it wrote a row.
import { CURRENT_VERSION } from '@/lib/releaseFields';

// This roster IS the privileged set: the owner plus the superadmins, created
// here (or backfilled by migrations 0004/0024) with the roles /admin's
// authorization seam (src/lib/adminAccess.ts) reads from the DB. The owner
// holds every area implicitly (empty stored `areas`); superadmins get the
// full grant list written out, which the owner narrows from /admin/users.
// Regular members are NOT seeded here — they're added from /admin/users.
const ADMINS: { email: string; name: string; role: string; areas: AdminArea[] }[] = [
  {
    email: 'samangithoseinpour@gmail.com',
    name: 'Saman Hoseinpour',
    role: 'owner',
    areas: [],
  },
  {
    email: 'aryangh1a@gmail.com',
    name: 'Aryan Ghasemi',
    role: 'superadmin',
    areas: [...ADMIN_AREAS],
  },
  {
    email: 'info@perseustudio.com',
    name: 'Perseus Studio',
    role: 'superadmin',
    areas: [...ADMIN_AREAS],
  },
];

// ~24-char URL-safe temp password.
const tempPassword = () => randomBytes(18).toString('base64url');

const schema = { user, session, account, verification, passkey };
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true },
});

const ctx = await auth.$context;
const created: { email: string; password: string }[] = [];

for (const admin of ADMINS) {
  const email = admin.email.toLowerCase();
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing?.user) {
    console.log(`• skip (already exists): ${email}`);
    continue;
  }

  const password = tempPassword();
  const hash = await ctx.password.hash(password);
  const newUser = await ctx.internalAdapter.createUser({
    email,
    name: admin.name,
    emailVerified: true,
  });
  await ctx.internalAdapter.linkAccount({
    userId: newUser.id,
    providerId: 'credential',
    accountId: newUser.id,
    password: hash,
  });
  // Better Auth's createUser drops fields it doesn't know about, so role and
  // grants are written directly — the seed roster is exactly the owner +
  // superadmin set.
  await db
    .update(user)
    .set({
      role: admin.role,
      areas: admin.areas,
      // Start them at today's release, not at nothing — otherwise a freshly
      // seeded account's first sign-in opens the whole changelog.
      releaseSeenVersion: CURRENT_VERSION,
    })
    .where(eq(user.id, newUser.id));

  created.push({ email, password });
  console.log(`✓ created: ${email}`);
}

if (created.length) {
  console.log(
    '\n=== TEMP PASSWORDS — shown once. Share securely, or use "Forgot password". ===',
  );
  for (const c of created) console.log(`  ${c.email}\t${c.password}`);
  console.log(
    '\nEach teammate should sign in, then enroll a passkey from the dashboard.',
  );
}

await pool.end();
process.exit(0);
