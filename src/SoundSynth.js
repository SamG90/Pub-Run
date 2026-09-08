export default class SoundSynth {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.enabled = true;
    this.lastStepAt = 0;
    this.lastWarningAt = 0;
  }

  // Audio must be initialised from a user gesture on mobile browsers.
  async init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.enabled ? 0.65 : 0;

      const compressor = this.audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 16;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.16;
      this.masterGain.connect(compressor);
      compressor.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.audioCtx && this.masterGain) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(enabled ? 0.65 : 0, now + 0.08);
    }
  }

  playTone(freq, type, duration, volume, attack = 0.008, release = 0.08, slideTo = null) {
    if (!this.audioCtx || !this.enabled || !this.masterGain) return;
    const now = this.audioCtx.currentTime;
    const oscillator = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, now);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(attack + 0.01, duration - release));

    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  playNoise(duration, volume, cutoffStart, cutoffEnd = 100) {
    if (!this.audioCtx || !this.enabled || !this.masterGain) return;
    const now = this.audioCtx.currentTime;
    const buffer = this.audioCtx.createBuffer(1, Math.ceil(this.audioCtx.sampleRate * duration), this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;

    const noise = this.audioCtx.createBufferSource();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();
    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffStart, now);
    filter.frequency.exponentialRampToValueAtTime(cutoffEnd, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  step() {
    if (!this.audioCtx || performance.now() - this.lastStepAt < 55) return;
    this.lastStepAt = performance.now();
    this.playTone(142, 'triangle', 0.07, 0.075, 0.005, 0.04, 105);
  }

  dodge() {
    this.playTone(420, 'sine', 0.085, 0.1, 0.004, 0.05, 620);
    this.playTone(820, 'triangle', 0.065, 0.035, 0.004, 0.04, 980);
  }

  enterGame() {
    [261.63, 329.63, 392, 523.25].forEach((note, index) => {
      window.setTimeout(() => this.playTone(note, 'triangle', 0.22 + index * 0.03, 0.13, 0.01, 0.12), index * 75);
    });
  }

  approachingHighScore() {
    if (!this.audioCtx || performance.now() - this.lastWarningAt < 650) return;
    this.lastWarningAt = performance.now();
    this.playTone(92, 'sine', 0.13, 0.16, 0.02, 0.08, 78);
  }

  approachingLife() {
    [659.25, 880, 1046.5].forEach((note, index) => {
      window.setTimeout(() => this.playTone(note, 'triangle', 0.12, 0.07, 0.008, 0.07), index * 70);
    });
  }

  crash() {
    this.playNoise(0.42, 0.5, 2600, 90);
    this.playTone(112, 'sawtooth', 0.38, 0.18, 0.008, 0.22, 38);
  }

  beerHit() {
    this.playTone(168, 'square', 0.12, 0.14, 0.006, 0.08, 86);
    window.setTimeout(() => this.playTone(82, 'sawtooth', 0.26, 0.16, 0.01, 0.16, 42), 60);
    this.playNoise(0.24, 0.23, 1500, 240);
  }

  beerPickup() {
    [783.99, 987.77, 1174.66].forEach((note, index) => {
      window.setTimeout(() => this.playTone(note, 'square', 0.1, 0.09, 0.004, 0.06), index * 62);
    });
  }

  milestone() {
    [523.25, 659.25, 783.99].forEach((note, index) => {
      window.setTimeout(() => this.playTone(note, 'triangle', 0.2, 0.11, 0.008, 0.11), index * 85);
    });
  }

  tierUp() {
    [392, 493.88, 587.33, 783.99].forEach((note, index) => {
      window.setTimeout(() => this.playTone(note, 'triangle', 0.18, 0.105, 0.006, 0.1), index * 70);
    });
  }

  win() {
    [523.25, 523.25, 523.25, 698.46, 1046.5].forEach((note, index) => {
      window.setTimeout(() => this.playTone(note, 'triangle', index === 4 ? 0.7 : 0.15, 0.12, 0.008, 0.12), index * 125);
    });
  }
}
