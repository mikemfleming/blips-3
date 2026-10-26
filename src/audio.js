// Same descending C-major pentatonic range as Blips 2, extended to 32 rows.
export const pitches = Array.from({ length: 32 }, (_, i) =>
  [84,81,79,76,74,72,69,67,64,62,60,57,55,52,50,48][Math.floor(i / 2)]);
export const level = (count, peak) => count === 0 ? 0 : .035 + .965 * Math.min(1, count / peak);
export const MIX_GAIN = .018;
export const ECHO_WET = .25;
export const ECHO_FEEDBACK = .3;

export function createAudioGraph(ctx) {
  const master = ctx.createGain();
  // Budget for all 32 full-scale voices AND the echo tail. A compressor is
  // not a hard limiter, so leave headroom before the signal reaches output.
  master.gain.value = MIX_GAIN;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3500;
  tone.Q.value = .5;
  master.connect(tone);
  tone.connect(ctx.destination);
  const delay = ctx.createDelay();
  delay.delayTime.value = .05;
  const wet = ctx.createGain();
  const feedback = ctx.createGain();
  wet.gain.value = ECHO_WET;
  feedback.gain.value = ECHO_FEEDBACK;
  master.connect(delay);
  delay.connect(wet);
  wet.connect(tone);
  delay.connect(feedback);
  feedback.connect(delay);
  const voices = pitches.map(midi => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    return gain.gain;
  });
  return { master, voices };
}

export class AudioEngine {
  constructor() {
    this.bpm = 120;
    this.peak = 32;
    this.mode = 'trigger';
    this.density = new Uint16Array(1024);
    this.events = [];
    this.voices = [];
    this.column = 0;
  }
  async play() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'playback' });
      Object.assign(this, createAudioGraph(this.ctx));
    }
    await this.ctx.resume();
    if (this.running) return;
    this.running = true;
    this.next = this.ctx.currentTime + .04;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 20);
  }
  scheduleStep(t, col) {
    const step = 15 / this.bpm;
    this.voices.forEach((gain, row) => {
      const value = level(this.density[row * 32 + col], this.peak);
      if (this.mode === 'trigger') {
        gain.cancelScheduledValues(t);
        gain.setValueAtTime(0, t);
        gain.linearRampToValueAtTime(value, t + .005);
        gain.exponentialRampToValueAtTime(.00001, t + Math.max(.01, step * .85));
        gain.setValueAtTime(0, t + step * .95);
      } else {
        gain.setTargetAtTime(value, t, Math.min(.04, step / 4));
      }
    });
    this.events.push({ time: t, column: col });
  }
  schedule() {
    const now = this.ctx.currentTime;
    const step = 15 / this.bpm;
    // After a UI/background stall, skip expired steps rather than scheduling
    // a burst of envelopes at once in the past.
    if (this.next < now + .005) {
      const missed = Math.ceil((now + .005 - this.next) / step);
      this.next += missed * step;
      this.column = (this.column + missed) % 32;
    }
    while (this.next < now + .1) {
      this.scheduleStep(this.next, this.column);
      this.column = (this.column + 1) % 32;
      this.next += step;
    }
  }
  fade() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.voices.forEach(gain => {
      // Hold the actual envelope value: simply removing a future ramp can
      // change the present value and introduce a click during pause/mode edits.
      gain.cancelAndHoldAtTime(t);
      gain.setTargetAtTime(0, t, .015);
    });
  }
  pause() {
    this.running = false;
    clearInterval(this.timer);
    this.events = [];
    this.fade();
  }
  setMode(mode) {
    if (mode === this.mode) return;
    this.fade();
    this.mode = mode;
  }
}
