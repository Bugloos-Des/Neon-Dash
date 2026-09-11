/* =========================================================
   PARTICLES — spawn/update. Imports gamestate.js.
   ========================================================= */
import { game } from './gamestate.js';

export function spawnParticles(x,y,color,count){
  for(let i=0;i<(count||6);i++){
    const ang = Math.random()*Math.PI*2, spd = 40+Math.random()*90;
    game.particles.push({type:'dot', x,y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd-40, life:0.5+Math.random()*0.3, maxLife:0.8, color, size:2+Math.random()*2});
  }
}
export function spawnTextParticle(text,x,y,color){
  game.particles.push({type:'text', text, x, y, vy:-35, life:0.9, maxLife:0.9, color});
}
export function updateParticles(dt){
  for(const pt of game.particles){
    pt.life -= dt;
    pt.x += (pt.vx||0)*dt; pt.y += (pt.vy||0)*dt;
    if(pt.type==='dot') pt.vy += 300*dt;
  }
  game.particles = game.particles.filter(pt=>pt.life>0);
}
