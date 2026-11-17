// Recruiting units and buying research.
import { TECHS, TECH_COST, UT } from './data.js';
import { G, fx, logMsg, makeUnit, unitAt } from './state.js';

export function recruit(nid,type,city){
  const n=G.nations[nid],cost=UT[type].cost;
  if(n.gold<cost||city.owner!==nid||city.recruited||unitAt(city.c,city.r))return null;
  n.gold-=cost;city.recruited=true;
  const u=makeUnit(type,nid,city.c,city.r,true);
  fx('spawn',city.c,city.r);
  return u;
}

export function techCost(n,key){const lv=n.tech[key];return lv>=3?null:TECH_COST[lv];}

export function buyTech(nid,key){
  const n=G.nations[nid],c=techCost(n,key);
  if(c===null||n.gold<c)return false;
  n.gold-=c;n.tech[key]++;
  logMsg(n.name+' researched '+TECHS.find(t=>t.key===key).name+' '+n.tech[key]+'.');
  return true;
}
