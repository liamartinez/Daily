"""
MOE - Stage 0.5: the boss gets eyes that know objects, and (maybe) ears-free
acknowledgment via salute.

Runs on the UNO Q's Linux side (MPU). Webcam + YoloX object detection are
Moe's eyes (person = wake, COCO objects = mission verification!), MediaPipe
gestures are the salute, the TTS brick is his voice through USB speakers,
and the LED matrix (sketch.ino on the MCU) is still his face.

State machine:

  SLEEPING -> GREET -> WAIT_ACK -> ISSUE_TASK -> WAIT_RETURN -> REACT
      ^                   |  (no salute: grumble, back to sleep)
      +-------------------+----------------- COOLDOWN <-------+

Fetch missions ("GET A SPOON") are verified by the camera actually SEEING
the object. Trust missions still pass on button / leave-and-return / timeout.
The web console (moe_console.html, port 8737) mirrors everything and can
fake a walk-by, salute, or button press remotely.
"""

import json
import os
import queue
import random
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from arduino.app_utils import *  # provides App and Bridge

# ------------------------------ knobs ---------------------------------------
CONFIDENCE = 0.45       # how sure the model must be about a detection.
                        # 0.60 made fetch quests nearly impossible — YoloX
                        # nano rarely exceeds 0.6 on handheld objects. Person
                        # waking is safe at 0.45 (the dwell timer smooths it).
REMIND_EVERY_S = 22     # re-scroll the mission while waiting, for kids who
                        # walked up mid-mission and missed the briefing
WAKE_AFTER_S = 1.5      # kid must linger this long before Moe wakes
ABSENT_AFTER_S = 2.5    # no detections for this long = hallway is empty
ACK_TIME_S = 20         # how long Moe waits for a salute before sulking
MISSION_TIME_S = 75     # Moe's patience per mission phase
COOLDOWN_S = 8          # quiet time before Moe re-arms
SCROLL_S_PER_CHAR = 0.42  # keep in sync with SCROLL_STEP_MS in sketch.ino

# Missions. "object" = a COCO class YoloX can see -> camera-verified fetch
# quest. No "object" = classic trust mission (button / leave-and-return).
MISSIONS = [
    {"text": "GET A SPOON",     "object": "spoon",
     "speak": "Emergency! I need a spoon. Bring it here and show me!"},
    {"text": "BRING A BANANA",  "object": "banana",
     "speak": "My lunch is missing. Find me a banana. Show it to my camera!"},
    {"text": "FETCH A BOOK",    "object": "book",
     "speak": "I want a bedtime story. Bring me a book and hold it up!"},
    {"text": "SHOW ME A CUP",   "object": "cup",
     "speak": "I am so thirsty. Find a cup and show me!"},
    {"text": "BRING TEDDY",     "object": "teddy bear",
     "speak": "I'm lonely. Bring me a teddy bear! Hold it up high!"},
    {"text": "JUMP 3 TIMES",
     "speak": "Morale check! Do three big jumps right where you are. I'm watching. Sort of."},
    {"text": "ROAR LIKE A DINO",
     "speak": "Make your very best dinosaur noise. This is official business."},
    {"text": "SPIN AROUND",
     "speak": "Spin around one time. It's for science."},
    {"text": "HIGH 5 A GROWNUP",
     "speak": "Go high five a grown up and report back. I'll wait."},
]
GREETINGS = [
    ("HEY AGENT!",       "Hey! Agent! You there? Salute if you're ready!"),
    ("PSST! AGENT!",     "Psst. Agent. I have a job for you. Salute me!"),
    ("AGENT! EMERGENCY!", "Agent! Thank goodness. It's an emergency. A small one. Salute to accept!"),
]
PRAISE = [
    ("AMAZING!",    "Amazing work. I'm putting this in your file."),
    ("INCREDIBLE!", "Incredible. I genuinely didn't think you'd do it."),
    ("TOP AGENT!",  "Top agent material. Don't tell the others."),
    ("WOW!",        "Wow. Just wow. I'm emotional."),
]
FETCH_PRAISE = "I can SEE it! With my own camera! Outstanding."
GRUMBLES = [
    ("HMPH.", "Nobody salutes the boss anymore. Fine. Back to sleep."),
    ("ZZZ.",  "Ignored. By my own agent. Unbelievable."),
]
GAVEUPS = [
    ("FINE. NEVER MIND.", "Fine. Never mind. Mission cancelled. I'm not sad. YOU'RE sad."),
    ("I GIVE UP.", "I give up. I'll do it myself. ... I will not do it myself."),
]
# spoken after trust-mission briefs, now that the salute can mean "done"
TRUST_SUFFIX = " Press my button or show me a thumbs up when you're done!"

