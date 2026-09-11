/* =========================================================
   MAIN LOOP — wires up side-effecting modules and drives the
   requestAnimationFrame loop. Replaces the original IIFE
   wrapper: ES modules are already strict-mode and scoped.
   ========================================================= */
import './canvas.js';
import './ui.js';
import { keys } from './input.js';
import { update } from './update.js';
import { render } from './render.js';

let lastTime = 0;
function loop(ts){
  const dt = Math.min((ts-lastTime)/1000, 0.033) || 0;
  lastTime = ts;
  update(dt);
  render(keys);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
