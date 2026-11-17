// One-time: turn Natural Earth 1:50m admin-1 boundaries into
//   assets/canada-map.json   — projected, simplified SVG paths for the site
//   data/ref/provinces.json  — simplified lon/lat rings for point-in-province lookups
//
// Usage: node scripts/build-map.mjs <ne_50m_admin_1_states_provinces.geojson>

import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { lcc } from '../js/shared/geo.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const src = process.argv[2];
if (!src) { console.error('usage: node scripts/build-map.mjs <geojson>'); process.exit(1); }

const gj = JSON.parse(await fs.readFile(src, 'utf8'));
const feats = gj.features.filter((f) => f.properties.adm0_a3 === 'CAN');

// Closed rings start and end on the same point, which would give Douglas–Peucker
// a zero-length baseline — so simplify the two halves separately.
function dp(ring, tol) {
  if (ring.length < 8) return ring;
  const mid = Math.floor(ring.length / 2);
  const a = dpOpen(ring.slice(0, mid + 1), tol), b = dpOpen(ring.slice(mid), tol);
  return a.concat(b.slice(1));
}
function dpOpen(pts, tol) { // Douglas–Peucker
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-12;
    let idx = -1, max = 0;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = (r) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(s / 2); };
const rings = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flatMap((poly) => poly.slice(0, 1)); // outer rings only

// projected bounds
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const f of feats) for (const r of rings(f.geometry)) for (const [lon, lat] of r) {
  const [x, y] = lcc(lon, lat);
  minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
}
const W = 1000, scale = W / (maxX - minX), H = Math.round((maxY - minY) * scale);
const tr = { minX, minY, scale };

const out = { width: W, height: H, transform: tr, provinces: [] };
const ref = { provinces: [] };
for (const f of feats) {
  const p = f.properties;
  const projected = rings(f.geometry)
    .map((r) => dp(r.map(([lon, lat]) => { const [x, y] = lcc(lon, lat); return [(x - minX) * scale, (y - minY) * scale]; }), 0.9))
    .filter((r) => r.length >= 4 && area(r) > 6);
  const path = projected.map((r) => 'M' + r.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z').join('');
  out.provinces.push({ code: p.postal, en: p.name, fr: p.name_fr || p.name, path });
  ref.provinces.push({
    code: p.postal, en: p.name, fr: p.name_fr || p.name,
    rings: rings(f.geometry).map((r) => dp(r, 0.02).map(([a, b]) => [+a.toFixed(3), +b.toFixed(3)])).filter((r) => r.length >= 4),
  });
}
await fs.writeFile(`${ROOT}assets/canada-map.json`, JSON.stringify(out));
await fs.writeFile(`${ROOT}data/ref/provinces.json`, JSON.stringify(ref));
console.log(`map: ${out.provinces.length} provinces, ${W}x${H}`);
