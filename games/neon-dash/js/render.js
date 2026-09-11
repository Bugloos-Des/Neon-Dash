/* =========================================================
   RENDER — fixed back-to-front draw order. See
   docs/architecture.md §9.
   ========================================================= */
import { CW, CH, GROUND_Y } from './config.js';
import { clamp } from './utils.js';
import { ctx } from './canvas.js';
import { game } from './gamestate.js';
import { activePlayers } from './player.js';

const THEMES = {
  outskirts: {sky:['#0d1430','#1a1440'], grid:'#1c2b55', accent:'#00e5ff', accent2:'#ff2ec4'},
  tunnels:   {sky:['#060a12','#0a1420'], grid:'#0f2233', accent:'#39ff9e', accent2:'#00e5ff'},
  orbital:   {sky:['#0a0620','#160a30'], grid:'#241246', accent:'#ff2ec4', accent2:'#00e5ff'},
  fortress:  {sky:['#180608','#240a0a'], grid:'#3a1416', accent:'#ff4d5e', accent2:'#ffc24b'},
};

function drawBackground(){
  const th = THEMES[game.level.theme];
  const g = ctx.createLinearGradient(0,0,0,CH);
  g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0,0,CW,CH);

  // stars
  const t = performance.now()/1000;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for(let i=0;i<40;i++){
    const sx = (i*137 - game.camera.x*0.15) % (CW+40);
    const sy = (i*71)%160 + 10;
    const tw = 0.5+0.5*Math.sin(t*2+i);
    ctx.globalAlpha = 0.3+0.4*tw;
    ctx.fillRect(((sx%(CW+40))+CW+40)%(CW+40)-20, sy, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  // big silhouette shapes
  ctx.fillStyle = th.grid;
  for(let i=0;i<6;i++){
    const bx = (i*260 - game.camera.x*0.3) % (CW+300);
    const bxw = ((bx%(CW+300))+CW+300)%(CW+300)-150;
    const hgt = 40 + (i%3)*22;
    ctx.fillRect(bxw, CH-95-hgt, 46, hgt+95);
  }

  // horizon grid lines
  ctx.strokeStyle = th.accent; ctx.globalAlpha=0.25; ctx.lineWidth=1;
  for(let i=0;i<10;i++){
    const gx = ((i*70 - game.camera.x*0.5) % 700 + 700) % 700 - 100;
    ctx.beginPath(); ctx.moveTo(gx, GROUND_Y+40); ctx.lineTo(gx-40, CH); ctx.stroke();
  }
  ctx.globalAlpha=1;
}

function drawSolids(){
  const th = THEMES[game.level.theme];
  for(const s of game.solids){
    if(s.type!=='solid') continue;
    if(s===game.gate){
      if(!game.gateActive) continue;
      ctx.fillStyle = 'rgba(255,77,94,0.25)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth=2;
      ctx.strokeRect(s.x+1, s.y+1, s.w-2, s.h-2);
      continue;
    }
    const topY = s.y;
    ctx.fillStyle = '#0c1120';
    ctx.fillRect(s.x, topY, s.w, Math.min(s.h, CH-topY+40));
    ctx.fillStyle = th.accent;
    ctx.fillRect(s.x, topY, s.w, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for(let gx=s.x; gx<s.x+s.w; gx+=20) ctx.fillRect(gx, topY+6, 1, Math.min(18,s.h-6));
  }
}

function drawBlocks(){
  for(const b of game.blocks){
    const off = b.bump>0 ? -Math.sin((0.15-b.bump)/0.15*Math.PI)*4 : 0;
    const y = b.y+off;
    if(b.kind==='energy' && !b.used){
      ctx.fillStyle = '#12335a'; ctx.fillRect(b.x,y,b.w,b.h);
      ctx.strokeStyle = '#ffc24b'; ctx.lineWidth=2; ctx.strokeRect(b.x+2,y+2,b.w-4,b.h-4);
      ctx.fillStyle = '#ffc24b';
      const pulse = 0.5+0.5*Math.sin(performance.now()/200);
      ctx.globalAlpha = 0.5+0.5*pulse;
      ctx.fillRect(b.x+b.w/2-3, y+b.h/2-3, 6, 6);
      ctx.globalAlpha = 1;
    } else if(b.kind==='energy' && b.used){
      ctx.fillStyle = '#0a0f1c'; ctx.fillRect(b.x,y,b.w,b.h);
      ctx.strokeStyle = '#2a3550'; ctx.lineWidth=2; ctx.strokeRect(b.x+2,y+2,b.w-4,b.h-4);
    } else {
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(b.x,y,b.w,b.h);
      ctx.strokeStyle = '#7a5a34'; ctx.lineWidth=2; ctx.strokeRect(b.x+2,y+2,b.w-4,b.h-4);
      ctx.fillStyle='#5a4226';
      ctx.fillRect(b.x+3,y+3,b.w-6,4); ctx.fillRect(b.x+3,y+b.h-9,b.w-6,4);
    }
  }
}

function drawHazardsStrips(){
  const t = performance.now()/1000;
  for(const h of game.hazardsZones){
    const glow = 0.5+0.5*Math.sin(t*8);
    ctx.fillStyle = `rgba(255,77,94,${0.5+0.3*glow})`;
    ctx.fillRect(h.x,h.y,h.w,h.h);
    ctx.fillStyle = '#ffc24b';
    for(let gx=h.x; gx<h.x+h.w; gx+=10) ctx.fillRect(gx,h.y-2,4,2);
  }
}

function drawTurrets(){
  for(const t of game.turrets){
    ctx.fillStyle = '#1a1f2e';
    ctx.fillRect(t.x, GROUND_Y-6, 28, 10);
    const bodyColor = t.state==='extended' ? '#ff4d5e' : (t.state==='rising' ? '#ffc24b' : '#3a4a66');
    ctx.fillStyle = bodyColor;
    ctx.fillRect(t.x+6, t.y, 16, t.h);
    ctx.fillStyle = '#ff2ec4';
    ctx.fillRect(t.x+11, t.y, 6, 4);
  }
}

function drawShards(){
  const t = performance.now()/1000;
  for(const s of game.shards){
    if(s.collected) continue;
    const bob = Math.sin(t*3 + s.x)*3;
    ctx.save();
    ctx.translate(s.x, s.y+bob);
    ctx.rotate(t*2 + s.x);
    ctx.fillStyle = '#39ff9e';
    ctx.beginPath();
    ctx.moveTo(0,-5); ctx.lineTo(5,0); ctx.lineTo(0,5); ctx.lineTo(-5,0); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawItems(){
  const t = performance.now()/1000;
  for(const it of game.items){
    if(it.collected) continue;
    const bob = it.spawning ? 0 : Math.sin(t*3+it.x)*2;
    const x = it.x, y = it.y+bob;
    if(it.type==='nano'){
      ctx.fillStyle = '#39ff9e';
      ctx.fillRect(x,y,18,18);
      ctx.fillStyle = '#0a2a1a';
      ctx.fillRect(x+4,y+4,4,4); ctx.fillRect(x+10,y+4,4,4);
    } else if(it.type==='plasma'){
      ctx.fillStyle = '#ff2ec4';
      ctx.beginPath(); ctx.arc(x+9,y+9,9,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.globalAlpha=0.6;
      ctx.beginPath(); ctx.arc(x+9,y+9,3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    } else if(it.type==='overdrive'){
      const hue = (t*180)%360;
      ctx.fillStyle = `hsl(${hue},100%,60%)`;
      ctx.save(); ctx.translate(x+9,y+9); ctx.rotate(t*3);
      ctx.beginPath();
      for(let i=0;i<5;i++){ const a=i*(Math.PI*2/5)-Math.PI/2; const r = i%2===0?10:4; ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
}

function drawEnemyScuttler(e){
  const sq = e.alive ? 1 : Math.max(0.15, e.squish/0.22);
  ctx.save();
  ctx.translate(e.x+e.w/2, e.y+e.h);
  ctx.scale(1, sq);
  ctx.translate(-e.w/2, -e.h);
  ctx.fillStyle = '#2a3a55';
  ctx.fillRect(0,4,e.w,e.h-4);
  ctx.fillStyle = '#ff4d5e';
  ctx.fillRect(e.w/2-7,6,6,6); ctx.fillRect(e.w/2+1,6,6,6);
  ctx.fillStyle = '#101622';
  ctx.fillRect(2,e.h-4,5,4); ctx.fillRect(e.w-7,e.h-4,5,4);
  ctx.restore();
}
function drawEnemyDrone(e){
  const t=performance.now()/1000;
  ctx.save();
  ctx.translate(e.x+e.w/2, e.y+e.h/2 + (e.alive?0:0));
  const sq = e.alive?1:Math.max(0.15,e.squish/0.22);
  ctx.scale(1,sq);
  ctx.fillStyle = '#3a2a55';
  ctx.beginPath(); ctx.ellipse(0,0,e.w/2,e.h/2,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ff2ec4';
  ctx.globalAlpha = 0.6+0.4*Math.sin(t*10);
  ctx.fillRect(-4,-3,8,6);
  ctx.globalAlpha=1;
  ctx.restore();
}
function drawEnemies(){
  for(const e of game.enemies){
    if(e.type==='scuttler') drawEnemyScuttler(e);
    else drawEnemyDrone(e);
  }
}

function drawBoss(){
  const b = game.boss;
  if(!b) return;
  if(b.dead && b.deadTimer<=0) return;
  const flash = b.invuln>0 && Math.floor(performance.now()/80)%2===0;
  ctx.save();
  ctx.globalAlpha = b.dead ? Math.max(0,b.deadTimer/1.2) : 1;
  ctx.fillStyle = flash ? '#ffffff' : '#402045';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = '#ff4d5e';
  ctx.fillRect(b.x+b.w/2-10, b.y+14, 20, 12);
  ctx.fillStyle = '#1a0a1e';
  ctx.fillRect(b.x+8, b.y+b.h-10, 10, 10);
  ctx.fillRect(b.x+b.w-18, b.y+b.h-10, 10, 10);
  ctx.restore();
  if(!b.dead){
    ctx.fillStyle='#0a0f1c';
    ctx.fillRect(b.x, b.y-14, b.w, 6);
    ctx.fillStyle='#ff4d5e';
    ctx.fillRect(b.x, b.y-14, b.w*(b.hp/b.maxHp), 6);
  }
}

function drawProjectiles(){
  for(const pr of game.projectiles){
    ctx.fillStyle = pr.fromPlayer ? '#00e5ff' : '#ff4d5e';
    ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
  }
}

function drawParticles(){
  for(const pt of game.particles){
    const a = clamp(pt.life/pt.maxLife,0,1);
    ctx.globalAlpha = a;
    if(pt.type==='dot'){
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x-pt.size/2, pt.y-pt.size/2, pt.size, pt.size);
    } else {
      ctx.font = "8px 'Press Start 2P'";
      ctx.fillStyle = pt.color;
      ctx.textAlign = 'center';
      ctx.fillText(pt.text, pt.x, pt.y);
    }
    ctx.globalAlpha = 1;
  }
}

function drawGoal(){
  const g = game.level.goal;
  if(!g) return;
  const t = performance.now()/1000;
  ctx.fillStyle = '#0c1120';
  ctx.fillRect(g.x-2, g.y-90, 4, 90);
  const pulse = 0.6+0.4*Math.sin(t*4);
  ctx.fillStyle = game.goalReached ? '#39ff9e' : `rgba(0,229,255,${pulse})`;
  ctx.beginPath(); ctx.arc(g.x, g.y-96, 10, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha=0.3;
  ctx.beginPath(); ctx.arc(g.x, g.y-96, 18, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
}

function drawPlayer(p){
  if(game.state==='playing' && p.hurtTimer>0 && Math.floor(performance.now()/80)%2===0) return;
  const t = performance.now()/1000;
  ctx.save();
  ctx.translate(p.x+p.w/2, p.y+p.h/2);
  ctx.scale(p.facing<0?-1:1, 1);
  ctx.translate(-p.w/2, -p.h/2);

  // Player 2 is recolored magenta (matching the key art) so co-op is easy to read at a glance.
  let bodyColor = p.id===2 ? '#e3c9dc' : '#c9d6e3';
  let accent = p.id===2 ? '#ff2ec4' : '#00e5ff';
  if(p.power>=2) accent = p.id===2 ? '#ffc24b' : '#ff2ec4';
  if(p.starTimer>0){ const hue=(t*260)%360; bodyColor=`hsl(${hue},80%,70%)`; accent=`hsl(${(hue+140)%360},100%,60%)`; }

  const runCycle = (!p.onGround) ? 0 : Math.sin(t*14)*3;
  // legs
  ctx.fillStyle = '#5c6b82';
  ctx.fillRect(3, p.h-7, 6, 7+Math.max(0,runCycle));
  ctx.fillRect(p.w-9, p.h-7, 6, 7-Math.min(0,runCycle));
  // body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(1, p.h*0.25, p.w-2, p.h*0.6);
  // head/visor band
  ctx.fillStyle = '#232b3d';
  ctx.fillRect(1, p.h*0.05, p.w-2, p.h*0.28);
  // eye
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.7+0.3*Math.sin(t*6);
  ctx.fillRect(p.w*0.55, p.h*0.14, 6, 6);
  ctx.globalAlpha=1;
  // antenna
  ctx.strokeStyle = '#5c6b82'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(p.w*0.5,p.h*0.05); ctx.lineTo(p.w*0.5,-3); ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(p.w*0.5,-4,2,0,Math.PI*2); ctx.fill();
  // shoulder pads if big
  if(p.power>=1){
    ctx.fillStyle = accent;
    ctx.fillRect(-2, p.h*0.28, 5, 8);
    ctx.fillRect(p.w-3, p.h*0.28, 5, 8);
  }
  // cannon if plasma
  if(p.power>=2){
    ctx.fillStyle = '#3a2030';
    ctx.fillRect(p.w-4, p.h*0.42, 10, 5);
  }
  ctx.restore();
}

export function render(){
  ctx.clearRect(0,0,CW,CH);
  if(!game.level){
    const g = ctx.createLinearGradient(0,0,0,CH);
    g.addColorStop(0,'#0d1430'); g.addColorStop(1,'#05060d');
    ctx.fillStyle = g; ctx.fillRect(0,0,CW,CH);
    return;
  }
  drawBackground();
  const shakeX = game.camera.shake>0 ? (Math.random()-0.5)*6 : 0;
  const shakeY = game.camera.shake>0 ? (Math.random()-0.5)*6 : 0;
  ctx.save();
  ctx.translate(-game.camera.x+shakeX, shakeY);
  drawSolids();
  drawBlocks();
  drawHazardsStrips();
  drawTurrets();
  drawGoal();
  drawShards();
  drawItems();
  drawEnemies();
  drawBoss();
  drawProjectiles();
  drawParticles();
  activePlayers().forEach(drawPlayer);
  ctx.restore();
}
