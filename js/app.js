import { t, getLang, setLang, MARKET, MARKET_SHORT } from './i18n.js';
import { scatter, dumbbell, columns, map, esc, hideTip } from './charts.js';
import { openPitch, evidenceLines } from './pitch.js';

const $ = (id) => document.getElementById(id);
const state = { kind: 'songs', filter: 'all', q: '', showAll: false, market: 'us' };
let D, GEO;

const fmtPct = (x) => `${Math.round(x * 100)}%`;
const fmtDate = (iso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  new Intl.DateTimeFormat(t().locale, { timeZone: 'UTC', ...opts }).format(new Date(iso));
const img = (u, size = 80) => (u ? u.replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`) : '');
const cityName = (o) => (getLang() === 'fr' ? o.cityFr || o.city : o.city);

function render() {
  const T = t();
  document.documentElement.lang = getLang();
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = T[el.dataset.t]; });
  document.querySelectorAll('.lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === getLang()));
  $('asOf').textContent = T.asOf(fmtDate(D.date, { month: 'long', day: 'numeric', year: 'numeric' }));
  $('toc').innerHTML = Object.entries(T.nav).map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`).join('');
  $('search').placeholder = T.search;
  renderPulse(); renderTable(); renderAway(); renderScenes(); renderLabels(); renderSound(); renderRadar(); renderPitches(); renderMethod();
}

// ------------------------------------------------------------------ pulse
function renderPulse() {
  const T = t(), p = D.pulse;
  const cells = D.songs.map((s) => `<i class="${s.canadian === true ? 'ca' : s.canadian === null ? 'unk' : ''}" title="#${s.rank} ${esc(s.name)}"></i>`).join('');
  let no1 = '';
  if (p.topCanadian) {
    const s = p.topCanadian;
    const parts = Object.entries(s.markets || {}).filter(([, r]) => r).map(([m, r]) => T.inMarket(m, r));
    no1 = T.pulseNo1(s, parts.length ? T.ranksAbroad(parts) : '');
  }
  const usCat = D.age.usTotal ? (D.age.us.catalogue || 0) / D.age.usTotal : null;
  const tiles = [
    [`${p.canadianAlbums}`, T.tiles.albums],
    [`${p.canadianInTop10}`, T.tiles.top10],
    [`${p.canadianArtists}`, T.tiles.artists],
    [fmtPct(p.nonMajorShare), T.tiles.nonMajor],
    [fmtPct(p.catalogueShare), T.tiles.catalogue, usCat != null ? T.tiles.catalogueSub(fmtPct(usCat)) : ''],
  ];
  $('pulse').innerHTML = `
    <div class="kicker">${esc(T.pulseKicker)}</div>
    <div class="hero">
      <div class="hero-num">${p.canadianSongs}<small>/${p.songs}</small></div>
      <div class="hero-text">${esc(T.pulseHead(p.canadianSongs, p.songs))}</div>
      <div class="hero-meter" aria-hidden="true">${cells}</div>
    </div>
    <p class="no1">${esc(no1)}</p>
    <div class="tiles">${tiles.map(([v, l, s]) => `<div class="tile"><div class="v">${v}</div><div class="l">${esc(l)}</div>${s ? `<div class="s">${esc(s)}</div>` : ''}</div>`).join('')}</div>
    <div class="coverage">${esc(T.coverage(p.coverage, p.unknownArtists.length ? [...new Set(p.unknownArtists)].join(', ') : ''))}</div>`;
}

