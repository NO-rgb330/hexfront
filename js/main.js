// Entry point: side-panel and menu wiring, then boot. Map input lives in ui/input.js.
import { COLORS, DEFAULT_SIZE, MAP_SIZES, NATIONS, TECHS, UT } from './core/data.js';
import { G } from './core/state.js';
import { buyTech, recruit } from './core/economy.js';
import { $, board } from './ui/dom.js';
import { U } from './ui/uistate.js';
import { renderSide, toast, updateAll } from './ui/panels.js';
import { layout } from './ui/camera.js';
import { frame } from './ui/render.js';
import { initInput } from './ui/input.js';
import { afterAction, endTurn, previewGame, select, selectNext, startGame } from './ui/actions.js';

$('side').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');
  if(!b||b.disabled||!G)return;
  const parts=b.dataset.act.split(':'),a=parts[0],v=parts[1];
  if(a==='tab'){U.tab=v;renderSide();return;}
  if(G.over||U.busy||G.current!==G.player)return;
  if(a==='recruit'&&U.sel&&U.sel.kind==='city'){
    const u=recruit(G.player,v,U.sel.city);
    if(u){toast(UT[v].name+' raised at '+U.sel.city.name);select({kind:'unit',unit:u});updateAll();}
  }else if(a==='tech'){
    if(buyTech(G.player,v)){toast(TECHS.find(t=>t.key===v).name+' upgraded');updateAll();}
  }else if(a==='hold'&&U.sel&&U.sel.kind==='unit'){
    U.sel.unit.done=true;afterAction(U.sel.unit);
  }else if(a==='next'){selectNext();}
});
$('endBtn').addEventListener('click',endTurn);
$('fastBtn').addEventListener('click',()=>{U.fast=!U.fast;$('fastBtn').setAttribute('aria-pressed',String(U.fast));});
$('startBtn').addEventListener('click',()=>{
  const nat=document.querySelector('input[name="nation"]:checked'),df=document.querySelector('input[name="diff"]:checked'),sz=document.querySelector('input[name="size"]:checked');
  startGame(nat?+nat.value:0,df?df.value:'normal',sz?sz.value:DEFAULT_SIZE);
});
$('againBtn').addEventListener('click',()=>{
  $('endScreen').hidden=true;$('start').hidden=false;previewGame(DEFAULT_SIZE);
});
if(typeof ResizeObserver!=='undefined'){
  let lastW=0,lastH=0;
  new ResizeObserver(()=>{
    const r=board.getBoundingClientRect(),w=Math.floor(r.width),h=Math.floor(r.height);
    if(w!==lastW||h!==lastH){lastW=w;lastH=h;layout();}
  }).observe(board);
}
$('nationPick').innerHTML=NATIONS.map((n,i)=>
  '<label><input type="radio" name="nation" value="'+i+'"'+(i===0?' checked':'')+'><span class="ncard" style="--c:'+COLORS[i]+'"><b>'+n.name+'</b><span>'+n.motto+'</span><small>Capital '+n.capital+' · '+n.corner+'</small></span></label>').join('');
$('sizePick').innerHTML=Object.entries(MAP_SIZES).map(([k,v])=>
  '<label><input type="radio" name="size" value="'+k+'"'+(k===DEFAULT_SIZE?' checked':'')+'><span class="dchip"><b>'+v.name+'</b><small>'+v.w+' × '+v.h+'</small></span></label>').join('');
initInput();
previewGame(DEFAULT_SIZE);
requestAnimationFrame(frame);
