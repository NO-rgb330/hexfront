# Hexfront Conquest

A turn-based hex-map conquest game for the browser. Four powers fight over a real-world map built from accurate coastlines, with generals that rank up, a small tech tree and AI rivals. Plain ES modules: no framework, no bundler, no dependencies.

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

- `tests/map.js` checks the world map: land/sea spot checks on real places, islands that must survive the hex grid, every city reachable on foot.
- `tests/sim.js` plays 16 AI-vs-AI games headlessly and checks invariants every turn (no stacked units, no tanks on mountains, no ground units at sea, every game ends).
- `tests/ui-smoke.js` loads the real UI modules against a stubbed DOM and canvas, then plays scripted turns through the click handler.

Set `GAMES=100 node tests/sim.js` for a bigger balance run.

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
  maps.js           map registry (MAPS, DEFAULT_MAP, getMap)
  world/            the main map, self-contained: real coastlines, terrain, cities, hex sampling (see below)
  core/             game rules. No DOM access, runs in Node for tests
    data.js           constants: nations, unit stats, counters, terrain costs, tech tree
    util.js           seeded RNG, noise, hex maths
    state.js          shared game state G (live binding) + accessors
    mapgen.js         builds the board from the active map, deals out starting cities
    movement.js       terrain cost, reachable-tile search (no distance cap, enemy zone of control)
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
tests/              map.js, sim.js, ui-smoke.js
```

### Dependency rule

Imports only point downward through this order. Core never imports UI.

`data → util → state → (maps → world) → mapgen → movement → combat → conquest → economy → game → ai`
then `dom → uistate → panels → render → actions → main`

### The world map (`js/world/`)

Everything about the main map lives in one folder and imports nothing from the game.

```
world/
  geo-old-world.js   Eurasia, Africa, Black Sea, Caspian, Baltic, Lake Victoria (and the P() polygon parser)
  geo-americas.js    North and South America, Greenland, western islands, the Great Lakes (standard lon, west negative)
  geo-islands.js     Britain, Ireland, Iceland, Japan, Madagascar, Sri Lanka, the Mediterranean islands, Arctic islands
  geo-oceania.js     Australia, New Zealand, New Guinea, Indonesia, the Philippines, Pacific groups
  geo-antarctica.js  Antarctica (below the playable latitudes, kept for completeness)
  geo-terrain.js     mountain ranges and forest belts
  geo-world.js       merges every coastline into LAND / WATER, shifts the Americas east of the dateline, isLand(lon, lat)
  hex.js             odd-r hex maths (same as core/util.js, so world/ needs nothing from the game)
  cities.js          the four starting capitals and ~65 real cities
  index.js           samples the coastlines onto a 72x33 hex board and exports the map { id, name, W, H, build() }
```

How a board is made: each hex is sampled at 19 points and becomes land if 40% or more is land. Any mid-size island that would vanish (Britain, Japan, Madagascar, Taiwan...) keeps its nearest hex. Terrain comes from the mountain and forest polygons. A sea hex touching two landmasses, or a pair of sea hexes linking two, becomes a **strait**, a ferry crossing ground units can cross at double cost, so Britain, Japan, Sri Lanka, Australia and the Indonesian islands are reachable on foot. Cities snap to the nearest free land hex; any city an army cannot walk to is dropped, and mountains on the route between cities are flattened so armor is never walled off.

The board spans a full turn of longitude starting at lon -26 (seam in the Atlantic), with hex shape matched to the lat/lon aspect so nothing is stretched.

**Adding another map:** create `js/<name>/index.js` exporting `{ id, name, W, H, build() }` where `build()` returns `{ tiles:[{t}], cities:[{c,r,name}] }` (the first four cities are the capitals in power order; terrain keys are `sea strait plain forest mount`), then register it in `js/maps.js`. Pass the map id to `genMap`.

### Rules that differ from a classic hex wargame

- **No movement cap.** A unit can go anywhere it can legally reach this turn (`UNLIMITED_MOVE` in `data.js`). Ground units cannot cross open sea and tanks and guns cannot enter mountains. Any non-air unit must stop on a hex touching an enemy, so armies cannot slip past each other. Set `UNLIMITED_MOVE=false` to use each unit's Move stat again.
- **No round limit.** The war ends when one power is left (`ROUND_LIMIT=Infinity`). Give it a number for a clock.
- The AI keeps one unit on its capital at all times, because with no movement cap an empty capital falls in a single move.
- The camera pans (drag) and zooms (wheel, pinch, +/-/0 keys, buttons).

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
| Another map | `js/<name>/index.js` plus `js/maps.js` (see above) |
| More or different cities | `world/cities.js` |
| Mountains and forests | `world/geo-terrain.js` |
| Generals with skills | `state.js` (`makeUnit`), `combat.js` (`gainXp`), `panels.js` (`unitCard`) |
| Alliances | `ai.js` (`foesOf`, `aiTarget`) |
| Save/load | serialise `G` (drop `rnd`), restore with `setG` |
