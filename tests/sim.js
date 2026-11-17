// Headless AI-vs-AI simulation. Plays full games with no human and checks invariants every turn.
import { newGame, nextTurn } from '../js/core/game.js';
import { aiTurn } from '../js/core/ai.js';
import { G } from '../js/core/state.js';
import { W, MAP_SIZES } from '../js/core/data.js';

// Games cycle through the world sizes. SIZES=huge GAMES=6 node tests/sim.js plays only huge worlds.
const GAMES = Number(process.env.GAMES || 40);
const SIZES = (process.env.SIZES || 'classic,classic,large,huge').split(',');
for (const k of SIZES) if (!MAP_SIZES[k]) throw new Error('unknown size ' + k);
const wins = {}, rounds = [], bySize = {};
let errors = 0, limit = 0;

for (let seed = 1; seed <= GAMES; seed++) {
  try {
    const size = SIZES[seed % SIZES.length], t0 = Date.now();
    newGame({ player: -1, diff: ['easy', 'normal', 'hard'][seed % 3], seed, size });
    let guard = 0;
    while (!G.over && guard++ < G.roundLimit * 4 + 20) {
      const gen = aiTurn(G.current);
      let n = 0;
      while (!gen.next().done && n++ < 500);
      G.fx.length = 0;
      const seen = new Set();
      for (const u of G.units) {
        const k = u.r * W + u.c;
        if (seen.has(k)) throw new Error('stacked units, seed ' + seed);
        seen.add(k);
        if (u.hp < 1 || u.hp > 10) throw new Error('bad hp ' + u.hp);
        if (u.type !== 'air' && G.tiles[k].t === 'sea') throw new Error('ground unit at sea');
        if ((u.type === 'tank' || u.type === 'art') && G.tiles[k].t === 'mount') throw new Error(u.type + ' on mountain');
      }
      if (G.over) break;
      nextTurn();
    }
    if (!G.over) throw new Error('game never ended, seed ' + seed);
    wins[G.over.winner] = (wins[G.over.winner] || 0) + 1;
    rounds.push(G.round);
    const b = bySize[size] || (bySize[size] = { n: 0, rounds: 0, limit: 0, ms: 0, cities: G.cities.length });
    b.n++; b.rounds += G.round; b.ms += Date.now() - t0; if (G.over.reason === 'limit') b.limit++;
    if (G.over.reason === 'limit') limit++;
  } catch (e) {
    errors++;
    console.log('ERR', e.stack.split('\n').slice(0, 3).join(' | '));
  }
}
const avg = Math.round(rounds.reduce((a, b) => a + b, 0) / (rounds.length || 1));
console.log(`sim: ${GAMES} games, errors ${errors}, wins ${JSON.stringify(wins)}, round-limit endings ${limit}, rounds avg ${avg}`);
for (const [k, b] of Object.entries(bySize)) console.log(`  ${k.padEnd(8)} ${b.n} games, avg ${Math.round(b.rounds / b.n)} rounds, ${b.limit} ended on the round limit, ${Math.round(b.ms / b.n)} ms/game`);
if (errors) process.exit(1);
