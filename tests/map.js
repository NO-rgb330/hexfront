// World map checks: real geography survives sampling onto the hex grid, and the board is playable.
import { genMap } from '../js/core/mapgen.js';
import { H, W } from '../js/core/data.js';
import { neighbors } from '../js/core/util.js';
import { WORLD } from '../js/world/index.js';
import { isLand } from '../js/world/geo-world.js';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL', msg); } };

const m = genMap(1);
ok(m.tiles.length === W * H && W === WORLD.W && H === WORLD.H, 'board size comes from the world map');
const land = m.tiles.filter(t => t.t !== 'sea' && t.t !== 'strait').length;
ok(land > 600 && land < 900, 'land hex count looks like Earth at this scale: ' + land);
ok(m.cities.filter(c => c.capital >= 0).length === 4, 'four capitals');
ok(m.cities.length >= 40, 'enough cities: ' + m.cities.length);
ok(new Set(m.cities.map(c => c.r * W + c.c)).size === m.cities.length, 'no two cities share a hex');
for (const c of m.cities) {
  const t = m.tiles[c.r * W + c.c].t;
  ok(t === 'plain', c.name + ' stands on plain, not ' + t);
}

// Every city must be reachable on foot from every capital, with and without mountains in the way.
for (const avoid of [['sea'], ['sea', 'mount']]) {
  const seen = new Set([m.cities[0].r * W + m.cities[0].c]), q = [[m.cities[0].c, m.cities[0].r]];
  while (q.length) {
    const [c, r] = q.pop();
    for (const [nc, nr] of neighbors(c, r)) {
      const i = nr * W + nc;
      if (!seen.has(i) && !avoid.includes(m.tiles[i].t)) { seen.add(i); q.push([nc, nr]); }
    }
  }
  ok(m.cities.every(c => seen.has(c.r * W + c.c)), 'all cities connected avoiding ' + avoid.join('+'));
}

// Geography spot checks on the raw coastlines (well inland or well offshore, so a vertex here or there can't matter).
const land_pts = [['Paris', 2.3, 48.9], ['Moscow', 37.6, 55.8], ['Beijing', 116.4, 39.9], ['Delhi', 77.2, 28.6], ['Cairo', 31.2, 30], ['Nairobi', 36.8, -1.3],
  ['Sydney', 151.2, -33.9], ['Alice Springs', 133.9, -23.7], ['NYC', -74, 40.7], ['Denver', -105, 39.7], ['Brasilia', -47.9, -15.8], ['Greenland', -40, 72],
  ['Madagascar', 47, -19], ['Borneo', 114, 0], ['Honshu', 138, 36], ['Great Britain', -2, 53], ['Anchorage', -150, 61.2]];
const sea_pts = [['Mid Atlantic', -30, 30], ['Mid Pacific', -150, 0], ['Indian Ocean', 75, -20], ['Med', 18, 35], ['Black Sea', 34, 43], ['Baltic', 19, 58.5],
  ['Gulf of Mexico', -90, 25], ['Hudson Bay', -85, 60], ['Caspian', 51, 41], ['Red Sea', 38, 20], ['Lake Michigan', -87, 43.5], ['Lake Victoria', 33, -1.5]];
for (const [n, lon, lat] of land_pts) ok(isLand(lon, lat), n + ' should be land');
for (const [n, lon, lat] of sea_pts) ok(!isLand(lon, lat), n + ' should be water');

// Real islands that must survive the hex grid, found by the hex nearest their position.
const hexAt = (lon, lat) => {
  let best = 0, bd = 1e9;
  for (let i = 0; i < W * H; i++) {
    const [hl, ht] = WORLD.hexLonLat(i % W, (i / W) | 0), x = lon < WORLD.view.lon0 ? lon + 360 : lon;
    const d = (hl - x) ** 2 + (ht - lat) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return m.tiles[best].t;
};
for (const [n, lon, lat] of [['Britain', -2, 53], ['Japan', 138, 36], ['Madagascar', 47, -19], ['Iceland', -19, 65], ['Sri Lanka', 80.7, 7.7], ['Taiwan', 121, 23.7], ['Tasmania', 146.5, -42], ['New Zealand', 174, -39]]) {
  ok(hexAt(lon, lat) !== 'sea', n + ' keeps a land hex');
}
console.log(`map: ${W}x${H}, ${land} land hexes, ${m.cities.length} cities, ${fails} failures`);
if (fails) process.exit(1);
