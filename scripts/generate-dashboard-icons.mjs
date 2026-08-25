#!/usr/bin/env node
// Generate the /admin PWA ("Perseus Dashboard") icon set from the existing
// marketing PWA icon, so the two apps are the same logo in two finishes rather
// than two pieces of artwork that can drift.
//
// Usage:
//   node scripts/generate-dashboard-icons.mjs [--force] [--dry-run]
//
// Why the roundabout recolour instead of .negate():
// the source is RGBA with real transparency (hasAlpha: true, isOpaque: false),
// so inverting pixels also inverts the transparent margin and dirties every
// anti-aliased edge. Instead the source's luminance becomes an ALPHA mask for a
// solid-white layer, which is then flattened onto the ink ground. Soft edges
// stay soft and the margin stays clean.
//
// Geometry is deliberately NOT touched. The source places the logo at 73% of
// the canvas width, whose farthest ink corner sits 195.2px from centre against
// Android's 204.8px maskable safe radius — i.e. it already survives the circle
// crop. Re-centring or rescaling here would only risk breaking that.

import sharp from 'sharp';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'public', 'web-app-manifest-512x512.png');

// --ink from src/app/globals.css:27. Also the dashboard manifest's
// theme_color/background_color, so the splash screen matches the icon.
const INK = '#141414';

const OUTPUTS = [
  { file: 'dashboard-icon-512.png', size: 512 },
  { file: 'dashboard-icon-192.png', size: 192 },
  // iOS uses <link rel="apple-touch-icon"> for a Home Screen web app, not the
  // manifest icons — without this the dashboard would wear the marketing icon.
  { file: 'dashboard-apple-icon.png', size: 180 },
];

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const dryRun = args.has('--dry-run');

const kb = (b) => `${(b / 1024).toFixed(1)} KB`;

async function inkedMaster() {
  const meta = await sharp(SRC).metadata();
  const { width: w, height: h } = meta;

  // Dark pixels are the logo. Flatten onto white first so the transparent
  // margin reads as "no logo" rather than as black.
  const lum = await sharp(SRC)
    .flatten({ background: '#ffffff' })
    .greyscale()
    .raw()
    .toBuffer();

  // alpha = 255 - luminance → opaque where the logo is, transparent elsewhere.
  const alpha = Buffer.from(Uint8Array.from(lum, (v) => 255 - v));

  const white = await sharp({
    create: { width: w, height: h, channels: 3, background: '#ffffff' },
  })
    .raw()
    .toBuffer();

  const whiteLogo = await sharp(white, { raw: { width: w, height: h, channels: 3 } })
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer();

  return sharp({
    create: { width: w, height: h, channels: 4, background: INK },
  })
    .composite([{ input: whiteLogo }])
    .png()
    .toBuffer();
}

async function main() {
  if (!existsSync(SRC)) {
    console.error(`Source icon missing: ${path.relative(ROOT, SRC)}`);
    process.exitCode = 1;
    return;
  }

  const pending = OUTPUTS.filter(
    (o) => force || !existsSync(path.join(ROOT, 'public', o.file)),
  );
  if (pending.length === 0) {
    console.log('All dashboard icons already present. Pass --force to rebuild.');
    return;
  }

  const master = await inkedMaster();

  for (const { file, size } of pending) {
    const out = path.join(ROOT, 'public', file);
    if (dryRun) {
      console.log(`would write public/${file} (${size}x${size})`);
      continue;
    }
    // Flatten again after the resize: a resampled alpha edge over ink would
    // otherwise leave a faint halo on a non-ink backdrop.
    const info = await sharp(master)
      .resize(size, size, { fit: 'cover' })
      .flatten({ background: INK })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`public/${file}  ${size}x${size}  ${kb(info.size)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
