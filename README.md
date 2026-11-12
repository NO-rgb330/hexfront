# Hexfront Conquest

A turn-based hex-map conquest game for the browser. Four powers, a procedurally generated continent, generals that rank up, a small tech tree, and AI rivals. Plain ES modules: no framework, no bundler, no dependencies.

## Run it

Browsers block ES modules on `file://`, so serve the folder:

```bash
npm run serve        # python3 -m http.server 8080
# open http://localhost:8080
```

## Test it

```bash
npm test
```

- `tests/sim.js` plays 60 AI-vs-AI games headlessly and checks invariants every turn (no stacked units, no tanks on mountains, every game ends).
- `tests/ui-smoke.js` loads the real UI modules against a stubbed DOM and canvas, then plays scripted turns through the click handler.

Set `GAMES=300 node tests/sim.js` for a bigger balance run.

## Deploy to GitHub Pages

1. Create a repo and push this folder to `main`.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push again (or run the workflow manually). The workflow runs the tests, then publishes the site at `https://<user>.github.io/<repo>/`.

Prefer branch deploys? Choose **Deploy from a branch → main / (root)** instead and delete `.github/workflows/pages.yml`. `.nojekyll` is already included.

## Layout

```
index.html          markup: HUD, canvas board, side panel, start and end screens
css/style.css       design tokens and styles (single dark theme)
js/
  main.js           entry point: DOM event wiring and boot
  core/             game rules. No DOM access, runs in Node for tests
    data.js           constants: nations, unit stats, counters, terrain costs, tech tree
    util.js           seeded RNG, noise, hex maths
    state.js          shared game state G (live binding) + accessors
    mapgen.js         terrain, capitals, cities, connectivity checks
    movement.js       terrain cost, reachable-tile search
    combat.js         damage formula, attacks, XP, player options
    conquest.js       moving, capturing, eliminating powers, win checks
    economy.js        recruiting, research
    game.js           newGame, turn start (heal, income), turn order
    ai.js             computer players (generator, one yield per action)
  ui/
    dom.js            element lookups
    uistate.js        mutable UI state: selection, hover, tab, effects
    panels.js         HUD, scoreboard, side-panel HTML
    render.js         canvas drawing, hit-testing, effects, frame loop
    actions.js        player input and turn flow
tests/              sim.js, ui-smoke.js
```

### Dependency rule

Imports only point downward through this order. Core never imports UI.

`data → util → state → mapgen → movement → combat → conquest → economy → game → ai`
then `dom → uistate → panels → render → actions → main`

### How the pieces talk

- **State:** `G` holds tiles, cities, units, nations, round and the effect queue. Import it from `core/state.js`. It is a live binding, so only `setG` (called by `newGame`) may reassign it. Mutate its properties freely.
- **Effects:** core code never draws. It pushes events onto `G.fx` (damage numbers, shots, captures, toasts) and `ui/render.js` drains them every frame.
- **AI turns:** `aiTurn(nid)` is a generator that yields after each visible action. The UI awaits a delay between yields; tests run it to completion instantly.

## Common upgrades

| Want | Touch |
|---|---|
| New unit type | `data.js` (`UT`, `MULT`, `MOVECOST`), `render.js` (`drawIcon`), weights in `ai.js` (`aiRecruitOne`) |
| Naval units and ports | `data.js` terrain costs, `mapgen.js` coasts, `movement.js` |
| Fog of war | `render.js`, `combat.js` (`computeOptions`), `ai.js` |
| Bigger map | `W`, `H` in `data.js`; capital targets in `mapgen.js` |
| Generals with skills | `state.js` (`makeUnit`), `combat.js` (`gainXp`), `panels.js` (`unitCard`) |
| Alliances | `ai.js` (`foesOf`, `aiTarget`) |
| Save/load | serialise `G` (drop `rnd`), restore with `setG` |
