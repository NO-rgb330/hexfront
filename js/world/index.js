// The world map. Turns the real coastlines (geo-*.js) into a hex board for the game.
// build() returns { tiles:[{t}], cities:[{c,r,name}], info } where cities[0..3] are the four capitals in power order.
// Terrain keys: sea, strait (ferry crossing), plain, forest, mount.
import { isLand, ISLANDS, insideLand } from './geo-world.js';
import { terrainAt } from './geo-terrain.js';
import { hexNeighbors, hexDist } from './hex.js';
import { CITIES, START_CAPITALS } from './cities.js';

export const W = 72, H = 33;
// Longitudes run from lon0 eastward for a full turn. The seam sits in the Atlantic. dLat/dLon = 0.866 matches a
// pointy-top hex, so the board is not stretched.
export const VIEW = { lon0: -26, lonSpan: 360, latN: 80, latS: -57.6 };
const dLon = VIEW.lonSpan / (W + 0.5), dLat = (VIEW.latN - VIEW.latS) / (H - 1);

export const hexLonLat = (c, r) => [VIEW.lon0 + (c + 0.5 + 0.5 * (r & 1)) * dLon, VIEW.latN - r * dLat];

// 19 sample points per hex: centre, an inner ring and an outer ring.
const RING = [[0, 0]];
for (let k = 0; k < 6; k++) RING.push([Math.cos(k * Math.PI / 3) * 0.5, Math.sin(k * Math.PI / 3) * 0.5]);
for (let k = 0; k < 12; k++) RING.push([Math.cos(k * Math.PI / 6) * 0.9, Math.sin(k * Math.PI / 6) * 0.9]);
const RX = dLon / 2, RY = dLat / 1.5, LAND_SHARE = 0.4;

function landShare(lon, lat) {
  let n = 0;
  for (const [a, b] of RING) if (isLand(lon + a * RX, lat + b * RY)) n++;
  return n / RING.length;
}

