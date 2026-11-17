// Moving, capturing cities, eliminating powers, and win/lose checks.
import { UT } from './data.js';
import { G, cityAt, fx, logMsg } from './state.js';

export function endByLimit(){
  const alive=G.nations.filter(n=>n.alive);
  const score=n=>G.cities.filter(c=>c.owner===n.id).length*100+G.units.filter(u=>u.owner===n.id).length;
  alive.sort((a,b)=>score(b)-score(a));
  G.over={winner:alive[0].id,reason:'limit',defeat:G.player>=0&&alive[0].id!==G.player};
}

export function checkOver(){
  if(G.over)return;
  const alive=G.nations.filter(n=>n.alive);
  if(G.player>=0&&!G.nations[G.player].alive){G.over={winner:alive.length===1?alive[0].id:-1,reason:'fallen',defeat:true};return;}
  if(alive.length===1)G.over={winner:alive[0].id,reason:'conquest',defeat:G.player>=0&&alive[0].id!==G.player};
}

export function doMove(u,c,r){
  if(u.c===c&&u.r===r)return;
  u.c=c;u.r=r;u.moved=true;u.acted=true;
  if(u.type==='art')u.done=true;
  tryCapture(u);
}

export function tryCapture(u){
  if(UT[u.type].air)return false;
  const city=cityAt(u.c,u.r);
  if(!city||city.owner===u.owner)return false;
  city.owner=u.owner;city.recruited=true;
  G.nations[u.owner].gold+=20;
  fx('cap',u.c,u.r,{text:city.name});
  logMsg(G.nations[u.owner].name+' took '+city.name+'.');
  if(city.capital>=0&&city.capital!==u.owner&&G.nations[city.capital].alive)eliminate(city.capital,u.owner);
  checkOver();
  return true;
}

export function eliminate(dead,by){
  const dn=G.nations[dead];
  dn.alive=false;
  G.units=G.units.filter(x=>x.owner!==dead);
  for(const c of G.cities)if(c.owner===dead)c.owner=by;
  G.nations[by].gold+=Math.floor(dn.gold/2);dn.gold=0;
  fx('toast',0,0,{text:dn.name+' has fallen'});
  logMsg(dn.name+' has fallen to '+G.nations[by].name+'.');
}
