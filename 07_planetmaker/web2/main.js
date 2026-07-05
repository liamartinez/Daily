// PlanetMaker — web port of PlanetMaker_PC.pde (Processing, 2011).
// Faithful to the original mechanics; every "tuned" constant is exposed as a
// live control so drifted values (mic scale, motion feel) can be recalibrated.
//
// Installation hooks (for rebuilding the physical piece):
//  - Microphone: initAudio() — swap the getUserMedia constraints to pin a
//    specific input device for a gallery setup.
//  - Distance sensor: sensor.js (Web Serial) + handleSensorByte() below —
//    speaks the unchanged PlanetMaker_Arduino.pde byte protocol; when
//    connected it drives zoom and the walk-away reset, replacing hover zoom.

import { SensorLink } from './sensor.js?v=1';

// ---------------------------------------------------------------- parameters

// Defaults are the original sketch's literal constants unless noted.
const PARAM_DEFS = [
  // audio — micGain has no original equivalent: it bridges Web Audio's scale
  // to Minim's, so "threshold 10" means what it meant in 2011.
  { key: 'micGain',    group: 'audio',  label: 'mic gain',        min: 0.005, max: 0.4,  step: 0.005, def: 0.08 },
  { key: 'threshold',  group: 'audio',  label: 'spawn threshold', min: 1,     max: 40,   step: 0.5,   def: 10 },
  { key: 'smoothing',  group: 'audio',  label: 'FFT smoothing',   min: 0,     max: 0.95, step: 0.05,  def: 0.6 },

  // motion & layout — original values: 0.006, ×10 wiggle, 90, 246, 450, 870
  { key: 'orbitSpeed',   group: 'motion', label: 'orbit speed',       min: 0,    max: 0.03, step: 0.0005, def: 0.006 },
  { key: 'wiggle',       group: 'motion', label: 'newest-item wiggle', min: 0,   max: 30,   step: 1,      def: 10 },
  { key: 'thingSize',    group: 'motion', label: 'item size',         min: 30,   max: 200,  step: 5,      def: 90 },
  { key: 'orbitDist',    group: 'motion', label: 'orbit distance',    min: 150,  max: 420,  step: 2,      def: 246 },
  { key: 'planetSize',   group: 'motion', label: 'planet size',       min: 200,  max: 700,  step: 10,     def: 450 },
  { key: 'worldScale',   group: 'motion', label: 'overall scale',     min: 0.4,  max: 2,    step: 0.05,   def: 1 },
  { key: 'spectrumBase', group: 'motion', label: 'spectrum baseline', min: 500,  max: 1000, step: 10,     def: 870 },

  // distance sensor — originals from PlanetMaker.pde serialEvent():
  // clamp bytes to 25–31, byte > 28 wipes the planet, lerp factor 0.5
  { key: 'sensorNear',  group: 'sensor', label: 'sensor byte: zoomed out', min: 0,    max: 127, step: 1,    def: 25 },
  { key: 'sensorFar',   group: 'sensor', label: 'sensor byte: zoomed in',  min: 1,    max: 127, step: 1,    def: 31 },
  { key: 'sensorReset', group: 'sensor', label: 'reset trigger byte',      min: 0,    max: 127, step: 1,    def: 28 },
  { key: 'sensorLerp',  group: 'sensor', label: 'sensor smoothing',        min: 0.05, max: 1,   step: 0.05, def: 0.5 },
];

const CHECK_DEFS = [
  { key: 'hoverZoom',    label: 'hover top-right to zoom (original)', def: true },
  { key: 'showSpectrum', label: 'show spectrum bars',                 def: true },
];

const DEFAULTS = Object.fromEntries(
  [...PARAM_DEFS, ...CHECK_DEFS].map(d => [d.key, d.def]));

let params = { ...DEFAULTS };
try {
  const saved = JSON.parse(localStorage.getItem('planetmaker-settings'));
  if (saved) params = { ...DEFAULTS, ...saved };
} catch (e) { /* fresh start */ }

function saveParams() {
  localStorage.setItem('planetmaker-settings', JSON.stringify(params));
}

// ------------------------------------------------------------------- assets

