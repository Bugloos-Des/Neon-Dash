/* =========================================================
   RUN — game-flow orchestration: loading levels, starting a
   run, death/damage handling, stomping, boss hits, reaching
   the goal, advancing levels. This is the module every screen
   button ultimately calls into (via ui.js/input.js), and the
   only "state-mutating" module physics.js is allowed to import
   — nothing in this file imports physics.js, ui.js or input.js,
   so there's no cycle.
   ========================================================= */
import { HURT_TIME, DEATH_TIME } from './config.js';
import { game } from './gamestate.js';
import { LEVELS } from './levels.js';
import { makeScuttler, makeDrone, makeTurret, makeBoss } from './entities.js';
import { activePlayers, newPlayer, recomputeSize } from './player.js';
import { clone } from './utils.js';
import { SFX } from './audio.js';
import { spawnParticles, spawnTextParticle } from './particles.js';
import { showScreen, hideAllScreens } from './screens.js';

export function loadLevel(idx){
  const lvl = LEVELS[idx];
  game.level = lvl;
  game.blocks = clone(lvl.blocks||[]);
  game.solids = [...lvl.ground, ...(lvl.platforms||[]), ...game.blocks];
  game.enemies = (lvl.enemies||[]).map(s=> s.type==='scuttler'?makeScuttler(s):makeDrone(s));
  game.turrets = (lvl.turrets||[]).map(t=>makeTurret(t.x));
  game.boss = lvl.boss ? makeBoss(lvl.boss) : null;
  game.gate = lvl.gate ? {x:lvl.gate.x,y:lvl.gate.y,w:lvl.gate.w,h:lvl.gate.h,type:'solid'} : null;
  game.gateActive = !!game.gate;
  if(game.gate) game.solids.push(game.gate);
  game.hazardsZones = clone(lvl.hazards||[]);
  game.shards = clone(lvl.shards||[]).map(s=>({x:s.x,y:s.y,collected:false}));
  game.items = clone(lvl.items||[]).map(s=>({type:s.type,x:s.x,y:s.y,w:18,h:18,collected:false,spawning:false,vx:0,vy:0}));
  game.projectiles = [];
  game.particles = [];
  game.camera.x = 0; game.camera.shake = 0;
  game.timeLeft = lvl.timeLimit || 150;
  game.goalReached = false;
  game.comboCount = 0;
  activePlayers().forEach((p,i)=>{
    p.x = lvl.start.x + i*16; p.y = lvl.start.y - (p.h-28);
    p.vx=0; p.vy=0; p.onGround=false; p.hurtTimer=1.0;
  });
  document.getElementById('hud-lvlcode').textContent = lvl.code;
  document.getElementById('hud-lvlname').textContent = lvl.name;
  document.getElementById('intro-code').textContent = lvl.code;
  document.getElementById('intro-name').textContent = lvl.name;
}

export function startNewGame(mode){
  game.mode = mode || game.mode || '1p';
  game.score=0; game.lives=3; game.levelIndex=0;
  game.player = newPlayer(1);
  game.player2 = game.mode==='2p' ? newPlayer(2) : null;
  loadLevel(0);
  game.state='intro'; game.introTimer=1.7;
  hideAllScreens();
}

export function startDeath(p){
  if(game.state==='dying') return;
  game.state='dying';
  game.dyingPlayer = p;
  p.vx=0; p.vy=-420;
  p.deathTimer = DEATH_TIME;
  SFX.hit();
}
export function handleDeath(){
  game.lives--;
  game.dyingPlayer = null;
  if(game.lives<=0){
    game.state='gameover';
    SFX.gameover();
    document.getElementById('go-score').textContent = game.score;
    showScreen('gameover');
  } else {
    activePlayers().forEach(p=>p.power=0);
    loadLevel(game.levelIndex);
    game.state='intro'; game.introTimer=1.2;
  }
}
export function damagePlayer(p){
  if(p.hurtTimer>0 || p.starTimer>0) return;
  if(p.power>0){
    p.power=0; recomputeSize(p);
    p.hurtTimer = HURT_TIME;
    SFX.hit();
  } else {
    startDeath(p);
  }
}

export function stompEnemy(e, p){
  e.alive=false; e.squish=0.22; e.remove=false;
  if(p) p.vy = -270;
  game.comboCount++;
  const gain = Math.min(800, 100*Math.pow(2, game.comboCount-1));
  game.score += gain;
  spawnTextParticle('+'+gain, e.x+e.w/2, e.y, '#39ff9e');
  spawnParticles(e.x+e.w/2, e.y+e.h/2, '#ff4d5e', 7);
  SFX.stomp();
}

export function bossHit(p){
  const b = game.boss;
  if(!b || b.dead || b.invuln>0) return;
  b.hp--; b.invuln=1.0;
  if(p) p.vy=-260;
  spawnParticles(b.x+b.w/2, b.y+10, '#ffc24b', 10);
  spawnTextParticle('HIT '+b.hp+'/'+b.maxHp, b.x+b.w/2, b.y-10, '#ffc24b');
  SFX.bossHit();
  if(b.hp<=0){
    b.dead=true; b.deadTimer=1.2;
    SFX.explode();
    spawnParticles(b.x+b.w/2, b.y+b.h/2, '#ff2ec4', 22);
    game.camera.shake = 0.4;
    if(game.gateActive){ game.gateActive=false; game.solids = game.solids.filter(s=>s!==game.gate); }
    game.projectiles = game.projectiles.filter(pr=>pr.fromPlayer);
    game.score += 1000;
  }
}

export function reachGoal(){
  game.goalReached = true;
  game.state = 'levelcomplete';
  const bonus = Math.floor(game.timeLeft)*10;
  game.score += bonus + 500;
  SFX.levelup();
  document.getElementById('lc-timebonus').textContent = '+'+bonus;
  document.getElementById('lc-shards').textContent = game.shardsCollected;
  document.getElementById('lc-score').textContent = game.score;
  showScreen('levelcomplete');
}
export function advanceLevel(){
  game.levelIndex++;
  if(game.levelIndex >= LEVELS.length){
    game.state='win';
    document.getElementById('win-score').textContent = game.score;
    showScreen('win');
  } else {
    loadLevel(game.levelIndex);
    game.state='intro'; game.introTimer=1.7;
    hideAllScreens();
  }
}
