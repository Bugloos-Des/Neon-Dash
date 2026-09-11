/* =========================================================
   PLAYER — player factory.
   Cosmo Leap is single-player (one `game.player`, no roster),
   so there is no activePlayers()-style accessor here — see
   the deviations note in the final report. Needs GROUND_Y for
   the default spawn Y, so it imports config.js (a fellow leaf
   module) rather than gamestate.js, which this game's player
   factory has no actual use for.
   ========================================================= */
import { GROUND_Y } from './config.js';

export function newPlayer(){
  return { x:40, y:GROUND_Y-28, vx:0, vy:0, w:22, h:28, onGround:false, facing:1,
    boosted:false, airJumpsLeft:0, novaCharged:false, novaTimer:0, hurtTimer:0, shootCd:0, shootPoseTimer:0, coyote:0, jumpBuffer:0 };
}
