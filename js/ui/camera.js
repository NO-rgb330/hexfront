// Camera: where the viewport sits over the world. Pan, zoom, fly-to, hit-testing and visibility.
import { H, W } from '../core/data.js';
import { G } from '../core/state.js';
import { board, cv } from './dom.js';
import { U } from './uistate.js';
import { sizeMini } from './minimap.js';

const SQ=Math.sqrt(3);
export const MAX_S=56;

export const worldW=s=>SQ*s*(W+0.5);
export const worldH=s=>s*(1.5*H+0.5);
export const fitScale=()=>Math.min(U.size.w/worldW(1),U.size.h/worldH(1));
export const minScale=()=>Math.min(fitScale(),MAX_S);
export const clampScale=s=>Math.max(minScale(),Math.min(MAX_S,s));

// Screen position of a hex centre. Odd rows sit half a hex to the right.
export function cen(c,r){
  const s=U.size.s;
  return [U.size.ox+SQ*s*(c+0.5+0.5*(r&1)),U.size.oy+s+1.5*s*r];
}

// Hex under a screen point, or null if the point is between the map and the edge.
export function tileAt(x,y){
  const s=U.size.s,hw=SQ*s,r0=Math.round((y-U.size.oy-s)/(1.5*s));
  let best=null,bd=1e9;
  for(let r=r0-1;r<=r0+1;r++){
    if(r<0||r>=H)continue;
    const c0=Math.round((x-U.size.ox)/hw-0.5-0.5*(r&1));
    for(let c=c0-1;c<=c0+1;c++){
      if(c<0||c>=W)continue;
      const p=cen(c,r),d=Math.hypot(p[0]-x,p[1]-y);
      if(d<bd){bd=d;best=[c,r];}
    }
  }
  return bd<=s*1.02?best:null;
}

export function inView(c,r,pad=1){
  const [x,y]=cen(c,r),p=U.size.s*pad;
  return x>-p&&x<U.size.w+p&&y>-p&&y<U.size.h+p;
}

// Keep the map on screen: centred when it is smaller than the view, otherwise never more than 1.5 hexes past an edge.
export function clampView(v){
  const {w,h}=U.size,s=v.s,ww=worldW(s),wh=worldH(s),m=s*1.5;
  return {
    s,
    ox:ww+2*m<=w?(w-ww)/2:Math.min(m,Math.max(w-ww-m,v.ox)),
    oy:wh+2*m<=h?(h-wh)/2:Math.min(m,Math.max(h-wh-m,v.oy))
  };
}
export function setView(v){
  const c=clampView(v);
  U.size.s=c.s;U.size.ox=c.ox;U.size.oy=c.oy;U.dirty=true;
}
export function panBy(dx,dy){setView({s:U.size.s,ox:U.size.ox+dx,oy:U.size.oy+dy});}
export function zoomAt(px,py,k){
  const {s,ox,oy}=U.size,s2=clampScale(s*k),f=s2/s;
  setView({s:s2,ox:px-(px-ox)*f,oy:py-(py-oy)*f});
}
export function zoomBy(k){U.fly=null;zoomAt(U.size.w/2,U.size.h/2,k);}

export function viewCenteredOn(c,r,s){
  return clampView({s,ox:U.size.w/2-SQ*s*(c+0.5+0.5*(r&1)),oy:U.size.h/2-s*(1+1.5*r)});
}
// Centre on a point given as fractions (0..1) of the whole world. Used by the minimap.
export function centerOnFraction(fx,fy){
  U.fly=null;
  const s=U.size.s;
  setView({s,ox:U.size.w/2-fx*worldW(s),oy:U.size.h/2-fy*worldH(s)});
}

const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
export function flyTo(c,r,minS){
  const s=clampScale(Math.max(U.size.s,minS||0)),to=viewCenteredOn(c,r,s);
  if(reduced()){U.fly=null;setView(to);return;}
  U.fly={t0:performance.now(),dur:420,from:{s:U.size.s,ox:U.size.ox,oy:U.size.oy},to};
}
export function flyToWorld(){
  const s=minScale(),to=clampView({s,ox:0,oy:0});
  if(reduced()){U.fly=null;setView(to);return;}
  U.fly={t0:performance.now(),dur:520,from:{s:U.size.s,ox:U.size.ox,oy:U.size.oy},to};
}
export function stepFly(now){
  const f=U.fly;
  if(!f)return false;
  const p=Math.min(1,(now-f.t0)/f.dur),e=p<0.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
  setView({s:f.from.s*Math.pow(f.to.s/f.from.s,e),ox:f.from.ox+(f.to.ox-f.from.ox)*e,oy:f.from.oy+(f.to.oy-f.from.oy)*e});
  if(p>=1)U.fly=null;
  return true;
}

// First view of a new game: your capital, comfortably zoomed in (or the whole map if it is small).
export function resetView(){
  if(!G)return;
  U.fly=null;
  const s0=Math.max(minScale(),Math.min(30,Math.max(18,U.size.w/(SQ*18))));
  const me=G.cities.find(x=>x.capital===G.player)||G.cities[0];
  U.size.s=s0;
  setView(viewCenteredOn(me.c,me.r,s0));
  U.viewReady=true;
}
export function homeView(){
  const me=G.cities.find(x=>x.capital===G.player)||G.cities[0];
  flyTo(me.c,me.r,22);
}

// Size the canvas to its board. Resizing keeps the same world point in the middle.
export function layout(){
  const rect=board.getBoundingClientRect();
  const w=Math.max(240,Math.floor(rect.width)||600),h=Math.max(240,Math.floor(rect.height)||420);
  const dpr=Math.min(2,(typeof window!=='undefined'&&window.devicePixelRatio)||1);
  const o=U.size;
  const wx=(o.w/2-o.ox)/o.s,wy=(o.h/2-o.oy)/o.s;
  cv.style.width=w+'px';cv.style.height=h+'px';
  cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  U.size={s:o.s,ox:o.ox,oy:o.oy,w,h,dpr};
  sizeMini();
  if(U.viewReady){const s=clampScale(o.s);setView({s,ox:w/2-wx*s,oy:h/2-wy*s});}
  else resetView();
  U.dirty=true;
}
