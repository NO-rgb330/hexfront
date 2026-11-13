// Computer players. aiTurn is a generator that yields after each visible action.
import { TECHS, UNLIMITED_MOVE, UT, W } from './data.js';
import { dist, shuffle, within } from './util.js';
import { G, cityAt, unitAt } from './state.js';
import { reach } from './movement.js';
import { calcDmg, doAttack } from './combat.js';
import { doMove } from './conquest.js';
import { buyTech, recruit, techCost } from './economy.js';

export function foesOf(nid){return G.units.filter(e=>e.owner!==nid);}

export function nearestFoeDist(u){
  let d=99;
  for(const e of G.units)if(e.owner!==u.owner)d=Math.min(d,dist(u.c,u.r,e.c,e.r));
  for(const c of G.cities)if(c.owner!==u.owner)d=Math.min(d,dist(u.c,u.r,c.c,c.r));
  return d;
}

export function frontDist(nid,city){
  let d=99;
  for(const e of G.units)if(e.owner!==nid)d=Math.min(d,dist(city.c,city.r,e.c,e.r));
  for(const c of G.cities)if(c.owner!==nid)d=Math.min(d,dist(city.c,city.r,c.c,c.r)+1);
  return d;
}

export function aiResearch(nid){
  const n=G.nations[nid];
  const keys=shuffle(TECHS.map(t=>t.key),G.rnd);
  for(const k of keys){
    const c=techCost(n,k);
    if(c!==null&&n.gold>=c+80&&G.rnd()<0.6){buyTech(nid,k);return;}
  }
}

export function aiTarget(u){
  const air=UT[u.type].air,art=u.type==='art';
  if(u.hp<=3){
    let best=null,bd=99;
    for(const c of G.cities)if(c.owner===u.owner){const d=dist(u.c,u.r,c.c,c.r);if(d<bd){bd=d;best=c;}}
    if(best)return best;
  }
  const cap=G.cities.find(c=>c.capital===u.owner&&c.owner===u.owner);
  if(cap&&!air){
    const threat=G.units.some(e=>e.owner!==u.owner&&dist(e.c,e.r,cap.c,cap.r)<=3);
    const guard=G.units.some(g=>g.owner===u.owner&&g!==u&&g.c===cap.c&&g.r===cap.r);
    if(threat&&!guard&&dist(u.c,u.r,cap.c,cap.r)<=6)return cap;
  }
  if(!air&&!art){
    let best=null,bs=1e9;
    for(const c of G.cities){
      if(c.owner===u.owner)continue;
      const s=dist(u.c,u.r,c.c,c.r)-(c.capital>=0?3:0)-(c.owner===-1?2:0)+G.rnd()*2.5;
      if(s<bs){bs=s;best=c;}
    }
    if(best)return best;
  }
  let best=null,bd=99;
  for(const e of G.units){
    if(e.owner===u.owner)continue;
    const d=dist(u.c,u.r,e.c,e.r)-(air&&e.type==='art'?2:0);
    if(d<bd){bd=d;best=e;}
  }
  if(best)return best;
  for(const c of G.cities)if(c.owner!==u.owner){const d=dist(u.c,u.r,c.c,c.r);if(d<bd){bd=d;best=c;}}
  return best;
}