SOUND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sounds")

# --------------------------- Moe's body (MCU) --------------------------------
def face(name):
    """Faces: sleep, neutral, happy, heart, grumpy, think, talk."""
    hub.emit("face", name=name)
    Bridge.call("show_face", name)

scroll_busy = False  # blinker must not blink over a scrolling mission

def say(text):
    """Scroll text across the matrix and wait until it has finished."""
    global scroll_busy
    print(f"MOE: {text}")
    hub.emit("say", text=text)
    scroll_busy = True
    Bridge.call("scroll_text", text)
    time.sleep(len(text) * SCROLL_S_PER_CHAR + 1.2)
    scroll_busy = False

console_button = False  # set remotely from the web console's DONE button

def button_pressed():
    """Optional button between D2 and GND. Works fine if nothing is wired.
    The web console's remote DONE button lands here too."""
    global console_button
    if console_button:
        console_button = False
        return True
    try:
        return bool(Bridge.call("take_button"))
    except Exception:
        return False

# --------------------------- Moe's voice (TTS + beeps) -----------------------
try:
    from arduino.app_bricks.tts import TextToSpeech
    _tts = TextToSpeech()
except Exception as e:
    _tts = None
    print(f"TTS unavailable ({e}) - Moe stays a silent-movie boss")

def speak(text):
    """Speak through the USB speaker. Prefers the TTS brick; falls back to
    pre-rendered voice WAVs (sounds/voice/<md5[:10]>.wav, generated on the
    laptop from Moe's fixed script). Safe no-op if neither exists."""
    if not text:
        return
    print(f"MOE (voice): {text}")
    hub.emit("log", text="moe says: " + text)
    if _tts:
        try:
            _tts.speak(text)
            return
        except Exception as e:
            print(f"TTS error: {e}")
    import hashlib
    slug = hashlib.md5(text.encode()).hexdigest()[:10]
    path = os.path.join(SOUND_DIR, "voice", slug + ".wav")
    if os.path.exists(path):
        _aplay(path, wait=True)
    else:
        hub.emit("log", text="(no voice wav for this line - regenerate on laptop)")

def _usb_alsa_device():
    """Find the USB speaker's ALSA card (the board's own card 0 has no jack).
    NOTE: /proc/asound/cards does NOT exist inside the app container —
    parse `aplay -l` instead, which works both in and out of it."""
    import re as _re
    try:
        out = subprocess.run(["aplay", "-l"], capture_output=True, text=True,
                             timeout=10).stdout
        for line in out.splitlines():
            m = _re.match(r"card (\d+):", line)
            if m and ("USB" in line or "usb" in line):
                return f"plughw:{m.group(1)},0"
    except Exception:
        pass
    try:  # fallback for running outside the container
        for line in open("/proc/asound/cards"):
            m = _re.match(r"\s*(\d+)\s+\[", line)
            if m and "USB" in line:
                return f"plughw:{m.group(1)},0"
    except Exception:
        pass
    return None

USB_SPEAKER = _usb_alsa_device()
print(f"USB speaker: {USB_SPEAKER or 'not found - earcons/voice silent'}")

