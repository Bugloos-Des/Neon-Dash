/* =========================================================
   ENTITY FACTORIES — turn level data into live entity objects.
   ========================================================= */
import { GROUND_Y } from './config.js';

export function makeScuttler(s){ return {type:'scuttler', x:s.x, y:GROUND_Y-20, w:24, h:20, dir:-1, rangeMin:s.rangeMin, rangeMax:s.rangeMax, alive:true, squish:0, remove:false}; }
export function makeDrone(s){ return {type:'drone', x:s.x, y:s.y, homeX:s.x, homeY:s.y, amp:s.amp, speed:s.speed, phase:Math.random()*6.28, w:26, h:18, alive:true, squish:0, remove:false}; }
export function makeTurret(x){ return {x, y:GROUND_Y-10, h:10, timer:Math.random()*2, cycle:2.4, state:'idle'}; }
export function makeBoss(b){ return {type:'boss', x:b.x, y:b.y, w:64, h:56, vx:60, minX:b.minX, maxX:b.maxX, hp:3, maxHp:3, shootTimer:2, invuln:0, dead:false, deadTimer:0}; }