export function aiUnit(u){
  const T=UT[u.type],rng=T.rng,enemies=foesOf(u.owner);
  // The unit holding the capital never leaves it: with no movement cap, an empty capital falls in one move.
  const home=G.cities.find(c=>c.capital===u.owner&&c.owner===u.owner);
  const garrison=!!home&&!T.air&&home.c===u.c&&home.r===u.r;
  const dests=garrison?new Map([[u.r*W+u.c,0]]):reach(u);
  // With no movement cap, distance travelled barely matters, so it only breaks ties.
  const cp=UNLIMITED_MOVE?0.12:1;
  let best=null;
  const consider=(c,r,cst,e)=>{
    const city=cityAt(c,r);
    let bonus=0;
    if(!T.air&&city&&city.owner!==u.owner)bonus=60+(city.capital>=0?150:0)+(city.owner===-1?0:20);
    const terr=G.tiles[r*W+c].t;
    const tb=(terr==='forest'?4:terr==='mount'?6:0)+(city&&city.owner===u.owner?5:0);
    let score;
    if(!e){if(bonus<=0)return;score=bonus-cst*cp*2+tb;}
    else{
      const d=dist(c,r,e.c,e.r);
      const dmg=calcDmg(u,e,c,r,e.c,e.r,1),kill=dmg>=e.hp;
      let cnt=0;
      if(!kill&&UT[e.type].rng>=d){
        const ghost=Object.assign({},e,{hp:e.hp-dmg});
        cnt=calcDmg(ghost,u,e.c,e.r,c,r,1);
      }
      score=dmg*UT[e.type].cost/10+(kill?UT[e.type].cost*0.25:0)-cnt*T.cost/10*0.9+bonus+tb-cst*cp*1.5;
    }
    if(!best||score>best.score)best={c,r,score,e};
  };
  if(!T.air)for(const city of G.cities){
    if(city.owner===u.owner)continue;
    const cst=u.type==='art'?(city.c===u.c&&city.r===u.r?0:undefined):dests.get(city.r*W+city.c);
    if(cst!==undefined)consider(city.c,city.r,cst,null);
  }
  for(const e of enemies){
    for(const [c,r] of within(e.c,e.r,rng)){
      let cst;
      if(u.type==='art'){if(c!==u.c||r!==u.r)continue;cst=0;}
      else{cst=dests.get(r*W+c);if(cst===undefined)continue;}
      consider(c,r,cst,e);
    }
  }
  if(best&&best.score>0){
    if(best.c!==u.c||best.r!==u.r)doMove(u,best.c,best.r);
    if(best.e&&!G.over&&G.units.includes(best.e)&&G.units.includes(u)&&!(u.type==='art'&&u.moved)&&dist(u.c,u.r,best.e.c,best.e.r)<=rng){
      doAttack(u,best.e);
    }
    return true;
  }
  if(garrison)return false;
  const target=aiTarget(u);
  if(!target)return false;
  let bd=null,bs=1e9;
  for(const [i,cst] of dests){
    const c=i%W,r=(i/W)|0,t=G.tiles[r*W+c].t;
    let s=dist(c,r,target.c,target.r)-(t==='forest'?0.3:t==='mount'?0.5:0)+G.rnd()*0.6;
    if(u.type==='art'){
      let md=99;
      for(const e of enemies)md=Math.min(md,dist(c,r,e.c,e.r));
      if(md<3)s+=4*(3-md);
    }
    if(s<bs){bs=s;bd=[c,r];}
  }
  if(!bd||(bd[0]===u.c&&bd[1]===u.r))return false;
  doMove(u,bd[0],bd[1]);
  return true;
}

export function aiRecruitOne(nid){
  const n=G.nations[nid];
  const mine=G.units.filter(u=>u.owner===nid).length,owned=G.cities.filter(c=>c.owner===nid);
  if(mine>=4+owned.length*2)return false;
  const free=owned.filter(c=>!c.recruited&&!unitAt(c.c,c.r));
  if(!free.length)return false;
  const aff=Object.keys(UT).filter(t=>UT[t].cost<=n.gold);
  if(!aff.length)return false;
  free.sort((a,b)=>frontDist(nid,a)-frontDist(nid,b));
  const wt={inf:45,tank:28,art:14,air:13};
  let tot=0;for(const t of aff)tot+=wt[t];
  let x=G.rnd()*tot,pick=aff[0];
  for(const t of aff){x-=wt[t];if(x<=0){pick=t;break;}}
  return !!recruit(nid,pick,free[0]);
}

export function* aiTurn(nid){
  if(!G.nations[nid].alive)return;
  aiResearch(nid);
  const order=G.units.filter(u=>u.owner===nid).map(u=>({u,d:nearestFoeDist(u)})).sort((a,b)=>a.d-b.d).map(o=>o.u);
  for(const u of order){
    if(G.over)return;
    if(!G.units.includes(u)||u.done)continue;
    if(aiUnit(u))yield;
  }
  while(!G.over&&aiRecruitOne(nid))yield;
}