def _aplay(path, wait=False, timeout=30):
    args = ["aplay", "-q"] + (["-D", USB_SPEAKER] if USB_SPEAKER else []) + [path]
    try:
        if wait:
            subprocess.run(args, timeout=timeout,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            subprocess.Popen(args,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        hub.emit("log", text="(audio playback failed: %s)" % e)

def sound(name):
    """Play a little beep/boop/grumble wav. Safe no-op without a speaker."""
    path = os.path.join(SOUND_DIR, name + ".wav")
    if os.path.exists(path):
        _aplay(path)

# --------------------------- Moe's console (live telemetry) ------------------
# Stdlib-only web console so any browser on the same wifi can watch Moe live
# and poke him when you can't reach the board. Two ways in:
#   1. http://<board>.local:8737/  — the board serves moe_console.html itself
#   2. open moe_console.html from disk and point it at the board's address
CONSOLE_PORT = 8737
CONSOLE_HTML = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "moe_console.html")

class ConsoleHub:
    def __init__(self):
        self.clients = []
        self.lock = threading.Lock()
        self.recent = []          # last 80 events, replayed to late joiners
        self.state = "SLEEPING"
        self.face = "sleep"
        self.last_say = ""

    def emit(self, kind, **data):
        evt = {"kind": kind, "t": time.strftime("%H:%M:%S"), **data}
        if kind == "state":
            self.state = data["state"]
        elif kind == "face":
            self.face = data["name"]
        elif kind == "say":
            self.last_say = data["text"]
        with self.lock:
            if kind != "blink":  # blinks are ephemeral, don't churn history
                self.recent = (self.recent + [evt])[-80:]
            for q in self.clients:
                try:
                    q.put_nowait(evt)
                except queue.Full:
                    pass  # slow client; it will resync from /events hello

    def snapshot(self):
        return {"kind": "hello", "state": self.state, "face": self.face,
                "say": self.last_say,
                "missions": globals().get("missions_done", 0),
                "recent": self.recent}

hub = ConsoleHub()

def console_walkby(seconds=6.0):
    """Pretend a kid is dwelling in front of the camera for a few seconds."""
    def walker():
        hub.emit("log", text="console: fake kid walked into the hallway")
        t0 = time.time()
        while time.time() - t0 < seconds:
            on_person()
            time.sleep(0.2)
    threading.Thread(target=walker, daemon=True).start()

class ConsoleHandler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass  # keep the app log clean

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self):
        if self.path == "/status":
            return self._json(hub.snapshot())
        if self.path == "/missions":
            return self._json(list(reversed(mission_log_read(30))))
        if self.path.startswith("/missions/"):
            name = os.path.basename(self.path)
            fp = os.path.join(MISSIONS_DIR, name)
            if name.endswith(".jpg") and os.path.exists(fp):
                with open(fp, "rb") as f:
                    body = f.read()
                self.send_response(200)
                self._cors()
                self.send_header("Content-Type", "image/jpeg")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "max-age=86400")
                self.end_headers()
                self.wfile.write(body)
                return
            return self._json({"err": "no such photo"}, 404)
        if self.path == "/events":
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            q = queue.Queue(maxsize=100)
            with hub.lock:
                hub.clients.append(q)
            try:
                self.wfile.write(("data: %s\n\n" % json.dumps(hub.snapshot()))
                                 .encode())
                self.wfile.flush()
                while True:
                    try:
                        evt = q.get(timeout=10)
                        self.wfile.write(("data: %s\n\n" % json.dumps(evt))
                                         .encode())
                    except queue.Empty:
                        self.wfile.write(b": ping\n\n")  # keep-alive
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            finally:
                with hub.lock:
                    if q in hub.clients:
                        hub.clients.remove(q)
            return
        # anything else: serve the console page if it deployed with the app
        if os.path.exists(CONSOLE_HTML):
            with open(CONSOLE_HTML, "rb") as f:
                body = f.read()
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self._json({"moe": "online",
                        "hint": "open moe_console.html and point it here"})

    def do_POST(self):
        global console_button
        if self.path != "/cmd":
            return self._json({"err": "unknown path"}, 404)
        n = int(self.headers.get("Content-Length") or 0)
        try:
            cmd = json.loads(self.rfile.read(n) or b"{}").get("cmd", "")
        except ValueError:
            cmd = ""
        if cmd == "walkby":
            console_walkby()
        elif cmd == "button":
            console_button = True
            hub.emit("log", text="console: DONE button pressed")
        elif cmd == "salute":
            on_gesture_ack("console salute")
        elif cmd == "beep":
            sound("ok")
            speak("Testing. This is the boss. Can you hear the boss?")
            hub.emit("log", text="console: audio test fired")
        else:
            return self._json({"err": "unknown cmd"}, 400)
        return self._json({"ok": True})

def start_console():
    try:
        srv = ThreadingHTTPServer(("", CONSOLE_PORT), ConsoleHandler)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        print(f"Console hub listening on port {CONSOLE_PORT}")
    except OSError as e:
        print(f"Console hub failed to start ({e}) - Moe runs fine without it")

start_console()

# --------------------------- Moe's eyes (camera) -----------------------------
from arduino.app_bricks.video_objectdetection import VideoObjectDetection

last_seen = 0.0
first_seen = None
last_object = {}       # COCO label -> last time YoloX saw it
last_salute = 0.0      # last time a salute/ack gesture arrived

