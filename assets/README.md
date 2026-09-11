# Sprite assets

Drop matching `.svg` files here to replace the built-in vector-drawn
look in `cosmo-leap.html`. The game checks for each file by name on
load; anything missing just falls back to the current procedural
drawing, so files can be added one at a time without breaking the game.

## Exporting from Illustrator

- `Object → Expand Appearance` (and expand strokes) before exporting,
  so nothing depends on live effects.
- `File → Export → Export As → SVG`, styling **"Presentation
  Attributes,"** fonts **"Convert to Outlines"** if any text is used.
- No linked/embedded raster images inside the SVG — keep it pure
  vector paths.
- Crop each artboard tightly to the artwork (no big empty margins) —
  the game scales each file to fit, so excess padding just makes the
  art render smaller than intended.

## Character poses (`viking-*.svg`)

These are anchored by the **bottom-center** of the artboard — export
each one standing on the same baseline, horizontally centered, so
swapping between poses doesn't visibly shift the character:

| File | Used when |
|---|---|
| `viking-idle.svg` | standing still |
| `viking-walk1.svg` / `viking-walk2.svg` | alternate every ~140ms while moving (2-frame walk cycle; if only one exists, `viking-idle.svg` is used as the other frame automatically since the game just keeps checking `ready`) |
| `viking-jump.svg` | airborne (jumping or falling) |
| `viking-shoot.svg` | briefly, right after firing an arrow |
| `viking-hurt.svg` | while the post-hit invincibility flash is active |
| `viking-dead.svg` | during the death sequence |

The character automatically mirrors horizontally when facing left, so
export every pose facing **right**.

## Icons & world objects (fit to a bounding box, centered)

| File | Used for |
|---|---|
| `arrow.svg` | the fired projectile (auto-mirrors by travel direction; export pointing right) |
| `bow-icon.svg` | the bow pickup that unlocks shooting |
| `gem.svg` | collectible shards, and the shield pickup |
| `coin.svg` | the double-jump pickup |
| `chest.svg` | the glowing "core" block (item-dispensing) |
| `crate.svg` | the plain breakable "ore" block |
| `bomb.svg` | the rolling crawler enemy |

These don't need a baseline anchor — they're centered and scaled to
fit their in-game bounding box, so square-ish artboards work best.