// ------------------------------------------------------------------ chart table
const FILTERS = {
  all: () => true,
  canadian: (s) => s.canadian === true,
  bigger: (s) => s.markets && s.markets.us !== undefined && (s.markets.us === null || s.markets.us - s.rank >= 25),
  indie: (s) => s.tier === 'independent' || s.tier === 'major-distributed',
  new: (s) => s.bucket === 'new',
  catalogue: (s) => s.bucket === 'catalogue',
};
function renderTable() {
  const T = t();
  const rows0 = state.kind === 'songs' ? D.songs : D.albums;
  const fkeys = state.kind === 'songs' ? Object.keys(FILTERS) : Object.keys(FILTERS).filter((k) => k !== 'bigger');
  if (!fkeys.includes(state.filter)) state.filter = 'all';
  $('kindSeg').innerHTML = ['songs', 'albums'].map((k) => `<button role="tab" aria-selected="${state.kind === k}" class="${state.kind === k ? 'on' : ''}" data-k="${k}">${esc(T[k])}</button>`).join('');
  $('kindSeg').querySelectorAll('button').forEach((b) => b.onclick = () => { state.kind = b.dataset.k; state.showAll = false; renderTable(); });
  $('filterChips').innerHTML = fkeys.map((k) => `<button class="chip ${state.filter === k ? 'on' : ''}" data-f="${k}">${esc(T.filters[k])}<span class="n">${rows0.filter(FILTERS[k]).length}</span></button>`).join('');
  $('filterChips').querySelectorAll('button').forEach((b) => b.onclick = () => { state.filter = b.dataset.f; state.showAll = state.filter !== 'all'; renderTable(); });

  const q = state.q;
  const rows = rows0.filter(FILTERS[state.filter]).filter((s) => !q || `${s.name} ${s.artist} ${s.label || ''}`.toLowerCase().includes(q));
  const shown = state.showAll ? rows : rows.slice(0, 25);
  const songs = state.kind === 'songs';
  const head = `<thead><tr><th class="num">${T.cols.rank}</th><th>${T.cols.title}</th><th class="hide-sm">${T.cols.genre}</th><th>${T.cols.released}</th><th>${T.cols.label}</th>${songs ? `<th>${T.cols.abroad}</th>` : ''}</tr></thead>`;
  const body = shown.map((s) => {
    const mv = s.move === 'new' ? `<span class="move new">${T.newEntry}</span>`
      : typeof s.move === 'number' && s.move !== 0 ? `<span class="move ${s.move > 0 ? 'up' : 'down'}">${s.move > 0 ? '▲' : '▼'}${Math.abs(s.move)}</span>` : '';
    const origin = s.canadian === true ? `<div class="ca-tag">${esc(T.canadianFrom(cityName(s)))}</div>` : s.canadian === null ? `<div class="unv">${T.unverified}</div>` : '';
    const abroad = songs ? `<td><div class="abroad">${['us', 'gb', 'au', 'fr'].map((m) => {
      const r = s.markets[m];
      if (r === undefined) return '';
      return `<span class="mk ${r == null ? 'none' : ''}" title="${esc(MARKET[getLang()][m])}"><small>${MARKET_SHORT[m]}</small><b>${r == null ? '—' : r}</b></span>`;
    }).join('')}</div></td>` : '';
    return `<tr class="${s.canadian === true ? 'is-ca' : ''}">
      <td class="num"><span class="rank">${s.rank}</span>${mv}</td>
      <td><div class="song"><img loading="lazy" alt="" src="${esc(img(s.art))}"><div>
        <div class="t"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></div>
        <div class="a">${esc(s.artist)}</div>${origin}</div></div></td>
      <td class="hide-sm small">${esc(s.genre || '—')}</td>
      <td class="age">${s.releaseDate ? `<b>${fmtDate(s.releaseDate)}</b>${esc(T.age[s.bucket] || '')}` : '—'}</td>
      <td class="lab">${esc(s.label || '—')}${s.canadianLabel ? `<span class="flag-lab">●</span>` : ''}<br>
        <span class="tier"><i class="ti-${s.tier}"></i>${esc(T.tier[s.tier] || '')}${s.group ? ` · ${esc(s.group)}` : ''}</span></td>
      ${abroad}</tr>`;
  }).join('');
  $('chartTable').innerHTML = head + `<tbody>${body || `<tr><td colspan="6" class="empty">${esc(T.noRows)}</td></tr>`}</tbody>`;
  $('moreBtn').hidden = rows.length <= 25;
  $('moreBtn').textContent = state.showAll ? T.showLess : T.showAll(rows.length);
}

