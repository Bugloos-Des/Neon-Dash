/* =========================================================
   UI WIRING — screen transitions and menu button handlers.
   ========================================================= */
import { game } from './gamestate.js';
import { showScreen, hideAllScreens } from './screens.js';
import { ensureAudio } from './audio.js';
import { startNewGame, loadLevel, advanceLevel } from './run.js';

export function togglePause(){
  if(game.state==='playing'){ game.state='paused'; showScreen('pause'); }
  else if(game.state==='paused'){ game.state='playing'; hideAllScreens(); }
}
export function confirmScreen(){
  if(!document.getElementById('screen-playerselect').classList.contains('hidden')){
    document.getElementById('btn-1p').click(); return;
  }
  if(game.state==='start') document.getElementById('btn-start').click();
  else if(game.state==='levelcomplete') document.getElementById('btn-continue').click();
  else if(game.state==='gameover') document.getElementById('btn-retry').click();
  else if(game.state==='win') document.getElementById('btn-playagain').click();
}

document.getElementById('btn-start').addEventListener('click', ()=>{ ensureAudio(); showScreen('playerselect'); });
document.getElementById('btn-1p').addEventListener('click', ()=>{ ensureAudio(); startNewGame('1p'); });
document.getElementById('btn-2p').addEventListener('click', ()=>{ ensureAudio(); startNewGame('2p'); });
document.getElementById('btn-playerselect-back').addEventListener('click', ()=>{ showScreen('start'); });
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-restart-level').addEventListener('click', ()=>{ loadLevel(game.levelIndex); game.state='intro'; game.introTimer=1.2; hideAllScreens(); });
document.getElementById('btn-quit').addEventListener('click', ()=>{ game.state='start'; showScreen('start'); });
document.getElementById('btn-continue').addEventListener('click', ()=>{ advanceLevel(); });
document.getElementById('btn-retry').addEventListener('click', ()=>{ ensureAudio(); startNewGame(); });
document.getElementById('btn-menu2').addEventListener('click', ()=>{ game.state='start'; showScreen('start'); });
document.getElementById('btn-playagain').addEventListener('click', ()=>{ ensureAudio(); startNewGame(); });
document.getElementById('pause-btn').addEventListener('click', togglePause);
