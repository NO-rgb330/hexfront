// Headless AI-vs-AI simulation. Plays full games with no human and checks invariants every turn.
import { newGame, nextTurn } from '../js/core/game.js';
import { aiTurn } from '../js/core/ai.js';
import { G } from '../js/core/state.js';
import { W } from '../js/core/data.js';

const GAMES = Number(process.env.GAMES || 16);
const wins = {}, rounds = [];
let errors = 0, limit = 0;

for (let seed = 1; seed <= GAMES; seed++) {
  try {
    newGame({ player: -1, diff: ['easy', 'normal', 'hard'][seed % 3], seed });
    let guard = 0;
    while (!G.over && guard++ < 600) {
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
        if (G.tiles[k].t === 'strait' && G.cities.some(c => c.r * W + c.c === k)) throw new Error('city on strait');
        if ((u.type === 'tank' || u.type === 'art') && G.tiles[k].t === 'mount') throw new Error(u.type + ' on mountain');
      }
      if (G.over) break;
      nextTurn();
    }
    if (!G.over) throw new Error('game never ended, seed ' + seed);
    wins[G.over.winner] = (wins[G.over.winner] || 0) + 1;
    rounds.push(G.round);
    if (G.over.reason === 'limit') limit++;
  } catch (e) {
    errors++;
    console.log('ERR', e.stack.split('\n').slice(0, 3).join(' | '));
  }
}
const avg = Math.round(rounds.reduce((a, b) => a + b, 0) / (rounds.length || 1));
console.log(`sim: ${GAMES} games, errors ${errors}, wins ${JSON.stringify(wins)}, round-limit endings ${limit}, rounds avg ${avg}`);
if (errors) process.exit(1);
