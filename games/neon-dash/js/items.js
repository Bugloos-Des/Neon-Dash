/* =========================================================
   ITEMS / BLOCKS — pickups popped from blocks and picked up
   by players.
   ========================================================= */
import { STAR_TIME } from './config.js';
import { game } from './gamestate.js';
import { SFX } from './audio.js';
import { spawnParticles, spawnTextParticle } from './particles.js';
import { activePlayers, recomputeSize } from './player.js';

export function spawnPopItem(type,x,y,dir){
  game.items.push({type, x, y:y-4, w:18, h:18, collected:false, spawning:true, spawnTimer:0.35, vx: type==='nano'?(dir*40):0, vy:0});
}
export function hitBlock(s, dir){
  s.bump = 0.15;
  if(s.kind==='energy'){
    if(!s.used){
      s.used = true;
      giveBlockItem(s, dir);
    } else { SFX.bump(); }
  } else if(s.kind==='data'){
    if(activePlayers().some(p=>p.power>0)){
      game.solids = game.solids.filter(x=>x!==s);
      game.blocks = game.blocks.filter(x=>x!==s);
      spawnParticles(s.x+12, s.y+12, '#ffc24b', 8);
      SFX.bump();
    } else {
      SFX.bump();
    }
  }
}
export function giveBlockItem(s, dir){
  switch(s.item){
    case 'nano': spawnPopItem('nano', s.x+3, s.y, dir||1); SFX.power(); break;
    case 'plasma': spawnPopItem('plasma', s.x+3, s.y, 0); SFX.power(); break;
    case 'shardburst':
      game.score += 50; game.shardsCollected += 5;
      spawnTextParticle('+50', s.x+12, s.y-6, '#39ff9e');
      spawnParticles(s.x+12, s.y+4, '#39ff9e', 8);
      SFX.shard();
      break;
    case 'life':
      game.lives++;
      spawnTextParticle('1UP!', s.x+12, s.y-6, '#ff2ec4');
      spawnParticles(s.x+12, s.y+4, '#ff2ec4', 8);
      SFX.power();
      break;
    default: SFX.bump();
  }
}
export function collectItem(it, p){
  it.collected = true;
  if(it.type==='nano'){
    if(p.power<1){ p.power=1; recomputeSize(p); } else { game.score+=200; spawnTextParticle('+200', it.x, it.y, '#00e5ff'); }
    SFX.power();
  } else if(it.type==='plasma'){
    if(p.power<2){ p.power=2; } else { game.score+=200; spawnTextParticle('+200', it.x, it.y, '#00e5ff'); }
    SFX.power();
  } else if(it.type==='overdrive'){
    p.starTimer = STAR_TIME;
    SFX.power();
  }
  spawnParticles(it.x+9, it.y+9, '#ffc24b', 8);
}
