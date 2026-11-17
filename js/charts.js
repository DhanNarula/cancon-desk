// Hand-built SVG charts. Thin marks, recessive grids, a hover layer on every mark.

import { toView } from './shared/geo.js';

const NS = 'http://www.w3.org/2000/svg';
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function svg(w, h, label) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', `0 0 ${w} ${h}`);
  s.setAttribute('role', 'img');
  if (label) s.setAttribute('aria-label', label);
  return s;
}
function add(parent, tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  parent.appendChild(n);
  return n;
}

// ------------------------------------------------------------------ tooltip
const tip = () => document.getElementById('tip');
export function showTip(html, ev) {
  const el = tip();
  el.innerHTML = html;
  el.hidden = false;
  const pad = 14, r = el.getBoundingClientRect();
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - pad;
  if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - pad;
  el.style.left = `${x}px`; el.style.top = `${y}px`;
}
export const hideTip = () => { tip().hidden = true; };
function hover(node, html) {
  node.addEventListener('pointermove', (e) => showTip(typeof html === 'function' ? html() : html, e));
  node.addEventListener('pointerleave', hideTip);
}

// ------------------------------------------------------------------ home & away scatter
export function scatter(box, { rows, market, labels }) {
  const W = 640, H = 460, m = { l: 46, r: 18, t: 18, b: 70 };
  const band = 34;                       // "not charting" band beneath the plot
  const pw = W - m.l - m.r, ph = H - m.t - m.b - band - 10;
  const x = (r) => m.l + ((r - 1) / 99) * pw;
  const y = (r) => m.t + ((r - 1) / 99) * ph;
  const s = svg(W, H, labels.title);

  for (const v of [1, 25, 50, 75, 100]) {
    add(s, 'line', { class: 'grid', x1: x(v), x2: x(v), y1: m.t, y2: m.t + ph });
    add(s, 'line', { class: 'grid', x1: m.l, x2: m.l + pw, y1: y(v), y2: y(v) });
    add(s, 'text', { x: x(v), y: H - m.b + 18 + band - 10, 'text-anchor': 'middle' }, v);
    add(s, 'text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, v);
  }
  const bandY = m.t + ph + 10;
  add(s, 'rect', { class: 'band', x: m.l, y: bandY, width: pw, height: band, rx: 6 });
  add(s, 'text', { x: m.l + pw - 8, y: bandY - 6, 'text-anchor': 'end', class: 'lbl' }, `${labels.notCharting} ↓`);
  add(s, 'line', { class: 'axis', x1: x(1), y1: y(1), x2: x(100), y2: y(100), 'stroke-dasharray': '0' });
  add(s, 'text', { x: m.l + pw - 4, y: m.t + 14, 'text-anchor': 'end', class: 'lbl' }, `↗ ${labels.biggerThere}`);
  add(s, 'text', { x: x(4), y: y(78), class: 'lbl-strong' }, `${labels.biggerHere} ↙`);
  add(s, 'text', { x: m.l + pw / 2, y: H - 8, 'text-anchor': 'middle', class: 'lbl' }, labels.axisX);
  add(s, 'text', { x: 12, y: m.t + ph / 2, 'text-anchor': 'middle', class: 'lbl', transform: `rotate(-90 12 ${m.t + ph / 2})` }, labels.axisY);

  // other artists first, Canadian on top
  const sorted = [...rows].sort((a, b) => (a.canadian === true) - (b.canadian === true));
  const pos = (r) => {
    const o = r[market];
    const jitter = ((r.rank * 37) % 17) - 8;
    return [x(r.rank), o == null ? bandY + band / 2 + jitter * 1.2 : y(o)];
  };
  for (const r of sorted) {
    const [cx, cy] = pos(r);
    const ca = r.canadian === true;
    const g = add(s, 'g');
    add(g, 'circle', { class: 'dot', cx, cy, r: ca ? 5.5 : 4.5, fill: ca ? 'var(--ca)' : 'var(--other)', 'fill-opacity': ca ? 1 : 0.75 });
    const hit = add(g, 'circle', { class: 'hit', cx, cy, r: 10 });
    hover(hit, () => `<b>${esc(r.name)}</b><br>${esc(r.artist)}<br><span class="sw" style="background:${ca ? 'var(--ca)' : 'var(--other)'}"></span>${labels.ca} #${r.rank} · ${labels.market} ${r[market] == null ? '—' : '#' + r[market]}`);
  }
  // direct labels: up to 3 Canadian songs that chart in both markets but rank much higher at home
  // (songs in the not-charting band stay unlabelled; the tooltip carries them)
  const top = rows.filter((r) => r.canadian === true && r[market] != null).map((r) => ({ r, gap: r[market] - r.rank })).filter((d) => d.gap > 15)
    .sort((a, b) => b.gap - a.gap).slice(0, 3);
  for (const { r } of top) {
    const [cx, cy] = pos(r);
    const t = add(s, 'text', { x: cx + 9, y: cy - 8, class: 'lbl-strong' }, r.name.length > 24 ? r.name.slice(0, 23) + '…' : r.name);
    t.style.paintOrder = 'stroke'; t.style.stroke = 'var(--surface)'; t.style.strokeWidth = '4px';
  }
  box.replaceChildren(s);
}

// ------------------------------------------------------------------ genre dumbbell
export function dumbbell(box, { rows, labels, fmt }) {
  const W = 560, rowH = 34, m = { l: 128, r: 46, t: 8, b: 26 };
  const H = m.t + rows.length * rowH + m.b;
  const max = Math.max(0.1, ...rows.flatMap((r) => [r.ca, r.us]));
  const top = Math.ceil(max * 10) / 10;
  const x = (v) => m.l + (v / top) * (W - m.l - m.r);
  const s = svg(W, H, labels.title);
  for (let v = 0; v <= top + 1e-9; v += 0.1) {
    add(s, 'line', { class: 'grid', x1: x(v), x2: x(v), y1: m.t, y2: H - m.b });
    add(s, 'text', { x: x(v), y: H - 8, 'text-anchor': 'middle' }, fmt(v));
  }
  rows.forEach((r, i) => {
    const cy = m.t + i * rowH + rowH / 2;
    add(s, 'text', { x: m.l - 12, y: cy + 4, 'text-anchor': 'end', class: 'lbl' }, r.genre);
    add(s, 'line', { x1: x(Math.min(r.ca, r.us)), x2: x(Math.max(r.ca, r.us)), y1: cy, y2: cy, stroke: 'var(--axis)', 'stroke-width': 2, 'stroke-linecap': 'round' });
    add(s, 'circle', { class: 'dot', cx: x(r.us), cy, r: 5.5, fill: 'var(--other)' });
    add(s, 'circle', { class: 'dot', cx: x(r.ca), cy, r: 5.5, fill: 'var(--ca)' });
    if (Math.abs(r.diff) >= 0.05) add(s, 'text', { x: x(Math.max(r.ca, r.us)) + 10, y: cy + 4, class: 'lbl-strong' }, `${r.diff > 0 ? '+' : '−'}${Math.round(Math.abs(r.diff) * 100)}`);
    const hit = add(s, 'rect', { class: 'hit', x: 0, y: cy - rowH / 2, width: W, height: rowH });
    hover(hit, `<b>${esc(r.genre)}</b><br><span class="sw" style="background:var(--ca)"></span>${labels.ca} ${fmt(r.ca)}<br><span class="sw" style="background:var(--other)"></span>${labels.us} ${fmt(r.us)}`);
  });
  box.replaceChildren(s);
}

// ------------------------------------------------------------------ grouped columns (release age)
export function columns(box, { groups, labels, fmt }) {
  const W = 560, H = 300, m = { l: 40, r: 10, t: 24, b: 44 };
  const max = Math.max(0.1, ...groups.flatMap((g) => [g.ca, g.us]));
  const top = Math.ceil(max * 10) / 10;
  const y = (v) => m.t + (1 - v / top) * (H - m.t - m.b);
  const s = svg(W, H, labels.title);
  for (let v = 0; v <= top + 1e-9; v += 0.1) {
    add(s, 'line', { class: v === 0 ? 'axis' : 'grid', x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) });
    add(s, 'text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, fmt(v));
  }
  const slot = (W - m.l - m.r) / groups.length, bw = 24, gap = 2;
  groups.forEach((g, i) => {
    const cx = m.l + slot * i + slot / 2;
    [['ca', 'var(--ca)', -1], ['us', 'var(--other)', 1]].forEach(([k, color, side]) => {
      const v = g[k], x0 = cx + (side < 0 ? -bw - gap / 2 : gap / 2), y0 = y(v), h = y(0) - y0;
      const r = Math.min(4, h);
      const d = `M${x0},${y(0)}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + bw - r}Q${x0 + bw},${y0} ${x0 + bw},${y0 + r}V${y(0)}Z`;
      add(s, 'path', { d: h > 0 ? d : '', fill: color });
      add(s, 'text', { x: x0 + bw / 2, y: y0 - 6, 'text-anchor': 'middle', class: 'lbl' }, fmt(v));
    });
    add(s, 'text', { x: cx, y: H - m.b + 20, 'text-anchor': 'middle', class: 'lbl' }, g.label);
    const hit = add(s, 'rect', { class: 'hit', x: cx - slot / 2, y: m.t, width: slot, height: H - m.t - m.b });
    hover(hit, `<b>${esc(g.label)}</b><br><span class="sw" style="background:var(--ca)"></span>${labels.ca} ${fmt(g.ca)}<br><span class="sw" style="background:var(--other)"></span>${labels.us} ${fmt(g.us)}`);
  });
  box.replaceChildren(s);
}

// ------------------------------------------------------------------ map of scenes
export function map(box, { geo, cities, lang, onHover, labels }) {
  const s = svg(geo.width, geo.height, labels.title);
  for (const p of geo.provinces) {
    const path = add(s, 'path', { class: 'prov', d: p.path });
    hover(path, `<b>${esc(lang === 'fr' ? p.fr : p.en)}</b>`);
  }
  const placed = [];
  const k = geo.width / 460; // the map is drawn in a 1000-unit box; size marks for ~460px on screen
  const sorted = [...cities].sort((a, b) => b.artists.length - a.artists.length);
  for (const c of sorted) {
    const [cx, cy] = toView(c.lon, c.lat, geo.transform);
    const r = (4 + 2.5 * Math.sqrt(c.artists.length)) * k;
    const dot = add(s, 'circle', { class: 'city', cx, cy, r, 'data-city': c.city, 'stroke-width': 2 * k });
    const name = lang === 'fr' ? c.cityFr || c.city : c.city;
    hover(dot, `<b>${esc(name)}</b><br>${c.artists.map((a) => esc(a.name)).join('<br>')}`);
    dot.addEventListener('pointerenter', () => onHover && onHover(c.city));
    dot.addEventListener('pointerleave', () => onHover && onHover(null));
    if (!placed.some(([x, y]) => Math.hypot(x - cx, y - cy) < 26 * k)) {
      const t = add(s, 'text', { x: cx + r + 4 * k, y: cy + 4 * k, class: 'lbl-strong' }, name);
      t.style.paintOrder = 'stroke'; t.style.stroke = 'var(--surface)'; t.style.strokeWidth = `${3 * k}px`;
      t.style.fontSize = `${12 * k}px`;
      placed.push([cx, cy]);
    }
  }
  box.replaceChildren(s);
}
