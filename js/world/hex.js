// Odd-r offset hex helpers, identical to js/core/util.js. Kept here so the world folder has no imports from the game.
const EVEN = [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]];
const ODD = [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]];

export function hexNeighbors(c, r, W, H) {
  const out = [];
  for (const [dc, dr] of (r & 1) ? ODD : EVEN) {
    const nc = c + dc, nr = r + dr;
    if (nc >= 0 && nc < W && nr >= 0 && nr < H) out.push([nc, nr]);
  }
  return out;
}

export function hexDist(c1, r1, c2, r2) {
  const cube = (c, r) => { const x = c - (r - (r & 1)) / 2; return [x, -x - r, r]; };
  const a = cube(c1, r1), b = cube(c2, r2);
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}
