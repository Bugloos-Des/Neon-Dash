/* =========================================================
   SCREENS — pure DOM show/hide of `.screen` elements.
   Leaf module: no imports.
   ========================================================= */
export function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  document.getElementById('screen-'+id).classList.remove('hidden');
}
export function hideAllScreens(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
}