const norm = lon => { while (lon < VIEW.lon0) lon += 360; while (lon >= VIEW.lon0 + 360) lon -= 360; return lon; };
const nearestHex = (lon, lat, ok) => {
  const x = norm(lon);
  let best = -1, bd = 1e9;
  for (let i = 0; i < W * H; i++) {
    if (ok && !ok(i)) continue;
    const [hl, ht] = hexLonLat(i % W, (i / W) | 0), d = ((hl - x) / dLon) ** 2 + ((ht - lat) / dLat) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return [best, bd];
};

export function build() {
  const tiles = new Array(W * H);
  const lonlat = [];
  for (let i = 0; i < W * H; i++) lonlat.push(hexLonLat(i % W, (i / W) | 0));
  for (let i = 0; i < W * H; i++) {
    const [lon, lat] = lonlat[i];
    tiles[i] = landShare(lon, lat) >= LAND_SHARE ? terrainAt(lon, lat) : 'sea';
  }

  // Keep every mid-size island: if a coastline contains no land hex at all, its hex nearest the centre becomes land.
  const forced = [];
  for (const isl of ISLANDS) {
    let has = false;
    for (let i = 0; i < W * H && !has; i++) {
      if (tiles[i] !== 'sea' && insideLand(isl.pts, lonlat[i][0], lonlat[i][1])) has = true;
    }
    if (has) continue;
    const [i] = nearestHex(isl.centroid[0], isl.centroid[1]);
    if (i >= 0 && tiles[i] === 'sea') { tiles[i] = terrainAt(lonlat[i][0], lonlat[i][1]); forced.push(i); }
  }

  // Union-find over land and strait hexes.
  const par = Array.from({ length: W * H }, (_, i) => i);
  const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
  const nbs = i => hexNeighbors(i % W, (i / W) | 0, W, H).map(([c, r]) => r * W + c);
  const dry = i => tiles[i] !== 'sea';
  for (let i = 0; i < W * H; i++) if (dry(i)) for (const j of nbs(i)) if (dry(j)) union(i, j);

  // Straits: a sea hex touching two different landmasses becomes a ferry crossing; so does a pair of sea hexes
  // that links two landmasses (a gap of two). Wider water stays impassable to ground units.
  const roots = i => new Set(nbs(i).filter(dry).map(find));
  for (let i = 0; i < W * H; i++) {
    if (dry(i)) continue;
    const rs = roots(i);
    if (rs.size >= 2) { tiles[i] = 'strait'; for (const j of nbs(i)) if (dry(j)) union(i, j); }
  }
  for (let i = 0; i < W * H; i++) {
    if (dry(i)) continue;
    const ra = roots(i);
    if (!ra.size) continue;
    for (const j of nbs(i)) {
      if (dry(j)) continue;
      const rb = roots(j);
      if (![...rb].some(x => !ra.has(x)) || !rb.size) continue;
      tiles[i] = 'strait'; tiles[j] = 'strait';
      for (const k of [i, j]) for (const m of nbs(k)) if (dry(m)) union(k, m);
      break;
    }
  }

  // Cities: capitals first, then the real city list, snapped to the nearest free land hex.
  const cities = [], taken = new Set();
  const place = (name, lon, lat) => {
    const x = norm(lon), cand = [];
    for (let i = 0; i < W * H; i++) {
      if (tiles[i] === 'sea' || tiles[i] === 'strait' || taken.has(i)) continue;
      const d = ((lonlat[i][0] - x) / dLon) ** 2 + ((lonlat[i][1] - lat) / dLat) ** 2;
      if (d <= 2.6) cand.push([d, i]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    for (const [, i] of cand) {
      const c = i % W, r = (i / W) | 0;
      if (cities.some(q => hexDist(q.c, q.r, c, r) < 2)) continue;
      taken.add(i); tiles[i] = 'plain';
      cities.push({ c, r, name });
      return true;
    }
    return false;
  };
  START_CAPITALS.forEach((s, n) => { if (!place('Capital ' + n, s.lon, s.lat)) throw new Error('capital ' + n + ' has no land'); });
  for (const [name, lon, lat] of CITIES) place(name, lon, lat);

  // Only keep cities an army can walk to, and make sure no mountain wall cuts the capitals off from armor.
  const home = find(cities[0].r * W + cities[0].c);
  for (let n = 1; n < 4; n++) if (find(cities[n].r * W + cities[n].c) !== home) throw new Error('capitals are not connected by land');
  const keep = cities.filter((q, i) => i < 4 || find(q.r * W + q.c) === home);
  const dropped = cities.length - keep.length;
  const dist = new Map([[cities[0].r * W + cities[0].c, 0]]), prev = new Map(), open = [[0, cities[0].r * W + cities[0].c]];
  const cost = t => t === 'sea' ? 99 : t === 'mount' ? 8 : t === 'strait' ? 2 : t === 'forest' ? 2 : 1;
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [d, i] = open.shift();
    if (d > dist.get(i)) continue;
    for (const j of nbs(i)) {
      const k = cost(tiles[j]);
      if (k >= 99) continue;
      if (!dist.has(j) || d + k < dist.get(j)) { dist.set(j, d + k); prev.set(j, i); open.push([d + k, j]); }
    }
  }
  let flattened = 0;
  for (const q of keep) {
    for (let i = q.r * W + q.c; i !== undefined; i = prev.get(i)) if (tiles[i] === 'mount') { tiles[i] = 'plain'; flattened++; }
  }

  const count = t => tiles.filter(x => x === t).length;
  return {
    tiles: tiles.map(t => ({ t })),
    cities: keep.map(({ c, r, name }) => ({ c, r, name })),
    info: { land: W * H - count('sea') - count('strait'), strait: count('strait'), mount: count('mount'), forest: count('forest'), forced: forced.length, droppedCities: dropped, flattened },
  };
}

export const WORLD = { id: 'world', name: 'World', W, H, view: VIEW, hexLonLat, build };
