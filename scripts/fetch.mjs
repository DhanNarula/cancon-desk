#!/usr/bin/env node
// CanCon Desk — daily data pipeline.
//
//  1. Charts     Apple Music "most played" public feeds: Canada (songs + albums)
//                and comparison markets (US, UK, Australia, France).
//  2. Artists    Who is Canadian, and from where? Wikidata, joined on the exact
//                Apple Music artist ID (P2850); MusicBrainz as a fallback.
//                Cached for 30 days. Hand corrections live in editorial/overrides.json.
//  3. Labels     Copyright lines from the Apple catalog → label + ownership tier.
//  4. Releases   Recent and upcoming releases for Canadian chart artists, Polaris
//                Music Prize alumni (from Wikidata), and the editor's watchlist.
//  5. History    Rank history for movement / debuts / days-on-chart.
//  6. Analysis   js/shared/analyze.js → data/latest.json (what the site reads).

import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getJSON, sparql, chunk } from './lib/http.mjs';
import { provinceAt, CITIES } from '../js/shared/geo.js';
import { analyze } from '../js/shared/analyze.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const RSS = 'https://rss.marketingtools.apple.com/api/v2';
const MARKETS = ['ca', 'us', 'gb', 'au', 'fr'];
const DATE = process.env.CANCON_DATE || new Date().toISOString().slice(0, 10);
const DAY = 86400000;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const readJSON = async (p, dflt) => { try { return JSON.parse(await fs.readFile(ROOT + p, 'utf8')); } catch { return dflt; } };
const writeJSON = (p, d) => fs.writeFile(ROOT + p, JSON.stringify(d) + '\n');
const daysSince = (iso) => (iso ? (Date.parse(DATE) - Date.parse(iso)) / DAY : Infinity);
const split = (s) => (s ? s.split('|').filter(Boolean) : []);
const pt = (s) => { const m = s && s.match(/Point\(([-\d.eE]+) ([-\d.eE]+)\)/); return m ? [+m[1], +m[2]] : null; };

// ----------------------------------------------------------------------------- 1. charts
async function chart(market, kind) {
  const d = await getJSON(`${RSS}/${market}/music/most-played/100/${kind}.json`, { tries: 6, timeout: 45000 });
  return {
    updated: d.feed.updated,
    items: d.feed.results.map((r, i) => ({
      rank: i + 1, id: r.id, name: r.name, artist: r.artistName, artistId: r.artistId || null,
      releaseDate: r.releaseDate || null,
      genres: (r.genres || []).map((g) => g.name).filter((n) => n !== 'Music'),
      collectionId: kind === 'songs' ? ((r.url || '').match(/album\/[^/]+\/(\d+)/) || [])[1] || null : r.id,
      url: r.url, art: r.artworkUrl100,
    })),
  };
}

// The public feeds are occasionally slow. Canada is required (we exit without
// touching any data if it fails, and the next scheduled run tries again).
// A comparison market that fails falls back to its most recent snapshot (≤3 days), flagged as stale.
async function lastSnapshotFor(market) {
  const files = (await fs.readdir(ROOT + 'data/snapshots').catch(() => [])).filter((f) => f.endsWith('.json') && f < `${DATE}.json`).sort().reverse();
  for (const f of files.slice(0, 3)) {
    const snap = await readJSON(`data/snapshots/${f}`, null);
    if (snap?.charts?.[market]?.songs) return { date: snap.date, songs: snap.charts[market].songs };
  }
  return null;
}
log('charts…');
const charts = {};
const feedUpdated = {};
const stale = {};
for (const m of MARKETS) {
  try {
    const c = await chart(m, 'songs');
    charts[m] = { songs: c.items };
    feedUpdated[m] = c.updated;
  } catch (e) {
    if (m === 'ca') { console.error(`Canadian chart unavailable (${e.message}); leaving data untouched.`); process.exit(1); }
    const prev = await lastSnapshotFor(m);
    if (prev) { charts[m] = { songs: prev.songs }; stale[m] = prev.date; log(`  ! ${m} unavailable (${e.message}); using snapshot from ${prev.date}`); }
    else log(`  ! ${m} unavailable today (${e.message}); continuing without it`);
  }
}
try { charts.ca.albums = (await chart('ca', 'albums')).items; }
catch (e) {
  const files = (await fs.readdir(ROOT + 'data/snapshots').catch(() => [])).filter((f) => f < `${DATE}.json`).sort().reverse();
  const snap = files.length ? await readJSON(`data/snapshots/${files[0]}`, null) : null;
  if (!snap?.charts?.ca?.albums) { console.error(`Canadian album chart unavailable (${e.message}); leaving data untouched.`); process.exit(1); }
  charts.ca.albums = snap.charts.ca.albums; stale.caAlbums = snap.date;
  log(`  ! ca albums unavailable (${e.message}); using snapshot from ${snap.date}`);
}
log(`  markets: ${Object.keys(charts).join(', ')}`);

