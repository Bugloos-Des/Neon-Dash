/* =========================================================
   PLAYER — player factory/accessors. Only depends on the
   shared state singleton, so it can be imported from almost
   anywhere (items, run, physics, render, update) without risk
   of a cycle.
   ========================================================= */
import { GROUND_Y } from './config.js';
import { game } from './gamestate.js';

// The active roster for this run: just P1 solo, or P1+P2 in co-op.
export function activePlayers(){
  const arr = [];
  if(game.player) arr.push(game.player);
  if(game.player2) arr.push(game.player2);
  return arr;
}

export function newPlayer(id){
  return { id: id||1, x:40, y:GROUND_Y-28, vx:0, vy:0, w:22, h:28, onGround:false, facing:1,
    power:0, hurtTimer:0, starTimer:0, shootCd:0, coyote:0, jumpBuffer:0 };
}
export function recomputeSize(p){ const bottom=p.y+p.h; p.h = p.power>=1 ? 38 : 28; p.y = bottom-p.h; }
