/* =========================================================
   INPUT — keyboard/touch input state + listeners.
   Imports ui.js, audio.js.
   ========================================================= */
import { togglePause, confirmScreen } from './ui.js';
import { toggleMute } from './audio.js';

export const keys = { left:false, right:false, jumpHeld:false, fire:false, jumpPressed:false, jumpReleased:false };

window.addEventListener('keydown', (e)=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','Space','KeyW','KeyA','KeyD'].includes(e.code)) e.preventDefault();
  handleKey(e.code, true);
});
window.addEventListener('keyup', (e)=>{ handleKey(e.code, false); });

function handleKey(code, down){
  if(code==='ArrowLeft'||code==='KeyA') keys.left = down;
  if(code==='ArrowRight'||code==='KeyD') keys.right = down;
  if(code==='ArrowUp'||code==='KeyW'||code==='Space'){
    if(down && !keys.jumpHeld) keys.jumpPressed = true;
    if(!down) keys.jumpReleased = true;
    keys.jumpHeld = down;
  }
  if(code==='KeyX'||code==='KeyK'||code==='ShiftLeft'||code==='ShiftRight') keys.fire = down;
  if(down && (code==='KeyP'||code==='Escape')) togglePause();
  if(down && code==='KeyM') toggleMute();
  if(down && (code==='Enter'||code==='Space')) confirmScreen();
}

function bindTouch(id, onDown, onUp){
  const el = document.getElementById(id);
  const down=(e)=>{ e.preventDefault(); onDown(); };
  const up=(e)=>{ e.preventDefault(); onUp(); };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointerleave', up);
  el.addEventListener('pointercancel', up);
}
bindTouch('btn-left', ()=>keys.left=true, ()=>keys.left=false);
bindTouch('btn-right', ()=>keys.right=true, ()=>keys.right=false);
bindTouch('btn-fire', ()=>keys.fire=true, ()=>keys.fire=false);
bindTouch('btn-jump', ()=>{ if(!keys.jumpHeld) keys.jumpPressed=true; keys.jumpHeld=true; }, ()=>{ keys.jumpHeld=false; keys.jumpReleased=true; });
