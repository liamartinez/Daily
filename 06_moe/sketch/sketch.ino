// MOE - Stage 0, MCU side: the face.
//
// The Linux side (main.py) calls these over the Bridge:
//   show_face("sleep"|"neutral"|"happy"|"heart"|"grumpy"|"think"|"talk")
//   scroll_text("HEY AGENT!")
//   take_button()  -> 1 if the optional button was pressed since last check
//
// Face bitmaps are the SAME 13-char strings as the browser prototype
// (moe_hq.html), so you can design faces there and paste them here.
//
// Compat notes (core versions vary a little):
//  - If matrix.draw(fb) doesn't exist in your core, try matrix.loadFrame(fb).
//  - If the class name Arduino_LED_Matrix isn't found, try ArduinoLEDMatrix.

#include <Arduino_LED_Matrix.h>
#include <Arduino_RouterBridge.h>

Arduino_LED_Matrix matrix;

const int ROWS = 8;
const int COLS = 13;
uint8_t fb[ROWS * COLS];

// Optional "I'm done!" button: any pushbutton (or a jumper wire you tap)
// between pin D2 and GND. Everything works without it, too.
const int BUTTON_PIN = 2;
bool buttonFlag = false;
unsigned long lastButtonMs = 0;

// ----------------------------- faces ---------------------------------------
const char* FACE_SLEEP[8] = {
  ".........###.",
  "..........#..",
  ".........###.",
  ".............",
  "..###...###..",
  ".............",
  "....#####....",
  "............."};
const char* FACE_NEUTRAL[8] = {
  ".............",
  "...##...##...",
  "...##...##...",
  ".............",
  ".............",
  "...#######...",
  ".............",
  "............."};
const char* FACE_HAPPY[8] = {
  ".............",
  "...##...##...",
  "...##...##...",
  ".............",
  "..#.......#..",
  "...#######...",
  ".............",
  "............."};
const char* FACE_HEART[8] = {
  ".............",
  "...##...##...",
  "..#########..",
  "..#########..",
  "...#######...",
  "....#####....",
  ".....###.....",
  "......#......"};
const char* FACE_GRUMPY[8] = {
  "..#.......#..",
  "...#.....#...",
  "...##...##...",
  ".............",
  ".............",
  "....#####....",
  "...#.....#...",
  "............."};
const char* FACE_THINK[8] = {
  ".............",
  "...##....##..",
  "...##....##..",
  ".............",
  ".............",
  "......###....",
  ".............",
  "............."};
const char* FACE_BLINK[8] = {
  ".............",
  ".............",
  "..###...###..",
  ".............",
  ".............",
  "...#######...",
  ".............",
  "............."};
const char* FACE_TALK[8] = {
  ".............",
  "...##...##...",
  "...##...##...",
  ".............",
  ".....###.....",
  ".....###.....",
  ".....###.....",
  "............."};

void drawRows(const char* rows[8]) {
  for (int r = 0; r < ROWS; r++)
    for (int c = 0; c < COLS; c++)
      fb[r * COLS + c] = (rows[r][c] == '#') ? 255 : 0;
  matrix.draw(fb);
}

// -------------------------- 5x7 scroll font ---------------------------------
// Column-major, bit0 = top row. Classic public-domain 5x7 glyphs.
// Index: A-Z = 0-25, 0-9 = 26-35, '!' = 36, '?' = 37, '.' = 38
const uint8_t FONT[39][5] = {
  {0x7E,0x11,0x11,0x11,0x7E}, {0x7F,0x49,0x49,0x49,0x36}, // A B
  {0x3E,0x41,0x41,0x41,0x22}, {0x7F,0x41,0x41,0x22,0x1C}, // C D
  {0x7F,0x49,0x49,0x49,0x41}, {0x7F,0x09,0x09,0x09,0x01}, // E F
  {0x3E,0x41,0x49,0x49,0x7A}, {0x7F,0x08,0x08,0x08,0x7F}, // G H
  {0x00,0x41,0x7F,0x41,0x00}, {0x20,0x40,0x41,0x3F,0x01}, // I J
  {0x7F,0x08,0x14,0x22,0x41}, {0x7F,0x40,0x40,0x40,0x40}, // K L
  {0x7F,0x02,0x0C,0x02,0x7F}, {0x7F,0x04,0x08,0x10,0x7F}, // M N
  {0x3E,0x41,0x41,0x41,0x3E}, {0x7F,0x09,0x09,0x09,0x06}, // O P
  {0x3E,0x41,0x51,0x21,0x5E}, {0x7F,0x09,0x19,0x29,0x46}, // Q R
  {0x46,0x49,0x49,0x49,0x31}, {0x01,0x01,0x7F,0x01,0x01}, // S T
  {0x3F,0x40,0x40,0x40,0x3F}, {0x1F,0x20,0x40,0x20,0x1F}, // U V
  {0x7F,0x20,0x18,0x20,0x7F}, {0x63,0x14,0x08,0x14,0x63}, // W X
  {0x07,0x08,0x70,0x08,0x07}, {0x61,0x51,0x49,0x45,0x43}, // Y Z
  {0x3E,0x51,0x49,0x45,0x3E}, {0x00,0x42,0x7F,0x40,0x00}, // 0 1
  {0x42,0x61,0x51,0x49,0x46}, {0x21,0x41,0x45,0x4B,0x31}, // 2 3
  {0x18,0x14,0x12,0x7F,0x10}, {0x27,0x45,0x45,0x45,0x39}, // 4 5
  {0x3C,0x4A,0x49,0x49,0x30}, {0x01,0x71,0x09,0x05,0x03}, // 6 7
  {0x36,0x49,0x49,0x49,0x36}, {0x06,0x49,0x49,0x29,0x1E}, // 8 9
  {0x00,0x00,0x5F,0x00,0x00},                             // !
  {0x02,0x01,0x51,0x09,0x06},                             // ?
  {0x00,0x60,0x60,0x00,0x00}                              // .
};

