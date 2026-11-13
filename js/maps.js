// Map registry. Each map is self-contained in its own folder and exposes { id, name, W, H, build() }.
// build() returns { tiles:[{t}], cities:[{c,r,name}] } where cities[0..3] are the four capitals in power order.
// To add a map: make js/<folder>/index.js with that shape, import it here and add it to MAPS.
import { WORLD } from './world/index.js';

export const MAPS = { world: WORLD };
export const DEFAULT_MAP = 'world';

export function getMap(id) {
  const m = MAPS[id || DEFAULT_MAP];
  if (!m) throw new Error('unknown map ' + id);
  return m;
}
