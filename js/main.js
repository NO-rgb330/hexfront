// Entry point: DOM event wiring and boot.
import { COLORS, NATIONS, TECHS, UT } from './core/data.js';
import { G } from './core/state.js';
import { buyTech, recruit } from './core/economy.js';
import { $, board, cv } from './ui/dom.js';
import { U } from './ui/uistate.js';
import { renderSide, toast, updateAll } from './ui/panels.js';
import { frame, layout, tileAt } from './ui/render.js';
import { afterAction, endTurn, onTap, previewGame, select, selectNext, startGame } from './ui/actions.js';

cv.addEventListener('pointerdown',e=>{
  const rect=cv.getBoundingClientRect();
  onTap(e.clientX-rect.left,e.clientY-rect.top);
});
cv.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch'||!G)return;
  const rect=cv.getBoundingClientRect(),t=tileAt(e.clientX-rect.left,e.clientY-rect.top);
  if(!U.hover&&!t)return;
  if(U.hover&&t&&U.hover[0]===t[0]&&U.hover[1]===t[1])return;
  U.hover=t;U.dirty=true;
});
cv.addEventListener('pointerleave',()=>{U.hover=null;U.dirty=true;});
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
  const nat=document.querySelector('input[name="nation"]:checked'),df=document.querySelector('input[name="diff"]:checked');
  startGame(nat?+nat.value:0,df?df.value:'normal');
});
$('againBtn').addEventListener('click',()=>{
  $('endScreen').hidden=true;$('start').hidden=false;previewGame();
});
document.addEventListener('keydown',e=>{
  if(!G||!$('start').hidden||!$('endScreen').hidden)return;
  if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName||''))return;
  const k=e.key.toLowerCase();
  if(k==='escape')select(null);
  else if(k==='e')endTurn();
  else if(k==='n'&&!U.busy&&G.current===G.player)selectNext();
});
if(typeof ResizeObserver!=='undefined'){
  let lastW=0;
  new ResizeObserver(()=>{const w=Math.floor(board.getBoundingClientRect().width);if(w!==lastW){lastW=w;layout();}}).observe(board);
}
$('nationPick').innerHTML=NATIONS.map((n,i)=>
  '<label><input type="radio" name="nation" value="'+i+'"'+(i===0?' checked':'')+'><span class="ncard" style="--c:'+COLORS[i]+'"><b>'+n.name+'</b><span>'+n.motto+'</span><small>Capital '+n.capital+' · '+n.corner+'</small></span></label>').join('');
previewGame();
requestAnimationFrame(frame);
