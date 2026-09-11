/* =========================================================
   PHYSICS — collision resolution + per-frame physics/AI
   updates. Imports gamestate.js, config.js, utils.js,
   items.js, particles.js, audio.js, run.js.

   Deviation from the template layering note: `keys` (the
   live input state) lives in input.js, and input.js sits
   above physics.js in the dependency graph, so physics.js
   cannot import it directly. Instead updatePlayerPhysics
   takes `keys` as a parameter — update.js (which may import
   input.js) passes it through each frame. This keeps the
   layering acyclic without adding input.js as a dependency
   here.
   ========================================================= */
import { game } from './gamestate.js';
import {
  CH, GROUND_Y, GRAVITY, MAX_FALL, MOVE_ACCEL, MAX_SPEED, FRICTION,
  JUMP_VELOCITY, JUMP_CUT, AIR_JUMP_VELOCITY, COYOTE_TIME, JUMP_BUFFER,
  FLARE_SPEED, FLARE_LIFE, FLARE_COOLDOWN
} from './config.js';
import { rectsOverlap, clamp } from './utils.js';
import { hitBlock, collectItem } from './items.js';
import { spawnParticles } from './particles.js';
import { SFX } from './audio.js';
import { startDeath, stompEnemy, bossHit, damagePlayer, reachGoal } from './run.js';

export function resolveEntityCollisions(e, solids, dt){
  e.x += e.vx*dt;
  for(const s of solids){
    if(rectsOverlap(e,s)){
      if(e.vx>0) e.x = s.x - e.w;
      else if(e.vx<0) e.x = s.x + s.w;
      e.vx = 0;
    }
  }
  e.y += e.vy*dt;
  e.onGround = false;
  for(const s of solids){
    if(rectsOverlap(e,s)){
      if(e.vy>0){ e.y = s.y - e.h; e.vy=0; e.onGround=true; }
      else if(e.vy<0){ e.y = s.y + s.h; e.vy=0; if(s.type==='block') hitBlock(s); }
    }
  }
}

export function updatePlayerPhysics(dt, keys){
  const p = game.player;
  let dir = 0;
  if(keys.left) dir -= 1;
  if(keys.right) dir += 1;
  const cap = MAX_SPEED * (p.novaTimer>0 ? 1.3 : 1);
  if(dir!==0){ p.vx += dir*MOVE_ACCEL*dt; p.facing = dir; }
  else {
    if(p.vx>0) p.vx = Math.max(0, p.vx-FRICTION*dt);
    else if(p.vx<0) p.vx = Math.min(0, p.vx+FRICTION*dt);
  }
  p.vx = clamp(p.vx, -cap, cap);

  if(p.onGround){ p.coyote = COYOTE_TIME; p.airJumpsLeft = p.boosted ? 1 : 0; }
  else p.coyote = Math.max(0, p.coyote-dt);

  if(keys.jumpPressed){ p.jumpBuffer = JUMP_BUFFER; keys.jumpPressed=false; }
  else { p.jumpBuffer = Math.max(0, p.jumpBuffer-dt); }

  if(p.jumpBuffer>0){
    if(p.coyote>0){
      p.vy = JUMP_VELOCITY; p.onGround=false; p.coyote=0; p.jumpBuffer=0; SFX.jump();
    } else if(p.airJumpsLeft>0){
      p.vy = AIR_JUMP_VELOCITY; p.airJumpsLeft--; p.jumpBuffer=0; SFX.airjump();
      spawnParticles(p.x+p.w/2, p.y+p.h, '#ffb347', 6);
    }
  }
  if(keys.jumpReleased){ if(p.vy<0) p.vy *= JUMP_CUT; keys.jumpReleased=false; }

  p.vy += GRAVITY*dt; if(p.vy>MAX_FALL) p.vy = MAX_FALL;

  if(p.shootCd>0) p.shootCd -= dt;
  if(keys.fire && p.novaCharged && p.shootCd<=0){
    game.projectiles.push({type:'flare', x: p.x + (p.facing>0?p.w:-8), y: p.y+p.h*0.35, vx: p.facing*FLARE_SPEED, vy:0, w:8, h:6, life:FLARE_LIFE, fromPlayer:true});
    p.shootCd = FLARE_COOLDOWN;
    p.shootPoseTimer = 0.22; // holds the bow-draw pose briefly after loosing an arrow
    SFX.shoot();
  }

  if(p.onGround) game.comboCount = 0;
  resolveEntityCollisions(p, game.solids, dt);

  if(p.hurtTimer>0) p.hurtTimer -= dt;
  if(p.novaTimer>0) p.novaTimer -= dt;
  if(p.shootPoseTimer>0) p.shootPoseTimer -= dt;

  if(p.y > CH+150) startDeath();
}

