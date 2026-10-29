// 12 Cm7 pitches from C4 through Bb6, distributed across 32 rows.
export const pitches=Array.from({length:32},(_,row)=>{
 const index=11-Math.round(row*11/31);
 return 60+12*Math.floor(index/4)+[0,3,7,10][index%4];
});
export const level = (count, peak) => count === 0 ? 0 : .035 + .965 * Math.min(1, count / peak);
export const MIX_GAIN = .014;
export const STEREO_WIDTH=.66;
// Ease the first/last four column intervals to center so both ends meet.
export const spatialX=column=>{
 if(column<0)return 0;
 const col=Math.min(31,column),edge=Math.min(1,Math.min(col,31-col)/4);
 const taper=edge*edge*(3-2*edge);
 return (4*col/31-2)*STEREO_WIDTH*taper;
};
export function createAudioGraph(ctx) {
  const master=ctx.createGain();master.gain.value=MIX_GAIN;
  const spatial=ctx.createPanner();spatial.panningModel='HRTF';spatial.rolloffFactor=0;
  spatial.positionX.value=0;spatial.positionY.value=0;spatial.positionZ.value=-1.5;
  const direct=ctx.createGain(),positioned=ctx.createGain();
  direct.gain.value=1-STEREO_WIDTH;positioned.gain.value=STEREO_WIDTH;
  const tone=ctx.createBiquadFilter();tone.type='lowpass';tone.frequency.value=2200;tone.Q.value=.5;
  // Preserve the former 66% Width setting, without any experimental processors.
  master.connect(direct);direct.connect(tone);
  master.connect(spatial);spatial.connect(positioned);positioned.connect(tone);
  tone.connect(ctx.destination);
  const spatialController={
    position(column,time){spatial.positionX.setTargetAtTime(spatialX(column),time,.015);},
    center(){
      spatial.positionX.cancelAndHoldAtTime(ctx.currentTime);
      spatial.positionX.setTargetAtTime(0,ctx.currentTime,.03);
    },
  };
  const voices=pitches.map(midi=>{
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='triangle';osc.frequency.value=440*2**((midi-69)/12);gain.gain.value=0;
    osc.connect(gain);gain.connect(master);osc.start();return gain.gain;
  });
  return {master,voices,spatialController};
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
    this.spatialController?.position(col,t);
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
    this.spatialController?.center();
    this.fade();
  }
  setMode(mode) {
    if (mode === this.mode) return;
    this.fade();
    this.mode = mode;
  }
}
