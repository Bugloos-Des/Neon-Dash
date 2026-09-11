/* =========================================================
   RENDER — all draw* functions + render(). Also owns the
   optional SVG sprite loading/drawing (a pure rendering
   concern: everything here is either drawn procedurally or,
   if the matching file exists, replaced by a sprite image).
   Imports gamestate.js, config.js, utils.js, canvas.js.

   Deviation: render(keys) takes the live input state as a
   parameter (mirrors updatePlayerPhysics in physics.js) since
   render.js may not import input.js under the layering rules;
   main.js passes `keys` through each frame.
   ========================================================= */
import { game } from './gamestate.js';
import { CW, CH, GROUND_Y, DEATH_TIME } from './config.js';
import { clamp } from './utils.js';
import { ctx } from './canvas.js';

/* =========================================================
   OPTIONAL SVG SPRITES
   Drop matching files into assets/ (see assets/README.md for exact
   names, sizing and anchor conventions) to replace the built-in
   vector-drawn look. Anything not present yet just falls back to the
   procedural drawing right below its usage -- nothing breaks while
   assets are added incrementally.
   ========================================================= */
const SPRITES = {};
function sprite(name, path){
  const entry = { img:new Image(), ready:false };
  entry.img.onload = ()=>{ entry.ready = true; };
  entry.img.onerror = ()=>{ entry.ready = false; };
  entry.img.src = path;
  SPRITES[name] = entry;
}
[
  ['viking-idle','/assets/viking-idle.svg'],
  ['viking-walk1','/assets/viking-walk1.svg'],
  ['viking-walk2','/assets/viking-walk2.svg'],
  ['viking-jump','/assets/viking-jump.svg'],
  ['viking-shoot','/assets/viking-shoot.svg'],
  ['viking-hurt','/assets/viking-hurt.svg'],
  ['viking-dead','/assets/viking-dead.svg'],
  ['arrow','/assets/arrow.svg'],
  ['bow-icon','/assets/bow-icon.svg'],
  ['gem','/assets/gem.svg'],
  ['coin','/assets/coin.svg'],
  ['chest','/assets/chest.svg'],
  ['crate','/assets/crate.svg'],
  ['bomb','/assets/bomb.svg'],
].forEach(([name,path])=>sprite(name,path));

// Draws a loaded sprite anchored by its bottom-center point (for
// characters: place their feet at (footX,footY) in the art), scaled to
// a target height with aspect ratio preserved. Returns false (drawing
// nothing) if the sprite isn't loaded, so the caller can fall back.
function drawSpriteAnchored(name, footX, footY, targetH, flip){
  const s = SPRITES[name];
  if(!s || !s.ready || !s.img.naturalHeight) return false;
  const scale = targetH / s.img.naturalHeight;
  const w = s.img.naturalWidth*scale;
  ctx.save();
  ctx.translate(footX, footY);
  if(flip) ctx.scale(-1,1);
  ctx.drawImage(s.img, -w/2, -targetH, w, targetH);
  ctx.restore();
  return true;
}
// Draws a loaded sprite fit within maxSize (longest side), centered at
// (cx,cy) -- for small symmetric icons (gems, coins, blocks) and, with
// flip:true, direction-facing shots like the arrow. Returns false if
// not loaded, so the caller can fall back.
function drawSpriteFit(name, cx, cy, maxSize, flip){
  const s = SPRITES[name];
  if(!s || !s.ready || !s.img.naturalWidth) return false;
  const scale = maxSize / Math.max(s.img.naturalWidth, s.img.naturalHeight);
  const w = s.img.naturalWidth*scale, h = s.img.naturalHeight*scale;
  ctx.save();
  ctx.translate(cx,cy);
  if(flip) ctx.scale(-1,1);
  ctx.drawImage(s.img, -w/2, -h/2, w, h);
  ctx.restore();
  return true;
}

