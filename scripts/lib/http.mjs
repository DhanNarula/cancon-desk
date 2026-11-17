// Polite HTTP: timeouts, retries with backoff, per-host pacing.

export const UA = 'cancon-desk/1.0 (open-source music research script)';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const lastHit = new Map();
const PACE = { 'musicbrainz.org': 1100, 'itunes.apple.com': 600, 'query.wikidata.org': 500 };

export async function getJSON(url, { tries = 4, timeout = 30000, headers = {} } = {}) {
  const host = new URL(url).host;
  let err;
  for (let i = 0; i < tries; i++) {
    const wait = (lastHit.get(host) || 0) + (PACE[host] || 0) - Date.now();
    if (wait > 0) await sleep(wait);
    lastHit.set(host, Date.now());
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
        signal: AbortSignal.timeout(timeout),
        redirect: 'follow',
      });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) { const e = new Error(`HTTP ${r.status} for ${url}`); e.fatal = true; throw e; }
      return await r.json();
    } catch (e) {
      err = e;
      if (e.fatal) break;
      await sleep(1500 * (i + 1) ** 2);
    }
  }
  throw err;
}

export async function sparql(query) {
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query);
  const d = await getJSON(url, { timeout: 60000, headers: { Accept: 'application/sparql-results+json' } });
  return d.results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
}

export const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
