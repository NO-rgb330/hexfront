// Procedural map: terrain noise, capitals, neutral cities, connectivity checks.
import { CITY_NAMES, H, NATIONS, W } from './data.js';
import { dist, makeNoise, mulberry32, neighbors, shuffle } from './util.js';

export function genMap(seed0){
  for(let k=0;k<500;k++){const m=tryMap(seed0+k*7919,false);if(m)return m;}
  return tryMap(seed0,true);
}

export function tryMap(seed,force){
  const rnd=mulberry32(seed),nE=makeNoise(rnd),nM=makeNoise(rnd);
  const tiles=[];let land=0;
  for(let r=0;r<H;r++)for(let c=0;c<W;c++){
    const ex=Math.abs(c/(W-1)-0.5)*2,ey=Math.abs(r/(H-1)-0.5)*2;
    let e=nE(c*0.32+2.7,r*0.32+9.1)*0.7+nE(c*0.85+5,r*0.85+1)*0.3;
    e-=Math.pow(Math.max(ex,ey),4)*0.2;
    const m=nM(c*0.45+13,r*0.45+3);
    let t='plain';
    if(e<0.4)t='sea';else if(e>0.66)t='mount';else if(m>0.56&&e>0.45)t='forest';
    if(force&&t==='sea')t='plain';
    if(t!=='sea')land++;
    tiles.push({t});
  }
  if(land<W*H*0.55)return null;
  const targets=[[2,2],[W-3,2],[2,H-3],[W-3,H-3]];
  const cities=[];
  for(let n=0;n<4;n++){
    let bi=-1,bd=1e9;
    for(let i=0;i<W*H;i++){
      if(tiles[i].t==='sea')continue;
      const d=dist(i%W,(i/W)|0,targets[n][0],targets[n][1]);
      if(d<bd){bd=d;bi=i;}
    }
    tiles[bi].t='plain';
    cities.push({c:bi%W,r:(bi/W)|0,owner:n,capital:n,name:NATIONS[n].capital,recruited:false});
  }
  const names=shuffle(CITY_NAMES,rnd);
  let tries=0;
  while(cities.length<14&&tries<800){
    tries++;
    const c=(rnd()*W)|0,r=(rnd()*H)|0,t=tiles[r*W+c].t;
    if(t==='sea'||t==='mount')continue;
    if(cities.some(x=>dist(x.c,x.r,c,r)<3))continue;
    tiles[r*W+c].t='plain';
    cities.push({c,r,owner:-1,capital:-1,name:names[cities.length-4],recruited:false});
  }
  if(cities.length<12)return null;
  if(!force){
    for(const avoid of [['sea'],['sea','mount']]){
      const seen=new Set([cities[0].r*W+cities[0].c]),q=[[cities[0].c,cities[0].r]];
      while(q.length){
        const [c,r]=q.pop();
        for(const [nc,nr] of neighbors(c,r)){
          const i=nr*W+nc;
          if(seen.has(i)||avoid.includes(tiles[i].t))continue;
          seen.add(i);q.push([nc,nr]);
        }
      }
      if(!cities.every(x=>seen.has(x.r*W+x.c)))return null;
    }
  }
  for(let n=0;n<4;n++){
    const cap=cities[n];let best=null,bd=1e9;
    for(const x of cities){
      if(x.owner!==-1)continue;
      const d=dist(cap.c,cap.r,x.c,x.r);
      if(d<bd){bd=d;best=x;}
    }
    if(best)best.owner=n;
  }
  return {tiles,cities};
}
