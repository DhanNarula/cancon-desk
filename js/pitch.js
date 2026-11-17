// The pitch builder: turns a data-driven opportunity into an editable one-page
// pitch for the editorial team, exportable as text / Markdown / print.
// Drafts persist per viewer in localStorage (a convenience, never required).

import { esc } from './charts.js';
import { MARKET_SHORT } from './i18n.js';

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

/** Human-readable evidence lines for an opportunity (used on cards and in pitches). */
export function evidenceLines(o, T) {
  return o.evidence.map((e) => {
    if (e.release) return [`${e.artist} — ${e.release}`, `${e.date}${e.label ? ` · ${e.label}` : ''}`];
    if (e.ranks) return [`${e.song} — ${e.artist}`, Object.entries(e.ranks).map(([m, r]) => `${MARKET_SHORT[m]} #${r}`).join(' · ')];
    if (e.best !== undefined) return [e.artist, e.best ? `CA #${e.best}` : ''];
    const bits = [];
    if (e.ca) bits.push(`CA #${e.ca}`);
    if (e.us !== undefined) bits.push(e.us == null ? 'US —' : `US #${e.us}`);
    if (typeof e.move === 'number') bits.push(`▲${e.move}`);
    if (e.move === 'new') bits.push(T.newEntry);
    if (e.year) bits.push(e.year);
    if (e.label) bits.push(e.label);
    return [`${e.song} — ${e.artist}`, bits.join(' · ')];
  });
}

export function openPitch(o, { T, date, dateLabel }) {
  const P = T.pitch;
  const copy = T.opp[o.type](o.params, T);
  const key = `cancon-pitch:${o.id}:${date}`;
  const saved = store.get(key) || {};
  const name = store.get('cancon-name') || '';
  const ev = evidenceLines(o, T).map(([a, b]) => `${a}${b ? ` (${b})` : ''}`).join('\n');
  const partners = o.partners.map((p) => `${p.label}${p.group ? ` (${p.group})` : ''}`).join('\n');
  const tracks = o.tracks.slice(0, 30);
  const picked = new Set(saved.tracks ?? tracks.slice(0, 15).map((_, i) => i));

  const f = document.getElementById('pitchForm');
  f.innerHTML = `
    <div class="pd-head">
      <div><div class="kicker">${esc(P.title)} · ${esc(dateLabel)}</div><h2 id="pitchHead">${esc(copy.title)}</h2></div>
      <button class="btn ghost" value="close" aria-label="${esc(P.close)}">✕</button>
    </div>
    <label>${esc(P.working)}<input name="title" value="${esc(saved.title ?? copy.title)}"></label>
    <div class="pd-grid">
      <label>${esc(P.format)}<input name="format" value="${esc(saved.format ?? copy.format)}"></label>
      <label>${esc(P.timing)}<input name="timing" value="${esc(saved.timing ?? (o.params.date || P.now))}"></label>
    </div>
    <label>${esc(P.angle)}<textarea name="angle" rows="4">${esc(saved.angle ?? copy.angle)}</textarea></label>
    <label>${esc(P.evidence)}<textarea name="evidence" rows="5">${esc(saved.evidence ?? `${copy.dek}\n${ev}`)}</textarea></label>
    <div><label>${esc(P.tracks)}</label>
      <div class="pd-tracks">${tracks.map((tr, i) => `
        <label><input type="checkbox" name="t" value="${i}" ${picked.has(i) ? 'checked' : ''}>
        <span>${esc(tr.name)} — ${esc(tr.artist)}</span><span class="r">${tr.rank ? `CA #${tr.rank}` : ''}</span></label>`).join('') || '<div class="muted small">—</div>'}
      </div>
    </div>
    <div class="pd-grid">
      <label>${esc(P.partners)}<textarea name="partners" rows="3">${esc(saved.partners ?? partners)}</textarea></label>
      <label>${esc(P.notes)}<textarea name="notes" rows="3">${esc(saved.notes ?? '')}</textarea></label>
    </div>
    <label>${esc(P.by)}<input name="by" placeholder="${esc(P.yourName)}" value="${esc(saved.by ?? name)}"></label>
    <div class="pd-actions">
      <button type="button" class="btn" data-act="copy">${esc(P.copy)}</button>
      <button type="button" class="btn ghost" data-act="md">${esc(P.download)}</button>
      <button type="button" class="btn ghost" data-act="print">${esc(P.print)}</button>
      <span class="muted" id="pdStatus">${esc(P.saved)}</span>
    </div>`;

  const read = () => {
    const fd = new FormData(f);
    return {
      title: fd.get('title'), format: fd.get('format'), timing: fd.get('timing'), angle: fd.get('angle'),
      evidence: fd.get('evidence'), partners: fd.get('partners'), notes: fd.get('notes'), by: fd.get('by'),
      tracks: fd.getAll('t').map(Number),
    };
  };
  const markdown = () => {
    const v = read();
    const tl = v.tracks.map((i, n) => `${n + 1}. ${tracks[i].name} — ${tracks[i].artist}${tracks[i].rank ? ` (CA #${tracks[i].rank})` : ''}${tracks[i].url ? `\n   ${tracks[i].url}` : ''}`).join('\n');
    const lines = (s) => (s || '').split('\n').filter(Boolean).map((l) => `- ${l}`).join('\n');
    return `# ${v.title}

**${P.format}:** ${v.format}  ·  **${P.timing}:** ${v.timing}${v.by ? `  ·  **${P.by}:** ${v.by}` : ''}

## ${P.angle}
${v.angle}

## ${P.evidence}
${lines(v.evidence)}

## ${P.tracks}
${tl || '—'}

## ${P.partners}
${lines(v.partners) || '—'}
${v.notes ? `\n## ${P.notes}\n${v.notes}\n` : ''}
---
${P.sources}: Apple Music most-played charts (CA, US, UK, AU, FR), ${dateLabel} · Wikidata · MusicBrainz · CanCon Desk
`;
  };

  f.oninput = () => {
    const v = read();
    store.set(key, v);
    if (v.by) store.set('cancon-name', v.by);
  };
  f.onclick = async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    const md = markdown();
    if (act === 'copy') {
      try { await navigator.clipboard.writeText(md); document.getElementById('pdStatus').textContent = `✓ ${P.copied}`; } catch { /* clipboard blocked */ }
    } else if (act === 'md') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
      a.download = `${read().title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase() || 'pitch'}.md`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else if (act === 'print') {
      const w = window.open('', '_blank');
      if (!w) return;
      const html = md.split('\n').map((l) => {
        if (l.startsWith('# ')) return `<h1>${esc(l.slice(2))}</h1>`;
        if (l.startsWith('## ')) return `<h2>${esc(l.slice(3))}</h2>`;
        if (l.startsWith('- ')) return `<li>${esc(l.slice(2))}</li>`;
        if (/^\d+\. /.test(l)) return `<p class="tr">${esc(l)}</p>`;
        if (l === '---') return '<hr>';
        return l.trim() ? `<p>${esc(l).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>` : '';
      }).join('');
      w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(read().title)}</title><style>body{font:15px/1.6 Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111}h1{font-size:30px;line-height:1.15}h2{font:600 13px/1.4 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em;margin-top:28px;color:#555}li{margin:2px 0}.tr{margin:2px 0}hr{border:0;border-top:1px solid #ddd;margin:28px 0 8px}p:last-child{font:12px system-ui,sans-serif;color:#777}</style>${html}`);
      w.document.close();
      w.focus();
      w.print();
    }
  };
  document.getElementById('pitchDlg').showModal();
}
