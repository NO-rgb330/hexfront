// Canvas board: drawing only what is on screen, level-of-detail by zoom, effects and the animation loop.
import { COLORS, H, NATIONS, W } from '../core/data.js';
import { G } from '../core/state.js';
import { cv } from './dom.js';
import { U } from './uistate.js';
import { toast } from './panels.js';
import { cen, inView, stepFly } from './camera.js';
import { drawMini } from './minimap.js';

const SQ=Math.sqrt(3);
export const SEA='#0d2833',TILE={plain:'#6c6a4c',forest:'#4a5b3c',mount:'#767b7f'};

export const vari=i=>(((i*2654435761)>>>0)%1000)/500-1;

export function hexPath(ctx,x,y,s){
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=Math.PI/180*(60*i-30),px=x+s*Math.cos(a),py=y+s*Math.sin(a);
    if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
  }
  ctx.closePath();
}

export function tree(ctx,x,y,sz){
  ctx.fillStyle='#2c4528';
  ctx.beginPath();ctx.moveTo(x,y-sz);ctx.lineTo(x+sz*0.72,y+sz*0.62);ctx.lineTo(x-sz*0.72,y+sz*0.62);ctx.closePath();ctx.fill();
}

function label(ctx,text,x,y,size,color){
  ctx.font='600 '+size+'px "Barlow Condensed","Arial Narrow",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='top';ctx.lineJoin='round';
  ctx.lineWidth=3;ctx.strokeStyle='rgba(8,16,20,.92)';ctx.strokeText(text,x,y);
  ctx.fillStyle=color;ctx.fillText(text,x,y);
}

// Level of detail: far out a tile is one flat fill, close in it gets texture, trees and mountains.
export function drawTile(ctx,c,r){
  const s=U.size.s,[x,y]=cen(c,r),i=r*W+c,t=G.tiles[i].t;
  if(t==='sea'&&s<10)return;                       // the canvas is already sea-coloured
  if(s<6){
    ctx.fillStyle=t==='sea'?SEA:TILE[t];
    ctx.fillRect(x-SQ*s/2-0.3,y-s*0.75-0.3,SQ*s+0.6,s*1.5+0.6);
    return;
  }
  hexPath(ctx,x,y,s);
  ctx.fillStyle=t==='sea'?SEA:TILE[t];ctx.fill();
  const v=vari(i);
  if(s<10)return;
  if(t!=='sea'){
    ctx.fillStyle=v>0?'rgba(255,255,255,'+(v*0.05)+')':'rgba(0,0,0,'+(-v*0.07)+')';
    ctx.fill();
  }
  ctx.lineWidth=1;
  ctx.strokeStyle=t==='sea'?'rgba(255,255,255,.035)':'rgba(0,0,0,.28)';
  ctx.stroke();
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
  if(s<9){
    // Far out a city is a flat marker in its owner's colour, a capital gets a gold star.
    const rr=Math.max(2.4,s*0.85);
    ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
    ctx.lineWidth=1;ctx.strokeStyle='#081014';ctx.stroke();
    if(city.capital>=0){star(ctx,x,y,Math.max(5,s*1.5));ctx.fillStyle='#ffd35c';ctx.fill();ctx.strokeStyle='#081014';ctx.stroke();}
  }else{
    hexPath(ctx,x,y,s*0.9);ctx.strokeStyle=col;ctx.lineWidth=Math.max(1.6,s*0.1);ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.3)';
    ctx.beginPath();ctx.ellipse(x,y+s*0.45,s*0.6,s*0.18,0,0,Math.PI*2);ctx.fill();
    const blocks=[[-0.5,0.0,0.3,0.45],[-0.12,-0.2,0.32,0.65],[0.26,0.08,0.28,0.37]];
    for(const [bx,by,bw,bh] of blocks){
      ctx.fillStyle='#dbe3e6';ctx.fillRect(x+bx*s,y+by*s,bw*s,bh*s);
      ctx.fillStyle=col;ctx.fillRect(x+bx*s,y+by*s,bw*s,Math.max(2,s*0.1));
    }
    if(city.capital>=0){star(ctx,x,y-s*0.62,s*0.2);ctx.fillStyle='#ffd35c';ctx.fill();}
  }
  // Names: every city once you are close, capitals as realm names when you are far out.
  if(s>=24)label(ctx,city.name,x,y+s*0.82,Math.min(15,Math.max(11,s*0.42)),'#e2ecef');
  else if(city.capital>=0&&s>=3.5)label(ctx,NATIONS[city.capital].name.toUpperCase(),x,y+Math.max(7,s*1.3),Math.max(11,Math.min(16,s*1.1)),COLORS[city.capital]);
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
  const s=U.size.s,[x,y]=cen(u.c,u.r);
  if(s<7){
    // Far out a unit is a dot in its nation's colour.
    ctx.beginPath();ctx.arc(x,y,Math.max(2.4,s*0.6),0,Math.PI*2);
    ctx.fillStyle=COLORS[u.owner];ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='#081014';ctx.stroke();
    return;
  }
  const r=s*0.58,mine=G.player>=0&&u.owner===G.player;
  ctx.globalAlpha=(mine&&u.done&&G.current===G.player)?0.55:1;
  if(s>=13){
    ctx.fillStyle='rgba(0,0,0,.35)';
    ctx.beginPath();ctx.ellipse(x,y+r*0.9,r*0.9,r*0.28,0,0,Math.PI*2);ctx.fill();
  }
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=COLORS[u.owner];ctx.fill();
  ctx.lineWidth=Math.max(1.5,s*0.09);ctx.strokeStyle='#081014';ctx.stroke();
  if(s>=13){
    ctx.beginPath();ctx.arc(x,y,r*0.84,0,Math.PI*2);ctx.lineWidth=1;ctx.strokeStyle='rgba(255,255,255,.55)';ctx.stroke();
    drawIcon(ctx,u.type,x,y,r);
  }
  if(s>=14){
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
  }
  ctx.globalAlpha=1;
}