const THEMES = {
  nebula:  {sky:['#201038','#0a0714'], grid:'#2c1a4a', accent:'#ffb347', accent2:'#a76bff'},
  caves:   {sky:['#0a0616','#14091f'], grid:'#1c1030', accent:'#3dffc0', accent2:'#ffb347'},
  belt:    {sky:['#140a24','#1e0f34'], grid:'#2a1846', accent:'#a76bff', accent2:'#ffb347'},
  reactor: {sky:['#200a10','#2a0e0e'], grid:'#3c1620', accent:'#ff6b81', accent2:'#ffb347'},
};

function drawBackground(){
  const th = THEMES[game.level.theme];
  const g = ctx.createLinearGradient(0,0,0,CH);
  g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0,0,CW,CH);

  // starfield
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

  // drifting asteroid silhouettes
  ctx.fillStyle = th.grid;
  for(let i=0;i<6;i++){
    const bx = (i*260 - game.camera.x*0.3) % (CW+300);
    const bxw = ((bx%(CW+300))+CW+300)%(CW+300)-150;
    const hgt = 40 + (i%3)*22;
    ctx.fillRect(bxw, CH-95-hgt, 46, hgt+95);
  }

  // horizon glow lines
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
      ctx.fillStyle = 'rgba(255,107,129,0.25)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = '#ff6b81'; ctx.lineWidth=2;
      ctx.strokeRect(s.x+1, s.y+1, s.w-2, s.h-2);
      continue;
    }
    const topY = s.y;
    ctx.fillStyle = '#140c22';
    ctx.fillRect(s.x, topY, s.w, Math.min(s.h, CH-topY+40));
    ctx.fillStyle = th.accent;
    ctx.fillRect(s.x, topY, s.w, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for(let gx=s.x; gx<s.x+s.w; gx+=20) ctx.fillRect(gx, topY+6, 1, Math.min(18,s.h-6));
  }
}

// Glossy treasure-chest block: wood-brown base, gold trim bands, and a
// pulsing gold lock while unused; dulls to a spent, opened look once used.
function drawChestBlock(b, y){
  const w=b.w, h=b.h, x=b.x;
  const lidH = h*0.4;
  const wood = ctx.createLinearGradient(x,y,x,y+h);
  if(b.used){ wood.addColorStop(0,'#3a2a20'); wood.addColorStop(1,'#241812'); }
  else { wood.addColorStop(0,'#a5642c'); wood.addColorStop(1,'#6b3d18'); }
  ctx.fillStyle = wood;
  ctx.fillRect(x+1,y+1,w-2,h-2);
  // gold trim bands
  ctx.fillStyle = b.used ? '#5a4a2a' : '#ffcf6b';
  ctx.fillRect(x+1,y+lidH-2,w-2,3);
  ctx.fillRect(x+2,y+2,3,h-4); ctx.fillRect(x+w-5,y+2,3,h-4);
  // lid highlight
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x+2,y+2,w-4,3);
  if(!b.used){
    const pulse = 0.5+0.5*Math.sin(performance.now()/220);
    ctx.save();
    ctx.translate(x+w/2, y+lidH+ (h-lidH)/2);
    const g = ctx.createRadialGradient(0,0,0.5,0,0,5);
    g.addColorStop(0,'#fff3d0'); g.addColorStop(1,'#c98a1c');
    ctx.globalAlpha = 0.7+0.3*pulse;
    ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
    ctx.globalAlpha=1;
    ctx.restore();
  }
}
// Glossy stone crate block: cool grey slab with a lighter bevel and
// crossed hammer-dent planks, in the style of a chunky cartoon prop.
function drawCrateBlock(b, y){
  const w=b.w, h=b.h, x=b.x;
  const stone = ctx.createLinearGradient(x,y,x,y+h);
  stone.addColorStop(0,'#8a7d92'); stone.addColorStop(1,'#4a3f52');
  ctx.fillStyle = stone; ctx.fillRect(x+1,y+1,w-2,h-2);
  ctx.strokeStyle = '#2c2432'; ctx.lineWidth=1.5; ctx.strokeRect(x+1.5,y+1.5,w-3,h-3);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(x+3,y+3,w-6,3);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(x+5,y+h-5); ctx.lineTo(x+w-5,y+5); ctx.stroke();
}
function drawBlocks(){
  for(const b of game.blocks){
    const off = b.bump>0 ? -Math.sin((0.15-b.bump)/0.15*Math.PI)*4 : 0;
    const y = b.y+off;
    if(b.kind==='core'){
      if(drawSpriteFit('chest', b.x+b.w/2, y+b.h/2, b.w*1.15)) continue;
      drawChestBlock(b, y);
    } else {
      if(drawSpriteFit('crate', b.x+b.w/2, y+b.h/2, b.w*1.15)) continue;
      drawCrateBlock(b, y);
    }
  }
}

