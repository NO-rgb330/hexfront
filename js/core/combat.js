// Damage formula, attacks, counter-attacks, experience and the options shown to the player.
import { MULT, RANKS, UT, W, XP_STEPS } from './data.js';
import { dist, within } from './util.js';
import { G, cityAt, fx } from './state.js';
import { reach } from './movement.js';

export function calcDmg(att,def,ac,ar,dc,dr,rf){
  const A=UT[att.type],D=UT[def.type],na=G.nations[att.owner],nd=G.nations[def.owner];
  const strength=A.atk*(1+0.1*na.tech.fire)*(1+0.08*att.lv)*(0.4+0.6*att.hp/10)*((MULT[att.type]||{})[def.type]||1);
  let bonus=0;
  if(!D.air){
    const t=G.tiles[dr*W+dc].t;
    bonus+=t==='forest'?0.25:t==='mount'?0.5:0;
    if(cityAt(dc,dr))bonus+=0.4;
  }
  const defense=D.def*(1+0.1*nd.tech.armor)*(1+0.08*def.lv)*(1+bonus);
  return Math.max(1,Math.min(def.hp,Math.round(4*strength/defense*rf)));
}

export function removeUnit(u){const i=G.units.indexOf(u);if(i>=0)G.units.splice(i,1);}

export function gainXp(u,x){
  u.xp+=x;
  while(u.lv<3&&u.xp>=XP_STEPS[u.lv]){
    u.lv++;u.hp=Math.min(10,u.hp+2);
    fx('lvl',u.c,u.r,{text:RANKS[u.lv]});
  }
}

export function doAttack(att,def){
  const dd=dist(att.c,att.r,def.c,def.r);
  const dmg=calcDmg(att,def,att.c,att.r,def.c,def.r,0.9+G.rnd()*0.2);
  def.hp-=dmg;
  fx('shot',att.c,att.r,{c2:def.c,r2:def.r});
  fx('dmg',def.c,def.r,{text:'-'+dmg,tone:'hit'});
  let counter=0;
  gainXp(att,dmg+(def.hp<=0?3:0));
  if(def.hp>0){
    if(UT[def.type].rng>=dd){
      counter=calcDmg(def,att,def.c,def.r,att.c,att.r,0.9+G.rnd()*0.2);
      att.hp-=counter;
      fx('dmg',att.c,att.r,{text:'-'+counter,tone:'counter'});
      gainXp(def,counter+(att.hp<=0?3:0));
    }
  }else removeUnit(def);
  if(att.hp<=0)removeUnit(att);
  att.done=true;att.acted=true;
  return {dmg,counter,killed:def.hp<=0,lost:att.hp<=0};
}

export function computeOptions(u){
  const dests=(u.done||u.moved)?new Map():reach(u);
  const targets=new Map();
  if(!u.done&&!(u.type==='art'&&u.moved)){
    const rng=UT[u.type].rng,fixed=u.type==='art'||u.moved;
    for(const e of G.units){
      if(e.owner===u.owner)continue;
      let best=null,bs=1e9;
      for(const [c,r] of within(e.c,e.r,rng)){
        let cst;
        if(fixed){if(c!==u.c||r!==u.r)continue;cst=0;}
        else{cst=dests.get(r*W+c);if(cst===undefined)continue;}
        const t=G.tiles[r*W+c].t;
        const s=cst*10-(t==='forest'?3:t==='mount'?5:0)-(cityAt(c,r)?4:0);
        if(s<bs){bs=s;best={c,r,cst};}
      }
      if(best)targets.set(e.id,best);
    }
  }
  return {dests,targets};
}
