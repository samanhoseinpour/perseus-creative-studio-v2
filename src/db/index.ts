/**
 * Neon Postgres client via Drizzle. DATABASE_URL is a server-only secret
 * (never NEXT_PUBLIC_*) injected by the Neon integration on Vercel and pasted
 * into .env.local for dev — same convention as GOOGLE_PLACES_API_KEY in
 * src/lib/googleReviews.ts.
 *
 * The neon-http driver speaks HTTP per query (no TCP pool), which suits
 * serverless functions and Neon's scale-to-zero free tier: the first query
 * after idle auto-wakes the database (~500ms), no manual resume.
 */
import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
export { contactSubmissions } from './schema';