last_sparkle = 0.0

def on_person():
    global last_seen, first_seen, last_sparkle
    now = time.time()
    if now - last_seen > ABSENT_AFTER_S:
        first_seen = now  # a new arrival, start the dwell clock
        hub.emit("log", text="camera: someone entered the hallway")
        # earcon lure: a sleeping Moe glitters when someone appears, so kids
        # discover he's alive before the dwell timer even wakes him
        if hub.state == "SLEEPING" and now - last_sparkle > 30:
            last_sparkle = now
            sound("sparkle")
    last_seen = now

_last_sees_log = 0.0

def on_objects(detections):
    """YoloX firehose: remember when each label was last seen.
    Payload shape (per brick example): {"person": 0.87, "bicycle": 0.66}"""
    global _last_sees_log
    now = time.time()
    try:
        for label in (detections or {}):
            last_object[label] = now
            if label == "person":
                on_person()
        # while a mission is running, show what Moe's eyes actually see —
        # the debugging window for "why isn't my cup working?!"
        if detections and hub.state == "WAIT_RETURN" and now - _last_sees_log > 2.5:
            _last_sees_log = now
            seen = ", ".join(f"{k} {v:.2f}" for k, v in
                             sorted(detections.items(), key=lambda x: -x[1]))
            hub.emit("log", text="camera sees: " + seen)
    except Exception:
        pass

# IMPORTANT: pass the camera by explicit device path. The default Camera()
# resolves to a NAME string ("usb:Integrated Camera: ..."), which OpenCV's
# V4L2 backend cannot open on this install — it then leaks a handle per
# retry and wedges the device. "usb:/dev/video0" bypasses name resolution.
from arduino.app_peripherals.camera import Camera
try:
    _cam = Camera("usb:/dev/video0")
except Exception as e:
    print(f"Explicit camera path failed ({e}) - falling back to default")
    _cam = None

detector = (VideoObjectDetection(camera=_cam, confidence=CONFIDENCE)
            if _cam else VideoObjectDetection(confidence=CONFIDENCE))
# Register both styles: the firehose gives us every label (fetch quests),
# and a direct person hook keeps waking working even if the firehose
# payload shape differs between brick versions.
try:
    detector.on_detect_all(on_objects)
except Exception as e:
    print(f"on_detect_all unavailable ({e})")
try:
    detector.on_detect("person", lambda *a, **k: on_person())
except Exception as e:
    print(f"on_detect person unavailable ({e})")

def object_seen(label, within_s=2.0):
    return (time.time() - last_object.get(label, 0)) < within_s

def present():
    return (time.time() - last_seen) < ABSENT_AFTER_S

def dwelling():
    return present() and first_seen and (time.time() - first_seen) >= WAKE_AFTER_S

# --------------------------- the salute (gesture brick) ----------------------
# MediaPipe has no literal salute, so Open_Palm (a raised flat hand) IS the
# official Moe salute. Thumb_Up also accepted - Moe is not picky, he is lazy.
# If the gesture brick can't share the camera on this install, Moe logs it
# and falls back to button-acknowledgment; nothing else breaks.
def on_gesture_ack(source="salute"):
    global last_salute
    last_salute = time.time()
    hub.emit("log", text="camera: " + source + "!")

# The gesture brick isn't in this App Lab version's registry, so its runner
# container must be started manually (see README: gesture-recognition-runner
# on the moe network, port 5002). We arm the salute in a background thread —
# CRITICAL: pass the detector's camera (_cam) so it doesn't open a second
# handle on /dev/video0 and wedge the device. If the runner isn't there, the
# thread fails quietly and acknowledgment stays: attention/button/console.
gesture = None

def arm_salute():
    global gesture
    try:
        from arduino.app_bricks.gesture_recognition import GestureRecognition
        g = GestureRecognition(_cam)
        g.on_gesture("Open_Palm", lambda meta: on_gesture_ack("salute (open palm)"))
        g.on_gesture("Thumb_Up", lambda meta: on_gesture_ack("salute (thumbs up)"))
        gesture = g
        print("Salute detection armed (Open_Palm / Thumb_Up)")
        hub.emit("log", text="salute detection armed")
    except Exception as e:
        print(f"Gesture unavailable ({e}) - salute via button/console only")

threading.Thread(target=arm_salute, daemon=True).start()