// ----------------------------------------------------------------------------- 2. artists
const provinces = (await readJSON('data/ref/provinces.json', { provinces: [] })).provinces;
const overrides = await readJSON('editorial/overrides.json', { artists: {} });
const cache = await readJSON('data/cache/artists.json', {});
const names = new Map();
// An artist ID can appear under combined credits ("Drake & Majid Jordan"); keep the plainest name.
for (const m of Object.keys(charts)) for (const kind of ['songs', 'albums']) for (const s of charts[m][kind] || []) {
  if (!s.artistId) continue;
  const prev = names.get(s.artistId);
  if (!prev || s.artist.length < prev.length) names.set(s.artistId, s.artist);
}
const caIds = new Set([...charts.ca.songs, ...charts.ca.albums].map((s) => s.artistId).filter(Boolean));

const wdQuery = (ids) => `
SELECT ?am ?a ?aLabel
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?type), "entity/"); separator="|") AS ?types)
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?cit), "entity/"); separator="|") AS ?cits)
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?orig), "entity/"); separator="|") AS ?origs)
  (SAMPLE(?fl) AS ?formedIn) (SAMPLE(?flfr) AS ?formedInFr) (SAMPLE(?fco) AS ?formedCoord) (SAMPLE(STRAFTER(STR(?fc), "entity/")) AS ?formedCountry)
  (SAMPLE(?bl) AS ?bornIn) (SAMPLE(?blfr) AS ?bornInFr) (SAMPLE(?bco) AS ?bornCoord) (SAMPLE(STRAFTER(STR(?bc), "entity/")) AS ?bornCountry)
  (MIN(YEAR(?start)) AS ?since)
WHERE {
  VALUES ?am { ${ids.map((i) => `"${i}"`).join(' ')} }
  ?a wdt:P2850 ?am .
  OPTIONAL { ?a wdt:P31 ?type }
  OPTIONAL { ?a wdt:P27 ?cit }
  OPTIONAL { ?a wdt:P495 ?orig }
  OPTIONAL { ?a wdt:P740 ?fp . ?fp wdt:P625 ?fco .
    OPTIONAL { ?fp rdfs:label ?fl FILTER(LANG(?fl) = "en") } OPTIONAL { ?fp rdfs:label ?flfr FILTER(LANG(?flfr) = "fr") }
    OPTIONAL { ?fp wdt:P17 ?fc } }
  OPTIONAL { ?a wdt:P19 ?bp . ?bp wdt:P625 ?bco .
    OPTIONAL { ?bp rdfs:label ?bl FILTER(LANG(?bl) = "en") } OPTIONAL { ?bp rdfs:label ?blfr FILTER(LANG(?blfr) = "fr") }
    OPTIONAL { ?bp wdt:P17 ?bc } }
  OPTIONAL { { ?a wdt:P2031 ?start } UNION { ?a wdt:P571 ?start } UNION { ?a wdt:P569 ?start } }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?am ?a ?aLabel`;

