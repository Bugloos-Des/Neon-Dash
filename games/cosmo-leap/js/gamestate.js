/* =========================================================
   GAMESTATE — the single mutable state singleton.
   Every other module imports this same `game` object and
   mutates its properties in place (never reassigns it), so
   this file must stay a pure data container with no imports
   and no functions — that's what keeps the rest of the
   dependency graph acyclic.
   ========================================================= */
export const game = {
  state:'start', // start, intro, playing, dying, paused, levelcomplete, gameover, win
  levelIndex:0, level:null, introTimer:0,
  player:null,
  camera:{x:0, shake:0},
  solids:[], blocks:[], enemies:[], vents:[], boss:null, gate:null, gateActive:false,
  hazardsZones:[], shards:[], items:[], projectiles:[], particles:[],
  score:0, lives:3, shardsCollected:0, timeLeft:150,
  goalReached:false, comboCount:0,
};
