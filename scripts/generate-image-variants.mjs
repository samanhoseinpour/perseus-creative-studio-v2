#!/usr/bin/env node
// generate-image-variants.mjs — Pre-generate responsive widths for each content image so
// the custom next/image loader (src/lib/imageLoader.ts) can serve device-sized files
// statically, with no runtime optimizer. For every "laddered" image it writes
// <base>-384 / <base>-640 / <base>-960 next to the original, in the SAME format, encoded
// at min(rung, native) (never enlarged). Originals and already-suffixed files are never
// touched, so OG/JSON-LD references to the unsuffixed path keep working.
//
// It ALSO emits a low-quality image placeholder (LQIP) per laddered image into
// src/lib/imageBlur.generated.json — a tiny base64 WebP that next/image renders blurred
// and cross-fades from on load (placeholder="blur" in src/components/Img.tsx). Same
// laddering + idempotency rules as the variants.
//
// Idempotent: skips a variant that already exists and is newer than its source (use
// --force to rebuild). All three rungs are always generated for a laddered image — even
// when a rung exceeds the native width — so the loader can never point at a missing file.
//
// Usage:
//   node scripts/generate-image-variants.mjs                  # whole public/images
//   node scripts/generate-image-variants.mjs public/images/home
//   node scripts/generate-image-variants.mjs --dry-run
//   node scripts/generate-image-variants.mjs --force
//
// RUNGS + the laddering rule MIRROR src/lib/imageVariants.ts — keep the two in sync.

import sharp from 'sharp';
import {
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const RUNGS = [384, 640, 960];
const QUALITY = 52;
const PUBLIC_DIR = path.resolve('public');
const IMAGE_EXTS = new Set(['.avif', '.webp', '.jpg', '.jpeg', '.png']);
// LQIP blur-up map: one tiny base64 WebP per laddered image, consumed by Img.tsx.
const BLUR_DIM = 16; // longest side (px); next/image blurs it heavily on render
const BLUR_QUALITY = 50;
const BLUR_MAP_PATH = path.resolve('src/lib/imageBlur.generated.json');
// Matches ONLY our generated variants (exact rungs). Must NOT catch real filenames that
// happen to end in a number, e.g. `…-2026.avif` or `…-match-tour-11.avif`.
const VARIANT_RE = /-(?:384|640|960)\.(?:avif|webp|png|jpe?g)$/i;

process.stdout.on('error', (e) => {
  if (e.code === 'EPIPE') process.exit(0);
});

// Mirror of src/lib/imageVariants.ts isLaddered(), on a public-relative URL path.
function isLaddered(urlPath) {
  if (!urlPath.startsWith('/images/')) return false;
  if (urlPath.startsWith('/images/shared/logos/')) return false;
  if (urlPath.startsWith('/images/shared/client-logos/')) return false;
  if (urlPath === '/images/perseus-logo-black.avif') return false;
  return true;
}
function variantPath(file, rung) {
  const ext = path.extname(file);
  return `${file.slice(0, -ext.length)}-${rung}${ext}`;
}
const toUrlPath = (file) => '/' + path.relative(PUBLIC_DIR, file).split(path.sep).join('/');

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) {
      a._.push(k);
      continue;
    }
    const key = k.slice(2);
    const n = argv[i + 1];
    a[key] = n && !n.startsWith('--') ? argv[++i] : 'true';
  }
  return a;
}
const KB = (b) => `${Math.round(b / 1024)}KB`;
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

// Return a buffer sharp can resize. AVIFs this sharp build can't decode go via avifdec→PNG.
async function decodable(file) {
  const input = readFileSync(file);
  try {
    await sharp(input).resize(8).toBuffer();
    return input;
  } catch {
    const tmpd = mkdtempSync(path.join(os.tmpdir(), 'imgvar-'));
    const tmp = path.join(tmpd, 'd.png');
    try {
      execFileSync('avifdec', ['--jobs', '4', file, tmp], { stdio: 'ignore' });
      return readFileSync(tmp);
    } finally {
      rmSync(tmpd, { recursive: true, force: true });
    }
  }
}
function encode(input, ext, dim, q) {
  const img = sharp(input)
    .rotate()
    .resize({ width: dim, fit: 'inside', withoutEnlargement: true })
    .keepIccProfile();
  switch (ext) {
    case '.avif':
      return img.avif({ quality: q, effort: 6 }).toBuffer();
    case '.webp':
      return img.webp({ quality: q, effort: 6 }).toBuffer();
    case '.jpg':
    case '.jpeg':
      return img.jpeg({ quality: q, mozjpeg: true }).toBuffer();
    case '.png':
      return img.png({ compressionLevel: 9, effort: 8 }).toBuffer();
    default:
      return Promise.resolve(null);
  }
}