function drawHazardsStrips(){
  const t = performance.now()/1000;
  for(const h of game.hazardsZones){
    const glow = 0.5+0.5*Math.sin(t*8);
    ctx.fillStyle = `rgba(255,107,129,${0.5+0.3*glow})`;
    ctx.fillRect(h.x,h.y,h.w,h.h);
    ctx.fillStyle = '#ffb347';
    for(let gx=h.x; gx<h.x+h.w; gx+=10) ctx.fillRect(gx,h.y-2,4,2);
  }
}

function drawVents(){
  for(const t of game.vents){
    ctx.fillStyle = '#241a2e';
    ctx.fillRect(t.x, GROUND_Y-6, 28, 10);
    const bodyColor = t.state==='extended' ? '#ff6b81' : (t.state==='rising' ? '#ffb347' : '#463a56');
    ctx.fillStyle = bodyColor;
    ctx.fillRect(t.x+6, t.y, 16, t.h);
    ctx.fillStyle = '#a76bff';
    ctx.fillRect(t.x+11, t.y, 6, 4);
  }
}

// Glossy gem: a diamond silhouette with a radial highlight and a bright
// sparkle facet, in the vein of a cartoon jewel icon — drawn as vector
// shapes so it stays crisp at any zoom, no image asset needed.
function drawGem(size, lightColor, midColor, darkColor){
  const r = size;
  ctx.beginPath();
  ctx.moveTo(0,-r); ctx.lineTo(r*0.9,-r*0.15); ctx.lineTo(0,r); ctx.lineTo(-r*0.9,-r*0.15);
  ctx.closePath();
  const g = ctx.createLinearGradient(-r,-r,r,r);
  g.addColorStop(0, lightColor); g.addColorStop(0.5, midColor); g.addColorStop(1, darkColor);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = darkColor; ctx.lineWidth=0.75; ctx.stroke();
  // facet line + sparkle highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth=0.75;
  ctx.beginPath(); ctx.moveTo(-r*0.9,-r*0.15); ctx.lineTo(r*0.9,-r*0.15); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.ellipse(-r*0.32,-r*0.4,r*0.22,r*0.12,-0.5,0,Math.PI*2); ctx.fill();
}
function drawShards(){
  const t = performance.now()/1000;
  for(const s of game.shards){
    if(s.collected) continue;
    const bob = Math.sin(t*3 + s.x)*3;
    if(drawSpriteFit('gem', s.x, s.y+bob, 13)) continue;
    ctx.save();
    ctx.translate(s.x, s.y+bob);
    ctx.rotate(Math.sin(t*1.5 + s.x)*0.35);
    drawGem(5.5, '#e8fff8', '#3dffc0', '#0a8f68');
    ctx.restore();
  }
}

