// Run: node test/analyze.test.mjs
import assert from 'node:assert/strict';
import { parseCopyright } from '../js/shared/labels.js';
import { analyze, ageBucket, normKey } from '../js/shared/analyze.js';
import { provinceAt, lcc } from '../js/shared/geo.js';
import fs from 'node:fs';

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('✓', name); };

test('copyright → label, partner, tier, group', () => {
  let c = parseCopyright('℗ 2026 RCA Records, a division of Sony Music Entertainment');
  assert.equal(c.label, 'RCA Records'); assert.equal(c.tier, 'major'); assert.equal(c.group, 'Sony');
  c = parseCopyright('℗ 2026 OVO, under exclusive license to Republic Records, a division of UMG Recordings, Inc.');
  assert.equal(c.label, 'OVO'); assert.equal(c.group, 'Universal'); assert.ok(c.canadian, 'OVO is a Canadian imprint');
  c = parseCopyright('℗ 2007 Arts & Crafts');
  assert.equal(c.tier, 'independent'); assert.ok(c.canadian);
  c = parseCopyright('℗ 2024 Some Artist, under exclusive license to The Orchard');
  assert.equal(c.tier, 'major-distributed');
  c = parseCopyright('℗ 2009 Phil Spector Records, Inc. Under exclusive license to EMI Blackwood Music Inc./Sony Music Entertainment');
  assert.equal(c.group, 'Sony', 'last-named parent wins');
  c = parseCopyright('An Atlantic Outpost Release., ℗ 2026 STELLA LEFTY');
  assert.equal(c.group, 'Warner');
  c = parseCopyright('℗ 2025 Taylor Swift', { 'taylor swift': { tier: 'major', group: 'Universal' } });
  assert.equal(c.tier, 'major'); assert.ok(c.overridden);
  assert.equal(parseCopyright('').tier, 'unknown');
  c = parseCopyright('An Island Records Release; ℗ 2007 UMG Recordings, Inc.');
  assert.equal(c.label, 'Island Records'); assert.equal(c.group, 'Universal');
  c = parseCopyright('Capitol Records; ℗ 2026 UMG Recordings, Inc.');
  assert.equal(c.label, 'Capitol Records');
  c = parseCopyright('℗ 2026 Cameron Whitcomb under exclusive license to Atlantic Recording Corporation.');
  assert.equal(c.label, 'Cameron Whitcomb'); assert.equal(c.partner, 'Atlantic Recording Corporation');
  c = parseCopyright('℗ 2026 OVO, under exclusive license to Republic Records, a division of UMG Recordings, Inc.');
  assert.equal(c.partner, 'Republic Records');
});

test('release-age buckets', () => {
  assert.equal(ageBucket(-3), 'new'); assert.equal(ageBucket(30), 'new'); assert.equal(ageBucket(200), 'recent');
  assert.equal(ageBucket(800), 'established'); assert.equal(ageBucket(5000), 'catalogue'); assert.equal(ageBucket(null), null);
});

test('cross-market matching ignores feat. credits and punctuation', () => {
  assert.equal(normKey('Solar Eclipse (feat. X)', 'Drake & Don Toliver'), normKey('Solar Eclipse', 'Drake'));
});

test('geography: provinces from coordinates', () => {
  const { provinces } = JSON.parse(fs.readFileSync(new URL('../data/ref/provinces.json', import.meta.url)));
  assert.equal(provinceAt(-73.57, 45.5, provinces), 'QC');
  assert.equal(provinceAt(-123.12, 49.28, provinces), 'BC'); // coastal fallback
  const [x1] = lcc(-123, 49), [x2] = lcc(-60, 46);
  assert.ok(x1 < x2, 'west is left');
});

test('analysis on a fixture', () => {
  const S = (rank, id, artist, artistId, extra = {}) => ({ rank, id, name: `Song ${id}`, artist, artistId, releaseDate: '2026-11-01', genres: ['Pop'], collectionId: `c${id}`, url: '', ...extra });
  const charts = {
    ca: { songs: [S(1, 'a', 'Canuck', 'A1'), S(2, 'b', 'Yank', 'B1'), S(3, 'c', 'Canuck', 'A1', { genres: ['Country'] }), S(4, 'd', 'Indie Kid', 'C1')], albums: [] },
    us: { songs: [S(1, 'b', 'Yank', 'B1'), S(40, 'a', 'Canuck', 'A1')] },
  };
  const artists = {
    A1: { name: 'Canuck', canadian: true, city: 'Toronto', lon: -79.38, lat: 43.65, inCanada: true, province: 'ON' },
    B1: { name: 'Yank', canadian: false },
    C1: { name: 'Indie Kid', canadian: true, city: 'Montreal', lon: -73.57, lat: 45.5, inCanada: true, province: 'QC' },
  };
  const collections = { ca: { copyright: '℗ 2026 Republic Records' }, cb: { copyright: '℗ 2026 Columbia' }, cc: { copyright: '℗ 2026 Republic Records' }, cd: { copyright: '℗ 2026 Secret City Records' } };
  const history = { days: [{ date: '2026-11-16', ca: [['a', 3], ['b', 1]] }] };
  const r = analyze({ date: '2026-11-17', charts, artists, collections, history });
  assert.equal(r.pulse.canadianSongs, 3);
  assert.equal(r.pulse.canadianShare, 0.75);
  assert.equal(r.songs[0].move, 2);           // 3 → 1
  assert.equal(r.songs[2].move, 'new');
  assert.equal(r.songs[3].tier, 'independent');
  assert.ok(r.songs[3].canadianLabel);
  assert.deepEqual(r.overIndex.map((s) => s.id), ['a', 'c', 'd']); // US 40 vs CA 1 → gap 39; c, d absent
  assert.equal(r.cities.length, 2);
  assert.ok(r.opportunities.some((o) => o.type === 'homeHeat'));
  assert.ok(r.opportunities.some((o) => o.type === 'climbers'));
  assert.ok(r.opportunities.some((o) => o.type === 'indieCanada'));
});

console.log(`\n${pass} tests passed`);
