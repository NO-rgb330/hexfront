// HUD, scoreboard and side-panel HTML. Reads game state, never changes it.
import { COLORS, NATIONS, RANKS, TECHS, TERRAIN_INFO, UT, W, XP_STEPS } from '../core/data.js';
import { G, cityAt, unitAt } from '../core/state.js';
import { recruit, techCost } from '../core/economy.js';
import { $, panel, scoreEl, toastEl } from './dom.js';
import { U } from './uistate.js';

export function toast(msg){
  toastEl.textContent=msg;toastEl.classList.add('on');
  clearTimeout(U.toastTimer);
  U.toastTimer=setTimeout(()=>toastEl.classList.remove('on'),2200);
}

export function hpColor(h){return h>6?'var(--good)':h>3?'var(--accent)':'var(--bad)';}

export function idleCount(){return G.units.filter(u=>u.owner===G.player&&!u.done).length;}

export function updateHud(){
  const n=G.nations[G.current];
  $('hRound').textContent=G.round;
  $('hNation').textContent=n.name+(G.current===G.player?' (you)':'');
  $('hDot').style.background=COLORS[G.current];
  const me=G.nations[G.player];
  $('hGold').textContent=me.gold;
  $('hInc').textContent=me.alive?'+'+me.income+'/turn':'';
  const eb=$('endBtn'),mine=G.current===G.player&&!U.busy&&!G.over;
  eb.disabled=!mine;
  eb.textContent=U.busy?'Enemy turn':mine?'End turn'+(idleCount()?' · '+idleCount()+' idle':''):'End turn';
}

export function renderScore(){
  scoreEl.innerHTML=G.nations.map(n=>{
    const cities=G.cities.filter(c=>c.owner===n.id).length,units=G.units.filter(u=>u.owner===n.id).length;
    return '<div class="row'+(n.id===G.current&&n.alive?' turn':'')+(n.alive?'':' dead')+'"><i class="dot" style="background:'+COLORS[n.id]+'"></i>'+
      '<span class="nm">'+n.name+(n.id===G.player?'<em>You</em>':'')+'</span>'+
      '<span class="num mono"><b>'+cities+'</b> cities</span><span class="num mono"><b>'+units+'</b> units</span></div>';
  }).join('');
}

export function unitCard(u){
  const T=UT[u.type],n=G.nations[u.owner];
  const atk=(T.atk*(1+0.1*n.tech.fire)*(1+0.08*u.lv)).toFixed(1);
  const def=(T.def*(1+0.1*n.tech.armor)*(1+0.08*u.lv)).toFixed(1);
  const mine=u.owner===G.player;
  let status='';
  if(mine){
    status=u.done?'Orders complete this turn.':u.moved?(u.type==='art'?'Moved. Artillery cannot fire after moving.':'Moved. It can still attack an adjacent enemy.'):'Ready for orders.';
  }
  const tile=G.tiles[u.r*W+u.c].t,city=cityAt(u.c,u.r);
  const ground=UT[u.type].air?'In the air, ignoring terrain defense.':'Standing on '+TERRAIN_INFO[tile].name.toLowerCase()+(city?' inside '+city.name:'')+'.';
  const next=u.lv<3?' Next rank at '+XP_STEPS[u.lv]+' xp (has '+u.xp+').':' Top rank reached.';
  return '<div class="uhead"><i class="dot" style="background:'+COLORS[u.owner]+';width:16px;height:16px"></i><div><div class="uname">'+T.name+'</div><div class="usub">'+RANKS[u.lv]+' '+u.cmd+' · '+NATIONS[u.owner].name+'</div></div><div class="stars" aria-label="Rank '+u.lv+' of 3">'+'★'.repeat(u.lv)+'☆'.repeat(3-u.lv)+'</div></div>'+
    '<div class="hp"><div class="hpbar"><i style="width:'+(u.hp*10)+'%;background:'+hpColor(u.hp)+'"></i></div><span class="mono">'+u.hp+'/10</span></div>'+
    '<dl class="sts"><div><dt>Atk</dt><dd>'+atk+'</dd></div><div><dt>Def</dt><dd>'+def+'</dd></div><div><dt>Move</dt><dd>'+T.mv+'</dd></div><div><dt>Range</dt><dd>'+T.rng+'</dd></div></dl>'+
    '<p class="note">'+T.desc+'</p>'+
    '<p class="note"><b>'+(status||ground)+'</b>'+(status?' '+ground:'')+next+'</p>';
}