function fromWikidata(r) {
  const cits = split(r.cits), origs = split(r.origs), types = split(r.types);
  const person = types.includes('Q5');
  const formedCA = r.formedCountry === 'Q16', bornCA = r.bornCountry === 'Q16';
  let canadian = null, basis = null;
  if (cits.includes('Q16')) { canadian = true; basis = 'citizenship'; }
  else if (origs.includes('Q16')) { canadian = true; basis = 'origin'; }
  else if (!person && formedCA) { canadian = true; basis = 'formed'; }
  else if (bornCA) { canadian = true; basis = 'born'; } // birthright citizenship
  else if (cits.length || origs.length || r.bornCountry || r.formedCountry) { canadian = false; basis = 'wikidata'; }
  const useFormed = (!person && r.formedIn) || (!r.bornIn && r.formedIn);
  const place = useFormed
    ? { city: r.formedIn, cityFr: r.formedInFr, co: pt(r.formedCoord), inCanada: formedCA, placeKind: 'formed' }
    : { city: r.bornIn || null, cityFr: r.bornInFr, co: pt(r.bornCoord), inCanada: bornCA, placeKind: r.bornIn ? 'born' : null };
  return {
    canadian, basis, kind: person ? 'person' : 'group', wikidata: r.a.split('/').pop(), since: r.since ? +r.since : null,
    city: place.city, cityFr: place.cityFr || place.city, lon: place.co?.[0] ?? null, lat: place.co?.[1] ?? null,
    inCanada: place.inCanada, placeKind: place.placeKind, source: 'wikidata',
  };
}

