// Mutable UI state (selection, hover, tab, effects, camera, minimap) in one object.
export const U = {
  sel: null, hover: null, busy: false, fast: false, tab: 'field',
  effects: [], dirty: true, toastTimer: 0,
  // Camera: s is hex radius in pixels, ox/oy is where the world origin sits on the canvas.
  size: { s: 20, ox: 0, oy: 0, w: 600, h: 400, dpr: 1 },
  viewReady: false, fly: null,
  mini: { w: 0, h: 0, ms: 1, dpr: 1 }, miniKey: '', miniTerrain: null
};
