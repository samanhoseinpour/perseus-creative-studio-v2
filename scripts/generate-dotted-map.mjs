// One-off generator for the Stats section's dotted world map.
//
// `dotted-map` (plus its proj4/wkt-parser/mgrs dependency chain) is ~390 KB of
// client JS just to produce a deterministic SVG, so we bake the SVG here at
// dev time instead and serve it from /public as a static asset.
//
// Re-run after changing the map settings below:
//   node scripts/generate-dotted-map.mjs
import { writeFileSync } from 'node:fs';
import DottedMapModule from 'dotted-map';

// The package ships a CJS bundle whose ESM default import is the module
// namespace; the class itself lives on `.default`.
const DottedMap = DottedMapModule.default ?? DottedMapModule;

// Keep these in sync with the visual spec in src/components/Stats.tsx.
const map = new DottedMap({ height: 60, grid: 'diagonal' });
const svg = map.getSVG({
  radius: 0.22,
  color: 'rgba(20,20,20,0.45)',
  shape: 'circle',
  backgroundColor: 'transparent',
});

writeFileSync(new URL('../public/dotted-world-map.svg', import.meta.url), svg);
console.log('Wrote public/dotted-world-map.svg', `(${svg.length} bytes)`);
