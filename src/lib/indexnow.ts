import 'server-only';

import { SITE_URL } from '@/constants';

/**
 * IndexNow key — public by protocol (engines verify ownership by fetching
 * `/{key}.txt`), so it is a constant, not a secret. It MUST byte-match the
 * committed key file `public/0f316f05e21ca76280a92202aa8b35f1.txt`; keeping
 * both in the repo (instead of an env var) means they can't drift.
 */
export const INDEXNOW_KEY = '0f316f05e21ca76280a92202aa8b35f1';

/**
 * Fire-and-forget IndexNow ping (Bing, Seznam, Naver, and other IndexNow
 * consumers — Bing's index also grounds Copilot and parts of ChatGPT search).
 *
 * - Production-only: preview/dev deploys must never announce URLs for the
 *   production host.
 * - Never throws: submission is best-effort by design; a failed ping must not
 *   break the admin mutation that triggered it. Call from `after()` so it
 *   runs post-response.
 *
 * `paths` are site-relative ('/projects/websites/acme'); duplicates are fine.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  if (process.env.VERCEL_ENV !== 'production') return;
  if (paths.length === 0) return;

  const host = new URL(SITE_URL).host;
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: [...new Set(paths)].map((p) => `${SITE_URL}${p}`),
      }),
    });
    if (!res.ok) {
      console.warn(`IndexNow ping failed: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.warn('IndexNow ping failed:', error);
  }
}