export function render(now){
  if(!G)return;
  const ctx=cv.getContext('2d'),{s,ox,oy,w,h,dpr}=U.size,hw=SQ*s;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle=SEA;ctx.fillRect(0,0,w,h);

  // Only the rows and columns that can touch the viewport get drawn.
  const r0=Math.max(0,Math.floor((-oy-s)/(1.5*s))-1),r1=Math.min(H-1,Math.ceil((h-oy)/(1.5*s))+1);
  const c0=Math.max(0,Math.floor(-ox/hw-1.5)),c1=Math.min(W-1,Math.ceil((w-ox)/hw)+1);
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)drawTile(ctx,c,r);

  if(U.sel&&U.sel.kind==='unit'){
    for(const i of U.sel.dests.keys()){
      const c=i%W,r=(i/W)|0;
      if(c===U.sel.unit.c&&r===U.sel.unit.r)continue;
      const [x,y]=cen(c,r);
      hexPath(ctx,x,y,s*0.94);ctx.fillStyle='rgba(88,214,196,.22)';ctx.fill();
      ctx.strokeStyle='rgba(88,214,196,.7)';ctx.lineWidth=1.5;ctx.stroke();
    }
  }
  const pad=2.5;
  for(const city of G.cities)if(inView(city.c,city.r,pad))drawCity(ctx,city);
  const seen=G.units.filter(u=>inView(u.c,u.r,pad)).sort((a,b)=>a.r-b.r);
  for(const u of seen)drawUnit(ctx,u);
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
  // Effects are stored by hex, so they stay put on the map while the camera moves.
  const fs=Math.max(s,14);
  for(const e of U.effects){
    const p=Math.min(1,(now-e.t0)/e.dur);
    if(p<0)continue;
    const [x,y]=cen(e.c,e.r);
    ctx.globalAlpha=1-p;
    if(e.kind==='dmg'||e.kind==='lvl'){
      ctx.font='700 '+Math.max(13,fs*0.72)+'px "Barlow Condensed",sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      const ty=y-fs*0.5-p*fs*0.9;
      ctx.lineWidth=3;ctx.strokeStyle='#081014';ctx.strokeText(e.text,x,ty);
      ctx.fillStyle=e.kind==='lvl'?'#ffd35c':e.tone==='counter'?'#ffb74d':'#ff7b7b';
      ctx.fillText(e.kind==='lvl'?'Promoted: '+e.text:e.text,x,ty);
    }else if(e.kind==='shot'){
      const [x2,y2]=cen(e.c2,e.r2),k=Math.min(1,p*2.4);
      ctx.strokeStyle='#fff3c4';ctx.lineWidth=Math.max(2,s*0.14);ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(x2-x)*k,y+(y2-y)*k);ctx.stroke();
    }else if(e.kind==='cap'||e.kind==='spawn'){
      ctx.strokeStyle=e.kind==='cap'?'#ffd35c':'#fff';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(x,y,Math.max(s,10)*(0.6+p*1.1),0,Math.PI*2);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  ctx.textAlign='start';ctx.textBaseline='alphabetic';
  drawMini();
}

export function flushFx(){
  if(!G||!G.fx.length)return;
  const now=performance.now();
  for(const f of G.fx){
    if(f.kind==='toast'){toast(f.text);continue;}
    // On a big world most fighting happens off screen. Skip what nobody can see.
    if(!inView(f.c,f.r,3)&&!(f.kind==='shot'&&inView(f.c2,f.r2,3)))continue;
    if(f.kind==='cap')toast(f.text+' captured');
    const e={kind:f.kind,c:f.c,r:f.r,t0:now,dur:f.kind==='shot'?320:f.kind==='dmg'||f.kind==='lvl'?950:700,text:f.text,tone:f.tone};
    if(f.kind==='shot'){e.c2=f.c2;e.r2=f.r2;}
    U.effects.push(e);
  }
  G.fx.length=0;
}

export function frame(){
  flushFx();
  const now=performance.now();
  if(stepFly(now))U.dirty=true;
  U.effects=U.effects.filter(e=>now-e.t0<e.dur);
  if(U.dirty||U.effects.length){render(now);U.dirty=false;}
  requestAnimationFrame(frame);
}
