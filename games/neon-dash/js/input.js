/* =========================================================
   INPUT — keyboard + touch, unified into keys1/keys2 (see
   docs/architecture.md §2).
   ========================================================= */
import { game } from './gamestate.js';
import { togglePause, confirmScreen } from './ui.js';
import { toggleMute } from './audio.js';

// keys1 = Player 1. In 1-player mode it also answers to WASD/X/Shift so a
// solo player can use either control scheme, exactly like the game always
// has. In 2-player mode it's Arrow-keys-only so it can't collide with P2.
export const keys1 = { left:false, right:false, jumpHeld:false, fire:false, jumpPressed:false, jumpReleased:false };
export const keys2 = { left:false, right:false, jumpHeld:false, fire:false, jumpPressed:false, jumpReleased:false };

const PREVENT_DEFAULT_CODES = ['ArrowLeft','ArrowRight','ArrowUp','Space','KeyW','KeyA','KeyD','KeyF','Slash','ShiftLeft','ShiftRight'];
window.addEventListener('keydown', (e)=>{
  if(PREVENT_DEFAULT_CODES.includes(e.code)) e.preventDefault();
  handleKey(e.code, true);
});
window.addEventListener('keyup', (e)=>{ handleKey(e.code, false); });

function setJump(k, down){
  if(down && !k.jumpHeld) k.jumpPressed = true;
  if(!down) k.jumpReleased = true;
  k.jumpHeld = down;
}

function handleKey(code, down){
  const twoP = game.mode==='2p';

  // Player 1: arrow keys always; WASD/X/Shift too, but only when solo
  // (so those keys are free for Player 2 in co-op).
  if(code==='ArrowLeft' || (!twoP && code==='KeyA')) keys1.left = down;
  if(code==='ArrowRight' || (!twoP && code==='KeyD')) keys1.right = down;
  if(code==='ArrowUp' || code==='Space' || (!twoP && code==='KeyW')) setJump(keys1, down);
  if(code==='Slash' || code==='ShiftRight' || (!twoP && (code==='KeyX'||code==='KeyK'||code==='ShiftLeft'))) keys1.fire = down;

  // Player 2: WASD to move/jump, F (or left-Shift) to fire — co-op only.
  if(twoP){
    if(code==='KeyA') keys2.left = down;
    if(code==='KeyD') keys2.right = down;
    if(code==='KeyW') setJump(keys2, down);
    if(code==='KeyF' || code==='ShiftLeft') keys2.fire = down;
  }

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
// Touch controls always drive Player 1 (co-op is keyboard-only, see #screen-playerselect).
bindTouch('btn-left', ()=>keys1.left=true, ()=>keys1.left=false);
bindTouch('btn-right', ()=>keys1.right=true, ()=>keys1.right=false);
bindTouch('btn-fire', ()=>keys1.fire=true, ()=>keys1.fire=false);
bindTouch('btn-jump', ()=>{ if(!keys1.jumpHeld) keys1.jumpPressed=true; keys1.jumpHeld=true; }, ()=>{ keys1.jumpHeld=false; keys1.jumpReleased=true; });