// Glossy round token (star-coin style): dark rim, radial gold gradient
// body, a bright specular highlight, and an embossed glyph on top.
function drawCoinToken(cx, cy, r, glyph, ringColor, faceLight, faceDark){
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle = ringColor; ctx.fill();
  const g = ctx.createRadialGradient(cx-r*0.3,cy-r*0.35,r*0.1, cx,cy,r*0.95);
  g.addColorStop(0, faceLight); g.addColorStop(1, faceDark);
  ctx.beginPath(); ctx.arc(cx,cy,r*0.8,0,Math.PI*2);
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.ellipse(cx-r*0.28,cy-r*0.32,r*0.28,r*0.14,-0.6,0,Math.PI*2); ctx.fill();
  if(glyph){
    ctx.fillStyle = ringColor; ctx.globalAlpha=0.85;
    ctx.font = `${Math.round(r*1.1)}px 'Press Start 2P'`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(glyph, cx, cy+1);
    ctx.globalAlpha=1;
  }
}
// Small glossy bow-and-arrow icon (curved wood stave + string + nocked
// arrow) -- the ranged-attack pickup.
function drawBowIcon(cx, cy, s){
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.PI/2);
  const wood = ctx.createLinearGradient(-s,0,s,0);
  wood.addColorStop(0,'#a5642c'); wood.addColorStop(1,'#6b3d18');
  ctx.strokeStyle = wood; ctx.lineWidth = s*0.22; ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(0,0,s,-1.1,1.1); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = s*0.09;
  ctx.beginPath(); ctx.moveTo(0,-s*0.86); ctx.lineTo(-s*0.32,0); ctx.lineTo(0,s*0.86); ctx.stroke();
  ctx.strokeStyle = '#c9c9d6'; ctx.lineWidth = s*0.14;
  ctx.beginPath(); ctx.moveTo(-s*0.32,0); ctx.lineTo(s*0.55,0); ctx.stroke();
  ctx.fillStyle = '#e8e8f0';
  ctx.beginPath(); ctx.moveTo(s*0.55,-s*0.16); ctx.lineTo(s*0.85,0); ctx.lineTo(s*0.55,s*0.16); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawItems(){
  const t = performance.now()/1000;
  for(const it of game.items){
    if(it.collected) continue;
    const bob = it.spawning ? 0 : Math.sin(t*3+it.x)*2;
    const x = it.x, y = it.y+bob;
    if(it.type==='boost'){
      // gold star-coin token: grants the double-jump boost
      if(drawSpriteFit('coin', x+9, y+9, 20)) continue;
      drawCoinToken(x+9, y+9, 9, '★', '#8a5a10', '#fff3d0', '#ffb347');
    } else if(it.type==='nova'){
      // bow token: grants the ranged arrow shot
      if(drawSpriteFit('bow-icon', x+9, y+9+Math.sin(t*4)*1.5, 20)) continue;
      ctx.save(); ctx.translate(0, Math.sin(t*4)*1.5);
      drawBowIcon(x+9, y+9, 8);
      ctx.restore();
    } else if(it.type==='shield'){
      // spinning gem: grants temporary invincibility
      if(drawSpriteFit('gem', x+9, y+9, 20)) continue;
      ctx.save(); ctx.translate(x+9,y+9); ctx.rotate(t*3);
      drawGem(9, '#fff0f5', '#ff6b81', '#8a1c30');
      ctx.restore();
    }
  }
}

