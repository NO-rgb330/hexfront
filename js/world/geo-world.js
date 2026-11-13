// Assembles every geo-*.js file into one land/water description.
// Convention: map lon. Old World files are already 0..360 (east of the dateline above 180); the Americas are
// standard lon (west negative) and get +360 so Alaska sits next to Chukotka.
import { P, EURASIA, AFRICA, BLACK_SEA, CASPIAN, BALTIC, VICTORIA } from './geo-old-world.js';
import { NORTH_AMERICA, SOUTH_AMERICA, GREENLAND, ISLANDS_W, GREAT_LAKES } from './geo-americas.js';
import { ISLANDS_ATLANTIC, ISLANDS_INDIAN, ISLANDS_EAST_ASIA, ISLANDS_ARCTIC_E } from './geo-islands.js';
import { AUSTRALIA, TASMANIA, NEW_ZEALAND, NEW_GUINEA, ISLANDS_SE_ASIA, ISLANDS_PACIFIC } from './geo-oceania.js';
import { ANTARCTICA } from './geo-antarctica.js';

const BAIKAL = P(`103.8,51.6 105.5,51.6 108.0,52.5 109.8,54.5 109.5,55.7 108.5,54.5 106.0,53.0 104.5,52.0`);
const TANGANYIKA = P(`29.2,-3.4 29.6,-6.0 30.8,-8.3 31.2,-8.6 30.0,-6.5 29.4,-4.5`);
const MALAWI = P(`34.3,-9.5 34.8,-11.5 34.5,-14.3 35.2,-14.0 34.9,-11.0 34.7,-9.5`);

const east = poly => poly.map(([x, y]) => [x + 360, y]);
const vals = o => Array.isArray(o) ? [o] : Object.values(o);

export const LAND = [
  EURASIA, AFRICA,
  ...[NORTH_AMERICA, SOUTH_AMERICA, GREENLAND, ...vals(ISLANDS_W)].map(east),
  ...vals(ISLANDS_ATLANTIC), ...vals(ISLANDS_INDIAN), ...vals(ISLANDS_EAST_ASIA), ...vals(ISLANDS_ARCTIC_E),
  AUSTRALIA, TASMANIA, NEW_GUINEA, ...vals(NEW_ZEALAND), ...vals(ISLANDS_SE_ASIA), ...vals(ISLANDS_PACIFIC),
  ANTARCTICA,
];

// Inland seas and lakes: cut out of the land above.
export const WATER = [BLACK_SEA, CASPIAN, BALTIC, VICTORIA, BAIKAL, TANGANYIKA, MALAWI, ...GREAT_LAKES.map(east)];

// Even-odd point in polygon (works for concave coastlines).
export function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Approximate area in km2 of a lon/lat polygon.
export function polyArea(pts) {
  let a = 0, lm = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1; lm += y1;
  }
  lm /= pts.length;
  return Math.abs(a / 2) * 111.32 * Math.cos(lm * Math.PI / 180) * 110.57;
}

export function polyCentroid(pts) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length], k = x1 * y2 - x2 * y1;
    a += k; cx += (x1 + x2) * k; cy += (y1 + y2) * k;
  }
  return a ? [cx / (3 * a), cy / (3 * a)] : pts[0];
}

const boxed = pts => {
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (const [x, y] of pts) { if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > d) d = y; }
  return { pts, a, b, c, d };
};
const LB = LAND.map(boxed), WB = WATER.map(boxed);
const hit = (list, x, y) => {
  for (const p of list) if (x >= p.a && x <= p.b && y >= p.c && y <= p.d && inside(p.pts, x, y)) return true;
  return false;
};

// Mid-size landmasses (30k to 3M km2) that a coarse hex sample could drop entirely: Britain, Japan, Madagascar...
export const ISLANDS = LAND.filter(p => p !== ANTARCTICA).map(pts => ({ pts, area: polyArea(pts) }))
  .filter(o => o.area >= 30000 && o.area < 3e6).map(o => ({ ...o, centroid: polyCentroid(o.pts) }));

export function insideLand(pts, lon, lat) {
  return inside(pts, lon, lat) || inside(pts, lon + 360, lat) || inside(pts, lon - 360, lat);
}

// True when (lon, lat) is land. The globe wraps, so a point is also tested one turn east and west.
export function isLand(lon, lat) {
  for (const x of [lon, lon + 360, lon - 360]) if (hit(LB, x, lat) && !hit(WB, x, lat)) return true;
  return false;
}
