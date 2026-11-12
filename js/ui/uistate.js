// Mutable UI state (selection, hover, tab, effects, canvas size) in one object.
export const U = {
  sel: null, hover: null, busy: false, fast: false, tab: 'field',
  effects: [], dirty: true, toastTimer: 0,
  size: { s: 20, ox: 0, oy: 0, w: 600, h: 400, dpr: 1 }
};

