import 'server-only';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

// Better Auth performs multi-step writes (e.g. account linking) that expect
// interactive transactions, which the contact form's `neon-http` client
// (src/db/index.ts) cannot do. This pooled WebSocket client IS
// transaction-capable, so it backs the auth adapter. Node 22+ — the Vercel
// runtime and local dev — exposes a native global `WebSocket`, so the
// `@neondatabase/serverless` Pool needs no `ws` shim.
//
// Kept separate from `@/db` on purpose: the contact form stays on the stateless
// HTTP driver it was verified against; only auth uses the pool.
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export const authDb = drizzle(pool, { schema });
