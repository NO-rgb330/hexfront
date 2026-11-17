// Shared game state `G` plus tiny accessors. Other modules import G as a live binding.
import { NATIONS } from './data.js';

export let G = null;
export function setG(v) { G = v; }

export function makeUnit(type,owner,c,r,done){
  const n=G.nations[owner],pool=NATIONS[owner].cmd;
  const u={id:G.nextId++,type,owner,c,r,hp:10,xp:0,lv:0,moved:false,done:!!done,acted:!!done,cmd:pool[(n.cmdIdx++)%pool.length]};
  G.units.push(u);
  return u;
}

export function unitAt(c,r){for(const u of G.units)if(u.c===c&&u.r===r)return u;return null;}

export function cityAt(c,r){for(const x of G.cities)if(x.c===c&&x.r===r)return x;return null;}

export function logMsg(t){G.log.push({round:G.round,text:t});if(G.log.length>80)G.log.shift();}

export function fx(kind,c,r,extra){G.fx.push(Object.assign({kind,c,r},extra||{}));}
