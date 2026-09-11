# Cosmo Leap — Engine Architecture

> **Note:** the code originally lived in one `cosmo-leap.html` file; it's
> since been split into ES modules under `games/cosmo-leap/js/` (same for
> `neon-dash.html` → `games/neon-dash/js/`) so multiple people/sessions can
> work on different parts in parallel — see `docs/development.md` for the
> module layout and workflow. Everything below still describes the *design*
> accurately; just read it as "this pattern lives in `js/<module>.js`"
> rather than "this pattern lives at line N of the one file."

This document explains how Cosmo Leap is built: the patterns it uses
and why, so it can double as a learning reference for browser platformer
engines in general (the same techniques show up in classic Mario-style
clones like FullScreenMario, but everything described here is original code
written for this project — no assets or level data were copied from
anywhere).

The whole game is dependency-free: a `<canvas>`, some CSS for the HUD/menus,
and plain ES modules (`games/cosmo-leap/js/*.js`) — split into one file per
concern, but no build step and no external game libraries. Just the 2D
canvas API and the Web Audio API.

## 1. Game loop & state machine

```js
let lastTime = 0;
function loop(ts){
  const dt = Math.min((ts-lastTime)/1000, 0.033) || 0;
  lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

Everything is driven by one `requestAnimationFrame` loop. `dt` (delta time,
in seconds) is clamped to `0.033` (~30fps worth of simulation time) so that
a slow frame — e.g. the tab was backgrounded — doesn't cause the physics to
"tunnel" a fast-moving entity through a wall in one giant step.

`game.state` is a plain string acting as a finite state machine:
`start → intro → playing ⇄ paused → dying → levelcomplete → (next level) → win`.
`update(dt)` branches on `game.state` at the top and returns early for
non-gameplay states, so the physics/collision code only ever has to reason
about the `'playing'` case.

## 2. Input handling

Keyboard and touch are unified into one plain object, `keys`, which the
physics step reads from — it never checks `event` objects directly:

```js
const keys = { left:false, right:false, jumpHeld:false, fire:false, jumpPressed:false, jumpReleased:false };
```

- `jumpHeld` is the live "is the button down right now" state.
- `jumpPressed` / `jumpReleased` are one-frame **edge triggers** — set to
  `true` the instant the button changes state, and consumed (reset to
  `false`) the next time physics reads them. This is what lets a jump
  register exactly once per press, regardless of how many frames the key
  is held, while still letting physics react to press/release timing
  separately from the held state (used for variable jump height — see §4).

Touch buttons (`bindTouch`) drive the exact same `keys` object via
`pointerdown`/`pointerup`, so gameplay code never needs to know or care
which input device is active.

## 3. Audio: synthesis instead of files

There are no `.wav`/`.mp3` assets. Every sound effect is a short envelope
on a Web Audio oscillator:

```js
function beep(freq,dur,type,vol,slide){
  const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
  osc.type=type; osc.frequency.setValueAtTime(freq,t0);
  if(slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide), t0+dur);
  gain.gain.setValueAtTime(vol,t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0+dur); // exponential decay = natural-sounding fade
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(t0); osc.stop(t0+dur+0.02);
}
```

Named effects (`SFX.jump`, `SFX.stomp`, `SFX.shard`, ...) are just presets
of `(frequency, duration, waveform, volume, pitch-slide)`. This keeps the
whole game a single file with zero binary assets, at the cost of a more
limited sound palette than sampled audio — a reasonable trade for an
8-bit-style arcade game.

Browsers block audio until a user gesture; `unlockAudioOnce` lazily
creates/resumes the `AudioContext` on the first keydown or pointerdown.

## 4. Physics: gravity, jump feel, and why order matters

Constants like `GRAVITY`, `JUMP_VELOCITY`, `MOVE_ACCEL` are tuned by feel,
but two techniques make the jump feel responsive rather than rigid:

- **Coyote time** (`COYOTE_TIME`): the player can still jump for ~90ms
  *after* walking off a ledge. Without it, platformers feel unfairly
  strict because players almost never press jump at the exact
  frame they leave the ground.
- **Jump buffering** (`JUMP_BUFFER`): a jump press is remembered for
  ~120ms even if the player isn't grounded yet (e.g. pressed jump just
  *before* landing). Combined with coyote time, both timers count down
  every frame and a jump fires the instant both are simultaneously > 0.
- **Variable jump height**: releasing jump early while still ascending
  cuts the upward velocity (`p.vy *= JUMP_CUT`), giving a short hop on a
  tap and a full jump on a hold — one physics system, two feels.
- **Double jump via power-up**: `p.airJumpsLeft` is reset to `1` (if
  boosted) only when grounded, then consumed on the first mid-air jump —
  a one-line gate on top of the same jump code path.

## 5. Collision: axis-separated AABB resolution

`resolveEntityCollisions` moves an entity one axis at a time, resolving
collisions between each move:

```js
e.x += e.vx*dt;
for(const s of solids) if(rectsOverlap(e,s)) { /* snap out along X */ }
e.y += e.vy*dt;
for(const s of solids) if(rectsOverlap(e,s)) { /* snap out along Y */ }
```

Resolving X and Y **separately** (rather than moving diagonally and
resolving once) is what makes a character sliding along a wall while
falling behave correctly — it can still fall straight down even while
horizontal motion is blocked, because the two axes never fight over the
same overlap. This same function is reused for the player, popped-out
items, and anything else that needs solid-ground physics — one collision
routine, several callers.

Enemies use simpler range/patrol or sine-wave motion instead of full
physics (see `updateEnemies`) since they don't need gravity or jumping.

## 6. Level data as declarative arrays + factory functions

Levels aren't drawn or scripted — they're **data**:

```js
{
  code:'1-1', name:'NEBULA FIELDS', theme:'nebula', width:3050,
  ground: buildGround(3050, [[600,680], ...]),   // gaps punched into a floor
  blocks: [ blk(420,170,'core','boost'), ... ],
  enemies: [ {type:'crawler', x:500, rangeMin:460, rangeMax:580}, ... ],
  ...
}
```

Helper functions (`seg`, `plat`, `haz`, `blk`, `buildGround`, `shardRow`)
are small builders that turn short descriptions into full rectangle/entity
records. `loadLevel(idx)` then runs **factory functions**
(`makeCrawler`, `makeFloater`, `makeVent`, `makeBoss`) over that raw data to
produce the live, mutable entity objects the update loop operates on.

This separation matters for learning: the *data* (what's in a level) is
kept completely apart from the *behavior* (what a crawler does each
frame, defined once in `updateEnemies`). Adding a new level is just adding
a new object to the `LEVELS` array — no new code paths needed, as long as
it only uses existing entity types.

**Try it:** duplicate the `1-1` object in `LEVELS`, change `code`/`name`,
and edit the `ground`/`enemies`/`shards` arrays — that's the entire
surface area for building a new level.

## 7. Camera

```js
const target = game.player.x + game.player.w/2 - CW/2;
game.camera.x = clamp(target, 0, Math.max(0, game.level.width - CW));
```

The camera just centers on the player horizontally, clamped so it never
scrolls past the level's start or end. `render()` then applies a single
`ctx.translate(-game.camera.x, ...)` before drawing world content, so
every draw function can work in *world space* and never needs to know
about scrolling at all — screen-space-only elements (the HUD, particles'
text) are drawn outside that translated block, or, for particles, inside
it but unaffected because they're already stored in world coordinates.

## 8. Particles

A single flat array (`game.particles`) holds two particle "types" —
`dot` (a physics-driven spark with gravity) and `text` (a floating
score/label) — distinguished by a `type` field and drawn with an
if/else in `drawParticles`. There's no particle *class hierarchy*; a
particle is just a plain object literal, which keeps `spawnParticles`/
`spawnTextParticle` trivial and the render loop a single flat pass.

## 9. Render order

`render()` draws in a fixed back-to-front order — background, solids,
blocks, hazards, vents, goal marker, shards, items, enemies, boss,
projectiles, particles, player — so nearer/more important elements
naturally draw over farther ones without any manual z-index bookkeeping.
Per-level **themes** (`THEMES` object: sky gradient + accent colors) are
looked up once per level and referenced throughout drawing, so reskinning
a level's palette is a one-line change to its `theme` field.

## Extending this project (suggested exercises)

- **New enemy type**: add a factory (`makeX`), a branch in `updateEnemies`
  for its behavior, and a `drawEnemyX`. Reference it from a level's
  `enemies` array with `{type:'x', ...}`.
- **New power-up**: add a case in `collectItem`/`giveBlockItem`, a visual
  in `drawItems`, and gate a player ability behind its flag (the way
  `p.boosted` gates double-jump).
- **Level editor**: the level objects are just JSON-shaped data — a
  natural next project is an in-browser tool that lets you place
  `ground`/`blocks`/`enemies` visually and emits a `LEVELS`-compatible
  object, rather than hand-writing coordinates.
- **Spatial partitioning**: collision here is brute-force (every entity
  checks every solid). It's fine at this scale, but a natural next step
  for a much larger level is bucketing solids into a coarse grid keyed by
  position, and only checking the bucket(s) an entity currently overlaps.
