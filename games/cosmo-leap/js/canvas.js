/* =========================================================
   CANVAS — grabs the canvas/context from the DOM.
   Leaf module: no internal imports.
   ========================================================= */
export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