def saluted_since(t0):
    return last_salute > t0

# --------------------------- shift album (photos + log) ----------------------
# Every mission is remembered: a JSONL log plus photos snapped at the
# briefing, the proof moment, and the celebration. Served to the console
# at /missions (list) and /missions/<file>.jpg (photos).
MISSIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "missions")
os.makedirs(MISSIONS_DIR, exist_ok=True)
MISSION_LOG = os.path.join(MISSIONS_DIR, "log.jsonl")

def snap(mission_id, tag):
    """Grab a photo from Moe's camera for the current mission's file."""
    try:
        import cv2
        frame = _cam.capture()
        if frame is None:
            return None
        fname = f"{mission_id}-{tag}.jpg"
        cv2.imwrite(os.path.join(MISSIONS_DIR, fname), frame,
                    [cv2.IMWRITE_JPEG_QUALITY, 82])
        return fname
    except Exception as e:
        print(f"snap failed ({tag}): {e}")
        return None

def mission_log_append(rec):
    try:
        with open(MISSION_LOG, "a") as f:
            f.write(json.dumps(rec) + "\n")
    except Exception as e:
        print(f"mission log write failed: {e}")

def mission_log_read(limit=50):
    try:
        with open(MISSION_LOG) as f:
            return [json.loads(l) for l in f.readlines()[-limit:]]
    except Exception:
        return []

# --------------------------- Moe's brain (states) ----------------------------
# the shift survives restarts (gave-ups are remembered but never counted)
missions_done = len([r for r in mission_log_read(10 ** 6)
                     if r.get("outcome") != "gave_up"])

def wait_for(condition, timeout_s):
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        if condition():
            return True
        time.sleep(0.1)
    return False

def goto(s):
    """State transition + telemetry in one place."""
    print("-> " + s)
    hub.emit("state", state=s)
    return s

def blinker():
    """While Moe waits on a kid, he blinks expectantly every few seconds."""
    while True:
        time.sleep(random.uniform(2.2, 4.2))
        if hub.state not in ("WAIT_ACK", "WAIT_RETURN") or scroll_busy:
            continue
        try:
            Bridge.call("show_face", "blink")
            hub.emit("blink")
            time.sleep(0.18)
            base = "neutral" if hub.state == "WAIT_ACK" else "think"
            Bridge.call("show_face", base)
        except Exception:
            pass

threading.Thread(target=blinker, daemon=True).start()

current_mission_text = None   # set while a mission is live, for the reminder

def reminder():
    """Re-scroll the assignment while Moe waits, so a kid who wandered up
    mid-mission (or forgot) learns what the job is."""
    while True:
        time.sleep(REMIND_EVERY_S)
        if hub.state == "WAIT_RETURN" and current_mission_text and not scroll_busy:
            try:
                say(current_mission_text)
                if hub.state == "WAIT_RETURN":
                    face("think")
            except Exception:
                pass

threading.Thread(target=reminder, daemon=True).start()

