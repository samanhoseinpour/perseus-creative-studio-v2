import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// drizzle-kit runs outside Next and doesn't read Next's env files — load
// .env.local explicitly (the same file `next dev` uses). DATABASE_URL comes
// from the Neon integration on Vercel; locally it's pasted into .env.local.
config({ path: '.env.local' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: true,
  strict: true,
});
