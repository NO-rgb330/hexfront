// Entry point: DOM event wiring and boot.
import { COLORS, NATIONS, TECHS, UT } from './core/data.js';
import { G } from './core/state.js';
import { buyTech, recruit } from './core/economy.js';
import { $, board, cv } from './ui/dom.js';
import { U } from './ui/uistate.js';
import { renderSide, toast, updateAll } from './ui/panels.js';
import { fitView, frame, layout, panBy, tileAt, zoomAt } from './ui/render.js';
import { afterAction, endTurn, onTap, previewGame, select, selectNext, startGame } from './ui/actions.js';

// Pointer input: a short press taps, a drag pans, wheel or two-finger pinch zooms.
const ptrs=new Map();
let drag=null,pinch=0;
const local=e=>{const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
const pinchInfo=()=>{
  const [a,b]=[...ptrs.values()];
  return {d:Math.hypot(a.x-b.x,a.y-b.y),mx:(a.x+b.x)/2,my:(a.y+b.y)/2};
};
cv.addEventListener('pointerdown',e=>{
  if(cv.setPointerCapture)try{cv.setPointerCapture(e.pointerId);}catch(_){}
  const [x,y]=local(e);
  ptrs.set(e.pointerId,{x,y});
  drag={x,y,moved:false,id:e.pointerId};
  if(ptrs.size===2){pinch=pinchInfo().d;drag.moved=true;}
});
cv.addEventListener('pointermove',e=>{
  const [x,y]=local(e),p=ptrs.get(e.pointerId);
  if(p){
    const dx=x-p.x,dy=y-p.y;
    p.x=x;p.y=y;
    if(ptrs.size===2){
      const q=pinchInfo();
      if(pinch>0&&q.d>0)zoomAt(q.d/pinch,q.mx,q.my);
      pinch=q.d;return;
    }
    if(drag){
      if(!drag.moved&&Math.hypot(x-drag.x,y-drag.y)>6)drag.moved=true;
      if(drag.moved){panBy(dx,dy);return;}
    }
  }
  if(e.pointerType==='touch'||!G)return;
  const t=tileAt(x,y);
  if(!U.hover&&!t)return;
  if(U.hover&&t&&U.hover[0]===t[0]&&U.hover[1]===t[1])return;
  U.hover=t;U.dirty=true;
});
const lift=e=>{
  const was=drag;
  ptrs.delete(e.pointerId);
  if(ptrs.size<2)pinch=0;
  if(e.type==='pointerup'&&was&&!was.moved&&was.id===e.pointerId){const [x,y]=local(e);onTap(x,y);}
  if(!ptrs.size)drag=null;
};
cv.addEventListener('pointerup',lift);
cv.addEventListener('pointercancel',lift);
cv.addEventListener('wheel',e=>{
  e.preventDefault();
  const [x,y]=local(e);
  zoomAt(Math.exp(-e.deltaY*0.0015),x,y);
},{passive:false});
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
$('zoomIn').addEventListener('click',()=>zoomAt(1.5,U.size.w/2,U.size.h/2));
$('zoomOut').addEventListener('click',()=>zoomAt(1/1.5,U.size.w/2,U.size.h/2));
$('zoomFit').addEventListener('click',fitView);
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
  else if(k==='+'||k==='=')zoomAt(1.5,U.size.w/2,U.size.h/2);
  else if(k==='-')zoomAt(1/1.5,U.size.w/2,U.size.h/2);
  else if(k==='0')fitView();
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