// pictures[0..53] exactly as loaded in PlanetMaker_PC.pde setup()
const PICTURE_FILES = [
  'pig', 'cactus', 'house', 'tree', 'mushroom', 'banana', 'cherry', 'flower',
  'strawberry', 'tallhouse', 'volcano', 'rose', 'castlebig', 'castletower',
  'castletower2', 'castletower3', 'coffee', 'brownstone', 'building',
  'converse', 'sneakers', 'flipflop', 'streetlamp', 'car', 'snowman', 'drink',
  'bowling', 'paperclip', 'stapler', 'elephant', 'alarm', 'hydrant', 'bomb',
  'pig', 'cactus', 'house', 'tree', 'mushroom', 'banana', 'cherry', 'flower',
  'strawberry', 'tallhouse', 'volcano', 'pig', 'cactus', 'house', 'tree',
  'mushroom', 'banana', 'cherry', 'flower', 'strawberry', 'tallhouse',
];

function loadImage(name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load ' + name));
    img.src = 'assets/' + name;
  });
}

const assets = {};   // bg, star, starmask, startover, save
let pictures = [];   // Image[54]
let starSprite;      // star.png pre-masked with starmask.png (original masked per frame)

async function loadAssets() {
  const uniques = [...new Set(PICTURE_FILES)];
  const [uniqueImgs, bg, star, starmask, startover, save] = await Promise.all([
    Promise.all(uniques.map(n => loadImage(n + '.png'))),
    loadImage('BG.png'), loadImage('star.png'), loadImage('starmask.png'),
    loadImage('startover.png'), loadImage('save.png'),
  ]);
  const byName = Object.fromEntries(uniques.map((n, i) => [n, uniqueImgs[i]]));
  pictures = PICTURE_FILES.map(n => byName[n]);
  Object.assign(assets, { bg, star, startover, save });

  const c = document.createElement('canvas');
  c.width = star.width; c.height = star.height;
  const g = c.getContext('2d');
  g.drawImage(star, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(starmask, 0, 0, star.width, star.height);
  starSprite = c;
}

// -------------------------------------------------------------------- audio

let audioCtx, analyser, freqData, bands = [], binHz = 0;

// Minim: new FFT(...).logAverages(12, 4) — octave splits down to a 12 Hz-wide
// bottom octave, 4 bands per octave. Reproduced so band k → pictures[k] maps
// the same frequency ranges to the same sprites as the original.
function computeLogBands(sampleRate) {
  const nyq = sampleRate / 2;
  let octaves = 1;
  for (let n = nyq; (n /= 2) > 12;) octaves++;
  const out = [];
  for (let o = 0; o < octaves; o++) {
    const lo = o === 0 ? 0 : nyq / Math.pow(2, octaves - o);
    const hi = nyq / Math.pow(2, octaves - o - 1);
    const step = (hi - lo) / 4;
    for (let b = 0; b < 4; b++) out.push([lo + b * step, lo + (b + 1) * step]);
  }
  return out.slice(0, PICTURE_FILES.length);
}

async function initAudio() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false },
  });
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;  // 1024 bins ≈ Minim's default buffer
  analyser.smoothingTimeConstant = params.smoothing;
  source.connect(analyser);
  freqData = new Uint8Array(analyser.frequencyBinCount);
  binHz = audioCtx.sampleRate / analyser.fftSize;
  bands = computeLogBands(audioCtx.sampleRate);
}

// Per-frame band averages in ~Minim units (micGain calibrates the bridge).
function getBandAverages() {
  analyser.smoothingTimeConstant = params.smoothing;
  analyser.getByteFrequencyData(freqData);
  return bands.map(([lo, hi]) => {
    let a = Math.max(0, Math.floor(lo / binHz));
    let b = Math.min(freqData.length - 1, Math.floor(hi / binHz));
    if (b < a) b = a;
    let sum = 0;
    for (let i = a; i <= b; i++) sum += freqData[i];
    return (sum / (b - a + 1)) * params.micGain;
  });
}

// -------------------------------------------------------------- world state

// All positions/sizes are in the original sketch's coordinate space
// (800×500 window, origin at planet center) and scaled at draw time.

class Thing {
  constructor(distance, thetaDeg, picture) {
    this.distance = distance;
    this.theta = thetaDeg * Math.PI / 180;
    this.picture = picture;
  }
  orbit() { this.theta += params.orbitSpeed; }
}