// ------------------------------------------------------------------ home & away
function renderAway() {
  const T = t(), L = getLang();
  const markets = D.marketsAvailable.filter((m) => m !== 'ca');
  if (!markets.includes(state.market)) state.market = markets[0];
  $('marketSel').innerHTML = markets.map((m) => `<option value="${m}" ${m === state.market ? 'selected' : ''}>${esc(MARKET[L][m])}</option>`).join('');
  $('awayLegend').innerHTML = `<span><i style="background:var(--ca)"></i>${esc(T.legendCA)}</span><span><i style="background:var(--other)"></i>${esc(T.legendOther)}</span>`;
  scatter($('scatter'), {
    rows: D.homeAway, market: state.market,
    labels: {
      title: T.awayTitle, notCharting: T.notCharting, biggerHere: T.biggerHere, biggerThere: T.biggerThere(state.market),
      axisX: T.axisCA, axisY: T.axisOther(state.market), ca: 'CA', market: MARKET_SHORT[state.market],
    },
  });
  $('staleNote').textContent = D.stale && D.stale[state.market] ? T.staleNote(state.market, D.stale[state.market]) : '';
  $('exports').innerHTML = D.exports.slice(0, 8).map((e) => `
    <li><img loading="lazy" alt="" src="${esc(img(e.art))}"><div><div class="t">${esc(e.name)}</div><div class="a">${esc(e.artist)}</div></div>
      <div class="abroad">${['ca', 'us', 'gb', 'au', 'fr'].filter((m) => e.ranks[m]).map((m) => `<span class="mk"><small>${MARKET_SHORT[m]}</small><b>${e.ranks[m]}</b></span>`).join('')}</div></li>`).join('');
}

