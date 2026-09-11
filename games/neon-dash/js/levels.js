/* =========================================================
   LEVEL DATA — declarative arrays + small builder helpers.
   See docs/architecture.md §6.
   ========================================================= */
import { GROUND_Y, CH } from './config.js';

function seg(x1,x2){ return {x:x1, y:GROUND_Y, w:x2-x1, h: CH+120-GROUND_Y, type:'solid'}; }
function plat(x,y,w,h){ return {x, y, w, h:h||14, type:'solid'}; }
function haz(x1,x2,y,h){ return {x:x1, y, w:x2-x1, h:h||6, type:'plasma'}; }
function blk(x,y,kind,item){ return {x, y, w:24, h:24, type:'block', kind, item: item||null, used:false, bump:0}; }
function buildGround(width, pits){
  const segs=[]; let cursor=0;
  const sorted = pits.slice().sort((a,b)=>a[0]-b[0]);
  for(const p of sorted){ if(cursor<p[0]) segs.push(seg(cursor,p[0])); cursor=p[1]; }
  if(cursor<width) segs.push(seg(cursor,width));
  return segs;
}
function shardRow(x0,y,count,step){ const arr=[]; for(let i=0;i<count;i++) arr.push({x:x0+i*step, y}); return arr; }

export const LEVELS = [
/* ---------------- 1-1 : OUTER GRID ---------------- */
{
  code:'1-1', name:'OUTER GRID', theme:'outskirts', width:3100, timeLimit:150,
  start:{x:40,y:GROUND_Y-28},
  ground: buildGround(3100, [[620,700],[1180,1260],[1905,1985]]),
  platforms: [ plat(1915,195,60,12), plat(2470,195,150,12) ],
  blocks: [ blk(430,170,'energy','nano'), blk(1330,170,'data'), blk(1364,170,'data'), blk(2110,170,'energy','shardburst') ],
  hazards: [],
  enemies: [
    {type:'scuttler', x:520, rangeMin:480, rangeMax:600},
    {type:'scuttler', x:980, rangeMin:900, rangeMax:1160},
    {type:'scuttler', x:1550, rangeMin:1470, rangeMax:1650},
    {type:'scuttler', x:2250, rangeMin:2180, rangeMax:2440},
    {type:'drone', x:800, y:150, amp:40, speed:1.2},
    {type:'drone', x:2700, y:150, amp:55, speed:1.4}
  ],
  turrets: [],
  boss: null, gate: null,
  shards: [].concat(
    shardRow(630,190,5,15),
    shardRow(2480,175,8,17),
    shardRow(1000,205,4,20),
    [{x:2900,y:200},{x:2950,y:190},{x:3000,y:200}]
  ),
  items: [],
  goal: {x:3040, y:GROUND_Y}
},
/* ---------------- 1-2 : SUB-GRID TUNNELS ---------------- */
{
  code:'1-2', name:'SUB-GRID TUNNELS', theme:'tunnels', width:3000, timeLimit:150,
  start:{x:40,y:GROUND_Y-28},
  ground: buildGround(3000, [[500,580],[1400,1470],[2300,2380]]),
  platforms: [ plat(0,40,3000,16) ],
  blocks: [ blk(300,170,'data'), blk(1150,170,'energy','plasma'), blk(1180,170,'data'), blk(2000,170,'energy','shardburst') ],
  hazards: [ haz(980,1040,224,6), haz(1850,1910,224,6) ],
  enemies: [
    {type:'scuttler', x:700, rangeMin:640, rangeMax:940},
    {type:'scuttler', x:1600, rangeMin:1500, rangeMax:1800},
    {type:'scuttler', x:2550, rangeMin:2440, rangeMax:2680},
    {type:'drone', x:1250, y:150, amp:35, speed:1.6}
  ],
  turrets: [ {x:820}, {x:1670}, {x:2600} ],
  boss: null, gate: null,
  shards: [].concat(
    shardRow(310,200,3,16),
    shardRow(1600,150,5,18),
    shardRow(2650,190,6,16)
  ),
  items: [],
  goal: {x:2950, y:GROUND_Y}
},
/* ---------------- 1-3 : ORBITAL CAUSEWAY ---------------- */
{
  code:'1-3', name:'ORBITAL CAUSEWAY', theme:'orbital', width:3300, timeLimit:160,
  start:{x:40,y:GROUND_Y-28},
  ground: [],
  platforms: [
    plat(0,230,180,16),
    plat(280,230,130,14),
    plat(490,195,110,14),
    plat(670,230,95,14),
    plat(840,165,90,14),
    plat(1010,210,110,14, ),
    plat(1240,230,95,14),
    plat(1430,185,90,14),
    plat(1610,230,120,14),
    plat(1830,185,90,14),
    plat(2010,215,110,14),
    plat(2200,185,90,14),
    plat(2380,230,120,14),
    plat(2600,195,100,14),
    plat(2800,230,130,14),
    plat(3000,205,120,14),
    plat(3140,230,160,16)
  ],
  blocks: [ blk(700,175,'energy','nano'), blk(2420,190,'energy','shardburst') ],
  hazards: [],
  enemies: [
    {type:'drone', x:560, y:150, amp:45, speed:1.3},
    {type:'drone', x:1120, y:150, amp:50, speed:1.1},
    {type:'drone', x:1720, y:130, amp:55, speed:1.5},
    {type:'drone', x:2280, y:140, amp:45, speed:1.3},
    {type:'drone', x:2900, y:150, amp:50, speed:1.2}
  ],
  turrets: [],
  boss: null, gate: null,
  shards: [].concat(
    [300,510,690,860,1030,1260,1450,1630,1850,2030,2220,2400,2620,2820,3020].map(x=>({x, y:180}))
  ),
  items: [ {type:'overdrive', x:1650, y:195} ],
  goal: {x:3260, y:230}
},
/* ---------------- 1-4 : CORE FORTRESS ---------------- */
{
  code:'1-4', name:'CORE FORTRESS', theme:'fortress', width:2800, timeLimit:170,
  start:{x:40,y:GROUND_Y-28},
  ground: buildGround(2800, [[750,820],[1500,1560]]),
  platforms: [],
  blocks: [ blk(150,170,'data'), blk(1300,170,'energy','life') ],
  hazards: [ haz(400,460,224,6), haz(1050,1120,224,6), haz(1750,1830,224,6) ],
  enemies: [
    {type:'scuttler', x:550, rangeMin:480, rangeMax:700},
    {type:'scuttler', x:900, rangeMin:870, rangeMax:1050},
    {type:'scuttler', x:1650, rangeMin:1600, rangeMax:1740},
    {type:'scuttler', x:1980, rangeMin:1900, rangeMax:2180}
  ],
  turrets: [ {x:250}, {x:950}, {x:1650} ],
  boss: {x:2350, y:GROUND_Y-56, minX:2260, maxX:2540},
  gate: {x:2200, y:80, w:14, h:170},
  shards: [].concat(
    shardRow(180,190,3,16),
    shardRow(1330,150,4,16),
    shardRow(1950,200,4,16)
  ),
  items: [],
  goal: {x:2760, y:GROUND_Y}
}
];
