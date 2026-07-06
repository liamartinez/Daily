# MOE — Stage 0: the silent-movie boss

Moe is a lazy boss who lives on an Arduino UNO Q. Kids are his agents.
Stage 0 has no speaker or mic yet, so Moe communicates entirely in LED-matrix
faces and scrolling text: he naps, spots a kid via the webcam, wakes up,
scrolls a mission ("GET A SPOON"), waits, and celebrates with a heart face
when the agent returns. Every mission ends in praise — he is a very
trusting boss.

The state machine here is the same one as the browser prototype
(`moe_hq.html`): SLEEPING → GREET → ISSUE_TASK → WAIT_RETURN → REACT →
COOLDOWN → back to sleep. The voice states (listening for "yeah",
judging trivia answers) arrive in Stage 2.

## What you need

- Arduino UNO Q (set up once with App Lab and joined to your Wi-Fi)
- USB webcam (UVC — any normal one)
- USB-C hub **with power-delivery passthrough** + a 5V/3A USB-C charger,
  because the board's single port must carry power *and* the webcam at
  the same time. (Not an Apple dongle — the docs specifically exclude those.)

### No hub yet? Test tonight anyway
Set `SIMULATE = True` at the top of `python/main.py`. A pretend kid walks
past every 25 seconds, "leaves", and "comes back", so you can watch the whole
loop — faces, scrolling missions, heart celebration — with just the board
plugged into your computer over USB-C. Flip it back to `False` when the
hub arrives.

## Install

1. In App Lab, create a new App called **Moe**.
2. In the **Bricks** tab, add **Video Image Classification** and select the
   *person* model. (Let App Lab write the `app.yaml` entry itself — its
   brick id/version will match your install.)
3. Paste `python/main.py` over the app's Python file, and
   `sketch/sketch.ino` over the sketch file.
4. Click **Run**. First run is slow (it downloads the brick's Docker
   container); later runs are much faster.
5. When it works, use **Copy and edit app** and set your copy as the
   **startup app** so Moe boots on power-up in the hallway, no laptop needed.

Optional: wire any pushbutton (or a jumper wire you can tap) between **D2**
and **GND** — that becomes the agents' "I'M DONE!" button. Everything works
without it; missions also complete when the kid leaves the frame and comes
back, or when Moe's patience timer runs out.

## Live console (watch Moe from anywhere in the house)

`main.py` runs a tiny telemetry hub (stdlib only, port `8737`). Any browser on
the same wifi can watch the real Moe live — his face mirrored on a fake LED
matrix, state machine, missions, and the hallway log — and poke him remotely:

- **Open `http://<board>.local:8737/`** — Moe serves the console page himself
  (`python/moe_console.html` deploys with the app). If mDNS doesn't resolve,
  use the board's IP from App Lab.
- Or double-click `python/moe_console.html` locally, type the board address,
  press Connect.

The two remote buttons are honest stand-ins for the real inputs: **fake a
walk-by** feeds the person detector (same `on_person()` path as the camera),
and **DONE** lands in the same `button_pressed()` as the wired D2 button.
The stream survives reconnects — a late-joining console replays the last 80
events. If the hub can't bind its port it prints a warning and Moe carries on;
the console is never load-bearing.

## Tuning knobs (top of main.py)

- `MISSIONS`, `GREETINGS`, `PRAISE` — Moe's whole personality. Add lines!
  Keep missions SHORT and UPPERCASE — they scroll at ~0.4 s per character.
- `WAKE_AFTER_S` — how long a kid must linger before Moe wakes (stops him
  greeting everyone who merely walks past).
- `CONFIDENCE` — raise it if Moe keeps waking up for the dog.

Faces are plain 13-character strings in `sketch.ino` — design new ones in the
browser prototype, paste them in.

## Stage 0.5 field notes (learned on the real board, July 2026)

- **Board**: "Ardy", SSH key-auth as `arduino@192.168.50.133`. App lives at
  `~/ArduinoApps/moe/`; deploy = scp files there + `arduino-app-cli app restart user:moe`.
- **Camera**: MUST be constructed as `Camera("usb:/dev/video0")`. The default
  resolves to a *name* string OpenCV can't open, then leaks a handle per retry
  and wedges /dev/video0 (this is also why the built-in "Detect Objects on
  Camera" example fails on this board).
- **Gesture brick**: not in this App Lab registry, and its runner demands the
  VENTUNO Q's NPU. Workaround: hand-rolled container `moe-gesture-runner`
  (gesture-recognition-runner:0.10.0 image, NPU delegate patched to CPU via
  a mounted inference.py at ~/moe-gesture/, alias `gesture_recognition` on the
  moe_default network). If salutes stop working: `docker start moe-gesture-runner`.
  In main.py, GestureRecognition MUST share the detector's camera object.
- **Voice**: the TTS brick is unavailable (no NPU, no models shipped, not in
  registry). Moe's voice = pre-rendered WAVs (macOS `say -v Ralph`), one per
  script line, keyed by md5(text)[:10] in `python/sounds/voice/`. After
  changing any spoken line, regenerate on the laptop (script lives in the
  session notes; it ast-parses main.py so slugs can't drift).
- **Audio out**: USB speaker via Apple USB-C→3.5mm adapter = ALSA card 1.
  main.py auto-detects it (`_usb_alsa_device`). If silent: `amixer -c 1 sset
  Headphone 100% unmute` — the adapter defaults to −23dB — and check the
  speakers' own volume knob (that was the actual culprit once).
- **Sketch**: the include is `Arduino_RouterBridge.h` (underscore). App restart
  recompiles + reflashes the MCU automatically.
- **Logs**: `arduino-app-cli app logs user:moe`; if it dies with a JSON error
  (null bytes after a crash), use `docker logs moe-main-1` or the console's
  event history at :8737.

## Troubleshooting (honest edition)

- **Import errors in main.py**: App Lab's Python module names have shifted
  between versions. Open the built-in *Detect Objects on Camera* example and
  copy its import lines + brick class name into `main.py`. The rest is
  version-independent.
- **`matrix.draw` not found**: some core versions call it `loadFrame`, and
  some name the class `ArduinoLEDMatrix` instead of `Arduino_LED_Matrix`.
  Check the built-in LED matrix example for your install's spelling.
- **Bridge signature complaints** on `show_face(String)` /
  `scroll_text(String)`: check App Lab's Bridge API reference for your
  version's preferred string type; only the signatures change.
- **Serial monitor empty over Wi-Fi**: known quirk — MCU serial output only
  shows over a direct USB connection. Python `print()`s show fine over the
  network, and main.py prints every state transition.
- **Sluggishness**: normal on the 2GB board while the camera container spins
  up. Stage 0 runs one model, so once running it's smooth.

## Roadmap

- **Stage 1** (hub + USB speaker): add Piper TTS — Moe speaks his lines
  instead of scrolling them.
- **Stage 2** (mic): add Vosk keyword listening — the "yeah" step, trivia
  judging, and the full task deck from the browser prototype.
- **Agent ID** (three kids): see the shopping-list discussion — height zones,
  printed ArUco agent badges, or an NFC clock-in reader on the Qwiic port.
