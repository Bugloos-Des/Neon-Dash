/* =========================================================
   MAIN LOOP — bootstraps the game: importing ui.js and
   input.js wires up their DOM event listeners as a side
   effect, then a single requestAnimationFrame loop drives
   update()/render() (see docs/architecture.md §1).
   ========================================================= */
import './canvas.js';
import './ui.js';
import './input.js';
import { update } from './update.js';
import { render } from './render.js';

let lastTime = 0;
function loop(ts){
  const dt = Math.min((ts-lastTime)/1000, 0.033) || 0;
  lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
