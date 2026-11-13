// Game lifecycle: new game, turn start (healing, income) and turn order.
import { DIFF, NATIONS, ROUND_LIMIT, W } from './data.js';
import { mulberry32, neighbors } from './util.js';
import { G, cityAt, fx, logMsg, makeUnit, setG, unitAt } from './state.js';
import { genMap } from './mapgen.js';
import { endByLimit } from './conquest.js';

export function newGame(opts){
  const seed=opts.seed!==undefined?opts.seed:((Math.random()*1e9)|0);
  const map=genMap(seed);
  setG({seed,tiles:map.tiles,cities:map.cities,units:[],nations:[],round:1,current:0,
     player:opts.player,diff:opts.diff||'normal',nextId:1,fx:[],log:[],over:null,
     rnd:mulberry32(seed^0x9e3779b9)});
  for(let i=0;i<4;i++)G.nations.push({id:i,name:NATIONS[i].name,alive:true,gold:150,tech:{fire:0,armor:0,econ:0},income:0,cmdIdx:0});
  for(let n=0;n<4;n++){
    const cap=G.cities.find(x=>x.capital===n);
    makeUnit('inf',n,cap.c,cap.r,false);
    const extra=G.cities.find(x=>x.owner===n&&x.capital<0);
    if(extra)makeUnit('inf',n,extra.c,extra.r,false);
    const order=['tank','inf','art','inf'];
    const okT=t=>t!=='sea'&&t!=='strait'&&t!=='mount';
    const free=neighbors(cap.c,cap.r).filter(([c,r])=>okT(G.tiles[r*W+c].t)&&!unitAt(c,r)&&!cityAt(c,r));
    for(let k=0;k<order.length&&k<free.length;k++)makeUnit(order[k],n,free[k][0],free[k][1],false);
  }
  startTurn(0);
  G.log=[];
  logMsg('Campaign begins. Four capitals, one world.');
  return G;
}

export function startTurn(nid){
  const n=G.nations[nid];
  for(const u of G.units){
    if(u.owner!==nid)continue;
    const city=cityAt(u.c,u.r);
    let heal=0;
    if(city&&city.owner===nid)heal=3;else if(!u.acted)heal=1;
    u.hp=Math.min(10,u.hp+heal);
    u.moved=false;u.done=false;u.acted=false;
  }
  let inc=0;
  for(const c of G.cities)if(c.owner===nid){c.recruited=false;inc+=c.capital>=0?40:20;}
  inc=Math.round(inc*(1+0.15*n.tech.econ)*(nid!==G.player?DIFF[G.diff].inc:1));
  n.gold+=inc;n.income=inc;
}

export function nextTurn(){
  const total=G.nations.length;
  let i=G.current;
  for(let k=0;k<total;k++){
    i=(i+1)%total;
    if(i===0)G.round++;
    if(G.nations[i].alive)break;
  }
  G.current=i;
  startTurn(i);
  if(G.round>ROUND_LIMIT&&!G.over)endByLimit();
}
