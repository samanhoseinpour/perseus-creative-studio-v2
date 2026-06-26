#!/usr/bin/env node
// Reduce images while KEEPING their exact filename + format (no rename, no
// format change). Re-encode at the given quality; if the result isn't smaller
// than the source, copy the original byte-for-byte. Used for blog images where
// references (blogs.ts + MDX) point at the existing filenames.
//
// Usage:
//   node scripts/reduce-images.mjs --src <dir> --out <dir> [--filter <regex>] [--quality 80]
//
// Reuses the sharp Next bundles. Handles avif/webp/jpg/jpeg/png.

import sharp from 'sharp';
import { readdir, mkdir, stat, copyFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const n = argv[i + 1];
    a[key] = n && !n.startsWith('--') ? argv[++i] : 'true';
  }
  return a;
}
const kb = (b) => `${(b / 1024).toFixed(1)} KB`;

// Re-encode in the SAME format. Returns a Buffer (or null if unsupported/failed).
async function encode(input, ext, quality) {
  const img = sharp(input).rotate(); // bake EXIF orientation, strip metadata
  switch (ext) {
    case '.avif':
      return img.avif({ quality, effort: 6, chromaSubsampling: '4:4:4' }).toBuffer();
    case '.webp':
      return img.webp({ quality, effort: 6 }).toBuffer();
    case '.jpg':
    case '.jpeg':
      return img.jpeg({ quality, mozjpeg: true }).toBuffer();
    case '.png':
      return img.png({ compressionLevel: 9, effort: 8 }).toBuffer();
    default:
      return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const srcDir = args.src && path.resolve(args.src);
  const outDir = args.out && path.resolve(args.out);
  const quality = Number(args.quality ?? 80);
  const filter = args.filter ? new RegExp(args.filter) : null;

  if (!srcDir || !outDir) {
    console.error('Usage: node scripts/reduce-images.mjs --src <dir> --out <dir> [--filter <regex>] [--quality 80]');
    process.exit(1);
  }
  if (!existsSync(srcDir)) {
    console.error(`Source dir not found: ${srcDir}`);
    process.exit(1);
  }
  await mkdir(outDir, { recursive: true });

  const files = (await readdir(srcDir, { withFileTypes: true }))
    .filter(
      (e) =>
        e.isFile() &&
        IMAGE_EXTS.has(path.extname(e.name).toLowerCase()) &&
        (!filter || filter.test(e.name)),
    )
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  console.log(`\nReducing ${files.length} image(s)  (keep name+format, skip if no gain)`);
  console.log(`  src: ${srcDir}\n  out: ${outDir}\n`);

  let inT = 0, outT = 0, reduced = 0, kept = 0;
  for (const name of files) {
    const ext = path.extname(name).toLowerCase();
    const sp = path.join(srcDir, name);
    const op = path.join(outDir, name);
    const inSize = (await stat(sp)).size;
    let buf = null;
    try {
      buf = await encode(sp, ext, quality);
    } catch (e) {
      console.log(`  ! ${name}  encode failed (${e.message}) — copying original`);
    }
    let finalSize, tag;
    if (buf && buf.length < inSize) {
      await writeFile(op, buf);
      finalSize = buf.length;
      reduced++;
      tag = `reduced -${(100 * (1 - buf.length / inSize)).toFixed(0)}%`;
    } else {
      await copyFile(sp, op);
      finalSize = inSize;
      kept++;
      tag = 'kept (no gain)';
    }
    inT += inSize;
    outT += finalSize;
    console.log(`  ${name.padEnd(66)} ${kb(inSize).padStart(9)} → ${kb(finalSize).padStart(9)}  ${tag}`);
  }

  console.log(`\nDone: ${reduced} reduced, ${kept} kept as-is, ${files.length} total.`);
  if (inT > 0) console.log(`Total: ${kb(inT)} → ${kb(outT)}  (saved ${(100 * (1 - outT / inT)).toFixed(1)}%)`);
}

main();
