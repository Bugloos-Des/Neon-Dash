/* =========================================================
   ITEMS / BLOCKS — pickups + hittable-block logic.
   Imports gamestate.js, audio.js, particles.js, config.js.
   ========================================================= */
import { game } from './gamestate.js';
import { SFX } from './audio.js';
import { spawnParticles, spawnTextParticle } from './particles.js';
import { NOVA_TIME } from './config.js';

export function spawnPopItem(type,x,y,dir){
  game.items.push({type, x, y:y-4, w:18, h:18, collected:false, spawning:true, spawnTimer:0.35, vx: type==='boost'?(dir*40):0, vy:0});
}
export function hitBlock(s){
  s.bump = 0.15;
  if(s.kind==='core'){
    if(!s.used){
      s.used = true;
      giveBlockItem(s);
    } else { SFX.bump(); }
  } else if(s.kind==='ore'){
    if(game.player.boosted || game.player.novaCharged){
      game.solids = game.solids.filter(x=>x!==s);
      game.blocks = game.blocks.filter(x=>x!==s);
      spawnParticles(s.x+12, s.y+12, '#ffb347', 8);
      SFX.bump();
    } else {
      SFX.bump();
    }
  }
}
export function giveBlockItem(s){
  switch(s.item){
    case 'boost': spawnPopItem('boost', s.x+3, s.y, game.player.facing||1); SFX.power(); break;
    case 'nova': spawnPopItem('nova', s.x+3, s.y, 0); SFX.power(); break;
    case 'burst':
      game.score += 50; game.shardsCollected += 5;
      spawnTextParticle('+50', s.x+12, s.y-6, '#3dffc0');
      spawnParticles(s.x+12, s.y+4, '#3dffc0', 8);
      SFX.shard();
      break;
    case 'life':
      game.lives++;
      spawnTextParticle('1UP!', s.x+12, s.y-6, '#a76bff');
      spawnParticles(s.x+12, s.y+4, '#a76bff', 8);
      SFX.power();
      break;
    default: SFX.bump();
  }
}
export function collectItem(it){
  it.collected = true;
  const p = game.player;
  if(it.type==='boost'){
    if(!p.boosted){ p.boosted=true; } else { game.score+=200; spawnTextParticle('+200', it.x, it.y, '#ffb347'); }
    SFX.power();
  } else if(it.type==='nova'){
    if(!p.novaCharged){ p.novaCharged=true; } else { game.score+=200; spawnTextParticle('+200', it.x, it.y, '#ffb347'); }
    SFX.power();
  } else if(it.type==='shield'){
    p.novaTimer = NOVA_TIME;
    SFX.power();
  }
  spawnParticles(it.x+9, it.y+9, '#ffb347', 8);
}
