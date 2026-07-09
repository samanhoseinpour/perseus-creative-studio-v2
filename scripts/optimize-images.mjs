#!/usr/bin/env node
// optimize-images.mjs — Audit public/images and shrink any image OVER a size
// budget, IN PLACE, without visible quality loss.
//
// Strategy: reduce by DOWNSCALING first (images are usually higher-res than they
// ever display), only nudging quality after — and never below a quality/size
// floor. If a complex image can't reach the budget without dropping below that
// floor, it's left at the best safe size and FLAGGED, rather than crushed.
//
// Safe by design: reads each original into memory before overwriting, keeps the
// file's exact name + format (no broken references), preserves the ICC colour
// profile (so wide-gamut images don't wash out), and never enlarges. AVIFs that
// this sharp build can't decode are decoded via `avifdec` (libavif) first.
//
// Usage (point it at the whole library, a folder, or a single file):
//   node scripts/optimize-images.mjs                              # default: public/images
//   node scripts/optimize-images.mjs public/images/blogs          # a folder (positional)
//   node scripts/optimize-images.mjs public/images/home/x.avif    # a single file
//   node scripts/optimize-images.mjs --dir public/images/blogs    # a folder (flag form)
//   node scripts/optimize-images.mjs --dry-run                    # audit only, no writes
//
// Flags: --dir <path> (or a positional path; file or folder), --max-kb (150),
//        --max-dim (1600), --min-quality (48), --min-dim (1200), --dry-run
// Companion: scripts/reduce-images.mjs is the src→out bulk re-encoder (migration helper).

import sharp from 'sharp';
import { readFileSync, writeFileSync, statSync, readdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const IMAGE_EXTS = new Set(['.avif', '.webp', '.jpg', '.jpeg', '.png']);

// Don't crash when piped to `head`/`grep` and the reader closes the stream early.
process.stdout.on('error', (e) => {
  if (e.code === 'EPIPE') process.exit(0);
});

// Flags that never take a value. Without this, `--dry-run public/images/blogs`
// would swallow the path as the flag's value — a REAL run over the whole tree.
const BOOL_FLAGS = new Set(['dry-run']);

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
    a[key] =
      !BOOL_FLAGS.has(key) && n && !n.startsWith('--') ? argv[++i] : 'true';
  }
  return a;
}
const KB = (b) => `${Math.round(b / 1024)}KB`;
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

function encode(input, ext, dim, q) {
  const img = sharp(input)
    .rotate() // bake EXIF orientation
    .resize({ width: dim, height: dim, fit: 'inside', withoutEnlargement: true })
    .keepIccProfile(); // preserve the colour profile so wide-gamut images don't wash out
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const TARGET = path.resolve(args.dir || args._[0] || 'public/images');
  const MAX = Number(args['max-kb'] ?? 150) * 1024;
  const MAXDIM = Number(args['max-dim'] ?? 1600);
  const MINQ = Number(args['min-quality'] ?? 48);
  const MINDIM = Number(args['min-dim'] ?? 1200);
  const DRY = args['dry-run'] === 'true';

  if (!existsSync(TARGET)) {
    console.error(`Path not found: ${TARGET}`);
    process.exit(1);
  }
  const isDir = statSync(TARGET).isDirectory();
  const base = isDir ? TARGET : path.dirname(TARGET);
  const files = (isDir ? walk(TARGET) : [TARGET]).filter((f) =>
    IMAGE_EXTS.has(path.extname(f).toLowerCase()),
  );
  const over = files
    .map((f) => ({ f, size: statSync(f).size }))
    .filter((x) => x.size > MAX)
    .sort((a, b) => b.size - a.size);

  console.log(`\nScanned ${files.length} image(s) in ${path.relative(process.cwd(), TARGET) || TARGET}`);
  console.log(`Over ${KB(MAX)} budget: ${over.length}${DRY ? '  (dry-run — no changes)' : ''}\n`);
  if (!over.length) {
    console.log('✓ Nothing to do — every image is within budget.');
    return;
  }

  // Quality-safe ladder: prefer the largest dimension + highest quality that fits.
  const dims = [];
  for (let d = MAXDIM; d >= MINDIM; d = Math.round(d * 0.85)) dims.push(d);
  if (dims[dims.length - 1] !== MINDIM) dims.push(MINDIM);
  const quals = [...new Set([58, 54, 50, MINQ])].filter((q) => q >= MINQ);

  let changed = 0, flagged = 0, saved = 0;
  for (const { f, size: before } of over) {
    const ext = path.extname(f).toLowerCase();
    let input = readFileSync(f);

    // Probe decodability; fall back to avifdec → PNG for AVIFs sharp can't read.
    try {
      await sharp(input).resize(8).toBuffer();
    } catch {
      try {
        const tmpd = mkdtempSync(path.join(os.tmpdir(), 'optimg-'));
        const tmp = path.join(tmpd, 'd.png');
        execFileSync('avifdec', ['--jobs', '4', f, tmp], { stdio: 'ignore' });
        input = readFileSync(tmp);
        rmSync(tmpd, { recursive: true, force: true });
      } catch {
        console.log(`  ⚠ skip — cannot decode (install libavif: brew install libavif)  ${path.relative(base, f)}`);
        flagged++;
        continue;
      }
    }

    let best = null, fit = null;
    for (const dim of dims) {
      for (const q of quals) {
        const buf = await encode(input, ext, dim, q);
        if (!buf) break;
        if (!best || buf.length < best.buf.length) best = { buf, dim, q };
        if (buf.length <= MAX) {
          fit = { buf, dim, q };
          break;
        }
      }
      if (fit) break;
    }
    if (!best) {
      console.log(`  ⚠ skip — unsupported format  ${path.relative(base, f)}`);
      flagged++;
      continue;
    }
    const pick = fit ?? best;
    if (!fit) flagged++;

    if (pick.buf.length < before) {
      if (!DRY) writeFileSync(f, pick.buf);
      changed++;
      saved += before - pick.buf.length;
    }
    console.log(
      `  ${KB(before).padStart(5)} → ${KB(pick.buf.length).padStart(5)}  (≤${pick.dim}px q${pick.q})  ${path.relative(base, f)}` +
        (fit ? '' : '  ⚠ kept above budget to preserve quality'),
    );
  }

  console.log(
    `\n${DRY ? 'Would change' : 'Changed'} ${changed} file(s); saved ${KB(saved)}.` +
      (flagged ? `  ${flagged} flagged (couldn't hit budget without quality loss).` : ''),
  );
  if (!DRY && changed) console.log('Review the changed images, then stage/commit them (git is yours to run).');
}

main();