export function updateEnemies(dt){
  for(const e of game.enemies){
    if(!e.alive){ if(e.squish>0){ e.squish-=dt; if(e.squish<=0) e.remove=true; } continue; }
    if(e.type==='crawler'){
      e.x += e.dir*42*dt;
      if(e.x < e.rangeMin){ e.x=e.rangeMin; e.dir=1; }
      if(e.x+e.w > e.rangeMax){ e.x=e.rangeMax-e.w; e.dir=-1; }
    } else if(e.type==='floater'){
      e.phase += dt*e.speed;
      e.x = e.homeX + Math.sin(e.phase)*e.amp;
      e.y = e.homeY + Math.cos(e.phase*0.7)*10;
    }
  }
  game.enemies = game.enemies.filter(e=>!e.remove);
  for(const t of game.vents){
    t.timer += dt;
    const phase = t.timer % t.cycle;
    if(phase < 1.2){ t.state='idle'; t.h = 10; }
    else if(phase < 1.5){ t.state='rising'; t.h = 10 + ((phase-1.2)/0.3)*26; }
    else { t.state='extended'; t.h = 36; }
    t.y = GROUND_Y - t.h;
  }
}

export function updateBoss(dt){
  const b = game.boss;
  if(!b) return;
  if(b.invuln>0) b.invuln -= dt;
  if(b.dead){ if(b.deadTimer>0) b.deadTimer -= dt; return; }
  b.x += b.vx*dt;
  if(b.x < b.minX){ b.x=b.minX; b.vx=Math.abs(b.vx); }
  if(b.x+b.w > b.maxX){ b.x=b.maxX-b.w; b.vx=-Math.abs(b.vx); }
  b.shootTimer -= dt;
  if(b.shootTimer<=0){
    b.shootTimer = 1.9;
    const dir = game.player.x < b.x ? -1 : 1;
    game.projectiles.push({type:'bolt', x:b.x+b.w/2, y:b.y+b.h*0.5, vx:dir*220, vy:0, w:10, h:8, life:2.5, fromPlayer:false});
    SFX.shoot();
  }
}

export function updateProjectiles(dt){
  for(const pr of game.projectiles){
    pr.life -= dt; pr.x += pr.vx*dt; pr.y += pr.vy*dt;
    pr.dead = pr.life<=0;
    for(const s of game.solids){ if(rectsOverlap(pr,s)) pr.dead=true; }
    if(pr.fromPlayer){
      for(const e of game.enemies){
        if(e.alive && rectsOverlap(pr,e)){ stompEnemy(e); pr.dead=true; }
      }
      if(game.boss && !game.boss.dead && rectsOverlap(pr,game.boss)){ bossHit(); pr.dead=true; }
    } else {
      const p = game.player;
      if(p.hurtTimer<=0 && p.novaTimer<=0 && rectsOverlap(pr,p)){ damagePlayer(); pr.dead=true; }
    }
  }
  game.projectiles = game.projectiles.filter(p=>!p.dead);
}

export function updateItems(dt){
  for(const it of game.items){
    if(it.collected) continue;
    if(it.spawning){
      it.spawnTimer -= dt; it.y -= 40*dt;
      if(it.spawnTimer<=0) it.spawning=false;
      continue;
    }
    if(it.type==='boost'){
      it.vy = (it.vy||0) + GRAVITY*dt; if(it.vy>MAX_FALL) it.vy=MAX_FALL;
      resolveEntityCollisions(it, game.solids, dt);
      if(it.y > CH+150) it.collected = true;
    }
  }
  game.items = game.items.filter(it=>!it.collected);
}

function ventRect(t){ return {x:t.x, y:t.y, w:28, h:t.h}; }

export function checkPlayerVsWorld(){
  const p = game.player;
  for(const e of game.enemies){
    if(!e.alive || !rectsOverlap(p,e)) continue;
    if(p.novaTimer>0){ stompEnemy(e); continue; }
    if(p.vy>0 && (p.y+p.h - e.y) < 12){ stompEnemy(e); }
    else { damagePlayer(); }
  }
  for(const t of game.vents){
    if(t.state==='extended' && p.novaTimer<=0 && rectsOverlap(p, ventRect(t))) damagePlayer();
  }
  if(game.boss && !game.boss.dead && rectsOverlap(p, game.boss)){
    if(p.novaTimer>0){ bossHit(); }
    else if(p.vy>0 && (p.y+p.h - game.boss.y) < 16){ bossHit(); }
    else damagePlayer();
  }
  for(const h of game.hazardsZones){
    if(p.novaTimer<=0 && rectsOverlap(p,h)) damagePlayer();
  }
  for(const s of game.shards){
    if(!s.collected && rectsOverlap(p, {x:s.x-6,y:s.y-6,w:12,h:12})){
      s.collected=true; game.score+=10; game.shardsCollected++;
      SFX.shard(); spawnParticles(s.x,s.y,'#3dffc0',4);
    }
  }
  for(const it of game.items){
    if(!it.collected && !it.spawning && rectsOverlap(p,it)) collectItem(it);
  }
  if(game.level.goal && !game.goalReached){
    const g = game.level.goal;
    const gr = {x:g.x, y:g.y-90, w:16, h:90};
    if(rectsOverlap(p,gr)) reachGoal();
  }
}
