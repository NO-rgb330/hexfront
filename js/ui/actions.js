// Player input and turn flow: selecting, moving, attacking, ending turns, start/end screens.
import { NATIONS, W } from '../core/data.js';
import { G, cityAt, unitAt } from '../core/state.js';
import { computeOptions, doAttack } from '../core/combat.js';
import { doMove } from '../core/conquest.js';
import { newGame, nextTurn } from '../core/game.js';
import { aiTurn } from '../core/ai.js';
import { $ } from './dom.js';
import { U } from './uistate.js';
import { renderSide, toast, updateAll } from './panels.js';
import { layout, tileAt } from './render.js';

export const sleep=ms=>new Promise(r=>setTimeout(r,ms));

export function select(obj){
  U.sel=obj;
  if(U.sel&&U.sel.kind==='unit'){const o=computeOptions(U.sel.unit);U.sel.dests=o.dests;U.sel.targets=o.targets;}
  if(U.sel)U.tab='field';
  renderSide();U.dirty=true;
}

export function afterAction(u){
  if(G.over){select(null);updateAll();showEnd();return;}
  if(u&&G.units.includes(u))select({kind:'unit',unit:u});else select(null);
  updateAll();
}

export function onTap(x,y){
  if(!G||G.over||U.busy||G.current!==G.player)return;
  const t=tileAt(x,y);
  if(!t){select(null);return;}
  const c=t[0],r=t[1],o=unitAt(c,r),city=cityAt(c,r),me=G.player;
  if(U.sel&&U.sel.kind==='unit'&&U.sel.unit.owner===me){
    const u=U.sel.unit;
    if(o&&o.owner!==me&&U.sel.targets.has(o.id)){
      const st=U.sel.targets.get(o.id);
      if(st.c!==u.c||st.r!==u.r)doMove(u,st.c,st.r);
      if(!G.over&&G.units.includes(o)&&G.units.includes(u))doAttack(u,o);
      afterAction(u);return;
    }
    if(!o&&U.sel.dests.has(r*W+c)){doMove(u,c,r);afterAction(u);return;}
  }
  if(o){select({kind:o.owner===me?'unit':'inspect',unit:o});return;}
  if(city&&city.owner===me){select({kind:'city',city});return;}
  select(city?{kind:'info',city}:{kind:'tile',c,r});
}

export function selectNext(){
  const mine=G.units.filter(u=>u.owner===G.player&&!u.done).sort((a,b)=>a.r-b.r||a.c-b.c);
  if(!mine.length){toast('No idle units');return;}
  let k=0;
  if(U.sel&&U.sel.kind==='unit'){const i=mine.indexOf(U.sel.unit);k=(i+1)%mine.length;}
  select({kind:'unit',unit:mine[k]});
}

export async function runUntilHuman(){
  U.busy=true;updateAll();
  while(!G.over&&G.current!==G.player){
    const nid=G.current;
    updateAll();
    const gen=aiTurn(nid);
    for(;;){
      const step=gen.next();
      if(step.done)break;
      updateAll();
      await sleep(U.fast?25:240);
      if(G.over)break;
    }
    if(G.over)break;
    nextTurn();
  }
  U.busy=false;
  updateAll();
  if(G.over)showEnd();
  else{toast('Round '+G.round+': your move');}
}

export async function endTurn(){
  if(!G||G.over||U.busy||G.current!==G.player)return;
  select(null);
  U.busy=true;
  nextTurn();
  if(G.over){U.busy=false;updateAll();showEnd();return;}
  await runUntilHuman();
}

export function showEnd(){
  const win=G.over.winner===G.player&&!G.over.defeat;
  $('endTitle').textContent=win?'Victory':G.over.reason==='limit'?'Armistice':'Defeat';
  const w=G.over.winner>=0?NATIONS[G.over.winner].name:'No power';
  $('endLead').textContent=win?
    (G.over.reason==='limit'?'The war ends at the round limit with your power holding the most ground.':'Every rival capital has fallen. The continent is yours.'):
    (G.over.reason==='fallen'?'Your capital has fallen. '+(G.over.winner>=0?w+' rules the continent.':'The war goes on without you.'):'The war ends at the round limit and '+w+' holds the most ground.');
  const me=G.player;
  $('endStats').innerHTML=[['Round',G.round],['Cities held',G.cities.filter(c=>c.owner===me).length],['Units left',G.units.filter(u=>u.owner===me).length],['Powers fallen',G.nations.filter(n=>!n.alive).length]]
    .map(a=>'<div class="stat"><small>'+a[0]+'</small><strong class="mono">'+a[1]+'</strong></div>').join('');
  $('endScreen').hidden=false;
}

export function startGame(player,diff){
  newGame({player,diff});
  U.sel=null;U.hover=null;U.busy=false;U.effects=[];U.tab='field';
  $('start').hidden=true;$('endScreen').hidden=true;
  layout();updateAll();
  if(G.current!==G.player)runUntilHuman();
  else toast('Round 1: your move');
}

export function previewGame(){
  newGame({player:0,diff:'normal'});
  U.sel=null;layout();updateAll();
}