async function fromMusicBrainz(name) {
  const primary = name.split(/\s+(?:&|x|feat\.?|with)\s+|,\s*/i)[0].trim();
  const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '');
  const d = await getJSON(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${primary.replace(/"/g, '')}"`)}&fmt=json&limit=5`);
  const a = (d.artists || []).find((x) => x.score >= 90 && norm(x.name) === norm(primary));
  if (!a) return null;
  const ba = a['begin-area'];
  const city = ba && ba.type !== 'Country' ? ba.name : null;
  const known = city && CITIES[city];
  // Prefer the ISO country; otherwise use the artist's area when it is a country.
  const country = a.country || (a.area && a.area.type === 'Country' ? (a.area.name === 'Canada' ? 'CA' : a.area.name) : null);
  a.country = country;
  return {
    canadian: a.country === 'CA' ? true : a.country ? false : null,
    basis: a.country ? 'musicbrainz' : null, kind: a.type === 'Person' ? 'person' : 'group', mbid: a.id,
    city: known ? city : a.country === 'CA' ? city : null, cityFr: city,
    lon: known ? known[0] : null, lat: known ? known[1] : null, inCanada: Boolean(known) || (a.country === 'CA' && !city),
    placeKind: city ? 'from' : null, source: 'musicbrainz',
  };
}

const toCheck = [...names.keys()].filter((id) => !cache[id] || daysSince(cache[id].checked) > 30);
log(`artists: ${names.size} total, ${toCheck.length} to (re)check`);
for (const ids of chunk(toCheck, 100)) {
  const rows = await sparql(wdQuery(ids));
  const got = new Set();
  for (const r of rows) {
    if (got.has(r.am)) continue;
    got.add(r.am);
    cache[r.am] = { name: r.aLabel && !/^Q\d+$/.test(r.aLabel) ? r.aLabel : names.get(r.am), ...fromWikidata(r), checked: DATE };
  }
  for (const id of ids) if (!got.has(id)) cache[id] = { name: names.get(id), canadian: null, source: 'none', checked: DATE };
}
// MusicBrainz fallback, only for artists on the Canadian charts that Wikidata couldn't place
const needMB = [...caIds].filter((id) => cache[id] && cache[id].source === 'none');
log(`  musicbrainz fallback for ${needMB.length}`);
for (const id of needMB) {
  try {
    const mb = await fromMusicBrainz(names.get(id));
    cache[id] = mb ? { name: names.get(id), ...mb, checked: DATE } : { ...cache[id], source: 'musicbrainz-miss' };
  } catch (e) { log(`  ! musicbrainz ${names.get(id)}: ${e.message}`); }
}
for (const [id, a] of Object.entries(cache)) {
  if (a.inCanada && a.lon != null) a.province = provinceAt(a.lon, a.lat, provinces);
  else if (a.city && CITIES[a.city]) a.province = CITIES[a.city][2];
  if (names.has(id) && (a.source !== 'wikidata' || !a.name)) a.name = names.get(id);
}
for (const [id, o] of Object.entries(overrides.artists || {})) cache[id] = { ...(cache[id] || {}), ...o, source: (cache[id]?.source || 'none') + '+editor', checked: DATE };
await writeJSON('data/cache/artists.json', cache);

// ----------------------------------------------------------------------------- 3. labels
const collCache = await readJSON('data/cache/collections.json', {});
const collIds = [...new Set([...charts.ca.songs.map((s) => s.collectionId), ...charts.ca.albums.map((s) => s.id)].filter(Boolean))]
  .filter((id) => !collCache[id]);
log(`collections: ${collIds.length} new to look up`);
for (const ids of chunk(collIds, 50)) {
  const d = await getJSON(`https://itunes.apple.com/lookup?id=${ids.join(',')}&country=ca`);
  for (const r of d.results || []) {
    if (r.wrapperType !== 'collection') continue;
    collCache[r.collectionId] = { copyright: r.copyright || null, genre: r.primaryGenreName || null, released: r.releaseDate || null, tracks: r.trackCount || null };
  }
}
await writeJSON('data/cache/collections.json', collCache);

// ----------------------------------------------------------------------------- 4. watchlists & releases
let polaris = await readJSON('data/cache/polaris.json', null);
if (!polaris || daysSince(polaris.checked) > 7) {
  log('polaris alumni (wikidata)…');
  const rows = await sparql(`
SELECT ?a ?aLabel (SAMPLE(?am) AS ?apple) (GROUP_CONCAT(DISTINCT ?kind; separator="|") AS ?kinds) (MAX(?y) AS ?year) WHERE {
  { ?a p:P166 ?st . ?st ps:P166 wd:Q685954 . BIND("winner" AS ?kind) }
  UNION { ?a p:P1411 ?st . ?st ps:P1411 wd:Q685954 . BIND("shortlist" AS ?kind) }
  UNION { ?w p:P166 ?st . ?st ps:P166 wd:Q685954 . ?w wdt:P175 ?a . BIND("winner" AS ?kind) }
  UNION { ?w p:P1411 ?st . ?st ps:P1411 wd:Q685954 . ?w wdt:P175 ?a . BIND("shortlist" AS ?kind) }
  OPTIONAL { ?st pq:P585 ?t . BIND(YEAR(?t) AS ?y) }
  OPTIONAL { ?a wdt:P2850 ?am }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?a ?aLabel`);
  const list = [];
  for (const r of rows) {
    let apple = r.apple || null;
    if (!apple) {
      try {
        const d = await getJSON(`https://itunes.apple.com/search?term=${encodeURIComponent(r.aLabel)}&entity=musicArtist&country=ca&limit=5`);
        const hit = (d.results || []).find((x) => x.artistName.toLowerCase() === r.aLabel.toLowerCase());
        apple = hit ? String(hit.artistId) : null;
      } catch { /* skip */ }
    }
    if (apple) list.push({ appleId: apple, name: r.aLabel, wikidata: r.a.split('/').pop(), won: split(r.kinds).includes('winner'), year: r.year ? +r.year : null });
  }
  polaris = { checked: DATE, artists: list };
  await writeJSON('data/cache/polaris.json', polaris);
}
const editorWatch = (await readJSON('editorial/watchlist.json', { artists: [] })).artists || [];

const watch = new Map(); // appleId -> { name, tags }
const addWatch = (id, name, tag) => { if (!id) return; const w = watch.get(id) || { name, tags: [] }; if (!w.tags.includes(tag)) w.tags.push(tag); watch.set(id, w); };
for (const id of caIds) if (cache[id]?.canadian === true) addWatch(id, names.get(id), 'chart');
for (const p of polaris.artists) addWatch(p.appleId, p.name, 'polaris');
for (const e of editorWatch) addWatch(e.appleId, e.name, 'editor');

log(`releases for ${watch.size} artists…`);
const releases = [];
const seen = new Set();
const typeOf = (r) => (/ - Single$/.test(r.collectionName) || r.trackCount <= 3 ? 'single' : / - EP$/.test(r.collectionName) || r.trackCount <= 6 ? 'ep' : 'album');
for (const ids of chunk([...watch.keys()], 10)) {
  let d;
  try { d = await getJSON(`https://itunes.apple.com/lookup?id=${ids.join(',')}&entity=album&country=ca&limit=25`); }
  catch (e) { log(`  ! releases batch failed: ${e.message}`); continue; }
  let current = null;
  for (const r of d.results || []) {
    if (r.wrapperType === 'artist') { current = String(r.artistId); continue; }
    if (r.wrapperType !== 'collection' || !current || !r.releaseDate) continue;
    const days = (Date.parse(r.releaseDate) - Date.parse(DATE)) / DAY;
    if (days < -60 || days > 180) continue;
    const name = r.collectionName.replace(/ - (Single|EP)$/, '');
    const key = `${current}::${name.toLowerCase().replace(/\s*[([].*?[)\]]/g, '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const w = watch.get(current);
    releases.push({
      artistId: current, artistName: w.name, credited: r.artistName, featured: String(r.artistId) !== current,
      collectionId: String(r.collectionId), name, type: typeOf(r), tracks: r.trackCount,
      releaseDate: r.releaseDate, url: r.collectionViewUrl, art: r.artworkUrl100, copyright: r.copyright || null,
      genre: r.primaryGenreName, watch: w.tags,
    });
  }
}
log(`  ${releases.length} releases in window`);

// ----------------------------------------------------------------------------- 5. history
const history = await readJSON('data/history.json', { days: [] });
history.days = history.days.filter((d) => d.date !== DATE);
history.days.push({ date: DATE, ca: charts.ca.songs.map((s) => [s.id, s.rank]), caAlbums: charts.ca.albums.map((s) => [s.id, s.rank]) });
history.days.sort((a, b) => (a.date < b.date ? -1 : 1));
history.days = history.days.slice(-120);
await writeJSON('data/history.json', history);
const slim = (arr) => arr.map(({ rank, id, name, artist, artistId, releaseDate, genres, collectionId }) => ({ rank, id, name, artist, artistId, releaseDate, genres, collectionId }));
await writeJSON(`data/snapshots/${DATE}.json`, { date: DATE, feedUpdated, charts: Object.fromEntries(Object.entries(charts).filter(([m]) => !stale[m]).map(([m, c]) => [m, { songs: slim(c.songs), ...(c.albums ? { albums: slim(c.albums) } : {}) }])) });

// ----------------------------------------------------------------------------- 6. analysis
const used = new Set([...names.keys(), ...watch.keys()]);
const artists = Object.fromEntries(Object.entries(cache).filter(([id]) => used.has(id)));
const analysis = analyze({ date: DATE, charts, artists, collections: collCache, releases, watchlist: polaris.artists, history, labelOverrides: overrides.labels || {} });
const sources = {
  artistsKnown: [...caIds].filter((id) => cache[id]?.canadian !== null).length,
  artistsTotal: caIds.size,
  bySource: [...caIds].reduce((m, id) => { const s = (cache[id]?.source || 'none').replace('-miss', ''); m[s] = (m[s] || 0) + 1; return m; }, {}),
  polaris: polaris.artists.length,
  editorWatch: editorWatch.length,
};
await writeJSON('data/latest.json', { generated: new Date().toISOString(), feedUpdated, stale, sources, ...analysis });

const p = analysis.pulse;
log(`done: ${p.canadianSongs}/${p.songs} Canadian songs · ${p.canadianAlbums}/${p.albums} albums · ` +
  `coverage ${(p.coverage * 100).toFixed(0)}% · ${analysis.cities.length} cities · ${analysis.radar.length} releases · ${analysis.opportunities.length} opportunities`);
