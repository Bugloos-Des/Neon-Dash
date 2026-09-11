#!/usr/bin/env python3
"""Generate the games' sound effects and music loops via the ElevenLabs
Sound Effects API (https://api.elevenlabs.io/v1/sound-generation).

Run by .github/workflows/generate-audio.yml, which supplies the API key
as ELEVENLABS_API_KEY. Files already present in assets/audio/ are left
alone unless FORCE_REGENERATE=true, so re-running the workflow doesn't
re-spend credits on sounds that already exist.

Both neon-dash.html and cosmo-leap.html look for these exact filenames
under assets/audio/ and fall back to their built-in synth beeps (see
SFX/playSfxFile in each game) whenever a file is missing, so this list
can be extended or trimmed independently of the game code.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

API_KEY = os.environ.get("ELEVENLABS_API_KEY", "").strip()
FORCE = os.environ.get("FORCE_REGENERATE", "false").lower() == "true"
URL = "https://api.elevenlabs.io/v1/sound-generation"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "audio")

# name -> (prompt, duration_seconds, prompt_influence)
SOUND_EFFECTS = {
    # duration_seconds must be >= 0.5 (the ElevenLabs API's own floor) --
    # several of these were originally shorter and got rejected with a 400.
    "jump":     ("retro 8-bit arcade video game jump sound effect, short rising blip", 0.5, 0.6),
    "airjump":  ("retro 8-bit arcade video game double-jump sound effect, higher pitched quick blip", 0.5, 0.6),
    "stomp":    ("retro 8-bit arcade video game enemy stomp sound effect, short squashy thud blip", 0.5, 0.6),
    "hit":      ("retro 8-bit arcade video game player takes damage sound effect, harsh descending blip", 0.5, 0.6),
    "shard":    ("retro 8-bit arcade video game coin or shard collect chime, short sparkly high blip", 0.5, 0.6),
    "power":    ("retro 8-bit arcade video game power-up collected sound effect, rising two-tone chime", 0.5, 0.6),
    "bump":     ("retro 8-bit arcade video game block bump sound effect, short low thud blip", 0.5, 0.6),
    "shoot":    ("retro 8-bit arcade video game laser or arrow shoot sound effect, quick pew blip", 0.5, 0.6),
    "bossHit":  ("retro 8-bit arcade video game boss takes a hit, harsh low impact thud", 0.5, 0.6),
    "explode":  ("retro 8-bit arcade video game explosion sound effect, short noisy boom", 0.6, 0.6),
    "levelup":  ("retro 8-bit arcade video game level complete fanfare, short triumphant three-note jingle", 1.3, 0.5),
    "gameover": ("retro 8-bit arcade video game game over jingle, descending sad four-note melody", 1.6, 0.5),
}

MUSIC = {
    "theme-neon":   ("seamless loop, upbeat 8-bit chiptune background music, cyberpunk neon synthwave arcade platformer, driving energetic bassline", 18, 0.4),
    "theme-nebula": ("seamless loop, whimsical 8-bit chiptune background music, cosmic space platformer adventure, bouncy retro melody", 18, 0.4),
}


def request_sound(prompt, duration, influence, attempt_label):
    body = json.dumps({
        "text": prompt,
        "duration_seconds": duration,
        "prompt_influence": influence,
    }).encode()
    req = urllib.request.Request(
        URL,
        data=body,
        headers={
            "xi-api-key": API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
    )
    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            err = e.read().decode(errors="replace")
            print(f"[{attempt_label}] HTTPError {e.code}: {err[:300]}", file=sys.stderr)
            if e.code == 429 and attempt < max_attempts - 1:
                wait = 20 * (attempt + 1)
                print(f"[{attempt_label}] rate limited, waiting {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            raise
        except Exception as e:
            print(f"[{attempt_label}] error: {e}", file=sys.stderr)
            if attempt < max_attempts - 1:
                time.sleep(5)
                continue
            raise


def main():
    if not API_KEY:
        print("ELEVENLABS_API_KEY is not set", file=sys.stderr)
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = {**{k: v for k, v in SOUND_EFFECTS.items()}, **{k: v for k, v in MUSIC.items()}}

    generated, skipped, failed = [], [], []
    for name, (prompt, duration, influence) in jobs.items():
        out_path = os.path.join(OUT_DIR, f"{name}.mp3")
        if os.path.exists(out_path) and not FORCE:
            print(f"skip existing {name}.mp3")
            skipped.append(name)
            continue
        print(f"generating {name}.mp3 ({duration}s): {prompt}")
        try:
            audio = request_sound(prompt, duration, influence, name)
        except Exception as e:
            print(f"FAILED {name}: {e}", file=sys.stderr)
            failed.append(name)
            continue
        with open(out_path, "wb") as f:
            f.write(audio)
        print(f"saved {out_path} ({len(audio)} bytes)")
        generated.append(name)
        time.sleep(3)  # be gentle on rate limits between requests

    print("\n--- summary ---")
    print("generated:", generated)
    print("skipped (already present):", skipped)
    print("failed:", failed)
    if failed and not generated:
        sys.exit(1)


if __name__ == "__main__":
    main()
