/* =========================================================
   CANVAS — grabs the 2D context once, shared by render.js.
   ========================================================= */
export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
