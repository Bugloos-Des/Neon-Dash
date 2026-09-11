/* =========================================================
   UPDATE — the main per-frame update(dt) + updateHUD().
   Imports gamestate.js, config.js, utils.js, particles.js,
   physics.js, run.js, input.js.
   ========================================================= */
import { game } from './gamestate.js';
import { CW, GRAVITY } from './config.js';
import { clamp } from './utils.js';
import { updateParticles } from './particles.js';
import {
  updatePlayerPhysics, updateEnemies, updateBoss,
  updateProjectiles, updateItems, checkPlayerVsWorld
} from './physics.js';
import { handleDeath, startDeath } from './run.js';
import { keys } from './input.js';

function updateDying(dt){
  const p = game.player;
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
  if(game.timeLeft<=0){ game.timeLeft=0; startDeath(); return; }

  updatePlayerPhysics(dt, keys);
  updateEnemies(dt);
  updateBoss(dt);
  updateProjectiles(dt);
  updateItems(dt);
  checkPlayerVsWorld();
  updateParticles(dt);

  for(const s of game.blocks) if(s.bump>0) s.bump -= dt;

  const target = game.player.x + game.player.w/2 - CW/2;
  game.camera.x = clamp(target, 0, Math.max(0, game.level.width - CW));
  if(game.camera.shake>0) game.camera.shake -= dt;

  updateHUD();
}

export function updateHUD(){
  document.getElementById('hud-score').textContent = String(game.score).padStart(6,'0');
  document.getElementById('hud-shards').textContent = String(game.shardsCollected).padStart(2,'0');
  document.getElementById('hud-lives').textContent = game.lives;
  document.getElementById('hud-time').textContent = Math.ceil(game.timeLeft);
}
