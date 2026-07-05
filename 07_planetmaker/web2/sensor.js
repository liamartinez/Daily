// Web Serial bridge to the original Arduino distance sensor.
// PlanetMaker_Arduino.pde streams analogRead(A0) as raw bytes at 9600 baud;
// this reads that same protocol unchanged, so the physical installation can
// be rebuilt by plugging the 2011 Arduino sketch straight into a browser.
// Web Serial is Chrome/Edge only and requires HTTPS or localhost.

export class SensorLink {
  constructor(onByte, onStatus) {
    this.onByte = onByte;
    this.onStatus = onStatus || (() => {});
    this.port = null;
    this.reader = null;
    this.connected = false;
  }

  get supported() { return 'serial' in navigator; }

  async connect() {
    if (!this.supported) {
      throw new Error('Web Serial needs Chrome or Edge');
    }
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: 9600 });
    this.connected = true;
    this.onStatus('connected');
    this.readLoop();
  }

  async readLoop() {
    try {
      while (this.connected && this.port.readable) {
        this.reader = this.port.readable.getReader();
        try {
          while (true) {
            const { value, done } = await this.reader.read();
            if (done) break;
            for (const b of value) this.onByte(b);
          }
        } finally {
          this.reader.releaseLock();
        }
      }
    } catch (err) {
      this.onStatus('error: ' + err.message);
    } finally {
      this.connected = false;
      this.onStatus('not connected');
    }
  }

  async disconnect() {
    this.connected = false;
    try { await this.reader?.cancel(); } catch (e) { /* already closed */ }
    try { await this.port?.close(); } catch (e) { /* already closed */ }
    this.port = null;
    this.onStatus('not connected');
  }
}