// ------------------------------------------------------------------ scenes
function renderScenes() {
  const T = t(), L = getLang();
  const highlight = (city) => document.querySelectorAll('.city').forEach((c) => c.classList.toggle('hl', c.dataset.city === city));
  map($('map'), { geo: GEO, cities: D.cities, lang: L, onHover: highlight, labels: { title: T.scenesTitle } });
  const prov = (code) => { const p = GEO.provinces.find((x) => x.code === code); return p ? (L === 'fr' ? p.fr : p.en) : ''; };
  $('cityList').innerHTML = D.cities.map((c) => `
    <div class="city" data-city="${esc(c.city)}">
      <h4>${esc(cityName(c))}<span>${esc(prov(c.province))} · ${esc(T.artistsN(c.artists.length))}</span></h4>
      <ul>${c.artists.map((a) => `<li><b>${esc(a.name)}</b>${a.songs.length ? ` — ${a.songs.slice(0, 2).map((s) => `${esc(s.name)} (#${s.rank})`).join(', ')}` : ''}</li>`).join('')}</ul>
    </div>`).join('');
  document.querySelectorAll('.city').forEach((el) => {
    const mark = (on) => document.querySelectorAll('svg .city').forEach((d) => { d.style.stroke = on && d.dataset.city === el.dataset.city ? 'var(--ink)' : ''; });
    el.addEventListener('pointerenter', () => mark(true));
    el.addEventListener('pointerleave', () => mark(false));
  });
}

// ------------------------------------------------------------------ labels
function renderLabels() {
  const T = t();
  const tiers = ['major', 'major-distributed', 'independent'];
  const bar = (counts, title) => {
    const total = tiers.reduce((s, k) => s + (counts[k] || 0), 0) || 1;
    return `<div class="tbar"><div class="cap"><b>${esc(title)}</b><span class="muted">${esc(T.songsN(total))}</span></div>
      <div class="bar" role="img" aria-label="${esc(title)}: ${tiers.map((k) => `${T.tier[k]} ${counts[k] || 0}`).join(', ')}">
      ${tiers.filter((k) => counts[k]).map((k) => { const sh = counts[k] / total; return `<div class="ti-${k}" style="flex:${counts[k]}" title="${esc(T.tier[k])}: ${counts[k]} (${fmtPct(sh)})">${sh >= 0.12 ? fmtPct(sh) : ''}</div>`; }).join('')}
      </div></div>`;
  };
  const legend = `<div class="legend">${tiers.map((k) => `<span><i class="sq ti-${k}"></i>${esc(T.tier[k])}</span>`).join('')}</div>`;
  const groups = ['Universal', 'Sony', 'Warner', null];
  const cnt = (rows, g) => rows.filter((x) => (x.group || null) === g && x.tier !== 'unknown').length;
  const ca = D.songs.filter((x) => x.canadian === true);
  const parent = `<table class="parent"><thead><tr><th>${esc(T.parentCo)}</th><th>${esc(T.barAll)}</th><th>${esc(T.barCA)}</th></tr></thead><tbody>${groups.map((g) =>
    `<tr><td>${esc(g || T.tier.independent)}</td><td>${cnt(D.songs, g)}</td><td>${cnt(ca, g)}</td></tr>`).join('')}</tbody></table>`;
  $('tierBars').innerHTML = legend + bar(D.labels.all, T.barAll) + bar(D.labels.canadian, T.barCA) + parent;
  $('labelList').innerHTML = D.labels.top.slice(0, 10).map((l) => `
    <li><span class="nm">${esc(l.label)}${l.canadianLabel ? `<span class="badge">${esc(T.canadianLabel)}</span>` : ''}</span>
      <span class="ct">${esc(T.songsN(l.n))}</span>
      <span class="sub"><span class="tier"><i class="ti-${l.tier}"></i>${esc(T.tier[l.tier])}${l.group ? ` · ${esc(l.group)}` : ''}</span> · ${esc(l.artists.slice(0, 3).join(', '))}</span></li>`).join('');
}

// ------------------------------------------------------------------ sound
function renderSound() {
  const T = t();
  const leg = `<span><i style="background:var(--ca)"></i>${esc(T.ca)}</span><span><i style="background:var(--other)"></i>${esc(T.us)}</span>`;
  $('genreLegend').innerHTML = leg; $('ageLegend').innerHTML = leg;
  dumbbell($('genres'), { rows: D.genres, labels: { title: T.genreTitle, ca: T.ca, us: T.us }, fmt: fmtPct });
  const lean = [...D.genres].sort((a, b) => b.diff - a.diff)[0];
  $('genreNote').textContent = lean && lean.diff > 0.03 ? T.leans(lean.genre, lean.diff) : '';
  const total = D.songs.length || 1, usTotal = D.age.usTotal || 1;
  columns($('ages'), {
    groups: ['new', 'recent', 'established', 'catalogue'].map((k) => ({ label: T.age[k], ca: (D.age.ca[k] || 0) / total, us: (D.age.us[k] || 0) / usTotal })),
    labels: { title: T.ageTitle, ca: T.ca, us: T.us }, fmt: fmtPct,
  });
}

// ------------------------------------------------------------------ release radar
function renderRadar() {
  const T = t();
  const cols = ['upcoming', 'thisWeek', 'recent'];
  $('radarList').innerHTML = cols.map((w) => {
    const items = D.radar.filter((r) => r.when === w).sort((a, b) => (w === 'upcoming' ? a.days - b.days : b.days - a.days)).slice(0, 8);
    return `<div class="radar-col"><h3>${esc(T.when[w])}</h3>${items.map((r) => `
      <a class="rel" href="${esc(r.url)}" target="_blank" rel="noopener">
        <img loading="lazy" alt="" src="${esc(img(r.art, 120))}">
        <div><div class="d">${fmtDate(r.releaseDate)} · ${esc(r.days > 0 ? T.inDays(r.days) : T.daysAgo(-r.days))}</div>
          <div class="t">${esc(r.name)}</div><div class="a">${esc(r.artistName)} · ${esc(T.kind[r.type])}</div>
          <div class="tags">${(r.watch || []).map((w) => `<span class="tag ${w}">${esc(T.tags[w])}</span>`).join('')}${r.label ? `<span class="tag">${esc(r.label)}</span>` : ''}</div></div>
      </a>`).join('') || `<p class="muted small">—</p>`}</div>`;
  }).join('');
}

// ------------------------------------------------------------------ opportunities
function renderPitches() {
  const T = t();
  $('oppGrid').innerHTML = D.opportunities.map((o, i) => {
    const c = T.opp[o.type](o.params, T);
    const ev = evidenceLines(o, T).slice(0, 4);
    const covers = o.tracks.filter((x) => x.art).slice(0, 5);
    return `<article class="opp">
      <div class="fmt">${esc(c.format)}</div>
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.dek)}</p>
      <ul class="ev">${ev.map(([a, b]) => `<li><span>${esc(a)}</span><span>${esc(b)}</span></li>`).join('')}</ul>
      <div class="foot"><div class="covers">${covers.map((x) => `<img alt="" loading="lazy" src="${esc(img(x.art, 60))}">`).join('')}</div>
        <span>${esc(T.tracksN(o.tracks.length))}</span>
        <button class="btn" data-i="${i}">${esc(T.draft)}</button></div>
    </article>`;
  }).join('');
  $('oppGrid').querySelectorAll('button[data-i]').forEach((b) => b.onclick = () =>
    openPitch(D.opportunities[+b.dataset.i], { T, date: D.date, dateLabel: fmtDate(D.date, { month: 'long', day: 'numeric', year: 'numeric' }) }));
}

// ------------------------------------------------------------------ method
function renderMethod() {
  const T = t(), s = D.sources;
  $('methodList').innerHTML = T.method.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const L = getLang();
  $('sourceStats').textContent = L === 'fr'
    ? `Artistes du palmarès canadien vérifiés : ${s.artistsKnown}/${s.artistsTotal} (Wikidata ${s.bySource.wikidata || 0}, MusicBrainz ${s.bySource.musicbrainz || 0}) · anciens du Polaris suivis : ${s.polaris} · jours d’historique : ${D.historyDays} · généré le ${new Date(D.generated).toLocaleString('fr-CA')}`
    : `Canadian-chart artists verified: ${s.artistsKnown}/${s.artistsTotal} (Wikidata ${s.bySource.wikidata || 0}, MusicBrainz ${s.bySource.musicbrainz || 0}) · Polaris alumni tracked: ${s.polaris} · days of history: ${D.historyDays} · generated ${new Date(D.generated).toLocaleString('en-CA')}`;
}

// ------------------------------------------------------------------ boot (last, so every renderer above is defined)
const [data, geo] = await Promise.all([
  fetch('data/latest.json', { cache: 'no-cache' }).then((r) => r.json()),
  fetch('assets/canada-map.json').then((r) => r.json()),
]);
D = data; GEO = geo;
render();

document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => { setLang(b.dataset.lang); render(); }));
$('search').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); state.showAll = true; renderTable(); });
$('moreBtn').addEventListener('click', () => { state.showAll = !state.showAll; renderTable(); });
$('marketSel').addEventListener('change', (e) => { state.market = e.target.value; renderAway(); });
addEventListener('scroll', hideTip, { passive: true });

// highlight the section in view
const io = new IntersectionObserver((entries) => {
  for (const en of entries) if (en.isIntersecting) document.querySelectorAll('#toc a').forEach((a) => a.classList.toggle('on', a.hash === `#${en.target.id}`));
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('main .section').forEach((s) => io.observe(s));