def run_moe():
    global missions_done, current_mission_text
    state = goto("SLEEPING")
    face("sleep")
    current = None            # the mission being worked on
    verified = False          # did the camera actually see the fetch object
    print("MOE-1 online. Watching the hallway.")

    while True:
        if state == "SLEEPING":
            wait_for(dwelling, 10 ** 9)      # nap until a kid lingers
            state = goto("GREET")

        elif state == "GREET":
            face("happy")
            sound("wake")
            scroll_text, spoken = random.choice(GREETINGS)
            threading.Thread(target=speak, args=(spoken,), daemon=True).start()
            say(scroll_text)
            state = goto("WAIT_ACK")

        elif state == "WAIT_ACK":
            face("neutral")
            ack_t0 = time.time()
            # acknowledged by: salute gesture (if brick available), button,
            # console salute — or simply standing at attention for 6 s
            # (pre-readers with no button still get missions)
            at_attention = lambda: present() and (time.time() - ack_t0) >= 6.0
            acked = wait_for(lambda: saluted_since(ack_t0) or button_pressed()
                             or at_attention(), 8)
            if not acked:
                sound("psst")   # earcon nudge: "hey. HEY. over here."
                acked = wait_for(lambda: saluted_since(ack_t0)
                                 or button_pressed() or at_attention(),
                                 ACK_TIME_S - 8)
            if acked:
                sound("ok")
                face("happy")
                state = goto("ISSUE_TASK")
            else:
                gave_up_lines = GRUMBLES
                state = goto("GAVE_UP")

        elif state == "ISSUE_TASK":
            current = random.choice(MISSIONS)
            current_mission_text = current["text"]
            mission_id = "m%d" % int(time.time())
            mission_photos = []
            hub.emit("log", text="mission: " + current["text"])
            spoken = current.get("speak", "")
            if not current.get("object"):
                spoken += TRUST_SUFFIX   # thumbs up / button = "done, boss!"
            threading.Thread(target=speak, args=(spoken,), daemon=True).start()
            say(current["text"])
            p = snap(mission_id, "briefing")   # agent receiving orders
            if p:
                mission_photos.append(p)
            face("think")                    # Moe waits, chin on fist
            state = goto("WAIT_RETURN")

        elif state == "WAIT_RETURN":
            quest = current.get("object") if current else None
            t0 = time.time()
            done_signal = lambda: button_pressed() or saluted_since(t0)
            if quest:
                # camera-verified fetch: Moe passes the INSTANT he sees it
                got = wait_for(lambda: object_seen(quest) or done_signal(),
                               MISSION_TIME_S)
                verified = got and object_seen(quest, within_s=3.0)
                failed = not got and not present()   # timed out AND wandered off
                outcome = "verified" if verified else \
                          ("gave_up" if failed else "trusted")
            else:
                # trust mission: thumbs up / button = done; or leave-and-return
                verified = False
                got = wait_for(lambda: done_signal() or not present(),
                               MISSION_TIME_S)
                failed = False
                if got and not present():
                    # they ran off to do the thing — wait for the comeback
                    face("neutral")
                    back = wait_for(lambda: done_signal() or dwelling(),
                                    MISSION_TIME_S)
                    failed = not back and not present()  # never came back
                # timeout while still standing there = trusting pass, as ever
                outcome = "gave_up" if failed else ("done" if got else "trusted")
            if failed:
                gave_up_lines = GAVEUPS
                state = goto("GAVE_UP")
            else:
                p = snap(mission_id, "proof")   # the spoon/thumbs-up moment
                if p:
                    mission_photos.append(p)
                state = goto("REACT")

        elif state == "GAVE_UP":
            current_mission_text = None
            sound("grumble")
            face("grumpy")
            if current:   # a real mission fizzled (not just an ignored greet)
                p = snap(mission_id, "aftermath")   # the empty hallway
                if p:
                    mission_photos.append(p)
                rec = {"id": mission_id, "n": missions_done,
                       "t": time.strftime("%Y-%m-%d %H:%M:%S"),
                       "mission": current["text"], "outcome": "gave_up",
                       "photos": mission_photos}
                mission_log_append(rec)
                hub.emit("mission", **rec)
            scroll_text, spoken = random.choice(gave_up_lines)
            threading.Thread(target=speak, args=(spoken,), daemon=True).start()
            say(scroll_text)
            current = None
            state = goto("COOLDOWN")

        elif state == "REACT":
            missions_done += 1
            print(f"Mission #{missions_done} complete.")
            hub.emit("stats", missions=missions_done)
            face("heart")
            sound("tada")
            p = snap(mission_id, "celebration")   # heart-face moment
            if p:
                mission_photos.append(p)
            current_mission_text = None
            rec = {"id": mission_id, "n": missions_done,
                   "t": time.strftime("%Y-%m-%d %H:%M:%S"),
                   "mission": current["text"] if current else "?",
                   "outcome": outcome, "photos": mission_photos}
            mission_log_append(rec)
            hub.emit("mission", **rec)
            scroll_text, spoken = random.choice(PRAISE)
            if verified and current:
                spoken = FETCH_PRAISE + " " + spoken
                hub.emit("log", text="camera: verified! Moe SAW the "
                         + current.get("object", "thing"))
            threading.Thread(target=speak, args=(spoken,), daemon=True).start()
            time.sleep(2.0)
            say(scroll_text)
            if missions_done % 5 == 0:
                speak("PROMOTION! There is no pay raise.")
                say("PROMOTION!")
            current = None
            state = goto("COOLDOWN")

        elif state == "COOLDOWN":
            face("happy")
            wait_for(lambda: not present(), 60)  # wait for an empty hallway
            time.sleep(COOLDOWN_S)
            face("sleep")
            state = goto("SLEEPING")

threading.Thread(target=run_moe, daemon=True).start()

App.run()
