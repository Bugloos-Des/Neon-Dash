# Development & multi-session workflow

Both games used to be a single ~1500-2000 line HTML file with everything —
markup, CSS, and all the JS — inlined in one `<script>` block. That's fine
solo, but it means any two people (or two parallel Claude Code sessions)
editing the same game at the same time are almost guaranteed to collide on
the same file. This doc covers the module layout that replaced it, and how
to split work across multiple sessions/branches without stepping on each
other.

## Layout

```
games/
  neon-dash/
    index.html      # markup only
    style.css        # all CSS, verbatim from the old <style> block
    js/
      config.js       # tuning constants — leaf module, no imports
      utils.js         # clamp/rectsOverlap/clone — leaf module
      canvas.js         # grabs <canvas>/ctx once
      gamestate.js       # the single mutable `game` state object — data only, no imports, no functions
      screens.js          # pure DOM show/hide of .screen overlays
      entities.js          # enemy/entity factories
      levels.js             # level data + builder helpers
      player.js              # player factory + activePlayers()
      audio.js                # synth SFX + mute toggle
      particles.js             # particle spawn/update
      items.js                  # pickups/blocks/power-ups
      run.js                     # game flow: load level, start run, death/score/goal
      physics.js                  # collision resolution + per-frame AI/physics
      render.js                    # all draw*() + render()
      update.js                     # per-frame update(dt) + HUD
      ui.js                          # screen button wiring
      input.js                        # keyboard/touch → keys1/keys2
      main.js                          # wires it together, runs the rAF loop
  cosmo-leap/
    (same shape)
```

`neon-dash.html` and `cosmo-leap.html` at the repo root are now thin
redirect stubs to `games/<name>/`, kept only so old bookmarks/links to the
live site still work. `docs/architecture.md` still describes the *design*
(game loop, input model, physics, level data, etc.) — it's unaffected by
where the code lives, just read `games/<name>/js/` instead of a single file
when it references line numbers.

### Why this split (and not something else)

The module list above is layered so imports only flow one direction — no
two files import each other. Roughly:

1. **Leaf** (config, utils, canvas, `gamestate`, `screens`, `entities`,
   `levels`, `player`) — little or no dependency on the rest of the game.
2. **Mid** (`audio`, `particles`, `items`) — build on the leaves.
3. **Orchestration** (`run`, `physics`) — game-flow and per-frame logic.
4. **Top** (`render`, `update`, `ui`, `input`, `main`) — wire everything
   together and touch the DOM/event listeners.

`gamestate.js` is deliberately just the `const game = {...}` object with
zero functions and zero imports — every other module imports that same
object and mutates its properties. That's what lets `run.js` (game flow)
and `ui.js` (screen buttons) each import from the other's neighbors without
importing each other directly, which is what keeps the graph acyclic.

This matters for parallel work: **a module only needs to be touched by the
session that's changing its concern.** Adding a new enemy type touches
`entities.js` + `physics.js` + `render.js`; retuning jump feel touches only
`config.js`; a new pickup touches `items.js` + `render.js`. Two sessions
working on different concerns very rarely need to edit the same file.

## Splitting work across sessions

For real parallelism (not just organized files), give each concurrent
session/agent its own **git worktree** and branch, so they're not fighting
over the working directory or the index:

```bash
# from the repo root, one worktree per concurrent session
git worktree add ../neon-dash-enemies -b feature/neon-dash-enemies
git worktree add ../neon-dash-audio   -b feature/neon-dash-audio
```

Point one Claude Code session at each worktree. Good ways to split:

- **By game**: one session on `games/neon-dash/`, another on
  `games/cosmo-leap/` — zero file overlap, ever. This is how the two games'
  module splits themselves were done, as it happens.
- **By module/concern within a game**: physics tuning, a new level, audio,
  render/visuals, UI screens — pick modules that don't both need to touch
  `physics.js`+`render.js`+`items.js` for the same feature.
- **Shared files** (`config.js`, `gamestate.js`) are the one place two
  sessions can still collide (e.g. both add a new state field). Keep
  changes there small and merge/rebase promptly rather than letting
  worktrees drift for a long time.

Merge each worktree's branch back (PR or direct merge) once its slice is
done; `git worktree remove <path>` to clean up afterward.

## Running it locally

Because the game is now ES modules (`<script type="module">`), **you can't
just double-click `index.html`** anymore — browsers block module imports
over `file://` (CORS). Serve the repo over plain HTTP instead, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/games/neon-dash/  (or /games/cosmo-leap/)
```

No build step, no bundler, no `node_modules` — same "just static files"
philosophy as before, just served instead of opened directly.
