/* =========================================================
   PHYSICS / COLLISION — axis-separated AABB resolution, per-
   frame player/enemy/boss/projectile/item updates, and world
   collision checks. See docs/architecture.md §4-5.
   ========================================================= */
import { CH, GROUND_Y, GRAVITY, MAX_FALL, MOVE_ACCEL, MAX_SPEED, FRICTION,
  JUMP_VELOCITY, JUMP_CUT, COYOTE_TIME, JUMP_BUFFER, PLASMA_SPEED, PLASMA_LIFE, PLASMA_COOLDOWN } from './config.js';
import { clamp, rectsOverlap } from './utils.js';
import { game } from './gamestate.js';
import { activePlayers } from './player.js';
import { SFX } from './audio.js';
import { spawnParticles } from './particles.js';
import { hitBlock, collectItem } from './items.js';
import { startDeath, damagePlayer, stompEnemy, bossHit, reachGoal } from './run.js';

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
      else if(e.vy<0){ e.y = s.y + s.h; e.vy=0; if(s.type==='block') hitBlock(s, e.facing||1); }
    }
  }
}

export function updatePlayerPhysics(dt, p, k){
  let dir = 0;
  if(k.left) dir -= 1;
  if(k.right) dir += 1;
  const cap = MAX_SPEED * (p.starTimer>0 ? 1.3 : 1);
  if(dir!==0){ p.vx += dir*MOVE_ACCEL*dt; p.facing = dir; }
  else {
    if(p.vx>0) p.vx = Math.max(0, p.vx-FRICTION*dt);
    else if(p.vx<0) p.vx = Math.min(0, p.vx+FRICTION*dt);
  }
  p.vx = clamp(p.vx, -cap, cap);

  if(p.onGround) p.coyote = COYOTE_TIME; else p.coyote = Math.max(0, p.coyote-dt);
  if(k.jumpPressed){ p.jumpBuffer = JUMP_BUFFER; k.jumpPressed=false; }
  else { p.jumpBuffer = Math.max(0, p.jumpBuffer-dt); }
  if(p.jumpBuffer>0 && p.coyote>0){
    p.vy = JUMP_VELOCITY; p.onGround=false; p.coyote=0; p.jumpBuffer=0; SFX.jump();
  }
  if(k.jumpReleased){ if(p.vy<0) p.vy *= JUMP_CUT; k.jumpReleased=false; }

  p.vy += GRAVITY*dt; if(p.vy>MAX_FALL) p.vy = MAX_FALL;

  if(p.shootCd>0) p.shootCd -= dt;
  if(k.fire && p.power>=2 && p.shootCd<=0){
    game.projectiles.push({type:'plasma', x: p.x + (p.facing>0?p.w:-8), y: p.y+p.h*0.35, vx: p.facing*PLASMA_SPEED, vy:0, w:8, h:6, life:PLASMA_LIFE, fromPlayer:true});
    p.shootCd = PLASMA_COOLDOWN;
    SFX.shoot();
  }

  if(p.onGround) game.comboCount = 0;
  resolveEntityCollisions(p, game.solids, dt);

  if(p.hurtTimer>0) p.hurtTimer -= dt;
  if(p.starTimer>0) p.starTimer -= dt;

  if(p.y > CH+150) startDeath(p);
}

export function updateEnemies(dt){
  for(const e of game.enemies){
    if(!e.alive){ if(e.squish>0){ e.squish-=dt; if(e.squish<=0) e.remove=true; } continue; }
    if(e.type==='scuttler'){
      e.x += e.dir*42*dt;
      if(e.x < e.rangeMin){ e.x=e.rangeMin; e.dir=1; }
      if(e.x+e.w > e.rangeMax){ e.x=e.rangeMax-e.w; e.dir=-1; }
    } else if(e.type==='drone'){
      e.phase += dt*e.speed;
      e.x = e.homeX + Math.sin(e.phase)*e.amp;
      e.y = e.homeY + Math.cos(e.phase*0.7)*10;
    }
  }
  game.enemies = game.enemies.filter(e=>!e.remove);
  for(const t of game.turrets){
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
    // Target whichever active player is nearest.
    const nearest = activePlayers().reduce((best,p)=>
      (!best || Math.abs(p.x-b.x) < Math.abs(best.x-b.x)) ? p : best, null);
    const dir = (nearest && nearest.x < b.x) ? -1 : 1;
    game.projectiles.push({type:'bolt', x:b.x+b.w/2, y:b.y+b.h*0.5, vx:dir*230, vy:0, w:10, h:8, life:2.5, fromPlayer:false});
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
      for(const p of activePlayers()){
        if(p.hurtTimer<=0 && p.starTimer<=0 && rectsOverlap(pr,p)){ damagePlayer(p); pr.dead=true; break; }
      }
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
    if(it.type==='nano'){
      it.vy = (it.vy||0) + GRAVITY*dt; if(it.vy>MAX_FALL) it.vy=MAX_FALL;
      resolveEntityCollisions(it, game.solids, dt);
      if(it.y > CH+150) it.collected = true;
    }
  }
  game.items = game.items.filter(it=>!it.collected);
}

function turretRect(t){ return {x:t.x, y:t.y, w:28, h:t.h}; }

export function checkPlayerVsWorld(p){
  for(const e of game.enemies){
    if(!e.alive || !rectsOverlap(p,e)) continue;
    if(p.starTimer>0){ stompEnemy(e, p); continue; }
    if(p.vy>0 && (p.y+p.h - e.y) < 12){ stompEnemy(e, p); }
    else { damagePlayer(p); }
  }
  for(const t of game.turrets){
    if(t.state==='extended' && p.starTimer<=0 && rectsOverlap(p, turretRect(t))) damagePlayer(p);
  }
  if(game.boss && !game.boss.dead && rectsOverlap(p, game.boss)){
    if(p.starTimer>0){ bossHit(p); }
    else if(p.vy>0 && (p.y+p.h - game.boss.y) < 16){ bossHit(p); }
    else damagePlayer(p);
  }
  for(const h of game.hazardsZones){
    if(p.starTimer<=0 && rectsOverlap(p,h)) damagePlayer(p);
  }
  for(const s of game.shards){
    if(!s.collected && rectsOverlap(p, {x:s.x-6,y:s.y-6,w:12,h:12})){
      s.collected=true; game.score+=10; game.shardsCollected++;
      SFX.shard(); spawnParticles(s.x,s.y,'#39ff9e',4);
    }
  }
  for(const it of game.items){
    if(!it.collected && !it.spawning && rectsOverlap(p,it)) collectItem(it, p);
  }
  if(game.level.goal && !game.goalReached){
    const g = game.level.goal;
    const gr = {x:g.x, y:g.y-90, w:16, h:90};
    if(rectsOverlap(p,gr)) reachGoal();
  }
}
