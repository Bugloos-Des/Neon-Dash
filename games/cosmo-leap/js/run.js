/* =========================================================
   RUN — game-flow: load level, start/restart run, death/
   damage/scoring, level-complete/advance, boss hits.
   Imports gamestate.js, levels.js, entities.js, player.js,
   utils.js, audio.js, particles.js, screens.js, config.js.
   ========================================================= */
import { game } from './gamestate.js';
import { LEVELS } from './levels.js';
import { makeCrawler, makeFloater, makeVent, makeBoss } from './entities.js';
import { newPlayer } from './player.js';
import { clone } from './utils.js';
import { SFX } from './audio.js';
import { spawnParticles, spawnTextParticle } from './particles.js';
import { showScreen, hideAllScreens } from './screens.js';
import { DEATH_TIME, HURT_TIME } from './config.js';

export function loadLevel(idx){
  const lvl = LEVELS[idx];
  game.level = lvl;
  game.blocks = clone(lvl.blocks||[]);
  game.solids = [...lvl.ground, ...(lvl.platforms||[]), ...game.blocks];
  game.enemies = (lvl.enemies||[]).map(s=> s.type==='crawler'?makeCrawler(s):makeFloater(s));
  game.vents = (lvl.vents||[]).map(t=>makeVent(t.x));
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
  game.player.x = lvl.start.x; game.player.y = lvl.start.y;
  game.player.vx=0; game.player.vy=0; game.player.onGround=false; game.player.hurtTimer=1.0;
  document.getElementById('hud-lvlcode').textContent = lvl.code;
  document.getElementById('hud-lvlname').textContent = lvl.name;
  document.getElementById('intro-code').textContent = lvl.code;
  document.getElementById('intro-name').textContent = lvl.name;
}

export function startNewGame(){
  game.score=0; game.lives=3; game.levelIndex=0;
  game.player = newPlayer();
  loadLevel(0);
  game.state='intro'; game.introTimer=1.7;
  hideAllScreens();
}

export function startDeath(){
  if(game.state==='dying') return;
  game.state='dying';
  game.player.vx=0; game.player.vy=-400;
  game.player.deathTimer = DEATH_TIME;
  game.particles.push({type:'soul', x:game.player.x+game.player.w/2, y:game.player.y, vy:-24, life:1.6, maxLife:1.6});
  SFX.hit();
}
export function handleDeath(){
  game.lives--;
  if(game.lives<=0){
    game.state='gameover';
    SFX.gameover();
    document.getElementById('go-score').textContent = game.score;
    showScreen('gameover');
  } else {
    game.player.boosted=false; game.player.novaCharged=false;
    loadLevel(game.levelIndex);
    game.state='intro'; game.introTimer=1.2;
  }
}
export function damagePlayer(){
  const p = game.player;
  if(p.hurtTimer>0 || p.novaTimer>0) return;
  if(p.boosted || p.novaCharged){
    p.boosted=false; p.novaCharged=false;
    p.hurtTimer = HURT_TIME;
    SFX.hit();
  } else {
    startDeath();
  }
}

export function stompEnemy(e){
  e.alive=false; e.squish=0.22; e.remove=false;
  const p=game.player;
  p.vy = -260;
  game.comboCount++;
  const gain = Math.min(800, 100*Math.pow(2, game.comboCount-1));
  game.score += gain;
  spawnTextParticle('+'+gain, e.x+e.w/2, e.y, '#3dffc0');
  spawnParticles(e.x+e.w/2, e.y+e.h/2, '#ff6b81', 7);
  SFX.stomp();
}

export function bossHit(){
  const b = game.boss;
  if(!b || b.dead || b.invuln>0) return;
  b.hp--; b.invuln=1.0;
  game.player.vy=-250;
  spawnParticles(b.x+b.w/2, b.y+10, '#ffb347', 10);
  spawnTextParticle('HIT '+b.hp+'/'+b.maxHp, b.x+b.w/2, b.y-10, '#ffb347');
  SFX.bossHit();
  if(b.hp<=0){
    b.dead=true; b.deadTimer=1.2;
    SFX.explode();
    spawnParticles(b.x+b.w/2, b.y+b.h/2, '#a76bff', 22);
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
