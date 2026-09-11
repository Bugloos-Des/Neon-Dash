# Sprite assets

Drop matching files here (`.png`/`.webp`/`.svg` all work — anything
`Image()` can load) to replace the built-in procedurally-drawn look in
`cosmo-leap.html`. The game checks for each file by name on load;
anything missing just falls back to the current procedural drawing, so
files can be replaced one at a time without breaking the game. The
`p1-*`/`gem`/`coin`/etc. `.png` files currently here are AI-generated
(Gemini Flash, image-referenced off the two robots in `start-bg.webp`
below) — swap any of them out at will, same rule applies.

## `start-bg.webp`

AI-generated 8-bit key art shared by both games as the backdrop for
their start and player-select screens (and, dimmed, behind the whole
page) — `neon-dash.html` and `cosmo-leap.html` each have their own two
`url('assets/start-bg.webp')` CSS rules pointing at this same file. It's
referenced by CSS `background-image`, so swapping in a different piece
of art (or giving each game its own) is just replacing/adding a file and
repointing those rules — no other code changes needed.

## `env-bg.webp`

AI-generated in-canvas level backdrop for `cosmo-leap.html` (same neon
pixel-art style/reference as `start-bg.webp`, so the actual gameplay
now matches the menus and the robot characters instead of looking like
a different game). It's drawn once per frame as a **static** layer —
deliberately not tiled or scrolled with the camera, since the source
art has a centered vanishing-point composition that wouldn't repeat
seamlessly — with each level's theme color washed over it at low alpha
for variety (see `drawBackground()`). Falls back to the original
procedural gradient+silhouettes look if the file is missing, same rule
as every other asset here. `neon-dash.html` doesn't use this file; it
still draws its own background procedurally.

## Character poses (`p1-*.png` / `p2-*.png`)

Player 1 and Player 2 (co-op) each have their own full pose set — P2 is
just P1's design recolored, matching the magenta robot in `start-bg.webp`
next to P1's cyan one. These are anchored by the **bottom-center** of
the artboard — keep every pose standing on the same baseline,
horizontally centered, so swapping between poses doesn't visibly shift
the character:

| File | Used when |
|---|---|
| `p1-idle.png` / `p2-idle.png` | standing still |
| `p1-walk1.png` / `p1-walk2.png` (and `p2-*`) | alternate every ~140ms while moving (2-frame walk cycle; if only one exists, `*-idle.png` is used as the other frame automatically since the game just keeps checking `ready`) |
| `p1-jump.png` / `p2-jump.png` | airborne (jumping or falling) |
| `p1-shoot.png` / `p2-shoot.png` | briefly, right after firing an arrow |
| `p1-hurt.png` / `p2-hurt.png` | while the post-hit invincibility flash is active |
| `p1-dead.png` / `p2-dead.png` | during the death sequence |

The character automatically mirrors horizontally when facing left, so
export every pose facing **right**.

## Icons & world objects (fit to a bounding box, centered)

| File | Used for |
|---|---|
| `arrow.png` | the fired projectile (auto-mirrors by travel direction; export pointing right) |
| `bow-icon.png` | the bow pickup that unlocks shooting |
| `gem.png` | collectible shards, and the shield pickup |
| `coin.png` | the double-jump pickup |
| `chest.png` | the glowing "core" block (item-dispensing) |
| `crate.png` | the plain breakable "ore" block |
| `bomb.png` | the rolling crawler enemy |
| `floater.png` | the hovering floater enemy |
| `boss.png` | the sector boss (not shown during its white invuln-hit flash, which stays a flat color for readability) |

These don't need a baseline anchor — they're centered and scaled to
fit their in-game bounding box, so square-ish artboards work best.

## Exporting a replacement from Illustrator (SVG)

If you'd rather hand-author a replacement as a vector file instead of
generating one: `Object → Expand Appearance` (and expand strokes)
before exporting, `File → Export → Export As → SVG` styling
**"Presentation Attributes"** (fonts **"Convert to Outlines"** if any
text is used), no linked/embedded raster images — keep it pure vector
paths, and crop the artboard tightly to the artwork (no big empty
margins, since the game scales each file to fit). Then update the
matching filename in the `SPRITES` list near the top of
`cosmo-leap.html`'s `<script>` (the loader takes any path `Image()`
can load, extension included).