// Rolling bomb-critter: a glossy round body with a rim-light, a lit fuse
// spark, and two cartoon eyes -- rolls back and forth on patrol.
function drawEnemyCrawler(e){
  const sq = e.alive ? 1 : Math.max(0.15, e.squish/0.22);
  const t = performance.now()/1000;
  if(sq>0.9 && drawSpriteFit('bomb', e.x+e.w/2, e.y+e.h/2, e.w*1.3)) return;
  ctx.save();
  ctx.translate(e.x+e.w/2, e.y+e.h);
  ctx.scale(1, sq);
  ctx.translate(0, -e.h/2);
  ctx.rotate(e.alive ? (e.x*0.05) : 0);
  const r = e.w/2-1;
  const g = ctx.createRadialGradient(-r*0.3,-r*0.35,r*0.1, 0,0,r);
  g.addColorStop(0,'#5c4a78'); g.addColorStop(0.6,'#2a1a44'); g.addColorStop(1,'#140c22');
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(-r*0.35,-r*0.4,r*0.32,r*0.16,-0.6,0,Math.PI*2); ctx.fill();
  // fuse
  ctx.strokeStyle = '#7a5a34'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0,-r); ctx.quadraticCurveTo(r*0.3,-r*1.5,r*0.1,-r*1.8); ctx.stroke();
  const flick = 0.6+0.4*Math.sin(t*20);
  ctx.fillStyle = `rgba(255,${140+Math.floor(80*flick)},60,${flick})`;
  ctx.beginPath(); ctx.arc(r*0.1,-r*1.8,2.2,0,Math.PI*2); ctx.fill();
  // eyes
  if(e.alive){
    ctx.fillStyle = '#ff6b81';
    ctx.beginPath(); ctx.arc(-r*0.3,-r*0.1,2.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(r*0.3,-r*0.1,2.2,0,Math.PI*2); ctx.fill();
  } else {
    ctx.strokeStyle = '#160e22'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-r*0.4,-r*0.2); ctx.lineTo(-r*0.15,0.2); ctx.moveTo(-r*0.15,-r*0.2); ctx.lineTo(-r*0.4,0.2); ctx.stroke();
  }
  ctx.restore();
}
function drawEnemyFloater(e){
  const t=performance.now()/1000;
  ctx.save();
  ctx.translate(e.x+e.w/2, e.y+e.h/2);
  const sq = e.alive?1:Math.max(0.15,e.squish/0.22);
  ctx.scale(1,sq);
  const g = ctx.createRadialGradient(-e.w*0.15,-e.h*0.2,1, 0,0,e.w/2);
  g.addColorStop(0,'#5c4a78'); g.addColorStop(1,'#2a1a44');
  ctx.beginPath(); ctx.ellipse(0,0,e.w/2,e.h/2,0,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.ellipse(-e.w*0.18,-e.h*0.22,e.w*0.22,e.h*0.12,-0.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#a76bff';
  ctx.globalAlpha = 0.6+0.4*Math.sin(t*10);
  ctx.beginPath(); ctx.ellipse(0,0,4,3,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  ctx.restore();
}
function drawEnemies(){
  for(const e of game.enemies){
    if(e.type==='crawler') drawEnemyCrawler(e);
    else drawEnemyFloater(e);
  }
}

function drawBoss(){
  const b = game.boss;
  if(!b) return;
  if(b.dead && b.deadTimer<=0) return;
  const flash = b.invuln>0 && Math.floor(performance.now()/80)%2===0;
  ctx.save();
  ctx.globalAlpha = b.dead ? Math.max(0,b.deadTimer/1.2) : 1;
  ctx.fillStyle = flash ? '#ffffff' : '#3a1a3e';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = '#ff6b81';
  ctx.fillRect(b.x+b.w/2-10, b.y+14, 20, 12);
  ctx.fillStyle = '#160a1e';
  ctx.fillRect(b.x+8, b.y+b.h-10, 10, 10);
  ctx.fillRect(b.x+b.w-18, b.y+b.h-10, 10, 10);
  ctx.restore();
  if(!b.dead){
    ctx.fillStyle='#140c22';
    ctx.fillRect(b.x, b.y-14, b.w, 6);
    ctx.fillStyle='#ff6b81';
    ctx.fillRect(b.x, b.y-14, b.w*(b.hp/b.maxHp), 6);
  }
}

function drawProjectiles(){
  for(const pr of game.projectiles){
    if(pr.fromPlayer){
      if(drawSpriteFit('arrow', pr.x+pr.w/2, pr.y+pr.h/2, pr.w*2.2, pr.vx<0)) continue;
      // arrow: wooden shaft, grey head, feather fletching -- oriented
      // to the direction it's actually flying
      ctx.save();
      ctx.translate(pr.x+pr.w/2, pr.y+pr.h/2);
      if(pr.vx<0) ctx.scale(-1,1);
      ctx.strokeStyle = '#7a4d0d'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-pr.w/2,0); ctx.lineTo(pr.w/2-2,0); ctx.stroke();
      ctx.fillStyle = '#c9c9d6';
      ctx.beginPath(); ctx.moveTo(pr.w/2-2,-2); ctx.lineTo(pr.w/2+3,0); ctx.lineTo(pr.w/2-2,2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.moveTo(-pr.w/2,-1.5); ctx.lineTo(-pr.w/2-3,-2.5); ctx.lineTo(-pr.w/2+1,0); ctx.lineTo(-pr.w/2-3,2.5); ctx.lineTo(-pr.w/2,1.5); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#ff6b81';
      ctx.beginPath(); ctx.arc(pr.x+pr.w/2, pr.y+pr.h/2, pr.w/2, 0, Math.PI*2); ctx.fill();
    }
  }
}

function drawParticles(){
  for(const pt of game.particles){
    const a = clamp(pt.life/pt.maxLife,0,1);
    ctx.globalAlpha = a;
    if(pt.type==='dot'){
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x-pt.size/2, pt.y-pt.size/2, pt.size, pt.size);
    } else if(pt.type==='soul'){
      // small ghostly silhouette drifting upward -- a nod to a "spirit
      // departing" moment on defeat, drawn as plain shapes (no assets)
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.fillStyle = 'rgba(240,245,255,0.85)';
      ctx.beginPath(); ctx.arc(0,0,5,Math.PI,0); ctx.lineTo(4,8); ctx.quadraticCurveTo(0,5,-4,8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,235,180,0.9)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.ellipse(0,-7,4,1.6,0,0,Math.PI*2); ctx.stroke();
      ctx.restore();
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
  ctx.fillStyle = '#140c22';
  ctx.fillRect(g.x-2, g.y-90, 4, 90);
  const pulse = 0.6+0.4*Math.sin(t*4);
  const cx=g.x, cy=g.y-96;
  ctx.globalAlpha=0.28;
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI*2);
  ctx.fillStyle = game.goalReached ? '#3dffc0' : '#ffb347';
  ctx.fill();
  ctx.globalAlpha=1;
  // glossy trophy-orb beacon
  const light = game.goalReached ? '#e8fff8' : '#fff3d0';
  const mid = game.goalReached ? '#3dffc0' : '#ffb347';
  const dark = game.goalReached ? '#0a8f68' : '#8a5a10';
  const gr = ctx.createRadialGradient(cx-3,cy-3,1, cx,cy,10*(0.9+0.1*pulse));
  gr.addColorStop(0,light); gr.addColorStop(0.6,mid); gr.addColorStop(1,dark);
  ctx.beginPath(); ctx.arc(cx, cy, 10*(0.9+0.1*pulse), 0, Math.PI*2); ctx.fillStyle=gr; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.ellipse(cx-3,cy-4,3,1.6,-0.6,0,Math.PI*2); ctx.fill();
}

// Player character: a small Viking hopper. Built from plain canvas
// shapes/gradients (helmet, horns, beard, tunic, cape, bow) -- an
// original reskin inspired by a reference sprite sheet's silhouette and
// palette, not traced or copied from it. Distinct poses for idle/run,
// airborne, drawing the bow, taking a hit, and being knocked out.
function drawPlayer(keys){
  const p = game.player;
  const t = performance.now()/1000;
  const w = p.w, h = p.h;
  const airborne = !p.onGround;
  const shooting = p.shootPoseTimer>0;
  const hurt = p.hurtTimer>0;
  const dying = game.state==='dying';

  // try an SVG sprite for the current pose first; only fall back to the
  // procedural vector Viking below if that file hasn't been added yet
  let poseName = 'viking-idle';
  if(dying) poseName = 'viking-dead';
  else if(shooting) poseName = 'viking-shoot';
  else if(airborne) poseName = 'viking-jump';
  else if(hurt) poseName = 'viking-hurt';
  else if(keys.left||keys.right){
    const w1=SPRITES['viking-walk1'], w2=SPRITES['viking-walk2'];
    if(w1.ready && w2.ready) poseName = (Math.floor(t*7)%2===0) ? 'viking-walk1' : 'viking-walk2';
    else if(w1.ready) poseName = 'viking-walk1';
  }
  if(drawSpriteAnchored(poseName, p.x+p.w/2, p.y+p.h, p.h*2.3, p.facing<0)) return;

  ctx.save();
  ctx.translate(p.x+p.w/2, p.y+p.h/2);
  ctx.scale(p.facing<0?-1:1, 1);

  if(dying){
    // knocked out: tumble in place while the death-arc physics carries
    // the body up and back down (see updateDying)
    ctx.rotate((DEATH_TIME - Math.max(0,p.deathTimer)) * 6);
  }
  ctx.translate(-w/2, -h/2);

  // palette: green tunic + gold cape by default; bow unlocked -> violet
  // cape trim; shield active -> shifting rainbow; hurt/dying -> red flash
  let tunic='#3f6b3a', tunicDark='#274a24', cape='#ffb347', capeDark='#c97f16';
  if(p.novaCharged){ cape='#a76bff'; capeDark='#6c2fc9'; }
  if(p.novaTimer>0){ const hue=(t*260)%360; tunic=`hsl(${hue},55%,42%)`; cape=`hsl(${(hue+140)%360},90%,65%)`; }
  if((hurt || dying) && Math.floor(t*10)%2===0){ tunic='#a83030'; tunicDark='#6b1c1c'; cape='#ff6b6b'; capeDark='#b33a3a'; }

  const runCycle = (airborne||shooting||dying) ? 0 : Math.sin(t*14)*3;

  // cape, drawn first so it sits behind the body
  ctx.fillStyle = cape;
  ctx.beginPath();
  if(airborne||dying){
    ctx.moveTo(w*0.34,h*0.3); ctx.quadraticCurveTo(-w*0.55,h*0.05,-w*0.3,h*0.8); ctx.lineTo(w*0.28,h*0.55);
  } else {
    const flap = Math.sin(t*8)*2;
    ctx.moveTo(w*0.3,h*0.3); ctx.quadraticCurveTo(-w*0.12,h*0.5,-w*0.02+flap,h*0.95); ctx.lineTo(w*0.34,h*0.85);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = capeDark; ctx.globalAlpha=0.4;
  ctx.beginPath(); ctx.moveTo(w*0.32,h*0.34); ctx.lineTo(-w*0.06,h*0.6); ctx.lineTo(w*0.08,h*0.66); ctx.closePath(); ctx.fill();
  ctx.globalAlpha=1;

  // boots
  ctx.fillStyle = '#4a3320';
  const legLift = (airborne||dying) ? 4 : 0;
  ctx.fillRect(w*0.18, h-7-legLift, 6, 7+Math.max(0,runCycle));
  ctx.fillRect(w*0.6, h-7-legLift, 6, 7-Math.min(0,runCycle));

  // tunic (trapezoid torso) with a simple vertical shading gradient
  const bodyGrad = ctx.createLinearGradient(0,h*0.32,0,h*0.85);
  bodyGrad.addColorStop(0,tunic); bodyGrad.addColorStop(1,tunicDark);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(w*0.15,h*0.32); ctx.lineTo(w*0.85,h*0.32); ctx.lineTo(w*0.78,h*0.85); ctx.lineTo(w*0.22,h*0.85);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a4d0d';
  ctx.fillRect(w*0.2,h*0.6,w*0.6,3.5);

  // skin (arms) -- pose depends on state
  ctx.fillStyle = '#e0a878';
  if(dying){
    ctx.fillRect(w*0.6,h*0.5,6,8);
    ctx.fillRect(w*0.05,h*0.5,6,8);
  } else if(shooting){
    ctx.fillRect(w*0.6,h*0.36,5,10);   // bow-arm, bent, holding the grip
    ctx.fillRect(w*0.0,h*0.4,7,6);     // draw-arm pulled back to the string
  } else if(airborne){
    ctx.fillRect(w*0.62,h*0.26,5,12);  // one arm thrown up mid-hop
    ctx.fillRect(w*0.05,h*0.3,5,10);
  } else {
    ctx.fillRect(w*0.62,h*0.38,5,10+Math.max(0,-runCycle)*0.4);
    ctx.fillRect(w*0.12,h*0.38,5,10+Math.max(0,runCycle)*0.4);
  }

  // head + beard
  ctx.fillStyle = '#e0a878';
  ctx.beginPath(); ctx.arc(w*0.5,h*0.2,w*0.28,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#a85a2a';
  ctx.beginPath();
  ctx.moveTo(w*0.27,h*0.2);
  ctx.quadraticCurveTo(w*0.5,h*0.44,w*0.73,h*0.2);
  ctx.quadraticCurveTo(w*0.6,h*0.3,w*0.5,h*0.3);
  ctx.quadraticCurveTo(w*0.4,h*0.3,w*0.27,h*0.2);
  ctx.closePath(); ctx.fill();

  // helmet + horns
  ctx.fillStyle = '#8f97a8';
  ctx.beginPath(); ctx.arc(w*0.5,h*0.14,w*0.3,Math.PI,0); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.arc(w*0.4,h*0.1,w*0.1,Math.PI,0); ctx.fill();
  ctx.fillStyle = '#e8dfc8';
  ctx.beginPath();
  ctx.moveTo(w*0.22,h*0.14); ctx.quadraticCurveTo(w*0.02,-h*0.05,w*0.08,-h*0.18); ctx.quadraticCurveTo(w*0.18,h*0.02,w*0.3,h*0.1);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w*0.78,h*0.14); ctx.quadraticCurveTo(w*0.98,-h*0.05,w*0.92,-h*0.18); ctx.quadraticCurveTo(w*0.82,h*0.02,w*0.7,h*0.1);
  ctx.closePath(); ctx.fill();

  // eye
  ctx.fillStyle = dying ? 'transparent' : '#241608';
  ctx.beginPath(); ctx.arc(w*0.62,h*0.2,1.6,0,Math.PI*2); ctx.fill();
  if(dying){
    ctx.strokeStyle='#241608'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(w*0.56,h*0.16); ctx.lineTo(w*0.68,h*0.24); ctx.moveTo(w*0.68,h*0.16); ctx.lineTo(w*0.56,h*0.24); ctx.stroke();
  }

  // bow: carried once the ranged pickup is found, drawn to full draw
  // while actively shooting
  if(p.novaCharged && !dying){
    ctx.save();
    ctx.translate(w*0.86, h*0.42);
    const draw = shooting ? 6 : 2;
    ctx.strokeStyle = '#7a4d0d'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,9,-1.15,1.15); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth=0.75;
    ctx.beginPath(); ctx.moveTo(0,-8.6); ctx.lineTo(-draw,0); ctx.lineTo(0,8.6); ctx.stroke();
    if(shooting){
      ctx.strokeStyle = '#c9c9d6'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-draw,0); ctx.lineTo(-draw-6,0); ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

export function render(keys){
  ctx.clearRect(0,0,CW,CH);
  if(!game.level){
    const g = ctx.createLinearGradient(0,0,0,CH);
    g.addColorStop(0,'#201038'); g.addColorStop(1,'#0a0714');
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
  drawVents();
  drawGoal();
  drawShards();
  drawItems();
  drawEnemies();
  drawBoss();
  drawProjectiles();
  drawParticles();
  if(game.player) drawPlayer(keys);
  ctx.restore();
}
