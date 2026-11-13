// Builds the board from the active map (js/maps.js): terrain from real coastlines, real cities, four capitals.
import { NATIONS, setDims } from './data.js';
import { dist } from './util.js';
import { DEFAULT_MAP, getMap } from '../maps.js';

const cache = {};

// seed is kept for the game's RNG; the map itself is the same every time.
export function genMap(seed, mapId = DEFAULT_MAP) {
  const def = getMap(mapId);
  setDims(def.W, def.H);
  if (!cache[def.id]) cache[def.id] = def.build();
  const m = cache[def.id];
  const tiles = m.tiles.map(x => ({ t: x.t }));
  const cities = m.cities.map((x, i) => ({
    c: x.c, r: x.r, owner: i < 4 ? i : -1, capital: i < 4 ? i : -1,
    name: i < 4 ? NATIONS[i].capital : x.name, recruited: false
  }));
  // Each power starts with its two nearest neutral cities, handed out in turns so nobody is favoured.
  for (let k = 0; k < 2; k++) {
    for (let n = 0; n < 4; n++) {
      const cap = cities[n];
      let best = null, bd = 1e9;
      for (const x of cities) {
        if (x.owner !== -1) continue;
        const d = dist(cap.c, cap.r, x.c, x.r);
        if (d < bd) { bd = d; best = x; }
      }
      if (best) best.owner = n;
    }
  }
  return { tiles, cities };
}
