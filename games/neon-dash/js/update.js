/* =========================================================
   MAIN UPDATE — per-frame simulation tick.
   ========================================================= */
import { game } from './gamestate.js';
import { CW, GRAVITY } from './config.js';
import { clamp } from './utils.js';
import { activePlayers } from './player.js';
import { keys1, keys2 } from './input.js';
import { startDeath, handleDeath } from './run.js';
import { updateParticles } from './particles.js';
import { updatePlayerPhysics, updateEnemies, updateBoss, updateProjectiles, updateItems, checkPlayerVsWorld } from './physics.js';

function updateDying(dt){
  const p = game.dyingPlayer;
  p.vy += GRAVITY*dt; p.x += p.vx*dt; p.y += p.vy*dt;
  p.deathTimer -= dt;
  updateParticles(dt);
  if(p.deathTimer<=0) handleDeath();
}

export function update(dt){
  if(game.state==='intro'){
    game.introTimer -= dt;
    updateParticles(dt);
    if(game.introTimer<=0) game.state='playing';
    return;
  }
  if(game.state==='dying'){ updateDying(dt); return; }
  if(game.state!=='playing') return;

  game.timeLeft -= dt;
  if(game.timeLeft<=0){ game.timeLeft=0; startDeath(activePlayers()[0]); return; }

  // Each player runs its own physics/input; if one triggers a death mid-frame
  // (game.state flips to 'dying'), skip the rest so we don't touch a stale world.
  activePlayers().forEach(p=>{
    if(game.state!=='playing') return;
    updatePlayerPhysics(dt, p, p.id===2 ? keys2 : keys1);
  });
  updateEnemies(dt);
  updateBoss(dt);
  updateProjectiles(dt);
  updateItems(dt);
  activePlayers().forEach(p=>{
    if(game.state!=='playing') return;
    checkPlayerVsWorld(p);
  });
  updateParticles(dt);

  for(const s of game.blocks) if(s.bump>0) s.bump -= dt;

  if(game.state==='playing'){
    const xs = activePlayers().map(p=>p.x+p.w/2);
    const avg = xs.reduce((a,b)=>a+b,0)/xs.length;
    game.camera.x = clamp(avg - CW/2, 0, Math.max(0, game.level.width - CW));
    if(game.camera.shake>0) game.camera.shake -= dt;
  }

  updateHUD();
}

function updateHUD(){
  document.getElementById('hud-score').textContent = String(game.score).padStart(6,'0');
  document.getElementById('hud-shards').textContent = String(game.shardsCollected).padStart(2,'0');
  document.getElementById('hud-lives').textContent = game.lives;
  document.getElementById('hud-time').textContent = Math.ceil(game.timeLeft);
}
