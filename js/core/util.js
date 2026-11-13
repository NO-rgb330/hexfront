// Pure helpers: seeded RNG, value noise, shuffle, hex-grid maths (odd-r offset coordinates).
import { H, W } from './data.js';

export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

export function makeNoise(rnd){
  const N=32,g=[];for(let i=0;i<N*N;i++)g.push(rnd());
  const at=(x,y)=>g[((y%N+N)%N)*N+((x%N+N)%N)];
  return function(x,y){
    const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
    const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    const a=at(x0,y0),b=at(x0+1,y0),c=at(x0,y0+1),d=at(x0+1,y0+1);
    return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;
  };
}

export function shuffle(arr,rnd){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=(rnd()*(i+1))|0;const t=a[i];a[i]=a[j];a[j]=t;}return a;}

export const DIRS_EVEN=[[1,0],[-1,0],[0,-1],[-1,-1],[0,1],[-1,1]];

export const DIRS_ODD=[[1,0],[-1,0],[1,-1],[0,-1],[1,1],[0,1]];

export function neighbors(c,r){
  const d=(r&1)?DIRS_ODD:DIRS_EVEN,out=[];
  for(const [dc,dr] of d){const nc=c+dc,nr=r+dr;if(nc>=0&&nc<W&&nr>=0&&nr<H)out.push([nc,nr]);}
  return out;
}

export function toCube(c,r){const x=c-(r-(r&1))/2;return [x,-x-r,r];}

export function dist(c1,r1,c2,r2){
  const a=toCube(c1,r1),b=toCube(c2,r2);
  return Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]),Math.abs(a[2]-b[2]));
}

// Every hex at distance 1..rng from (c,r), as [c,r,d]. Used to look for firing positions around a target.
export function within(c,r,rng){
  const seen=new Set([r*W+c]),out=[];let ring=[[c,r]];
  for(let d=1;d<=rng;d++){
    const next=[];
    for(const [pc,pr] of ring)for(const [nc,nr] of neighbors(pc,pr)){
      const i=nr*W+nc;
      if(seen.has(i))continue;
      seen.add(i);next.push([nc,nr]);out.push([nc,nr,d]);
    }
    ring=next;
  }
  return out;
}
