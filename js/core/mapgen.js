// Procedural map: samples real-world coastlines (geo-*.js) onto the hex grid, then
// textures land with noise-driven forest/mountain. Capitals sit near the four board
// corners; every city is kept on one connected landmass so ground armies can reach them.
import { CITY_NAMES, H, NATIONS, W } from './data.js';
import { dist, makeNoise, mulberry32, neighbors, shuffle } from './util.js';
import { sampleWorld } from './geo-world.js';

// Old World windows: Iberia/Ireland -> Western China/India, Scandinavia -> Equator.
// Africa meets Eurasia at Sinai, so one landmass hosts all four corners.
const WINDOWS = [
  { lon0: -15, lonSpan: 130, latN: 66, latS: -4 },
  { lon0: -10, lonSpan: 120, latN: 63, latS: -2 },
  { lon0: -20, lonSpan: 140, latN: 68, latS: -6 },
  { lon0: -12, lonSpan: 125, latN: 64, latS: -3 },
];

const CITY_MAX = 18;   // 4 capitals + 14 neutrals
const CITY_MIN = 13;   // 4 capitals + 9 neutrals

export function genMap(seed0){
  for(const win of WINDOWS){
    // sampleWorld is the expensive step (~100ms); compute once per window.
    const fracs = sampleWorld(W, H, win);
    for(let k = 0; k < 40; k++){
      const m = tryMap(seed0 + k * 7919, fracs, false);
      if(m) return m;
    }
  }
  // Forced fallback: keep trying each window without the connectivity gate.
  for(const win of WINDOWS){
    const fracs = sampleWorld(W, H, win);
    for(let k = 0; k < 200; k++){
      const m = tryMap(seed0 + k, fracs, true);
      if(m) return m;
    }
  }
  throw new Error('mapgen: no playable map from any window');
}

export function tryMap(seed, fracs, force){
  const rnd = mulberry32(seed), nE = makeNoise(rnd), nF = makeNoise(rnd);

  // Terrain: geographic sea from coastline sampling; forest/mountain from noise on land.
  const tiles = [];
  for(let r = 0; r < H; r++) for(let c = 0; c < W; c++){
    const f = fracs[r * W + c];
    let t;
    if(f < 0.35) t = 'sea';
    else if(nE(c * 0.42 + 5, r * 0.42 + 9) > 0.70 && f > 0.55) t = 'mount';
    else if(nF(c * 0.55 + 13, r * 0.55 + 3) > 0.56) t = 'forest';
    else t = 'plain';
    tiles.push({t});
  }

  // Find the largest connected land component; ground armies can only traverse it.
  const comp = new Int32Array(W * H).fill(-1);
  let bestId = -1, bestSize = 0, nextId = 0;
  for(let i = 0; i < W * H; i++){
    if(tiles[i].t === 'sea' || comp[i] !== -1) continue;
    let size = 0;
    const q = [i]; comp[i] = nextId;
    while(q.length){
      const j = q.pop(); size++;
      const jc = j % W, jr = (j / W) | 0;
      for(const [nc, nr] of neighbors(jc, jr)){
        const k = nr * W + nc;
        if(comp[k] === -1 && tiles[k].t !== 'sea'){ comp[k] = nextId; q.push(k); }
      }
    }
    if(size > bestSize){ bestSize = size; bestId = nextId; }
    nextId++;
  }

  const totalLand = tiles.filter(t => t.t !== 'sea').length;
  if(totalLand < W * H * 0.45) return null;
  if(!force && bestSize < totalLand * 0.6) return null;   // too fragmented for a real game

  // Capitals: nearest largest-component land tile to each board corner.
  const corners = [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]];
  const cities = [];
  const used = new Set();
  for(let n = 0; n < 4; n++){
    let bi = -1, bd = 1e9;
    for(let i = 0; i < W * H; i++){
      if(tiles[i].t === 'sea' || used.has(i)) continue;
      if(comp[i] !== bestId) continue;
      const d = dist(i % W, (i / W) | 0, corners[n][0], corners[n][1]);
      if(d < bd){ bd = d; bi = i; }
    }
    if(bi < 0 && force){                  // forced fallback: accept any land tile
      bd = 1e9;
      for(let i = 0; i < W * H; i++){
        if(tiles[i].t === 'sea' || used.has(i)) continue;
        const d = dist(i % W, (i / W) | 0, corners[n][0], corners[n][1]);
        if(d < bd){ bd = d; bi = i; }
      }
    }
    if(bi < 0) return null;
    used.add(bi);
    tiles[bi].t = 'plain';
    cities.push({c: bi % W, r: (bi / W) | 0, owner: n, capital: n, name: NATIONS[n].capital, recruited: false});
  }

  // Neutral cities: spread out on the same component, on any non-mountain land.
  const names = shuffle(CITY_NAMES, rnd);
  let tries = 0;
  while(cities.length < CITY_MAX && tries < 2000){
    tries++;
    const c = (rnd() * W) | 0, r = (rnd() * H) | 0, i = r * W + c;
    if(tiles[i].t === 'sea' || tiles[i].t === 'mount') continue;
    if(!force && comp[i] !== bestId) continue;
    if(used.has(i)) continue;
    if(cities.some(x => dist(x.c, x.r, c, r) < 3)) continue;
    used.add(i);
    tiles[i].t = 'plain';
    cities.push({c, r, owner: -1, capital: -1, name: names[cities.length - 4], recruited: false});
  }
  if(cities.length < CITY_MIN) return null;

  // Non-forced: verify full reachability by land, and by land without using mountains.
  if(!force){
    for(const avoid of [['sea'], ['sea', 'mount']]){
      const seen = new Set([cities[0].r * W + cities[0].c]);
      const q = [[cities[0].c, cities[0].r]];
      while(q.length){
        const [c, r] = q.pop();
        for(const [nc, nr] of neighbors(c, r)){
          const i = nr * W + nc;
          if(seen.has(i) || avoid.includes(tiles[i].t)) continue;
          seen.add(i); q.push([nc, nr]);
        }
      }
      if(!cities.every(x => seen.has(x.r * W + x.c))) return null;
    }
  }

  // Each nation gets one extra neutral city (the nearest to its capital).
  for(let n = 0; n < 4; n++){
    const cap = cities[n];
    let best = null, bd = 1e9;
    for(const x of cities){
      if(x.owner !== -1) continue;
      const d = dist(cap.c, cap.r, x.c, x.r);
      if(d < bd){ bd = d; best = x; }
    }
    if(best) best.owner = n;
  }

  return {tiles, cities};
}
