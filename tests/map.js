// Map generator checks across every world size: connectivity, fairness, spacing, names, terrain mix.
import { newGame } from '../js/core/game.js';
import { G } from '../js/core/state.js';
import { MAP_SIZES, W, H } from '../js/core/data.js';
import { dist, neighbors } from '../js/core/util.js';

const SEEDS = Number(process.env.SEEDS || 12);
let failures = 0;
const fail = (m) => { failures++; console.log('FAIL', m); };

function reachable(avoid) {
  const seen = new Uint8Array(W * H), c0 = G.cities[0], q = [c0.r * W + c0.c];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop();
    for (const [nc, nr] of neighbors(i % W, (i / W) | 0)) {
      const j = nr * W + nc;
      if (seen[j] || avoid.includes(G.tiles[j].t)) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return G.cities.every(x => seen[x.r * W + x.c]);
}

for (const key of Object.keys(MAP_SIZES)) {
  const t0 = Date.now();
  const stat = { cities: 0, sea: 0, mount: 0, forest: 0, minRatio: 1 };
  for (let seed = 1; seed <= SEEDS; seed++) {
    newGame({ player: 0, diff: 'normal', seed, size: key });
    const tag = `${key} seed ${seed}`, n = W * H;
    if (G.tiles.length !== n) fail(tag + ' wrong tile count');
    if (!reachable(['sea'])) fail(tag + ' a city is cut off by sea');
    if (!reachable(['sea', 'mount'])) fail(tag + ' a city is cut off for tanks and artillery');
    const names = new Set(G.cities.map(c => c.name));
    if (names.size !== G.cities.length) fail(tag + ' duplicate city names');
    const spots = new Set(G.cities.map(c => c.r * W + c.c));
    if (spots.size !== G.cities.length) fail(tag + ' two cities share a hex');
    for (const c of G.cities) if (G.tiles[c.r * W + c.c].t === 'sea' || G.tiles[c.r * W + c.c].t === 'mount') fail(tag + ' city on ' + G.tiles[c.r * W + c.c].t);
    // Capitals: every power owns one, they are far apart, and each has free neighbours for its starting army.
    const caps = G.cities.filter(c => c.capital >= 0);
    if (caps.length !== 4) fail(tag + ' capital count ' + caps.length);
    let minD = 1e9;
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) minD = Math.min(minD, dist(caps[a].c, caps[a].r, caps[b].c, caps[b].r));
    if (minD < Math.min(W, H) * 0.35) fail(tag + ' capitals too close: ' + minD);
    for (const c of caps) {
      const free = neighbors(c.c, c.r).filter(([x, y]) => G.tiles[y * W + x].t !== 'sea' && G.tiles[y * W + x].t !== 'mount');
      if (free.length < 4) fail(tag + ' capital ' + c.name + ' has only ' + free.length + ' open neighbours');
    }
    // Fairness: starting cities and units match across powers.
    const own = [0, 1, 2, 3].map(p => G.cities.filter(c => c.owner === p).length);
    if (Math.max(...own) !== Math.min(...own)) fail(tag + ' unequal starting cities ' + own);
    const army = [0, 1, 2, 3].map(p => G.units.filter(u => u.owner === p).length);
    if (Math.max(...army) !== Math.min(...army)) fail(tag + ' unequal starting armies ' + army);
    for (const u of G.units) {
      const t = G.tiles[u.r * W + u.c].t;
      if (t === 'sea' || (t === 'mount' && u.type !== 'inf')) fail(tag + ' unit starts on ' + t);
    }
    const count = (t) => G.tiles.filter(x => x.t === t).length / n;
    stat.cities += G.cities.length; stat.sea += count('sea'); stat.mount += count('mount'); stat.forest += count('forest');
    if (count('sea') < 0.15 || count('sea') > 0.45) fail(tag + ' sea share ' + count('sea').toFixed(2));
  }
  const f = (v) => (v / SEEDS).toFixed(2);
  console.log(`map ${key.padEnd(8)} ${W}x${H}  avg cities ${(stat.cities / SEEDS).toFixed(0)}  sea ${f(stat.sea)}  mountain ${f(stat.mount)}  forest ${f(stat.forest)}  ${(Date.now() - t0) / SEEDS | 0} ms/map`);
}

if (process.env.SHOW) {
  newGame({ player: 0, diff: 'normal', seed: Number(process.env.SHOW), size: process.env.SIZE || 'huge' });
  const spot = new Map(G.cities.map(c => [c.r * W + c.c, c]));
  for (let r = 0; r < H; r++) {
    let line = r & 1 ? ' ' : '';
    for (let c = 0; c < W; c++) {
      const city = spot.get(r * W + c), t = G.tiles[r * W + c].t;
      line += (city ? (city.capital >= 0 ? String(city.capital + 1) : '#') : t === 'sea' ? ' ' : t === 'mount' ? '^' : t === 'forest' ? '"' : '.') + ' ';
    }
    console.log(line);
  }
}
if (failures) { console.log(failures + ' failures'); process.exit(1); }
console.log('map: OK');
