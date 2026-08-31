#!/usr/bin/env node
// Generate the /admin PWA ("Perseus Dashboard") icon set from the existing
// marketing PWA icon, so the two apps are the same logo in two finishes rather
// than two pieces of artwork that can drift.
//
// It also emits the WEEKLY DIGEST EMAIL letterhead, which is the same recolour
// applied to a different source. That one cannot come from the square icon: the
// icon pads the logo to 73% of a square canvas, so at the ~176px an email header
// can spare, "CREATIVE STUDIO" underneath is an illegible smudge. It reads the
// wide wordmark instead, and it has to be a PNG because Gmail renders neither
// the AVIF the wordmark ships as nor SVG.
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

// The wide wordmark, the email letterhead's source. Tight margins and 702x240,
// so at 176px logical in the email it is still 4x on a retina screen.
const WORDMARK_SRC = path.join(ROOT, 'public', 'images', 'perseus-logo-black.avif');

// Deliberately at the public ROOT and not under /images/: that path is served
// `Cache-Control: immutable` (next.config.ts), so changing a file's CONTENT
// there needs a new filename. dashboard-icon-512.png lives at the root for the
// same reason. Flattened onto INK with NO alpha, because Outlook mishandles PNG
// alpha over a coloured background and the band behind it is this exact ink.
const EMAIL_WORDMARK = 'perseus-wordmark-email.png';

const OUTPUTS = [
  { file: 'dashboard-icon-512.png', size: 512 },
  { file: 'dashboard-icon-192.png', size: 192 },
  // iOS uses <link rel="apple-touch-icon"> for a Home Screen web app, not the
  // manifest icons — without this the dashboard would wear the marketing icon.
  { file: 'dashboard-apple-icon.png', size: 180 },
  // The Android notification BADGE — the small glyph in the status bar. It is
  // a MASK, not an icon: Android reads only the alpha channel and tints the
  // result itself, so this one must be the white logo on TRANSPARENT rather
  // than on ink. Flattened onto ink it would render as a solid filled square.
  // Other platforms ignore `badge` entirely.
  { file: 'dashboard-badge-96.png', size: 96, mask: true },
];

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const dryRun = args.has('--dry-run');

const kb = (b) => `${(b / 1024).toFixed(1)} KB`;

/** The white logo on transparency — the alpha mask Android tints for a badge,
 *  and the layer the inked master composites onto its ground. Takes its source
 *  so the square icons and the wide email wordmark share one recolour. */
async function whiteOnTransparent(src) {
  const meta = await sharp(src).metadata();
  const { width: w, height: h } = meta;

  // Dark pixels are the logo. Flatten onto white first so the transparent
  // margin reads as "no logo" rather than as black.
  const lum = await sharp(src)
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

  return sharp(white, { raw: { width: w, height: h, channels: 3 } })
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer();
}

async function inkedMaster(src) {
  const { width: w, height: h } = await sharp(src).metadata();
  const whiteLogo = await whiteOnTransparent(src);
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
  const emailOut = path.join(ROOT, 'public', EMAIL_WORDMARK);
  const emailPending = force || !existsSync(emailOut);

  if (pending.length === 0 && !emailPending) {
    console.log('All dashboard icons already present. Pass --force to rebuild.');
    return;
  }

  if (emailPending) {
    if (!existsSync(WORDMARK_SRC)) {
      console.error(`Wordmark missing: ${path.relative(ROOT, WORDMARK_SRC)}`);
      process.exitCode = 1;
      return;
    }
    if (dryRun) {
      console.log(`would write public/${EMAIL_WORDMARK} (wide wordmark)`);
    } else {
      // No resize: the source is already the shipping size, and flattening
      // drops the alpha channel the email must not carry.
      // Two-tone art, so a 64-colour palette is visually identical to the
      // full-depth encode and a third of the bytes (36.4 KB -> 11.7 KB). Worth
      // it for a file every recipient's mail client fetches every Monday.
      const info = await sharp(await inkedMaster(WORDMARK_SRC))
        .flatten({ background: INK })
        .png({ palette: true, colours: 64, compressionLevel: 9 })
        .toFile(emailOut);
      console.log(
        `public/${EMAIL_WORDMARK}  ${info.width}x${info.height}  ${kb(info.size)}`,
      );
    }
  }

  if (pending.length === 0) return;

  const master = await inkedMaster(SRC);

  // The badge needs the white logo WITHOUT the ink ground behind it.
  const maskMaster = pending.some((o) => o.mask) ? await whiteOnTransparent(SRC) : null;

  for (const { file, size, mask } of pending) {
    const out = path.join(ROOT, 'public', file);
    if (dryRun) {
      console.log(`would write public/${file} (${size}x${size})${mask ? ' [mask]' : ''}`);
      continue;
    }
    const info = mask
      ? await sharp(maskMaster)
          .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ compressionLevel: 9 })
          .toFile(out)
      // Flatten again after the resize: a resampled alpha edge over ink would
      // otherwise leave a faint halo on a non-ink backdrop.
      : await sharp(master)
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
