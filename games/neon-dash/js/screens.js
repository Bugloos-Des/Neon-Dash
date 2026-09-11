/* =========================================================
   SCREENS — pure DOM show/hide of the `.screen` overlays.
   No game-state knowledge, no imports: this keeps run.js and
   ui.js from having to import each other (both import this).
   ========================================================= */
export function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  document.getElementById('screen-'+id).classList.remove('hidden');
}
export function hideAllScreens(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
}