// Tiny base64 WebP placeholder (longest side BLUR_DIM). next/image scales it up and
// blurs it, then cross-fades to the real image on load (placeholder="blur").
async function encodeBlur(input) {
  const buf = await sharp(input)
    .rotate()
    .resize(BLUR_DIM, BLUR_DIM, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: BLUR_QUALITY, effort: 6 })
    .toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const TARGET = path.resolve(args.dir || args._[0] || 'public/images');
  const DRY = args['dry-run'] === 'true';
  const FORCE = args.force === 'true';

  let blurMap = {};
  try {
    blurMap = JSON.parse(readFileSync(BLUR_MAP_PATH, 'utf8'));
  } catch {
    // first run — no map yet
  }
  let blurWritten = 0;

  if (!existsSync(TARGET)) {
    console.error(`Path not found: ${TARGET}`);
    process.exit(1);
  }

  const all = (statSync(TARGET).isDirectory() ? walk(TARGET) : [TARGET]).filter((f) =>
    IMAGE_EXTS.has(path.extname(f).toLowerCase()),
  );
  // Sources = real images that are laddered and not themselves a generated variant.
  const sources = all.filter((f) => !VARIANT_RE.test(f) && isLaddered(toUrlPath(f)));

  console.log(
    `\nScanned ${all.length} image(s); ${sources.length} laddered source(s) in ${
      path.relative(process.cwd(), TARGET) || TARGET
    }`,
  );
  console.log(
    `Rungs: ${RUNGS.join(', ')}  (q${QUALITY})${DRY ? '  (dry-run — no writes)' : ''}${
      FORCE ? '  (force)' : ''
    }\n`,
  );

  let written = 0,
    skipped = 0,
    failed = 0,
    bytes = 0;

  for (const f of sources) {
    const ext = path.extname(f).toLowerCase();
    const urlPath = toUrlPath(f);
    const srcMtime = statSync(f).mtimeMs;
    const todo = RUNGS.filter((r) => {
      const out = variantPath(f, r);
      if (!FORCE && existsSync(out) && statSync(out).mtimeMs >= srcMtime) {
        skipped++;
        return false;
      }
      return true;
    });
    // Regenerate the LQIP when forced, when it's missing, or when the variants are
    // stale (a changed source invalidates both); otherwise keep the existing entry.
    const needBlur = FORCE || !(urlPath in blurMap) || todo.length > 0;
    if (!todo.length && !needBlur) continue;

    let input;
    try {
      input = await decodable(f);
    } catch {
      console.log(`  ⚠ skip — cannot decode (brew install libavif)  ${path.relative(PUBLIC_DIR, f)}`);
      failed += todo.length;
      continue;
    }

    for (const r of todo) {
      const out = variantPath(f, r);
      let buf = null;
      try {
        buf = await encode(input, ext, r, QUALITY);
      } catch {
        buf = null;
      }
      if (!buf) {
        console.log(`  ⚠ skip — unsupported format  ${path.relative(PUBLIC_DIR, out)}`);
        failed++;
        continue;
      }
      if (!DRY) writeFileSync(out, buf);
      written++;
      bytes += buf.length;
      console.log(`  +${KB(buf.length).padStart(5)}  ${path.relative(PUBLIC_DIR, out)}`);
    }

    if (needBlur) {
      try {
        blurMap[urlPath] = await encodeBlur(input);
        blurWritten++;
      } catch {
        console.log(`  ⚠ skip blur — ${path.relative(PUBLIC_DIR, f)}`);
      }
    }
  }

  // Prune LQIP entries whose source image no longer exists (safe on scoped runs too),
  // then write the map back with sorted keys for stable diffs.
  let blurPruned = 0;
  for (const key of Object.keys(blurMap)) {
    if (!existsSync(path.join(PUBLIC_DIR, key.replace(/^\//, '')))) {
      delete blurMap[key];
      blurPruned++;
    }
  }
  if (!DRY) {
    const sorted = Object.fromEntries(Object.keys(blurMap).sort().map((k) => [k, blurMap[k]]));
    writeFileSync(BLUR_MAP_PATH, JSON.stringify(sorted, null, 2) + '\n');
  }

  console.log(
    `\n${DRY ? 'Would write' : 'Wrote'} ${written} variant(s) (${KB(bytes)}); skipped ${skipped} up-to-date; ${failed} failed.`,
  );
  console.log(
    `${DRY ? 'Would update' : 'Updated'} ${blurWritten} LQIP blur entr${blurWritten === 1 ? 'y' : 'ies'}` +
      `${blurPruned ? `, pruned ${blurPruned} dead` : ''} → ${path.relative(process.cwd(), BLUR_MAP_PATH)} (${Object.keys(blurMap).length} total).`,
  );
  if (!DRY && (written || blurWritten || blurPruned))
    console.log('Review, then stage/commit the new variants + imageBlur.generated.json (git is yours to run).');
}

main();
