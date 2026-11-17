// Pathing: per-unit terrain cost and the reachable-tile search.
import { MOVECOST, UT, W } from './data.js';
import { neighbors } from './util.js';
import { G, unitAt } from './state.js';

export function stepCost(type,t){const v=MOVECOST[type][t];return v===undefined?99:v;}

export function reach(u){
  const mv=UT[u.type].mv,best=new Map(),start=u.r*W+u.c;
  best.set(start,0);
  const pq=[[0,u.c,u.r]];
  while(pq.length){
    pq.sort((a,b)=>a[0]-b[0]);
    const [cost,c,r]=pq.shift();
    if(cost>best.get(r*W+c))continue;
    for(const [nc,nr] of neighbors(c,r)){
      const i=nr*W+nc,sc=stepCost(u.type,G.tiles[i].t);
      if(sc>=99)continue;
      const nCost=cost+sc;
      if(nCost>mv)continue;
      const occ=unitAt(nc,nr);
      if(occ&&occ.owner!==u.owner)continue;
      if(!best.has(i)||nCost<best.get(i)){best.set(i,nCost);pq.push([nCost,nc,nr]);}
    }
  }
  const dest=new Map();
  for(const [i,cst] of best){
    const occ=unitAt(i%W,(i/W)|0);
    if(!occ||occ===u)dest.set(i,cst);
  }
  return dest;
}
