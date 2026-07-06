# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Moe: a lazy-boss robot for kids, living on a physical Arduino UNO Q ("Ardy") in a hallway. Kids are his agents: he wakes when they linger, they salute to accept missions ("GET A SPOON", "JUMP 3 TIMES"), the camera verifies fetch quests, and he celebrates or sulks accordingly. Currently at **Stage 0.5** — see PROGRESS.md for exact status and next steps.

## The three deployment surfaces

1. **`python/main.py`** — Moe's brain, runs on the board's Linux side inside an App Lab container. State machine: `SLEEPING → GREET → WAIT_ACK → ISSUE_TASK → WAIT_RETURN → REACT|GAVE_UP → COOLDOWN`. Also hosts the console hub (HTTP + SSE, port 8737) and the shift album (mission log + photos).
2. **`sketch/sketch.ino`** — the MCU side: LED-matrix faces + text scroller + optional D2 button, driven over the Bridge (`show_face`, `scroll_text`, `take_button`). Recompiled/reflashed automatically on app restart. The include is `Arduino_RouterBridge.h` (underscore — `ArduinoRouterBridge.h` does not exist).
3. **`python/moe_console.html`** — live web console, served by the board itself at `http://<board>:8737/`. Mirrors the LED matrix pixel-for-pixel (fonts/faces ported from sketch.ino — keep them in sync), streams state/log, shows the shift album, and has remote controls (walk-by, salute, DONE button, audio test) via POST `/cmd`.

## Deploying (no App Lab GUI needed)

```
scp python/main.py python/moe_console.html arduino@<board-ip>:ArduinoApps/moe/python/
ssh arduino@<board-ip> 'arduino-app-cli app restart user:moe'
```

Board address and every hardware quirk (camera-by-path requirement, gesture runner hack, ALSA card detection, volume, corrupted-logs workaround) are documented in **README.md → "Stage 0.5 field notes"**. Read that section before touching board-facing code — each note is a trap already sprung once.

## Non-obvious architecture decisions

- **Voice is pre-rendered, not TTS.** The board's TTS brick is unusable (needs a VENTUNO Q NPU + unshipped models). Moe's script is fixed strings in main.py, rendered on the Mac with `say -v Ralph` into `python/sounds/voice/<md5(text)[:10]>.wav`. **After editing any spoken string, regenerate**: the generator ast-parses main.py (MISSIONS speak fields + TRUST_SUFFIX appended for trust missions, GREETINGS/PRAISE/GRUMBLES/GAVEUPS spoken halves, FETCH_PRAISE+praise combos), renders only missing slugs, then peak-normalizes to 95% full scale. If a line has no WAV, Moe logs `(no voice wav for this line)` to the console.
- **Camera is shared.** One `Camera("usb:/dev/video0")` feeds both `VideoObjectDetection` and `GestureRecognition`. Never let anything construct its own default `Camera()` — a second open wedges /dev/video0 (see field notes).
- **The gesture runner is hand-rolled** (`moe-gesture-runner` container, NPU delegate patched to CPU) because the brick isn't in this App Lab version's registry. If salutes die: `docker start moe-gesture-runner`.
- **Detection confidence is 0.45 deliberately** — 0.60 made fetch quests nearly impossible (YoloX-nano rarely exceeds 0.6 on handheld objects). Fetch mission objects must be COCO classes.
- **Mission history** (`python/missions/log.jsonl` + JPGs, on the board) is the source of truth for `missions_done` across restarts; gave-ups are logged but never counted.
- Console pages cache hard — the HTML is served with the app, so a stale browser tab after redeploys is the usual cause of "states not showing"; hard-refresh first.

## Debugging

- Live telemetry: `curl http://<board>:8737/status` (state, face, last 80 events), `/missions` (album).
- During `WAIT_RETURN`, the console log prints `camera sees: <label> <conf>, …` every ~2.5s — the primary tool for "why isn't my object detected".
- `arduino-app-cli app logs user:moe`; when that fails with a JSON error (null bytes after crashes), use `docker logs moe-main-1`.
