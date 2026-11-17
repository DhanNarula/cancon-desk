// Geography helpers shared by the pipeline and the site.
// Lambert Conformal Conic — the projection Statistics Canada uses for national maps
// (standard parallels 49°N and 77°N), so Canada looks the way Canadians expect.

const D = Math.PI / 180;
const P = { lat1: 49, lat2: 77, lat0: 63.390675, lon0: -91.866667 };
const t = (lat) => Math.tan(Math.PI / 4 + (lat * D) / 2);
const n = Math.log(Math.cos(P.lat1 * D) / Math.cos(P.lat2 * D)) / Math.log(t(P.lat2) / t(P.lat1));
const F = (Math.cos(P.lat1 * D) * Math.pow(t(P.lat1), n)) / n;
const rho0 = F / Math.pow(t(P.lat0), n);

/** lon/lat (degrees) → projected plane, y pointing down (SVG-ready). */
export function lcc(lon, lat) {
  const rho = F / Math.pow(t(lat), n);
  const th = n * (lon - P.lon0) * D;
  return [rho * Math.sin(th), -(rho0 - rho * Math.cos(th))];
}

/** Projected plane → map view box, using the transform saved by build-map. */
export function toView(lon, lat, tr) {
  const [x, y] = lcc(lon, lat);
  return [(x - tr.minX) * tr.scale, (y - tr.minY) * tr.scale];
}

/** Ray-casting point-in-polygon over a list of rings ([[lon,lat],...]). */
export function inRings(lon, lat, rings) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/**
 * Which province contains this point? Coastal cities (Vancouver, Halifax…) can
 * fall just outside a simplified coastline, so fall back to the nearest boundary
 * vertex within ~1°. Only call this for places already known to be in Canada.
 */
export function provinceAt(lon, lat, provinces) {
  for (const p of provinces) if (inRings(lon, lat, p.rings)) return p.code;
  let best = null, bd = 1;
  const k = Math.cos(lat * D);
  for (const p of provinces) {
    for (const r of p.rings) for (const [x, y] of r) {
      const d = Math.hypot((x - lon) * k, y - lat);
      if (d < bd) { bd = d; best = p.code; }
    }
  }
  return best;
}

// Fallback coordinates for city names that arrive without them (MusicBrainz areas).
export const CITIES = {
  'Toronto': [-79.383, 43.653, 'ON'], 'Montreal': [-73.567, 45.501, 'QC'], 'Montréal': [-73.567, 45.501, 'QC'],
  'Vancouver': [-123.121, 49.282, 'BC'], 'Calgary': [-114.071, 51.045, 'AB'], 'Edmonton': [-113.494, 53.546, 'AB'],
  'Ottawa': [-75.697, 45.421, 'ON'], 'Winnipeg': [-97.138, 49.895, 'MB'], 'Halifax': [-63.575, 44.649, 'NS'],
  'Quebec City': [-71.208, 46.813, 'QC'], 'Québec': [-71.208, 46.813, 'QC'], 'Hamilton': [-79.866, 43.256, 'ON'],
  'Mississauga': [-79.651, 43.589, 'ON'], 'Brampton': [-79.762, 43.731, 'ON'], 'Saskatoon': [-106.67, 52.157, 'SK'],
  'Regina': [-104.618, 50.445, 'SK'], 'Victoria': [-123.366, 48.428, 'BC'], 'London': [-81.249, 42.984, 'ON'],
  'Kitchener': [-80.482, 43.452, 'ON'], 'Windsor': [-83.026, 42.317, 'ON'], "St. John's": [-52.712, 47.561, 'NL'],
  'Moncton': [-64.778, 46.087, 'NB'], 'Fredericton': [-66.643, 45.964, 'NB'], 'Charlottetown': [-63.126, 46.238, 'PE'],
  'Whitehorse': [-135.057, 60.721, 'YT'], 'Yellowknife': [-114.372, 62.454, 'NT'], 'Iqaluit': [-68.52, 63.746, 'NU'],
  'Gatineau': [-75.701, 45.477, 'QC'], 'Laval': [-73.692, 45.606, 'QC'], 'Sherbrooke': [-71.889, 45.4, 'QC'],
  'Oshawa': [-78.863, 43.897, 'ON'], 'Markham': [-79.337, 43.856, 'ON'], 'Surrey': [-122.849, 49.191, 'BC'],
  'Kelowna': [-119.496, 49.888, 'BC'], 'Thunder Bay': [-89.248, 48.381, 'ON'], 'Sudbury': [-80.991, 46.49, 'ON'],
  'Kingston': [-76.486, 44.231, 'ON'], 'Barrie': [-79.69, 44.389, 'ON'], 'Guelph': [-80.248, 43.544, 'ON'],
  'Lethbridge': [-112.842, 49.694, 'AB'], 'Red Deer': [-113.811, 52.268, 'AB'], 'Nanaimo': [-123.94, 49.166, 'BC'],
};
