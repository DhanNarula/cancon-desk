// CanCon Desk — the analysis layer.
// Pure functions: the same code runs in the daily pipeline (Node) and is unit
// tested against fixtures. Output is language-neutral; the site renders it in
// English or French.

import { parseCopyright } from './labels.js';

const DAY = 86400000;
export const MARKETS = ['ca', 'us', 'gb', 'au', 'fr'];
export const AGE_BUCKETS = [
  ['new', -Infinity, 30],
  ['recent', 31, 365],
  ['established', 366, 365 * 3],
  ['catalogue', 365 * 3 + 1, Infinity],
];

export const normKey = (name, artist) => {
  const n = (s) => (s || '').toLowerCase()
    .replace(/\s*[([].*?(feat|with|ft\.|remix|version|edit|live).*?[)\]]/g, '')
    .normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '');
  return `${n(name)}::${n((artist || '').split(/,|&| x | feat\.?/i)[0])}`;
};

export function ageBucket(age) {
  if (age == null || Number.isNaN(age)) return null;
  return AGE_BUCKETS.find(([, lo, hi]) => age >= lo && age <= hi)[0];
}

const share = (n, of) => (of ? n / of : 0);
const countBy = (arr, f) => arr.reduce((m, x) => { const k = f(x); if (k != null) m[k] = (m[k] || 0) + 1; return m; }, {});

