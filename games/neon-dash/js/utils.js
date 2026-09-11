/* =========================================================
   UTILS — small pure helpers, no imports.
   ========================================================= */
export const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
export const rectsOverlap = (a,b)=> a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
export const clone = (o)=> JSON.parse(JSON.stringify(o));
