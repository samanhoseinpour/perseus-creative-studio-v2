'use client';
import { createAuthClient } from 'better-auth/react';
import { passkeyClient } from '@better-auth/passkey/client';

// Browser auth client. baseURL is omitted deliberately — the API is same-origin
// (/api/auth), so Better Auth infers it from window.location. Consumed only by
// client components (the login form, the dashboard's passkey/sign-out actions).
export const authClient = createAuthClient({
  plugins: [passkeyClient()],
});
