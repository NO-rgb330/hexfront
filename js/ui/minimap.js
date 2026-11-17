// Minimap: the whole world in one small canvas, with territory, armies and the current viewport.
import { COLORS, H, W } from '../core/data.js';
import { G } from '../core/state.js';
import { mini } from './dom.js';
import { U } from './uistate.js';

const SQ=Math.sqrt(3);
const MCOL={sea:'#0b2430',plain:'#79764f',forest:'#4b6a3f',mount:'#8b9296'};

export function sizeMini(){
  const aspect=SQ*(W+0.5)/(1.5*H+0.5);
  const cw=U.size.w<520?120:200,ch=Math.round(cw/aspect),dpr=U.size.dpr||1;
  mini.style.width=cw+'px';mini.style.height=ch+'px';
  mini.width=Math.round(cw*dpr);mini.height=Math.round(ch*dpr);
  U.mini={w:cw,h:ch,dpr,ms:cw/(SQ*(W+0.5))};
  U.miniKey='';
}

export function drawMini(){
  if(!G||!U.mini.w)return;
  const m=U.mini,ms=m.ms,ctx=mini.getContext('2d');
  const key=G.seed+'|'+W+'x'+H+'|'+m.w+'x'+m.h+'|'+m.dpr;
  if(U.miniKey!==key){
    // Terrain never changes during a game, so it is painted once into an offscreen canvas.
    const off=document.createElement('canvas');off.width=mini.width;off.height=mini.height;
    const o=off.getContext('2d');o.scale(m.dpr,m.dpr);
    o.fillStyle=MCOL.sea;o.fillRect(0,0,m.w,m.h);
    for(let r=0;r<H;r++)for(let c=0;c<W;c++){
      const t=G.tiles[r*W+c].t;
      if(t==='sea')continue;
      o.fillStyle=MCOL[t];
      o.fillRect(ms*SQ*(c+0.5+0.5*(r&1))-ms*0.87,ms*(1+1.5*r)-ms*0.8,ms*1.74+0.4,ms*1.6+0.4);
    }
    U.miniTerrain=off;U.miniKey=key;
  }
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,mini.width,mini.height);
  ctx.drawImage(U.miniTerrain,0,0);
  ctx.setTransform(m.dpr,0,0,m.dpr,0,0);
  const us=Math.max(1.8,ms*1.5);
  for(const c of G.cities){
    const x=ms*SQ*(c.c+0.5+0.5*(c.r&1)),y=ms*(1+1.5*c.r);
    // Neutral cities are small and quiet so territory colours read first, capitals are boxed.
    const cs=c.capital>=0?Math.max(5,ms*3.2):c.owner>=0?Math.max(2.8,ms*1.9):Math.max(2,ms*1.3);
    ctx.fillStyle=c.owner>=0?COLORS[c.owner]:'rgba(220,228,231,.75)';
    ctx.fillRect(x-cs/2,y-cs/2,cs,cs);
    if(c.capital>=0){ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(x-cs/2-1,y-cs/2-1,cs+2,cs+2);}
  }
  for(const u of G.units){
    const x=ms*SQ*(u.c+0.5+0.5*(u.r&1)),y=ms*(1+1.5*u.r);
    ctx.fillStyle=COLORS[u.owner];
    ctx.fillRect(x-us/2,y-us/2,us,us);
  }
  // Viewport frame
  const f=ms/U.size.s;
  ctx.save();ctx.beginPath();ctx.rect(0,0,m.w,m.h);ctx.clip();
  ctx.strokeStyle='#fff';ctx.lineWidth=1.5;
  ctx.strokeRect(-U.size.ox*f,-U.size.oy*f,U.size.w*f,U.size.h*f);
  ctx.restore();
}