class Star {
  constructor() {
    this.distance = rand(450, 1500);
    this.diameter = rand(30, 100);
    this.theta = rand(0, 360);           // original: random(0,360) used as radians
    this.orbitspeed = rand(0.007, 0.009);
  }
  orbit() { this.theta += this.orbitspeed; }
}

class MiniPlanet {
  constructor(distance, theta, canvas, size) {
    this.distance = distance;
    this.theta = theta;
    this.canvas = canvas;
    this.size = size;
  }
  orbit() { this.theta += params.orbitSpeed; }
}

function rand(a, b) { return a + Math.random() * (b - a); }

let things = [];
let planets = [];
const stars = Array.from({ length: 40 }, () => new Star());
let usedthetas = new Array(360).fill(false);
let lasthighestplace = -1;
let waver = 0;

// original checkLocation1: window [t-4, t+7)
function checkLocation1(t) {
  t = Math.floor(t);
  for (let i = t - 4; i < t + 7; i++) if (usedthetas[i]) return false;
  return true;
}
// original checkLocation2: window [t, t+5), claims the slot on success
function checkLocation2(t) {
  t = Math.floor(t);
  for (let i = t; i < t + 5; i++) if (usedthetas[i]) return false;
  usedthetas[t] = true;
  return true;
}

function startOver() {
  things = [];
  usedthetas.fill(false);
}

// original spawn loop, verbatim logic
function trySpawn(highest, highestPlace) {
  let oktoplace = false, counter = 0;
  while (!oktoplace) {
    const randomlocation = rand(5, 350);
    oktoplace = checkLocation1(randomlocation);
    if (oktoplace && highestPlace !== lasthighestplace) {
      checkLocation2(randomlocation);
      lasthighestplace = highestPlace;
      things.push(new Thing(params.orbitDist, randomlocation,
        pictures[Math.min(highestPlace, pictures.length - 1)]));
    }
    if (++counter > 100) oktoplace = true;
  }
}

// ------------------------------------------------------------------ drawing

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, dpr = 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
}
window.addEventListener('resize', resize);
resize();

const mouse = { x: -1, y: -1, down: false };
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', onCanvasClick);

let zoomout = 0;   // 0 (close) … -800 (far), as in the original
const CAM_Z = 433; // Processing default camera z for a 500px-tall window

// ---- distance-sensor hook (original PlanetMaker.pde serialEvent, verbatim:
// clamp byte to near/far, map to translate-z, lerp; crossing the reset byte
// wipes the planet, debounced by `pushed`)
let sensorPushed = false;
const sensor = new SensorLink(handleSensorByte, setSensorStatus);

function handleSensorByte(inByte) {
  const lo = params.sensorNear, hi = Math.max(params.sensorFar, params.sensorNear + 1);
  const b = Math.max(lo, Math.min(hi, inByte));
  const raw = ((b - lo) / (hi - lo)) * 800 - 800; // map(b, lo, hi, -800, 0)
  zoomout += (raw - zoomout) * params.sensorLerp;
  if (inByte > params.sensorReset && !sensorPushed) {
    startOver();
    sensorPushed = true;
  } else if (sensorPushed && inByte < params.sensorReset) {
    sensorPushed = false;
  }
}

function setSensorStatus(text) {
  document.getElementById('sensor-status').textContent = text;
  document.getElementById('btn-sensor').textContent =
    sensor.connected ? 'disconnect sensor' : 'connect sensor (serial)';
}

function worldScaleNow() {
  return Math.min(W / 800, H / 500) * params.worldScale;
}
function zoomScaleNow() {
  return CAM_Z / (CAM_Z - zoomout);
}

// on-canvas buttons, original placement: (width - width/5, height - height/4)
function buttonRects() {
  const bw = 130, bh = 80;
  const x = W - W / 5, y = H - H / 4;
  return {
    startover: { x, y, w: bw, h: bh },
    save: { x: x + bw + 5, y, w: bw, h: bh },
  };
}

function onCanvasClick(e) {
  const { startover, save } = buttonRects();
  const mx = e.clientX, my = e.clientY;
  const inside = r => mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h;
  if (inside(startover)) startOver();
  else if (inside(save)) savePlanet();
}

