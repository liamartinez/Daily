# Moe — progress journal

## Where we are: Stage 0.5 (July 6, 2026)

Moe is **alive in the hallway and fully playable**. As of tonight, a kid can:
sparkle-lure → get greeted by voice → salute (open palm / thumbs up) to accept →
receive a spoken + scrolled mission → complete it (camera-verified for fetch
quests, thumbs-up/button for trust missions) → get a heart-face, fanfare, and a
photo album entry. Ignoring him produces a proper spoken sulk.

Working end-to-end, verified with real humans:
- ✅ Person-detection wake (YoloX, shared camera), dwell timer, sparkle earcon lure
- ✅ Salute acknowledgment via hand-rolled CPU gesture runner + stand-at-attention fallback
- ✅ Camera-verified fetch quests ("SHOW ME A CUP" → `verified` in the log means Moe SAW it)
- ✅ Full voice (pre-rendered Ralph WAVs through USB adapter) + 6 earcons
- ✅ Expectant blinking while waiting; mission re-scrolled every ~22s as a reminder
- ✅ GAVE_UP state (grumpy sulk, logged with an "aftermath" photo, not counted)
- ✅ Shift album: every mission logged to JSONL with briefing/proof/celebration photos,
  browsable in the live console; mission count survives restarts
- ✅ Live web console at `http://<board>:8737/` — pixel-true LED mirror, state machine,
  log with live "camera sees:" detection debugging, remote controls

## Current tuning (knobs at top of main.py)

CONFIDENCE 0.45 · WAKE_AFTER_S 1.5 · ACK_TIME_S 20 (psst nudge at 8s) ·
MISSION_TIME_S 75 · REMIND_EVERY_S 22 · attention-ack at 6s of presence

## Known rough edges / watch list

- **Fetch quests are still finicky** — 0.45 confidence helps, but small/odd objects
  may never score. Use the console's `camera sees:` line to diagnose; swap missions
  to friendlier COCO classes if needed (person, cup, banana, book, teddy bear,
  sports ball, bottle all tested or plausible).
- **Trusting pass inflation**: a kid standing in frame for 75s auto-completes trust
  missions (`trusted` outcome). By design, but ranks inflate on busy days.
- **Gesture runner fragility**: hand-rolled container outside App Lab's management.
  `docker start moe-gesture-runner` if salutes stop. Object-detection runner
  sometimes reports "unhealthy" while working fine.
- **Speaker loudness**: everything maxed in software; the Apple adapter is
  headphone-level. If the hallway needs more, buy a powered USB speaker.
- **Voice regeneration** is a laptop step (macOS `say`) — new/edited spoken lines
  are silent until regenerated (console logs a warning when a WAV is missing).

## Backlog (rough priority)

1. **Watch kids play; tune** — do they discover the salute? Is 22s reminder cadence right?
2. **Agent identity** — printed ArUco badges ("AGENT JUNIPER") read via OpenCV on the
   Linux side; per-kid greetings, mission counts, and album filtering. No new ML needed.
3. **Bigger face** — recommended: 8×32 WS2812B panel (~$35 with PSU + level shifter);
   same 8-row geometry, FastLED port of sketch.ino keeps the same face strings.
   Wildcard: any monitor via USB-C DP alt-mode showing the console fullscreen.
4. **Mission deck growth** — more fetch quests around reliable COCO classes; seasonal
   missions; kid-authored missions (they add lines, we regenerate voice).
5. **Stage 2 (mic)** — Vosk keyword listening for "yeah"/"done"/trivia answers, the full
   browser-prototype deck. Needs a USB mic (webcam has none) + the browser prototype's
   never-listen-while-talking rule.
6. **Album niceties** — "best of shift" export, per-day pages, photo rotation if needed.

## History

- **2011-era**: (unrelated repo history) — see moe_hq.html browser prototype for the
  original vision: full voice interaction, trivia deck, ranks.
- **Stage 0** (`moe_stage0.zip`, now stale): silent-movie boss — faces + scrolling text,
  person detection, trust missions only.
- **Stage 0.5** (this): live console, YoloX eyes + fetch verification, salute, voice,
  earcons, blinking, GAVE_UP, shift album with photos. Debugging war stories and every
  hardware trap live in README.md → "Stage 0.5 field notes".
