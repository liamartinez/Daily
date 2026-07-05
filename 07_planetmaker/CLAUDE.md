# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

PlanetMaker is a 2011 physical-computing installation (ITP-era) written in **Processing (Java mode, `.pde` sketches)** with an optional **Arduino** sensor. Users make sounds into a microphone; an FFT picks the dominant frequency and drops a corresponding object (house, tree, volcano, pig…) into orbit around a planet. An Arduino-connected analog sensor (rangefinder/pot on A0) drives zoom and triggers a "start over" reset.

The source of record is `PlanetMaker-master.zip`, extracted to `PlanetMaker-master/`.

## Web port (active development)

`web/` is a faithful browser port of `PlanetMaker_PC/` — plain ES modules, no build step, canvas 2D + Web Audio `AnalyserNode` (Minim-style log-averaged bands, `computeLogBands` in `web/main.js`). All original tuning constants live in `PARAM_DEFS` with the 2011 literals as defaults, adjustable via the on-screen tweak panel; settings persist to localStorage and export as JSON via "copy settings" (that JSON is how versions get frozen). All world coordinates remain in the original 800×500 sketch space, scaled at draw time (`worldScaleNow`); zoom emulates Processing's perspective camera (`CAM_Z = 433`).

Installation hardware hooks are preserved: `web/sensor.js` is a Web Serial (Chrome/Edge) bridge speaking the unchanged `PlanetMaker_Arduino.pde` byte protocol (raw `analogRead` bytes @ 9600 baud); when connected it drives zoom + walk-away reset via `handleSensorByte()` in main.js, replacing hover zoom. Sensor calibration bytes (near/far/reset/lerp) are tweak-panel params.

Run locally: `python3 server.py 8767` (threaded; plain `http.server` hangs with Chrome keep-alive) → http://localhost:8767/web/. Mic access requires localhost or HTTPS. Deployable as-is to any static host.

**Versioning**: `web/` is the frozen v1 faithful port — do not iterate on it; new versions are copies (`web2/` is the active one). Parameter "versions" are frozen as copy-settings JSON blobs from the tweak panel.

## Running the original

There is no build system or test suite. Sketches are opened and run from the **Processing IDE** (each sketch folder name must match its main `.pde` file, so don't rename folders or main files independently).

- Written for **Processing 1.x/2.x era APIs**: `size(600, 600, OPENGL)`, `.vlw` fonts (`data/Serif-48.vlw`), `Serial.list()[0]`, and the old `stop()`/`super.stop()` Minim teardown. Running under modern Processing 4 requires porting (e.g. `OPENGL` → `P3D`, updated Minim/serial handling).
- Required libraries: **Minim** (audio FFT), **processing.serial** (Arduino variants only), **processing.opengl**.
- The Arduino sketch (`PlanetMaker_Arduino/PlanetMaker_Arduino.pde`) just streams `analogRead(A0)` bytes at 9600 baud. The Processing side blindly opens `Serial.list()[0]` — the sketch crashes at setup without a serial device attached; use the `_PC` variant when no Arduino is present.
- Prebuilt exports exist in `PlanetMaker/application.{macosx,windows32,windows64}/` — these are stale build artifacts, not source to edit.

## Three sketch variants (parallel, mostly-duplicated code)

| Folder | Difference |
|---|---|
| `PlanetMaker/` | Main version: Arduino serial input for zoom/reset, `Earth` centerpiece |
| `planets_PCOMP__SHOW5/` | Show version, near-identical to `PlanetMaker/` plus an unused `Lightning.pde` |
| `PlanetMaker_PC/` | No-Arduino version: mouse/keyboard instead of serial, `Note` labels, no `Earth` |

These were forked by copy-paste, not shared code. A change to shared behavior (e.g. `things.pde`, `Star.pde`) usually needs to be applied to each variant separately — check `diff` between variants before assuming they match.

## Architecture

Each variant is one flat Processing sketch; all classes share the sketch's global scope (e.g. `Earth.display()` reads the global `blankearth` image directly).

- **Main sketch** (`PlanetMaker.pde` etc.) — all global state, `setup()`/`draw()`, audio analysis, serial handling. The core loop: `fft.forward(input.mix)` → find the loudest frequency bin (`highestPlace`) → if amplitude > 3 and the bin differs from `lasthighestplace`, map bin 100–512 → picture index 0–44 and spawn a `Thing` at a random free angle.
- **Placement collision**: `usedthetas[360]` marks occupied orbit angles. `checkLocation1()` tests a ±4/+7 degree window; `checkLocation2()` is the same test but also claims the slot. Reset clears the whole array.
- **`things.pde`** (`Thing` class) — an orbiting sprite: `rotate(theta); translate(distance, 0, z)` around screen center. The newest `Thing` is drawn wiggling/tinted (size driven by live audio amplitude `waver`); older ones draw static. `pictures[0..44]` in `data/` maps frequency to sprite.
- **`Earth.pde`** — non-interactive rotating planet image at center.
- **`Star.pde`** — 40 background stars orbiting at random distances.
- **`StartOver.pde`, `Note.pde`, `Planet.pde`** — reset button, text label, and an older planet class; partially vestigial (much code is commented out).
- **Serial protocol**: raw sensor byte clamped to 25–31, mapped to `zoomout` (−800..0, lerped). Byte > 28 triggers the reset (clear `things`, clear `usedthetas`); the `pushed` flag debounces it.