int glyphIndex(char ch) {
  if (ch >= 'a' && ch <= 'z') ch = ch - 'a' + 'A';
  if (ch >= 'A' && ch <= 'Z') return ch - 'A';
  if (ch >= '0' && ch <= '9') return 26 + (ch - '0');
  if (ch == '!') return 36;
  if (ch == '?') return 37;
  if (ch == '.') return 38;
  return -1;  // space and anything unknown render blank
}

// ------------------------- non-blocking scroller -----------------------------
const unsigned long SCROLL_STEP_MS = 70;  // 6 cols/char * 70 ms = 0.42 s/char
                                          // (matches SCROLL_S_PER_CHAR in main.py)
uint8_t scrollCols[260];   // enough for ~40 characters
int scrollLen = 0;
int scrollPos = 0;
bool scrolling = false;
unsigned long lastStepMs = 0;

void startScroll(String text) {
  scrollLen = 0;
  for (unsigned int i = 0; i < text.length() && scrollLen < 250; i++) {
    int g = glyphIndex(text[i]);
    for (int c = 0; c < 5; c++)
      scrollCols[scrollLen++] = (g >= 0) ? FONT[g][c] : 0x00;
    scrollCols[scrollLen++] = 0x00;  // 1 blank column between glyphs
  }
  scrollPos = -COLS;  // start with the text just off the right edge
  scrolling = true;
}

void stepScroll() {
  memset(fb, 0, sizeof(fb));
  for (int x = 0; x < COLS; x++) {
    int src = scrollPos + x;
    if (src < 0 || src >= scrollLen) continue;
    uint8_t colBits = scrollCols[src];
    for (int r = 0; r < 7; r++)
      if (colBits & (1 << r)) fb[r * COLS + x] = 255;
  }
  matrix.draw(fb);
  scrollPos++;
  if (scrollPos > scrollLen) {
    scrolling = false;
    drawRows(FACE_NEUTRAL);
  }
}

// ------------------------- Bridge endpoints ----------------------------------
void showFace(String name) {
  scrolling = false;
  if      (name == "sleep")   drawRows(FACE_SLEEP);
  else if (name == "happy")   drawRows(FACE_HAPPY);
  else if (name == "heart")   drawRows(FACE_HEART);
  else if (name == "grumpy")  drawRows(FACE_GRUMPY);
  else if (name == "think")   drawRows(FACE_THINK);
  else if (name == "talk")    drawRows(FACE_TALK);
  else if (name == "blink")   drawRows(FACE_BLINK);
  else                        drawRows(FACE_NEUTRAL);
}

void scrollText(String text) {
  startScroll(text);
}

int takeButton() {
  int was = buttonFlag ? 1 : 0;
  buttonFlag = false;
  return was;
}

// ----------------------------- setup / loop ----------------------------------
void setup() {
  Serial.begin(115200);
  matrix.begin();
  matrix.setGrayscaleBits(8);   // 0-255 brightness values in fb
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  Bridge.begin();
  Bridge.provide("show_face", showFace);
  Bridge.provide("scroll_text", scrollText);
  Bridge.provide("take_button", takeButton);

  drawRows(FACE_SLEEP);
}

void loop() {
  unsigned long now = millis();

  if (scrolling && now - lastStepMs >= SCROLL_STEP_MS) {
    lastStepMs = now;
    stepScroll();
  }

  // Optional button (active low), 250 ms debounce
  if (digitalRead(BUTTON_PIN) == LOW && now - lastButtonMs > 250) {
    lastButtonMs = now;
    buttonFlag = true;
  }

  delay(5);
}
