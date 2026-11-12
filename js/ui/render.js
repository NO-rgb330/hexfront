// Canvas board: layout, hit-testing, drawing, effects and the animation loop.
import { COLORS, H, W } from '../core/data.js';
import { G } from '../core/state.js';
import { board, cv } from './dom.js';
import { U } from './uistate.js';
import { toast } from './panels.js';

export const SEA='#0d2833',TILE={plain:'#6c6a4c',forest:'#4a5b3c',mount:'#767b7f'};

export const vari=i=>(((i*2654435761)>>>0)%1000)/500-1;

export function cen(c,r){const hw=Math.sqrt(3)*U.size.s;return [U.size.ox+hw*(c+0.5+0.5*(r&1)),U.size.oy+U.size.s+1.5*U.size.s*r];}

export function hexPath(ctx,x,y,s){
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=Math.PI/180*(60*i-30),px=x+s*Math.cos(a),py=y+s*Math.sin(a);
    if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
  }
  ctx.closePath();
}

export function layout(){
  const rect=board.getBoundingClientRect();
  const w=Math.max(280,Math.floor(rect.width)||600);
  const s=w/(Math.sqrt(3)*(W+0.5));
  const h=Math.ceil(s*(1.5*H+0.5));
  const dpr=Math.min(2,window.devicePixelRatio||1);
  cv.style.width=w+'px';cv.style.height=h+'px';
  cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  U.size={s,ox:0,oy:0,w,h,dpr};
  U.dirty=true;
}

export function tileAt(x,y){
  let best=null,bd=1e9;
  for(let r=0;r<H;r++)for(let c=0;c<W;c++){
    const p=cen(c,r),d=Math.hypot(p[0]-x,p[1]-y);
    if(d<bd){bd=d;best=[c,r];}
  }
  return bd<=U.size.s*1.02?best:null;
}

export function tree(ctx,x,y,sz){
  ctx.fillStyle='#2c4528';
  ctx.beginPath();ctx.moveTo(x,y-sz);ctx.lineTo(x+sz*0.72,y+sz*0.62);ctx.lineTo(x-sz*0.72,y+sz*0.62);ctx.closePath();ctx.fill();
}

