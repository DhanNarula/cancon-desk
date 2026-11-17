// Who actually releases this record?
//
// Apple's catalog exposes each release's copyright line, e.g.
//   "℗ 2026 RCA Records, a division of Sony Music Entertainment"
//   "℗ 2024 OVO, under exclusive license to Republic Records"
//   "℗ 2025 Arts & Crafts Productions Inc."
// We parse it into the label name, any licensing partner, and an ownership tier:
//   major             — a Universal / Sony / Warner label or imprint
//   major-distributed — independent label distributed by a major-owned arm
//                       (The Orchard, AWAL, ADA, Virgin, Ingrooves, Caroline)
//   independent       — everything else (incl. DIY distributors)
// Shared by the data pipeline (Node) and the site (browser).

const MAJORS = [
  ['Universal', /universal music|\bumg\b|republic records|interscope|island records|island def jam|def jam|capitol (records|music)|motown|geffen|polydor|virgin records|\bemi\b|decca|verve|mercury records|astralwerks|aftermath|cash money|young money|quality control music|top dawg|blue note|darkroom|lava records|loma vista|10:22pm|abbey road|\bmca\b|mca nashville|universal music canada/i],
  ['Sony', /sony music|\bsony\b|columbia|\brca\b|epic records|\bepic\b|arista|legacy recordings|ultra records|kemosabe|syco|masterworks|black butter|ministry of sound|sony music entertainment canada/i],
  ['Warner', /warner|atlantic (records|recording|outpost)|elektra|parlophone|asylum|reprise|nonesuch|300 entertainment|fueled by ramen|big beat|rhino|\bsire\b|\bwmg\b|roadrunner|spinnin|artist partner group|warner music canada/i],
];
const MAJOR_DISTRIBUTION = /the orchard|\bawal\b|\bada\b|alternative distribution alliance|virgin music|ingrooves|caroline (international|distribution|records)?|\bcaroline\b/i;
const DIY = /distrokid|tunecore|cd baby|unitedmasters|united masters|\bamuse\b|\bstem\b|ditto|believe|\bempire\b|routenote|landr|symphonic|onerpm|vydia/i;

// Canadian labels & imprints — independents from coast to coast, Québec's
// francophone houses, and Canadian-founded imprints distributed by majors.
const CANADIAN = /arts ?& ?crafts|secret city|dine alone|royal mountain|last gang|bonsound|audiogram|simone records|arbutus|paper bag|mint records|flemish eye|six shooter|coax records|indica|duprince|117 records|cadence music|open road recordings|mdm recordings|starseed|ishk[oō]d[eé]|hidden pony|light organ|grosse bo[iî]te|7i[eè]me ciel|musicor|spectra musique|\bovo\b|ovo sound|\bxo\b|xo records|universal music canada|sony music (entertainment )?canada|warner music canada|big loud canada|anthem|aquarius records|maple music|nettwerk|first nations music|ste-4|joyride records|chivi chivi/i;

const clean = (s) => s
  .replace(/[℗©]|\((p|c)\)/gi, ' ')
  .replace(/\b(19|20)\d{2}(\s*[-–,&]\s*(19|20)\d{2})*\b/g, ' ')
  .replace(/\ball rights reserved\.?/gi, ' ')
  .replace(/\s+/g, ' ')
  .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '')
  .trim();

/**
 * @param {string} copyright  Apple catalog copyright line
 * @param {object} overrides  editor corrections keyed by lower-cased label, e.g.
 *   { "taylor swift": { tier: "major", group: "Universal", note: "…" } }
 */
export function parseCopyright(copyright, overrides = {}) {
  const raw = (copyright || '').trim();
  if (!raw) return { raw, label: null, partner: null, group: null, tier: 'unknown', canadian: false };
  const s = clean(raw);
  // "An Island Records Release; ℗ 2007 UMG Recordings" / "Capitol Records; ℗ 2026 UMG Recordings"
  const rel = s.match(/^an? (.+?) (?:label group )?release\b[.;,]?\s*(.*)$/i);
  const semi = !rel && s.includes(';') ? s.split(';').map((x) => x.trim()).filter(Boolean) : null;
  let body = rel ? rel[2] || rel[1] : semi ? semi.slice(1).join('; ') || semi[0] : s;
  let label = body, partner = null;
  const m = body.match(/^(.*?)(?:,|\.)?\s+(?:under (?:an? )?(?:exclusive )?licen[cs]e to|exclusively licen[cs]ed to|licen[cs]ed to|distributed by|marketed by|in partnership with|a division of|a label of|an? [\w\s]*?company of|under license from)\s+(.*)$/i);
  if (m) { label = m[1].trim(); partner = m[2].replace(/^the\s+/i, '').trim(); }
  if (rel) label = rel[1].split(/\s+\/\s+/)[0].trim();
  else if (semi) label = semi[0];
  label = label.split(/\s+(?:\/|\|)\s+/)[0].replace(/[,.;]+$/, '').trim();
  // the licensee is who you call: "Republic Records, a division of UMG…" → "Republic Records"
  if (partner) partner = partner.split(/,\s*(?:a division of|an? [\w\s]*company)|\s+for the\s/i)[0].replace(/[,.;]+$/, '').trim();

  // When several groups are named ("EMI Blackwood Music / Sony Music Entertainment"),
  // the last one mentioned is the ultimate parent ("X, a division of Y", "licensed to Y").
  let group = null, at = -1;
  for (const [name, re] of MAJORS) {
    for (const m of s.matchAll(new RegExp(re.source, 'gi'))) if (m.index > at) { at = m.index; group = name; }
  }
  let tier;
  if (group) tier = 'major';
  else if (MAJOR_DISTRIBUTION.test(s)) tier = 'major-distributed';
  else tier = 'independent';
  const diy = DIY.test(s);
  const out = { raw, label: label || s, partner, group, tier, diy, canadian: CANADIAN.test(s), note: null };
  const o = overrides[(label || '').toLowerCase()];
  if (o) Object.assign(out, o, { overridden: true });
  return out;
}

export const TIERS = ['major', 'major-distributed', 'independent'];
