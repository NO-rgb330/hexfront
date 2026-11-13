// UI smoke test: runs the real UI modules against a stubbed DOM and canvas.
// It plays scripted turns through the same click handler a player uses.
const stub = () => {
  const store = {};
  return new Proxy(function () {}, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === Symbol.iterator) return function* () {};
      if (k in store) return store[k];
      if (k === 'classList') return { add() {}, remove() {} };
      if (k === 'dataset') return {};
      if (k === 'getBoundingClientRect') return () => ({ width: 760, left: 0, top: 0, height: 500 });
      if (k === 'getContext') return () => ctx;
      return stub();
    },
    set(t, k, v) { store[k] = v; return true; },
    apply() { return stub(); }
  });
};
const ctx = new Proxy({}, {
  get: (t, k) => k === 'measureText' ? () => ({ width: 8 }) : (k in t ? t[k] : () => {}),
  set: (t, k, v) => { t[k] = v; return true; }
});
const els = {};
globalThis.document = {
  getElementById: id => els[id] || (els[id] = stub()),
  querySelector: () => null,
  addEventListener() {}
};
globalThis.window = { devicePixelRatio: 1 };
globalThis.requestAnimationFrame = () => 0;

await import('../js/main.js');
const { startGame, onTap, endTurn } = await import('../js/ui/actions.js');
const { cen } = await import('../js/ui/render.js');
const { U } = await import('../js/ui/uistate.js');
const state = await import('../js/core/state.js'); // namespace keeps G a live binding
const { W } = await import('../js/core/data.js');
const { recruit } = await import('../js/core/economy.js');

for (const p of [0, 2]) {
  startGame(p, 'normal');
  const G = () => state.G;
  U.fast = true;
  await new Promise(r => setTimeout(r, 800));
  for (let turn = 0; turn < 12 && !G().over; turn++) {
    for (const u of G().units.filter(x => x.owner === G().player)) {
      if (!G().units.includes(u)) continue;
      let [x, y] = cen(u.c, u.r); onTap(x, y);
      if (!U.sel || U.sel.kind !== 'unit') continue;
      const tg = [...U.sel.targets.keys()][0];
      if (tg) { const e = G().units.find(z => z.id === tg); [x, y] = cen(e.c, e.r); onTap(x, y); }
      else {
        const d = [...U.sel.dests.keys()].find(i => i !== u.r * W + u.c);
        if (d !== undefined) { [x, y] = cen(d % W, (d / W) | 0); onTap(x, y); }
      }
    }
    for (const c of G().cities.filter(c => c.owner === G().player)) {
      const [x, y] = cen(c.c, c.r); onTap(x, y);
      recruit(G().player, 'inf', c);
    }
    await endTurn();
  }
  console.log(`ui-smoke: player ${p} reached round ${G().round}, over=${G().over ? G().over.reason : 'no'}`);
}
console.log('ui-smoke: OK');
process.exit(0);
