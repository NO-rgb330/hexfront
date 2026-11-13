// Pathing: per-unit terrain cost and the reachable-tile search.
// With UNLIMITED_MOVE there is no distance cap, but ground units stop on any hex touching an enemy.
import { MOVECOST, UNLIMITED_MOVE, UT, W } from './data.js';
import { neighbors } from './util.js';
import { G } from './state.js';

export function stepCost(type,t){const v=MOVECOST[type][t];return v===undefined?99:v;}

export function reach(u){
  const T=UT[u.type],cap=UNLIMITED_MOVE?Infinity:T.mv,start=u.r*W+u.c;
  const occ=new Map();
  for(const o of G.units)occ.set(o.r*W+o.c,o);
  let zoc=null;
  if(UNLIMITED_MOVE&&!T.air){
    zoc=new Set();
    for(const e of G.units)if(e.owner!==u.owner)for(const [nc,nr] of neighbors(e.c,e.r))zoc.add(nr*W+nc);
  }
  const best=new Map([[start,0]]),buckets=[[start]];
  for(let cost=0;cost<buckets.length;cost++){
    const b=buckets[cost];
    if(!b)continue;
    for(const i of b){
      if(best.get(i)!==cost)continue;
      if(zoc&&i!==start&&zoc.has(i))continue;
      const c=i%W,r=(i/W)|0;
      for(const [nc,nr] of neighbors(c,r)){
        const j=nr*W+nc,sc=stepCost(u.type,G.tiles[j].t);
        if(sc>=99)continue;
        const nCost=cost+sc;
        if(nCost>cap)continue;
        const o=occ.get(j);
        if(o&&o.owner!==u.owner)continue;
        const prev=best.get(j);
        if(prev===undefined||nCost<prev){best.set(j,nCost);(buckets[nCost]||(buckets[nCost]=[])).push(j);}
      }
    }
  }
  const dest=new Map();
  for(const [i,cst] of best){
    const o=occ.get(i);
    if(!o||o===u)dest.set(i,cst);
  }
  return dest;
}