export function drawTile(ctx,c,r){
  const s=U.size.s,[x,y]=cen(c,r),i=r*W+c,t=G.tiles[i].t;
  hexPath(ctx,x,y,s);
  ctx.fillStyle=t==='sea'?SEA:TILE[t];ctx.fill();
  const v=vari(i);
  if(t!=='sea'){
    ctx.fillStyle=v>0?'rgba(255,255,255,'+(v*0.05)+')':'rgba(0,0,0,'+(-v*0.07)+')';
    ctx.fill();
  }
  ctx.lineWidth=1;
  ctx.strokeStyle=t==='sea'?'rgba(255,255,255,.035)':'rgba(0,0,0,.28)';
  ctx.stroke();
  if(s<10)return;
  if(t==='forest'){
    tree(ctx,x-s*0.36,y+s*0.12,s*0.3);tree(ctx,x+s*0.32,y+s*0.18,s*0.3);tree(ctx,x,y-s*0.22,s*0.34);
  }else if(t==='mount'){
    ctx.fillStyle='#575c60';
    ctx.beginPath();ctx.moveTo(x-s*0.55,y+s*0.38);ctx.lineTo(x-s*0.12,y-s*0.5);ctx.lineTo(x+s*0.28,y+s*0.38);ctx.closePath();ctx.fill();
    ctx.fillStyle='#8e9498';
    ctx.beginPath();ctx.moveTo(x-s*0.12,y-s*0.5);ctx.lineTo(x+s*0.28,y+s*0.38);ctx.lineTo(x+s*0.04,y+s*0.38);ctx.closePath();ctx.fill();
    ctx.fillStyle='#667075';
    ctx.beginPath();ctx.moveTo(x,y+s*0.38);ctx.lineTo(x+s*0.38,y-s*0.1);ctx.lineTo(x+s*0.68,y+s*0.38);ctx.closePath();ctx.fill();
    ctx.fillStyle='#e5ecee';
    ctx.beginPath();ctx.moveTo(x-s*0.12,y-s*0.5);ctx.lineTo(x-s*0.24,y-s*0.2);ctx.lineTo(x,y-s*0.2);ctx.closePath();ctx.fill();
  }else if(t==='sea'&&v>0.2){
    ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(x-s*0.15,y+s*0.1,s*0.22,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
    ctx.beginPath();ctx.arc(x+s*0.25,y-s*0.15,s*0.18,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
  }
}

export function star(ctx,x,y,r){
  ctx.beginPath();
  for(let k=0;k<10;k++){
    const a=-Math.PI/2+k*Math.PI/5,rr=k%2?r*0.45:r;
    const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;
    if(k)ctx.lineTo(px,py);else ctx.moveTo(px,py);
  }
  ctx.closePath();
}

export function drawCity(ctx,city){
  const s=U.size.s,[x,y]=cen(city.c,city.r);
  const col=city.owner>=0?COLORS[city.owner]:'#aab5b9';
  hexPath(ctx,x,y,s*0.9);ctx.strokeStyle=col;ctx.lineWidth=Math.max(1.6,s*0.1);ctx.stroke();
  if(s<9)return;
  ctx.fillStyle='rgba(0,0,0,.3)';
  ctx.beginPath();ctx.ellipse(x,y+s*0.45,s*0.6,s*0.18,0,0,Math.PI*2);ctx.fill();
  const blocks=[[-0.5,0.0,0.3,0.45],[-0.12,-0.2,0.32,0.65],[0.26,0.08,0.28,0.37]];
  for(const [bx,by,bw,bh] of blocks){
    ctx.fillStyle='#dbe3e6';ctx.fillRect(x+bx*s,y+(by+0.0)*s,bw*s,bh*s);
    ctx.fillStyle=col;ctx.fillRect(x+bx*s,y+by*s,bw*s,Math.max(2,s*0.1));
  }
  if(city.capital>=0){star(ctx,x,y-s*0.62,s*0.2);ctx.fillStyle='#ffd35c';ctx.fill();}
}

export function drawIcon(ctx,type,x,y,r){
  ctx.fillStyle='#fff';ctx.strokeStyle='#fff';
  if(type==='inf'){
    ctx.beginPath();ctx.arc(x,y+0.05*r,0.48*r,Math.PI,0);ctx.closePath();ctx.fill();
    ctx.fillRect(x-0.62*r,y+0.05*r,1.24*r,0.15*r);
  }else if(type==='tank'){
    ctx.fillRect(x-0.58*r,y+0.02*r,1.16*r,0.32*r);
    ctx.fillRect(x-0.27*r,y-0.26*r,0.5*r,0.28*r);
    ctx.fillRect(x+0.18*r,y-0.2*r,0.55*r,0.09*r);
  }else if(type==='art'){
    ctx.save();ctx.translate(x-0.15*r,y+0.1*r);ctx.rotate(-0.55);ctx.fillRect(0,-0.08*r,0.85*r,0.16*r);ctx.restore();
    ctx.beginPath();ctx.arc(x-0.15*r,y+0.2*r,0.24*r,0,Math.PI*2);ctx.fill();
    ctx.lineWidth=Math.max(1,0.1*r);
    ctx.beginPath();ctx.moveTo(x-0.15*r,y+0.2*r);ctx.lineTo(x-0.62*r,y+0.45*r);ctx.stroke();
  }else{
    ctx.beginPath();ctx.moveTo(x,y-0.6*r);ctx.lineTo(x+0.55*r,y+0.5*r);ctx.lineTo(x,y+0.22*r);ctx.lineTo(x-0.55*r,y+0.5*r);ctx.closePath();ctx.fill();
  }
}

export function drawUnit(ctx,u){
  const s=U.size.s,[x,y]=cen(u.c,u.r),r=s*0.58;
  const mine=G.player>=0&&u.owner===G.player;
  ctx.globalAlpha=(mine&&u.done&&G.current===G.player)?0.55:1;
  ctx.fillStyle='rgba(0,0,0,.35)';
  ctx.beginPath();ctx.ellipse(x,y+r*0.9,r*0.9,r*0.28,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=COLORS[u.owner];ctx.fill();
  ctx.lineWidth=Math.max(1.5,s*0.09);ctx.strokeStyle='#081014';ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,r*0.84,0,Math.PI*2);ctx.lineWidth=1;ctx.strokeStyle='rgba(255,255,255,.55)';ctx.stroke();
  drawIcon(ctx,u.type,x,y,r);
  if(u.hp<10){
    const fs=Math.max(8,s*0.44);
    ctx.font='600 '+fs+'px "IBM Plex Mono",monospace';
    const tw=ctx.measureText(String(u.hp)).width+4,bx=x+r*0.35,by=y+r*0.5,bh=fs+2;
    ctx.fillStyle='#081014';ctx.fillRect(bx,by,tw,bh);
    ctx.fillStyle=u.hp<=3?'#ff8a80':'#fff';ctx.textBaseline='middle';ctx.textAlign='left';
    ctx.fillText(String(u.hp),bx+2,by+bh/2+0.5);
  }
  for(let k=0;k<u.lv;k++){
    ctx.beginPath();ctx.arc(x-(u.lv-1)*s*0.1+k*s*0.2,y-r-s*0.02,Math.max(1.5,s*0.075),0,Math.PI*2);
    ctx.fillStyle='#ffd35c';ctx.fill();
  }
  ctx.globalAlpha=1;
}

export function render(now){
  if(!G)return;
  const ctx=cv.getContext('2d'),s=U.size.s;
  ctx.setTransform(U.size.dpr,0,0,U.size.dpr,0,0);
  ctx.clearRect(0,0,U.size.w,U.size.h);
  ctx.fillStyle=SEA;ctx.fillRect(0,0,U.size.w,U.size.h);
  for(let r=0;r<H;r++)for(let c=0;c<W;c++)drawTile(ctx,c,r);
  if(U.sel&&U.sel.kind==='unit'){
    for(const i of U.sel.dests.keys()){
      const c=i%W,r=(i/W)|0;
      if(c===U.sel.unit.c&&r===U.sel.unit.r)continue;
      const [x,y]=cen(c,r);
      hexPath(ctx,x,y,s*0.94);ctx.fillStyle='rgba(88,214,196,.22)';ctx.fill();
      ctx.strokeStyle='rgba(88,214,196,.7)';ctx.lineWidth=1.5;ctx.stroke();
    }
  }
  for(const city of G.cities)drawCity(ctx,city);
  const ordered=G.units.slice().sort((a,b)=>a.r-b.r);
  for(const u of ordered)drawUnit(ctx,u);
  if(U.sel&&U.sel.kind==='unit'){
    for(const e of G.units){
      if(!U.sel.targets.has(e.id))continue;
      const [x,y]=cen(e.c,e.r);
      hexPath(ctx,x,y,s*0.96);ctx.fillStyle='rgba(255,70,80,.24)';ctx.fill();
      ctx.strokeStyle='#ff5a64';ctx.lineWidth=2.5;ctx.stroke();
    }
  }
  const focus=U.sel&&(U.sel.kind==='unit'||U.sel.kind==='inspect')?[U.sel.unit.c,U.sel.unit.r]:U.sel&&(U.sel.kind==='city'||U.sel.kind==='info')?[U.sel.city.c,U.sel.city.r]:U.sel&&U.sel.kind==='tile'?[U.sel.c,U.sel.r]:null;
  if(focus){
    const [x,y]=cen(focus[0],focus[1]);
    hexPath(ctx,x,y,s*0.98);ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke();
  }
  if(U.hover){
    const [x,y]=cen(U.hover[0],U.hover[1]);
    hexPath(ctx,x,y,s*0.98);ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=1.5;ctx.stroke();
  }
  for(const e of U.effects){
    const p=Math.min(1,(now-e.t0)/e.dur);
    if(p<0)continue;
    ctx.globalAlpha=1-p;
    if(e.kind==='dmg'||e.kind==='lvl'){
      ctx.font='700 '+Math.max(13,s*0.72)+'px "Barlow Condensed",sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      const ty=e.y-s*0.5-p*s*0.9;
      ctx.lineWidth=3;ctx.strokeStyle='#081014';ctx.strokeText(e.text,e.x,ty);
      ctx.fillStyle=e.kind==='lvl'?'#ffd35c':e.tone==='counter'?'#ffb74d':'#ff7b7b';
      ctx.fillText(e.kind==='lvl'?'Promoted: '+e.text:e.text,e.x,ty);
    }else if(e.kind==='shot'){
      ctx.strokeStyle='#fff3c4';ctx.lineWidth=Math.max(2,s*0.14);ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+(e.x2-e.x)*Math.min(1,p*2.4),e.y+(e.y2-e.y)*Math.min(1,p*2.4));ctx.stroke();
    }else if(e.kind==='cap'||e.kind==='spawn'){
      ctx.strokeStyle=e.kind==='cap'?'#ffd35c':'#fff';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(e.x,e.y,s*(0.6+p*1.1),0,Math.PI*2);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  ctx.textAlign='start';ctx.textBaseline='alphabetic';
}

export function flushFx(){
  if(!G||!G.fx.length)return;
  const now=performance.now();
  for(const f of G.fx){
    if(f.kind==='toast'){toast(f.text);continue;}
    if(f.kind==='cap')toast(f.text+' captured');
    const [x,y]=cen(f.c,f.r);
    const e={kind:f.kind,x,y,t0:now,dur:f.kind==='shot'?320:f.kind==='dmg'||f.kind==='lvl'?950:700,text:f.text,tone:f.tone};
    if(f.kind==='shot'){const q=cen(f.c2,f.r2);e.x2=q[0];e.y2=q[1];}
    U.effects.push(e);
  }
  G.fx.length=0;
}

export function frame(){
  flushFx();
  const now=performance.now();
  U.effects=U.effects.filter(e=>now-e.t0<e.dur);
  if(U.dirty||U.effects.length){render(now);U.dirty=false;}
  requestAnimationFrame(frame);
}