// original "SAVE": grab the planet + its things off the stage, mask into a
// circle, launch it as a small planet orbiting far out
function savePlanet() {
  const s = worldScaleNow() * zoomScaleNow();
  const r = (params.planetSize / 2 + params.thingSize) * s;
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.drawImage(canvas,
    (W / 2 - r) * dpr, (H / 2 - r) * dpr, 2 * r * dpr, 2 * r * dpr,
    0, 0, size, size);
  g.globalCompositeOperation = 'destination-in';
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  g.fill();
  planets.push(new MiniPlanet(rand(400, 1200), rand(0, Math.PI * 2), c, rand(100, 300)));
}

function draw() {
  requestAnimationFrame(draw);
  if (!analyser) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // ---- zoom (original: mouse in top-right quadrant maps to translate-z)
  if (params.hoverZoom && !sensor.connected &&
      mouse.y >= 0 && mouse.y < H / 2 && mouse.x > W / 2) {
    // original: zoomout = constrain(map(mouseY, 0, height/2, 0, -800), -800, 0)
    zoomout = Math.max(-800, Math.min(0, (mouse.y / (H / 2)) * -800));
  }

  const s = worldScaleNow() * zoomScaleNow();

  // ---- world space: planet, things, stars, saved mini-planets
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(s, s);

  ctx.drawImage(assets.bg, -2900 / 2, -2600 / 2, 2900, 2600);

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1 / s;
  ctx.beginPath();
  ctx.arc(0, 0, params.planetSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < things.length; i++) {
    const t = things[i];
    t.orbit();
    const sizemod = (i === things.length - 1) ? waver * params.wiggle : 1;
    const n = params.thingSize + sizemod;
    ctx.save();
    ctx.rotate(t.theta);
    ctx.translate(t.distance, 0);
    ctx.drawImage(t.picture, -n / 2, -n / 2, n, n);
    ctx.restore();
  }

  for (const st of stars) {
    st.orbit();
    ctx.save();
    ctx.rotate(st.theta);
    ctx.translate(st.distance, 0);
    ctx.drawImage(starSprite, 0, 0, st.diameter, st.diameter); // CORNER mode, as original
    ctx.restore();
  }

  for (const p of planets) {
    p.orbit();
    ctx.save();
    ctx.rotate(p.theta);
    ctx.translate(p.distance, 0);
    ctx.drawImage(p.canvas, -p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }

  ctx.restore();

  // ---- audio analysis + spawn
  const avgs = getBandAverages();
  waver = avgs[0]; // original loop left waver = band 0's amplitude

  let highest = 0, highestPlace = 0;
  for (let k = avgs.length - 1; k >= 0; k--) {
    if (avgs[k] > highest) { highest = avgs[k]; highestPlace = k; }
  }
  updateMeter(highest);
  if (highest > params.threshold) trySpawn(highest, highestPlace);

  // ---- spectrum along the bottom (original: baseline y=870 in a 500px
  // window — bars mostly live below the screen edge; sprites ride the loud
  // band peaks up into view, drawn rotated -90°, one 40px over one 30px)
  const baseWorldY = params.spectrumBase;
  const sSpec = worldScaleNow();
  const bw = W / avgs.length;
  for (let k = avgs.length - 1; k >= 0; k--) {
    const barTopWorld = baseWorldY - avgs[k] * 10;
    if (params.showSpectrum) {
      const yBase = H + (baseWorldY - 500) * sSpec;
      const yTop = H + (barTopWorld - 500) * sSpec;
      ctx.fillStyle = 'rgb(150,150,150)';
      ctx.fillRect(k * bw, yTop, bw, yBase - yTop);
    }
    let ourheight = barTopWorld;
    if (ourheight > 600) ourheight = baseWorldY - 20;
    const ySprite = H + (ourheight - 500) * sSpec;
    if (ySprite < H + 60) {
      const pic = pictures[Math.min(k, pictures.length - 1)];
      ctx.save();
      ctx.translate(k * bw + bw, ySprite);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(pic, -20, -20, 40, 40);
      ctx.drawImage(pic, -15, -15, 30, 30);
      ctx.restore();
    }
  }

  // ---- buttons
  const { startover, save } = buttonRects();
  ctx.drawImage(assets.startover, startover.x, startover.y, startover.w, startover.h);
  ctx.drawImage(assets.save, save.x, save.y, save.w, save.h);
}

// ----------------------------------------------------------------- controls

const panel = document.getElementById('panel');
document.getElementById('panel-toggle').addEventListener('click', () => {
  panel.classList.toggle('collapsed');
  document.getElementById('panel-arrow').textContent =
    panel.classList.contains('collapsed') ? '▸' : '▾';
});

const sliderEls = {};

function buildControls() {
  for (const def of PARAM_DEFS) {
    const host = document.getElementById(
      { audio: 'sliders-audio', motion: 'sliders-motion', sensor: 'sliders-sensor' }[def.group]);
    const div = document.createElement('div');
    div.className = 'ctl';
    div.innerHTML = `<label>${def.label} <span class="val"></span></label>
      <input type="range" min="${def.min}" max="${def.max}" step="${def.step}">`;
    const input = div.querySelector('input');
    const val = div.querySelector('.val');
    input.value = params[def.key];
    val.textContent = params[def.key];
    input.addEventListener('input', () => {
      params[def.key] = parseFloat(input.value);
      val.textContent = input.value;
      saveParams();
    });
    host.appendChild(div);
    sliderEls[def.key] = { input, val };
  }
  for (const def of CHECK_DEFS) {
    const div = document.createElement('div');
    div.className = 'ctl check';
    div.innerHTML = `<input type="checkbox" id="chk-${def.key}"><label for="chk-${def.key}">${def.label}</label>`;
    const input = div.querySelector('input');
    input.checked = params[def.key];
    input.addEventListener('change', () => {
      params[def.key] = input.checked;
      saveParams();
    });
    document.getElementById('checks').appendChild(div);
    sliderEls[def.key] = { input };
  }

  const btnSensor = document.getElementById('btn-sensor');
  if (!('serial' in navigator)) {
    btnSensor.disabled = true;
    document.getElementById('sensor-status').textContent = 'needs Chrome/Edge';
  }
  btnSensor.addEventListener('click', async () => {
    try {
      if (sensor.connected) await sensor.disconnect();
      else await sensor.connect();
    } catch (err) {
      setSensorStatus(err.name === 'NotFoundError' ? 'not connected' : err.message);
    }
  });

  document.getElementById('btn-startover').addEventListener('click', startOver);
  document.getElementById('btn-save').addEventListener('click', savePlanet);
  document.getElementById('btn-reset').addEventListener('click', () => {
    params = { ...DEFAULTS };
    saveParams();
    syncControls();
  });
  document.getElementById('btn-copy').addEventListener('click', async () => {
    const json = JSON.stringify(params, null, 1);
    const out = document.getElementById('settings-out');
    out.style.display = 'block';
    out.value = json;
    try { await navigator.clipboard.writeText(json); } catch (e) { out.select(); }
  });
}

function syncControls() {
  for (const def of PARAM_DEFS) {
    sliderEls[def.key].input.value = params[def.key];
    sliderEls[def.key].val.textContent = params[def.key];
  }
  for (const def of CHECK_DEFS) sliderEls[def.key].input.checked = params[def.key];
}

const meterFill = document.querySelector('#meter .fill');
const meterThresh = document.querySelector('#meter .thresh');
const meterBox = document.getElementById('meter');
const levelVal = document.getElementById('level-val');
const METER_MAX = 40;
let meterFrame = 0;

function updateMeter(highest) {
  if (panel.classList.contains('collapsed') || (meterFrame++ % 3)) return;
  meterFill.style.width = Math.min(100, (highest / METER_MAX) * 100) + '%';
  meterThresh.style.left = Math.min(100, (params.threshold / METER_MAX) * 100) + '%';
  meterBox.classList.toggle('hot', highest > params.threshold);
  levelVal.textContent = highest.toFixed(1);
}

// -------------------------------------------------------------------- start

buildControls();

const overlay = document.getElementById('start-overlay');
overlay.addEventListener('click', async () => {
  overlay.querySelector('.go').textContent = 'loading…';
  try {
    await Promise.all([loadAssets(), initAudio()]);
    await audioCtx.resume();
    overlay.remove();
    requestAnimationFrame(draw);
  } catch (err) {
    overlay.querySelector('.go').textContent =
      'could not start: ' + err.message + ' — click to retry';
  }
}, { once: false });
