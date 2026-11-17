// Procedural map: scale-aware terrain, capitals in the corners, spread-out neutral cities, land-bridge repair.
import { CITY_NAMES, H, NATIONS, W } from './data.js';
import { dist, makeNoise, mulberry32, neighbors, shuffle } from './util.js';

const PREFIX=['Ash','Iron','Stone','Red','Kes','High','Dun','Salt','Vel','North','Cinder','Lark','Bright','Thorn','Grav','Port','Oak','Raven','Frost','Gold','Silver','Black','White','Storm','Mist','Wolf','Hawk','Elm','Cold','Amber','Grey','Eagle','Fair','Deep','Lone','Marsh','Pine','Rook','Sun','Swift'];
const SUFFIX=['ford','gate','hollow','marsh','bay','moor','mere','wick','mont','reach','fall','spur','water','bury','lin','haven','ridge','watch','field','crest','ton','stead','vale','holm'];

// Original handpicked names first, then enough Prefix+Suffix combinations for hundreds of cities.
function cityNames(rnd){
  const first=shuffle(CITY_NAMES,rnd),used=new Set(first),combos=[];
  for(const p of PREFIX)for(const s of SUFFIX){const n=p+s;if(!used.has(n))combos.push(n);}
  return first.concat(shuffle(combos,rnd));
}

class Heap{
  constructor(){this.k=[];this.v=[];}
  get size(){return this.k.length;}
  push(key,val){
    let i=this.k.length;this.k.push(key);this.v.push(val);
    while(i>0){const p=(i-1)>>1;if(this.k[p]<=key)break;this.k[i]=this.k[p];this.v[i]=this.v[p];i=p;}
    this.k[i]=key;this.v[i]=val;
  }
  pop(){
    const k0=this.k[0],v0=this.v[0],kl=this.k.pop(),vl=this.v.pop(),n=this.k.length;
    if(n){
      let i=0;
      for(;;){
        let c=2*i+1;if(c>=n)break;
        if(c+1<n&&this.k[c+1]<this.k[c])c++;
        if(this.k[c]>=kl)break;
        this.k[i]=this.k[c];this.v[i]=this.v[c];i=c;
      }
      this.k[i]=kl;this.v[i]=vl;
    }
    return [k0,v0];
  }
}

const quantile=(arr,f)=>{const a=Array.from(arr).sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(f*a.length))];};

// Build one candidate world from a seed. Always returns a connected map.
function buildMap(seed){
  const rnd=mulberry32(seed),N=128;
  const nE=makeNoise(rnd,N),nM=makeNoise(rnd,N),nR=makeNoise(rnd,N);
  const area=W*H;
  const k=Math.sqrt(area/140);                 // 1 on the classic map, grows with the world
  const fb=0.32/(1+(k-1)*0.55);                // continent-scale frequency, so bigger worlds get bigger landmasses
  const ox=rnd()*40,oy=rnd()*40;

  const elev=new Float32Array(area),moist=new Float32Array(area),ridge=new Float32Array(area);
  for(let r=0;r<H;r++)for(let c=0;c<W;c++){
    const i=r*W+c,x=c+0.5*(r&1),y=r*0.866;
    const ex=Math.abs(c/(W-1)-0.5)*2,ey=Math.abs(r/(H-1)-0.5)*2;
    let e=nE(x*fb+ox,y*fb+oy)*0.55+nE(x*fb*2.3+ox+31,y*fb*2.3+oy+17)*0.30+nE(x*fb*5+ox+7,y*fb*5+oy+3)*0.15;
    e-=Math.pow(Math.max(ex,ey),3)*0.28;      // open ocean around the edges
    elev[i]=e;
    moist[i]=nM(x*fb*2+ox+13,y*fb*2+oy+3);
    ridge[i]=1-Math.abs(2*nR(x*fb*1.7+ox+5,y*fb*1.7+oy+29)-1);   // thin bright lines become mountain ranges
  }
  // Rank-based thresholds give every seed the same share of sea, mountain and forest.
  const seaLevel=quantile(elev,area>200?0.27:0.24);
  const land=[];for(let i=0;i<area;i++)if(elev[i]>seaLevel)land.push(i);
  const mScore=i=>ridge[i]+0.6*elev[i];
  const mountCut=quantile(land.map(mScore),0.88);
  const mountSet=new Set(land.filter(i=>mScore(i)>=mountCut));
  const flat=land.filter(i=>!mountSet.has(i));
  const forestCut=quantile(flat.map(i=>moist[i]),0.70);
  const tiles=new Array(area);
  for(let i=0;i<area;i++){
    let t='sea';
    if(elev[i]>seaLevel)t=mountSet.has(i)?'mount':moist[i]>=forestCut?'forest':'plain';
    tiles[i]={t};
  }

  // Capitals sit near the four corners on the nearest dry tile, with open ground around them.
  const tx=Math.max(2,Math.round(W*0.15)),ty=Math.max(2,Math.round(H*0.18));
  const targets=[[tx,ty],[W-1-tx,ty],[tx,H-1-ty],[W-1-tx,H-1-ty]];
  const cities=[];
  for(let n=0;n<4;n++){
    let bi=-1,bd=1e9;
    for(let i=0;i<area;i++){
      if(tiles[i].t==='sea'||tiles[i].t==='mount')continue;
      const d=dist(i%W,(i/W)|0,targets[n][0],targets[n][1]);
      if(d<bd){bd=d;bi=i;}
    }
    const cc=bi%W,cr=(bi/W)|0;
    tiles[bi].t='plain';
    for(const [nc,nr] of neighbors(cc,cr)){const j=nr*W+nc;if(tiles[j].t==='sea'||tiles[j].t==='mount')tiles[j].t='plain';}
    cities.push({c:cc,r:cr,owner:n,capital:n,name:NATIONS[n].capital,recruited:false});
  }

  // Neutral cities: best-candidate sampling spreads them out evenly instead of clumping.
  const names=cityNames(rnd),spacing=area>1000?4:3;
  const target=area<=200?14:Math.round(area/26);
  const cand=[];for(let i=0;i<area;i++)if(tiles[i].t==='plain'||tiles[i].t==='forest')cand.push(i);
  let stalls=0;
  while(cities.length<target&&stalls<40){
    let best=-1,bs=-1;
    for(let a=0;a<8;a++){
      const i=cand[(rnd()*cand.length)|0],c=i%W,r=(i/W)|0;
      let md=1e9;
      for(const x of cities){const d=dist(x.c,x.r,c,r);if(d<md){md=d;if(md<spacing)break;}}
      if(md>=spacing&&md>bs){bs=md;best=i;}
    }
    if(best<0){stalls++;continue;}
    stalls=0;
    tiles[best].t='plain';
    cities.push({c:best%W,r:(best/W)|0,owner:-1,capital:-1,name:names[cities.length-4],recruited:false});
  }

  carve(tiles,cities);

  // Starting territory: each power takes its nearest neutral cities in turn.
  const start=Math.max(1,Math.round(Math.sqrt(area)/20));
  for(let round=0;round<start;round++){
    for(let n=0;n<4;n++){
      const cap=cities[n];let best=null,bd=1e9;
      for(const x of cities){
        if(x.owner!==-1)continue;
        const d=dist(cap.c,cap.r,x.c,x.r);
        if(d<bd){bd=d;best=x;}
      }
      if(best)best.owner=n;
    }
  }
  return {tiles,cities};
}