export function analyze({ date, charts, artists = {}, collections = {}, releases = [], watchlist = [], history = { days: [] }, labelOverrides = {} }) {
  const t0 = Date.parse(date);
  const ageDays = (d) => (d ? Math.round((t0 - Date.parse(d)) / DAY) : null);
  const art = (id) => artists[id] || {};

  // ---------------------------------------------------------------- cross-market index
  const marketIndex = {};
  for (const m of MARKETS) {
    const songs = charts[m]?.songs;
    if (!songs) continue;
    const byId = new Map(), byKey = new Map();
    for (const s of songs) { byId.set(s.id, s.rank); byKey.set(normKey(s.name, s.artist), s.rank); }
    marketIndex[m] = { byId, byKey };
  }
  const rankIn = (m, s) => {
    const ix = marketIndex[m];
    if (!ix) return undefined; // market unavailable today
    return ix.byId.get(s.id) ?? ix.byKey.get(normKey(s.name, s.artist)) ?? null;
  };
  const marketsAvailable = MARKETS.filter((m) => marketIndex[m]);

  // ---------------------------------------------------------------- history / movement
  const prevDay = [...history.days].filter((d) => d.date < date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const prevRank = new Map(prevDay ? prevDay.ca.map(([id, r]) => [id, r]) : []);
  const daysOn = new Map();
  for (const d of history.days) if (d.date <= date) for (const [id] of d.ca) daysOn.set(id, (daysOn.get(id) || 0) + 1);

  // ---------------------------------------------------------------- enriched Canadian chart
  const enrich = (s, kind) => {
    const a = art(s.artistId);
    const coll = collections[kind === 'songs' ? s.collectionId : s.id] || {};
    const lab = parseCopyright(coll.copyright, labelOverrides);
    const age = ageDays(s.releaseDate);
    const prev = prevRank.get(s.id);
    return {
      rank: s.rank, id: s.id, name: s.name, artist: s.artist, artistId: s.artistId, url: s.url, art: s.art,
      releaseDate: s.releaseDate, age, bucket: ageBucket(age),
      genre: (s.genres && s.genres[0]) || coll.genre || null,
      canadian: a.canadian ?? null, basis: a.basis || null, city: a.city || null, cityFr: a.cityFr || null, province: a.province || null,
      label: lab.label, partner: lab.partner, tier: lab.tier, group: lab.group, canadianLabel: lab.canadian, copyright: lab.raw, labelNote: lab.note || null,
      markets: kind === 'songs' ? Object.fromEntries(MARKETS.filter((m) => m !== 'ca').map((m) => [m, rankIn(m, s)])) : null,
      move: prevDay ? (prev == null ? 'new' : prev - s.rank) : null,
      daysOn: daysOn.get(s.id) || 1,
    };
  };
  const songs = (charts.ca?.songs || []).map((s) => enrich(s, 'songs'));
  const albums = (charts.ca?.albums || []).map((s) => enrich(s, 'albums'));

  // ---------------------------------------------------------------- pulse
  const isCA = (x) => x.canadian === true;
  const cSongs = songs.filter(isCA), cAlbums = albums.filter(isCA);
  const known = songs.filter((s) => s.canadian !== null).length;
  const tiersAll = countBy(songs, (s) => s.tier);
  const tiersCA = countBy(cSongs, (s) => s.tier);
  const ageCA = countBy(songs, (s) => s.bucket);
  const usSongs = charts.us?.songs || [];
  const ageUS = countBy(usSongs, (s) => ageBucket(ageDays(s.releaseDate)));
  const pulse = {
    songs: songs.length, albums: albums.length,
    canadianSongs: cSongs.length, canadianAlbums: cAlbums.length,
    canadianShare: share(cSongs.length, songs.length),
    canadianArtists: new Set([...cSongs, ...cAlbums].map((s) => s.artistId)).size,
    topCanadian: cSongs[0] || null,
    topCanadianAlbum: cAlbums[0] || null,
    canadianInTop10: songs.slice(0, 10).filter(isCA).length,
    nonMajorShare: share((tiersAll.independent || 0) + (tiersAll['major-distributed'] || 0), songs.length),
    newShare: share(ageCA.new || 0, songs.length),
    catalogueShare: share(ageCA.catalogue || 0, songs.length),
    coverage: share(known, songs.length),
    unknownArtists: songs.filter((s) => s.canadian === null).map((s) => s.artist),
  };

  // ---------------------------------------------------------------- home & away
  const homeAway = songs.map((s) => ({ rank: s.rank, id: s.id, name: s.name, artist: s.artist, canadian: s.canadian, ...s.markets }));
  // "Bigger here": songs in Canada's top 50 that are absent from, or 25+ places lower on, the US chart.
  const overIndex = songs
    .filter((s) => s.rank <= 50 && s.markets.us !== undefined && (s.markets.us === null || s.markets.us - s.rank >= 25))
    .map((s) => ({ ...s, gap: s.markets.us === null ? null : s.markets.us - s.rank }));

  const exportsMap = new Map();
  for (const m of marketsAvailable) {
    for (const s of charts[m].songs) {
      if (art(s.artistId).canadian !== true) continue;
      const k = normKey(s.name, s.artist);
      if (!exportsMap.has(k)) exportsMap.set(k, { name: s.name, artist: s.artist, artistId: s.artistId, url: s.url, art: s.art, ranks: {} });
      exportsMap.get(k).ranks[m] = s.rank;
    }
  }
  const exportsList = [...exportsMap.values()]
    .map((e) => ({ ...e, abroad: Object.keys(e.ranks).filter((m) => m !== 'ca').length }))
    .filter((e) => e.abroad > 0)
    .sort((a, b) => b.abroad - a.abroad || Math.min(...Object.values(a.ranks)) - Math.min(...Object.values(b.ranks)));

  // ---------------------------------------------------------------- genre mix CA vs US
  const gCA = countBy(songs, (s) => s.genre), gUS = countBy(usSongs, (s) => (s.genres && s.genres[0]) || null);
  const genres = Object.keys({ ...gCA, ...gUS })
    .map((g) => ({ genre: g, ca: share(gCA[g] || 0, songs.length), us: share(gUS[g] || 0, usSongs.length) }))
    .map((g) => ({ ...g, diff: g.ca - g.us }))
    .sort((a, b) => b.ca + b.us - (a.ca + a.us))
    .slice(0, 8);

  // ---------------------------------------------------------------- labels
  const labelMap = new Map();
  for (const s of songs) {
    if (!s.label) continue;
    const k = s.label.toLowerCase();
    if (!labelMap.has(k)) labelMap.set(k, { label: s.label, tier: s.tier, group: s.group, canadianLabel: s.canadianLabel, n: 0, canadianSongs: 0, artists: new Set() });
    const L = labelMap.get(k);
    L.n++; if (isCA(s)) L.canadianSongs++; L.artists.add(s.artist);
  }
  const topLabels = [...labelMap.values()].map((L) => ({ ...L, artists: [...L.artists] })).sort((a, b) => b.n - a.n).slice(0, 12);
  const labels = { all: tiersAll, canadian: tiersCA, top: topLabels, canadianLabels: topLabels.filter((l) => l.canadianLabel) };

  // ---------------------------------------------------------------- scenes (cities)
  const cityMap = new Map();
  for (const s of [...songs, ...albums]) {
    const a = art(s.artistId);
    if (!isCA(s) || !a.city || a.lon == null || !a.inCanada) continue;
    const k = a.city;
    if (!cityMap.has(k)) cityMap.set(k, { city: a.city, cityFr: a.cityFr || a.city, province: a.province, lon: a.lon, lat: a.lat, artists: new Map() });
    const C = cityMap.get(k);
    const cur = C.artists.get(s.artistId) || { id: s.artistId, name: a.name || s.artist, best: Infinity, songs: [] };
    if (s.markets) { cur.best = Math.min(cur.best, s.rank); cur.songs.push({ name: s.name, rank: s.rank, url: s.url, id: s.id }); }
    C.artists.set(s.artistId, cur);
  }
  const cities = [...cityMap.values()]
    .map((c) => ({ ...c, artists: [...c.artists.values()].sort((a, b) => a.best - b.best) }))
    .sort((a, b) => b.artists.length - a.artists.length || a.artists[0].best - b.artists[0].best);
  const provinces = countBy(cities.flatMap((c) => c.artists.map(() => c.province)), (p) => p);

  // ---------------------------------------------------------------- release radar
  const bestRank = new Map();
  for (const s of [...songs, ...albums]) if (!bestRank.has(s.artistId)) bestRank.set(s.artistId, s.rank);
  const radar = releases
    .map((r) => {
      const days = -ageDays(r.releaseDate);
      const lab = parseCopyright(r.copyright, labelOverrides);
      return { ...r, days, when: days > 0 ? 'upcoming' : days >= -7 ? 'thisWeek' : 'recent', tier: lab.tier, label: lab.label, partner: lab.partner, group: lab.group, canadianLabel: lab.canadian, chartRank: bestRank.get(r.artistId) ?? null };
    })
    .filter((r) => r.days <= 180 && r.days >= -60)
    .sort((a, b) => b.days - a.days);

  // ---------------------------------------------------------------- programming opportunities
  const opps = [];
  const partnersOf = (items) => {
    const m = new Map();
    for (const it of items) {
      const who = it.partner || it.label; // licensee first: that's the label team you'd actually call
      if (who) m.set(who, { label: who, group: it.group, tier: it.tier });
    }
    return [...m.values()].slice(0, 6);
  };
  const track = (s) => ({ name: s.name, artist: s.artist, url: s.url, rank: s.rank ?? null, art: s.art, id: s.id });

  const homeHeat = overIndex.slice(0, 15);
  if (homeHeat.length >= 3) {
    opps.push({
      id: 'home-heat', type: 'homeHeat', priority: 80 + homeHeat.length,
      params: { n: overIndex.length, canadian: overIndex.filter(isCA).length, absentUS: overIndex.filter((s) => s.gap === null).length },
      evidence: homeHeat.slice(0, 5).map((s) => ({ song: s.name, artist: s.artist, ca: s.rank, us: s.markets.us })),
      tracks: homeHeat.map(track), partners: partnersOf(homeHeat),
    });
  }

  const climbers = songs.filter((s) => isCA(s) && (s.move === 'new' || (typeof s.move === 'number' && s.move >= 5)));
  if (climbers.length) {
    opps.push({
      id: 'climbers', type: 'climbers', priority: 88,
      params: { n: climbers.length, debuts: climbers.filter((s) => s.move === 'new').length },
      evidence: climbers.slice(0, 5).map((s) => ({ song: s.name, artist: s.artist, ca: s.rank, move: s.move })),
      tracks: climbers.map(track), partners: partnersOf(climbers),
    });
  }

  const windowArtists = new Set();
  for (const r of radar.filter((r) => (r.when === 'upcoming' && r.days <= 45) || r.when === 'thisWeek')) {
    if (windowArtists.has(r.artistId) || windowArtists.size >= 4) continue;
    windowArtists.add(r.artistId);
    const watch = (r.watch || []).includes('chart') ? 'chart' : (r.watch || [])[0];
    opps.push({
      id: `release-${r.collectionId}`, type: 'releaseWindow',
      priority: (r.when === 'upcoming' ? 92 : 86) - (r.chartRank ? r.chartRank / 10 : 12),
      params: { artist: r.artistName, title: r.name, date: r.releaseDate.slice(0, 10), days: r.days, kind: r.type, chartRank: r.chartRank, watch },
      evidence: [{ release: r.name, artist: r.artistName, date: r.releaseDate.slice(0, 10), label: r.label, tier: r.tier }],
      tracks: songs.filter((s) => s.artistId === r.artistId).map(track),
      partners: partnersOf([r]), url: r.url, art: r.art,
    });
  }

  for (const c of cities.filter((c) => c.artists.length >= 2).slice(0, 3)) {
    const tr = c.artists.flatMap((a) => a.songs.slice(0, 2).map((s) => ({ ...s, artist: a.name })));
    const items = songs.filter((s) => c.artists.some((a) => a.id === s.artistId));
    opps.push({
      id: `scene-${c.city}`, type: 'scene', priority: 60 + c.artists.length * 4,
      params: { city: c.city, cityFr: c.cityFr, province: c.province, artists: c.artists.length },
      evidence: c.artists.slice(0, 6).map((a) => ({ artist: a.name, best: Number.isFinite(a.best) ? a.best : null })),
      tracks: tr, partners: partnersOf(items),
    });
  }

  for (const g of genres.filter((g) => g.diff >= 0.05).sort((a, b) => b.diff - a.diff).slice(0, 2)) {
    const items = songs.filter((s) => s.genre === g.genre);
    opps.push({
      id: `genre-${g.genre}`, type: 'genreLean', priority: 70 + Math.round(g.diff * 100),
      params: { genre: g.genre, ca: g.ca, us: g.us, n: items.length, canadian: items.filter(isCA).length },
      evidence: items.slice(0, 5).map((s) => ({ song: s.name, artist: s.artist, ca: s.rank, us: s.markets.us, canadian: s.canadian })),
      tracks: items.slice(0, 20).map(track), partners: partnersOf(items),
    });
  }

  const indie = cSongs.filter((s) => s.tier !== 'major' && s.tier !== 'unknown');
  if (indie.length) {
    opps.push({
      id: 'indie-canada', type: 'indieCanada', priority: 74,
      params: { n: indie.length, of: cSongs.length },
      evidence: indie.slice(0, 5).map((s) => ({ song: s.name, artist: s.artist, ca: s.rank, label: s.label, tier: s.tier })),
      tracks: indie.map(track), partners: partnersOf(indie),
    });
  }

  const exportHits = exportsList.filter((e) => e.abroad >= 2);
  if (exportHits.length >= 2) {
    opps.push({
      id: 'exports', type: 'exports', priority: 66,
      params: { n: exportHits.length, markets: marketsAvailable.filter((m) => m !== 'ca').length },
      evidence: exportHits.slice(0, 5).map((e) => ({ song: e.name, artist: e.artist, ranks: e.ranks })),
      tracks: exportHits.map((e) => ({ name: e.name, artist: e.artist, url: e.url, art: e.art, rank: e.ranks.ca ?? null })),
      partners: [],
    });
  }

  const catalogue = songs.filter((s) => s.rank <= 50 && s.bucket === 'catalogue');
  if (catalogue.length >= 2) {
    opps.push({
      id: 'catalogue', type: 'catalogue', priority: 58,
      params: { n: catalogue.length, oldest: Math.max(...catalogue.map((s) => Math.floor(s.age / 365))) },
      evidence: catalogue.slice(0, 5).map((s) => ({ song: s.name, artist: s.artist, ca: s.rank, year: s.releaseDate ? s.releaseDate.slice(0, 4) : null })),
      tracks: catalogue.map(track), partners: partnersOf(catalogue),
    });
  }

  const polarisNew = radar.filter((r) => (r.watch || []).includes('polaris') && r.days <= 0);
  if (polarisNew.length >= 2) {
    opps.push({
      id: 'polaris', type: 'polaris', priority: 54,
      params: { n: polarisNew.length },
      evidence: polarisNew.slice(0, 5).map((r) => ({ release: r.name, artist: r.artistName, date: r.releaseDate.slice(0, 10) })),
      tracks: polarisNew.map((r) => ({ name: r.name, artist: r.artistName, url: r.url, art: r.art })),
      partners: partnersOf(polarisNew),
    });
  }
  opps.sort((a, b) => b.priority - a.priority);

  return {
    date, marketsAvailable, pulse, songs, albums,
    homeAway, overIndex: overIndex.map(track).map((t, i) => ({ ...t, us: overIndex[i].markets.us, canadian: overIndex[i].canadian })),
    exports: exportsList.slice(0, 20), genres,
    age: { ca: ageCA, us: ageUS, usTotal: usSongs.length },
    labels, cities, provinces, radar, opportunities: opps,
    hasHistory: Boolean(prevDay), historyDays: history.days.length,
    watchlist,
  };
}
