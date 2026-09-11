/* =========================================================
   LEVEL DATA — builder helpers + the LEVELS data array.
   Imports config.js only.
   ========================================================= */
import { CH, GROUND_Y } from './config.js';

function seg(x1,x2){ return {x:x1, y:GROUND_Y, w:x2-x1, h: CH+120-GROUND_Y, type:'solid'}; }
function plat(x,y,w,h){ return {x, y, w, h:h||14, type:'solid'}; }
function haz(x1,x2,y,h){ return {x:x1, y, w:x2-x1, h:h||6, type:'hazard'}; }
function blk(x,y,kind,item){ return {x, y, w:24, h:24, type:'block', kind, item: item||null, used:false, bump:0}; }
function buildGround(width, gaps){
  const segs=[]; let cursor=0;
  const sorted = gaps.slice().sort((a,b)=>a[0]-b[0]);
  for(const g of sorted){ if(cursor<g[0]) segs.push(seg(cursor,g[0])); cursor=g[1]; }
  if(cursor<width) segs.push(seg(cursor,width));
  return segs;
}
function shardRow(x0,y,count,step){ const arr=[]; for(let i=0;i<count;i++) arr.push({x:x0+i*step, y}); return arr; }

export const LEVELS = [
/* ---------------- 1-1 : NEBULA FIELDS ---------------- */
{
  code:'1-1', name:'NEBULA FIELDS', theme:'nebula', width:3050, timeLimit:150,
  start:{x:40,y:GROUND_Y-28},
  ground: buildGround(3050, [[600,680],[1150,1225],[1870,1945]]),
  platforms: [ plat(1880,195,55,12), plat(2430,195,145,12) ],
  blocks: [ blk(420,170,'core','boost'), blk(1300,170,'ore'), blk(1334,170,'ore'), blk(2080,170,'core','burst') ],
  hazards: [],
  enemies: [
    {type:'crawler', x:500, rangeMin:460, rangeMax:580},
    {type:'crawler', x:950, rangeMin:870, rangeMax:1120},
    {type:'crawler', x:1510, rangeMin:1430, rangeMax:1610},
    {type:'crawler', x:2200, rangeMin:2130, rangeMax:2390},
    {type:'floater', x:780, y:150, amp:40, speed:1.2},
    {type:'floater', x:2650, y:150, amp:55, speed:1.4}
  ],
  vents: [],
  boss: null, gate: null,
  shards: [].concat(
    shardRow(610,190,5,15),
    shardRow(2440,175,8,17),
    shardRow(970,205,4,20),
    [{x:2860,y:200},{x:2910,y:190},{x:2960,y:200}]
  ),
  items: [],
  goal: {x:2990, y:GROUND_Y}
},
/* ---------------- 1-2 : COMET CAVES ---------------- */
{
  code:'1-2', name:'COMET CAVES', theme:'caves', width:2950, timeLimit:150,
  start:{x:40,y:GROUND_Y-28},
  ground: buildGround(2950, [[480,560],[1370,1440],[2260,2340]]),
  platforms: [ plat(0,40,2950,16) ],
  blocks: [ blk(290,170,'ore'), blk(1120,170,'core','nova'), blk(1150,170,'ore'), blk(1970,170,'core','burst') ],
  hazards: [ haz(960,1020,224,6), haz(1820,1880,224,6) ],
  enemies: [
    {type:'crawler', x:680, rangeMin:620, rangeMax:920},
    {type:'crawler', x:1570, rangeMin:1470, rangeMax:1770},
    {type:'crawler', x:2510, rangeMin:2400, rangeMax:2640},
    {type:'floater', x:1220, y:150, amp:35, speed:1.6}
  ],
  vents: [ {x:800}, {x:1640}, {x:2560} ],
  boss: null, gate: null,
  shards: [].concat(
    shardRow(300,200,3,16),
    shardRow(1570,150,5,18),
    shardRow(2610,190,6,16)
  ),
  items: [],
  goal: {x:2900, y:GROUND_Y}
},
/* ---------------- 1-3 : ASTEROID BELT ---------------- */
{
  code:'1-3', name:'ASTEROID BELT', theme:'belt', width:3250, timeLimit:160,
  start:{x:40,y:GROUND_Y-28},
  ground: [],
  platforms: [
    plat(0,230,175,16),
    plat(275,230,125,14),
    plat(480,195,105,14),
    plat(655,230,90,14),
    plat(815,165,85,14),
    plat(980,210,105,14),
    plat(1200,230,90,14),
    plat(1380,185,85,14),
    plat(1555,230,115,14),
    plat(1765,185,85,14),
    plat(1935,215,105,14),
    plat(2115,185,85,14),
    plat(2285,230,115,14),
    plat(2495,195,95,14),
    plat(2685,230,125,14),
    plat(2880,205,115,14),
    plat(3015,230,155,16)
  ],
  blocks: [ blk(680,175,'core','boost'), blk(2320,190,'core','burst') ],
  hazards: [],
  enemies: [
    {type:'floater', x:545, y:150, amp:45, speed:1.3},
    {type:'floater', x:1090, y:150, amp:50, speed:1.1},
    {type:'floater', x:1680, y:130, amp:55, speed:1.5},
    {type:'floater', x:2230, y:140, amp:45, speed:1.3},
    {type:'floater', x:2840, y:150, amp:50, speed:1.2}
  ],
  vents: [],
  boss: null, gate: null,
  shards: [].concat(
    [295,495,665,825,990,1210,1390,1565,1775,1945,2125,2295,2505,2695,2890].map(x=>({x, y:180}))
  ),
  items: [ {type:'shield', x:1610, y:195} ],
  goal: {x:3210, y:230}
},
/* ---------------- 1-4 : CORE REACTOR ---------------- */
{
  code:'1-4', name:'CORE REACTOR', theme:'reactor', width:2750, timeLimit:170,
  start:{x:40,y:GROUND_Y-28},
  ground: buildGround(2750, [[720,790],[1470,1530]]),
  platforms: [],
  blocks: [ blk(150,170,'ore'), blk(1280,170,'core','life') ],
  hazards: [ haz(390,450,224,6), haz(1030,1100,224,6), haz(1720,1800,224,6) ],
  enemies: [
    {type:'crawler', x:530, rangeMin:460, rangeMax:680},
    {type:'crawler', x:880, rangeMin:850, rangeMax:1030},
    {type:'crawler', x:1620, rangeMin:1570, rangeMax:1710},
    {type:'crawler', x:1950, rangeMin:1870, rangeMax:2150}
  ],
  vents: [ {x:250}, {x:930}, {x:1620} ],
  boss: {x:2300, y:GROUND_Y-56, minX:2210, maxX:2490},
  gate: {x:2150, y:80, w:14, h:170},
  shards: [].concat(
    shardRow(180,190,3,16),
    shardRow(1310,150,4,16),
    shardRow(1920,200,4,16)
  ),
  items: [],
  goal: {x:2710, y:GROUND_Y}
}
];