// Dry land that tanks can cross (no sea, no mountain) from city 0.
function flood(tiles,cities){
  const seen=new Uint8Array(W*H),q=[cities[0].r*W+cities[0].c];
  seen[q[0]]=1;
  while(q.length){
    const i=q.pop();
    for(const [nc,nr] of neighbors(i%W,(i/W)|0)){
      const j=nr*W+nc;
      if(seen[j]||tiles[j].t==='sea'||tiles[j].t==='mount')continue;
      seen[j]=1;q.push(j);
    }
  }
  return seen;
}

// Guarantee every city can be reached on foot by every ground unit.
// Isolated cities get a land bridge: sea becomes plain, mountain becomes forest along the cheapest path.
function carve(tiles,cities){
  for(let guard=0;guard<cities.length+20;guard++){
    const seen=flood(tiles,cities);
    const missing=cities.filter(x=>!seen[x.r*W+x.c]);
    if(!missing.length)return;
    const d=new Float32Array(W*H).fill(Infinity),prev=new Int32Array(W*H).fill(-1),heap=new Heap();
    for(let i=0;i<W*H;i++)if(seen[i]){d[i]=0;heap.push(0,i);}
    while(heap.size){
      const [dd,i]=heap.pop();
      if(dd>d[i])continue;
      for(const [nc,nr] of neighbors(i%W,(i/W)|0)){
        const j=nr*W+nc,t=tiles[j].t,nd=dd+(t==='sea'?4:t==='mount'?3:1);
        if(nd<d[j]){d[j]=nd;prev[j]=i;heap.push(nd,j);}
      }
    }
    let best=missing[0];
    for(const m of missing)if(d[m.r*W+m.c]<d[best.r*W+best.c])best=m;
    let i=best.r*W+best.c;
    while(i>=0&&!seen[i]){
      if(tiles[i].t==='sea')tiles[i].t='plain';else if(tiles[i].t==='mount')tiles[i].t='forest';
      i=prev[i];
    }
  }
}

// How many neutral cities lie near each capital. Used to reject lopsided starts.
function balance(map){
  const D=Math.max(3,Math.round(0.22*Math.max(W,H))),counts=[];
  for(let n=0;n<4;n++){
    const cap=map.cities[n];
    counts.push(map.cities.filter(x=>x.capital<0&&dist(cap.c,cap.r,x.c,x.r)<=D).length);
  }
  const mx=Math.max(...counts),mn=Math.min(...counts);
  return mx<8?(mn>=1?1:0):mn/mx;
}

export function genMap(seed0){
  let best=null,bs=-1;
  for(let a=0;a<40;a++){
    const m=buildMap(seed0+a*7919);
    const s=balance(m);
    if(s>bs){bs=s;best=m;}
    if(s>=0.6)break;
  }
  return best;
}
