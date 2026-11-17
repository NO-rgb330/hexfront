// Player input: drag to pan, pinch and wheel to zoom, keyboard, camera buttons and the minimap.
import { G } from '../core/state.js';
import { $, cv, mini } from './dom.js';
import { U } from './uistate.js';
import { centerOnFraction, flyToWorld, homeView, panBy, tileAt, zoomAt, zoomBy } from './camera.js';
import { endTurn, onTap, select, selectNext } from './actions.js';

const local=e=>{const r=cv.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};

export function initInput(){
  const pts=new Map();
  let drag=null,pinch=null;

  cv.addEventListener('pointerdown',e=>{
    if(cv.setPointerCapture)try{cv.setPointerCapture(e.pointerId);}catch(_){}
    const p=local(e);
    pts.set(e.pointerId,p);
    U.fly=null;
    if(pts.size===1)drag={x0:p.x,y0:p.y,ox:U.size.ox,oy:U.size.oy,moved:false};
    else{
      // A second finger turns the gesture into a pinch and cancels any tap.
      drag=null;
      const [a,b]=[...pts.values()];
      pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,mx:(a.x+b.x)/2,my:(a.y+b.y)/2};
    }
  });
  cv.addEventListener('pointermove',e=>{
    if(!G)return;
    const p=local(e);
    if(pts.has(e.pointerId))pts.set(e.pointerId,p);
    if(pinch&&pts.size>=2){
      const [a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y)||1,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      zoomAt(mx,my,d/pinch.d);
      panBy(mx-pinch.mx,my-pinch.my);
      pinch={d,mx,my};
      return;
    }
    if(drag){
      const dx=p.x-drag.x0,dy=p.y-drag.y0;
      if(!drag.moved&&Math.hypot(dx,dy)>(e.pointerType==='touch'?8:5)){drag.moved=true;cv.classList.add('dragging');}
      if(drag.moved){
        U.size.ox=drag.ox;U.size.oy=drag.oy;
        panBy(dx,dy);
        return;
      }
    }
    if(e.pointerType==='touch')return;
    const t=tileAt(p.x,p.y);
    if(!U.hover&&!t)return;
    if(U.hover&&t&&U.hover[0]===t[0]&&U.hover[1]===t[1])return;
    U.hover=t;U.dirty=true;
  });
  const lift=e=>{
    const p=local(e),tap=drag&&!drag.moved&&pts.size===1&&e.type==='pointerup';
    pts.delete(e.pointerId);
    if(pts.size<2)pinch=null;
    if(pts.size===0){drag=null;cv.classList.remove('dragging');}
    if(tap)onTap(p.x,p.y);
  };
  cv.addEventListener('pointerup',lift);
  cv.addEventListener('pointercancel',lift);
  cv.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch'){U.hover=null;U.dirty=true;}});
  cv.addEventListener('wheel',e=>{
    e.preventDefault();
    const p=local(e);
    U.fly=null;
    zoomAt(p.x,p.y,Math.exp(-e.deltaY*(e.ctrlKey?0.01:0.0016)));
  },{passive:false});

  // Camera buttons
  $('zoomIn').addEventListener('click',()=>zoomBy(1.35));
  $('zoomOut').addEventListener('click',()=>zoomBy(1/1.35));
  $('homeBtn').addEventListener('click',()=>{if(G)homeView();});
  $('fitBtn').addEventListener('click',()=>{if(G)flyToWorld();});

  // Minimap: tap or drag to move the camera
  let miniDrag=false;
  const jump=e=>{
    const r=mini.getBoundingClientRect();
    centerOnFraction(Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height)));
  };
  mini.addEventListener('pointerdown',e=>{
    miniDrag=true;
    if(mini.setPointerCapture)try{mini.setPointerCapture(e.pointerId);}catch(_){}
    jump(e);
  });
  mini.addEventListener('pointermove',e=>{if(miniDrag)jump(e);});
  const miniEnd=()=>{miniDrag=false;};
  mini.addEventListener('pointerup',miniEnd);
  mini.addEventListener('pointercancel',miniEnd);

  document.addEventListener('keydown',e=>{
    if(!G||!$('start').hidden||!$('endScreen').hidden)return;
    if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName||''))return;
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    const k=e.key.toLowerCase(),step=U.size.s*3;
    if(k==='escape')select(null);
    else if(k==='e')endTurn();
    else if(k==='n'&&!U.busy&&G.current===G.player)selectNext();
    else if(k==='arrowleft'||k==='a'){U.fly=null;panBy(step,0);e.preventDefault();}
    else if(k==='arrowright'||k==='d'){U.fly=null;panBy(-step,0);e.preventDefault();}
    else if(k==='arrowup'||k==='w'){U.fly=null;panBy(0,step);e.preventDefault();}
    else if(k==='arrowdown'||k==='s'){U.fly=null;panBy(0,-step);e.preventDefault();}
    else if(k==='+'||k==='='){zoomBy(1.35);}
    else if(k==='-'||k==='_'){zoomBy(1/1.35);}
    else if(k==='h')homeView();
    else if(k==='f')flyToWorld();
  });
}