export function cityCard(city,own){
  const n=city.owner>=0?G.nations[city.owner]:null;
  const me=G.nations[G.player];
  let html='<div class="uhead"><i class="dot" style="background:'+(n?COLORS[n.id]:'#aab5b9')+';width:16px;height:16px"></i><div><div class="uname">'+city.name+'</div><div class="usub">'+(city.capital>=0?'Capital of '+NATIONS[city.capital].name:'City')+' · '+(n?'held by '+n.name:'Neutral')+'</div></div></div>';
  html+='<p class="note" style="margin-top:10px">Yields <b class="mono">'+(city.capital>=0?40:20)+'</b> gold per turn to its owner. Units here heal 3 hp a turn and defend with +40%.'+(city.capital>=0?' Taking a capital eliminates that power.':'')+'</p>';
  if(own){
    const occ=unitAt(city.c,city.r);
    if(city.recruited)html+='<p class="note"><b>No more troops can be raised here this turn.</b></p>';
    else if(occ)html+='<p class="note"><b>A unit is stationed here.</b> Move it out to raise troops.</p>';
    else{
      html+='<h3 style="margin:12px 0 8px;font:600 12px/1 var(--display);letter-spacing:.16em;text-transform:uppercase;color:var(--mute)">Raise troops</h3>';
      for(const k of Object.keys(UT)){
        const T=UT[k];
        html+='<button class="rec" type="button" data-act="recruit:'+k+'"'+(me.gold<T.cost?' disabled':'')+'><span><span class="rname">'+T.name+'</span><br><span class="rstat mono">A'+T.atk+' D'+T.def+' M'+T.mv+' R'+T.rng+'</span></span><span></span><span class="rcost mono">'+T.cost+'</span></button>';
      }
    }
  }
  return html;
}

export function fieldHTML(){
  if(U.sel){
    if(U.sel.kind==='unit'||U.sel.kind==='inspect'){
      let html=unitCard(U.sel.unit);
      if(U.sel.kind==='unit'&&U.sel.unit.owner===G.player&&!U.sel.unit.done&&G.current===G.player&&!U.busy){
        html+='<div class="btnrow"><button class="btn" type="button" data-act="hold">Hold &amp; rest</button><button class="btn ghost" type="button" data-act="next">Next idle</button></div>';
      }
      return html;
    }
    if(U.sel.kind==='city')return cityCard(U.sel.city,true);
    if(U.sel.kind==='info')return cityCard(U.sel.city,false);
    if(U.sel.kind==='tile'){
      const t=G.tiles[U.sel.r*W+U.sel.c].t;
      return '<div class="uname">'+TERRAIN_INFO[t].name+'</div><p class="note" style="margin-top:8px">'+TERRAIN_INFO[t].text+'</p>';
    }
  }
  return '<ul class="help">'+
    '<li><b>Select a unit.</b> Teal hexes show where it can move. Red outlines mark enemies it can strike.</li>'+
    '<li><b>Tap an enemy to attack.</b> The unit moves into range first if needed. Defenders hit back unless you outrange them.</li>'+
    '<li><b>Tap your cities to raise troops.</b> Gold comes from the cities you hold.</li>'+
    '<li><b>Win by taking every rival capital.</b> Keys: N next idle unit, E end turn, Esc clear.</li></ul>'+
    '<div class="legend"><span><i style="background:rgba(88,214,196,.6)"></i>Move</span><span><i style="background:#ff5a64"></i>Attack</span><span><i style="background:#ffd35c"></i>Capital</span></div>';
}

export function techHTML(){
  const me=G.nations[G.player];
  return '<div class="tech">'+TECHS.map(t=>{
    const lv=me.tech[t.key],c=techCost(me,t.key);
    return '<div class="t"><b>'+t.name+'</b><p>'+t.desc+'</p><div class="pips">'+[0,1,2].map(k=>'<i class="'+(k<lv?'on':'')+'"></i>').join('')+'</div>'+
      '<button class="btn" type="button" data-act="tech:'+t.key+'"'+(c===null||me.gold<c||G.current!==G.player||U.busy?' disabled':'')+'>'+(c===null?'Max':c+' gold')+'</button></div>';
  }).join('')+'</div>';
}

export function logHTML(){
  return '<ul class="log">'+G.log.slice().reverse().slice(0,40).map(l=>'<li><span>R'+l.round+'</span><div>'+l.text+'</div></li>').join('')+'</ul>';
}

export function renderSide(){
  renderScore();
  for(const k of ['field','tech','log']){
    const b=$('tab'+k[0].toUpperCase()+k.slice(1));
    b.setAttribute('aria-selected',String(U.tab===k));
  }
  panel.innerHTML=U.tab==='field'?fieldHTML():U.tab==='tech'?techHTML():logHTML();
}

export function updateAll(){updateHud();renderSide();U.dirty=true;}
