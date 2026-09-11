/* =========================================================
   AUDIO — tiny synth, no assets. Mute toggle + audio-unlock
   listeners. DOM-only + own state; no other module imports
   needed.
   ========================================================= */
let audioCtx=null, muted=false;
export function ensureAudio(){
  if(!audioCtx){ try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; } }
  if(audioCtx.state==='suspended') audioCtx.resume();
}
function beep(freq,dur,type,vol,slide){
  if(muted || !audioCtx) return;
  const t0=audioCtx.currentTime;
  const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
  osc.type=type||'square';
  osc.frequency.setValueAtTime(freq,t0);
  if(slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide), t0+dur);
  gain.gain.setValueAtTime(vol||0.15,t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0+dur);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(t0); osc.stop(t0+dur+0.02);
}
export const SFX = {
  jump: ()=>beep(500,0.11,'square',0.11,240),
  airjump: ()=>beep(680,0.1,'square',0.1,180),
  stomp: ()=>beep(200,0.1,'square',0.15,-80),
  hit: ()=>beep(150,0.28,'sawtooth',0.18,-100),
  shard: ()=>beep(1050,0.06,'square',0.09,320),
  power: ()=>{ beep(340,0.09,'square',0.14,220); setTimeout(()=>beep(540,0.13,'square',0.14,300),90); },
  bump: ()=>beep(230,0.06,'square',0.12,0),
  shoot: ()=>beep(760,0.07,'sawtooth',0.1,-220),
  bossHit: ()=>beep(160,0.2,'sawtooth',0.2,-60),
  explode: ()=>beep(95,0.45,'sawtooth',0.2,-40),
  levelup: ()=>{ [660,880,1100].forEach((f,i)=>setTimeout(()=>beep(f,0.15,'square',0.15,0),i*120)); },
  gameover: ()=>{ [420,340,260,180].forEach((f,i)=>setTimeout(()=>beep(f,0.28,'sawtooth',0.15,0),i*160)); },
};
document.getElementById('mute-btn').addEventListener('click', toggleMute);
export function toggleMute(){ muted=!muted; document.getElementById('mute-btn').textContent = muted?'🔇':'🔊'; }

function unlockAudioOnce(){ ensureAudio(); window.removeEventListener('keydown', unlockAudioOnce); window.removeEventListener('pointerdown', unlockAudioOnce); }
window.addEventListener('keydown', unlockAudioOnce, {once:false});
window.addEventListener('pointerdown', unlockAudioOnce, {once:false});
