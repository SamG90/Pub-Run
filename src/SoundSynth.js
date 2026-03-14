export default class SoundSynth {
  constructor() {
    this.audioCtx = null;
  }

  // Audio Context must be initialized after user interaction
  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTone(freq, type, duration, vol, attack = 0.01, release = 0.1) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

    // Envelope to prevent clipping/clicking
    gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(vol, this.audioCtx.currentTime + attack);
    gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start(this.audioCtx.currentTime);
    osc.stop(this.audioCtx.currentTime + duration);
  }

  step() {
    // Lower pitched sound for stepping
    this.playTone(150, 'triangle', 0.05, 0.03, 0.01, 0.04);
  }

  dodge() {
    this.playTone(400, 'sine', 0.1, 0.04, 0.01, 0.09);
    setTimeout(() => this.playTone(300, 'sine', 0.1, 0.04, 0.01, 0.09), 60);
  }

  enterGame() {
    // Welcoming rising chord
    this.playTone(261.63, 'sine', 0.3, 0.1, 0.05, 0.2); // C4
    setTimeout(() => this.playTone(329.63, 'sine', 0.3, 0.1, 0.05, 0.2), 100); // E4
    setTimeout(() => this.playTone(392.00, 'sine', 0.4, 0.1, 0.05, 0.3), 200); // G4
    setTimeout(() => this.playTone(523.25, 'sine', 0.6, 0.15, 0.05, 0.5), 300); // C5
  }

  approachingHighScore() {
    // Tense, low heartbeat sound
    this.playTone(80, 'sine', 0.15, 0.2, 0.05, 0.1);
    setTimeout(() => this.playTone(70, 'sine', 0.2, 0.2, 0.05, 0.15), 200);
  }

  approachingLife() {
    // Magical twinkling, rising chime
    this.playTone(659.25, 'triangle', 0.1, 0.05, 0.02, 0.08); // E5
    setTimeout(() => this.playTone(880.00, 'triangle', 0.1, 0.05, 0.02, 0.08), 80); // A5
    setTimeout(() => this.playTone(1046.50, 'triangle', 0.15, 0.05, 0.02, 0.1), 160); // C6
  }

  crash() {
    if (!this.audioCtx) return;
    const duration = 0.5;
    const bufferSize = this.audioCtx.sampleRate * duration;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, this.audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + duration);

    const gainNode = this.audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    noise.start();
  }

  beerHit() {
    if (!this.audioCtx) return;
    // Lower, more punishing thud
    this.playTone(150, 'sawtooth', 0.1, 0.3, 0.02, 0.1);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.2, 0.3, 0.02, 0.2), 80);
    setTimeout(() => this.playTone(50, 'sawtooth', 0.4, 0.3, 0.02, 0.4), 200);
    this.crash(); // use existing crash noise for extra effect
  }

  beerPickup() {
    // Fast, bright pickup jingle inspired by classic platformers
    this.playTone(783.99, 'square', 0.08, 0.08, 0.005, 0.06); // G5
    setTimeout(() => this.playTone(987.77, 'square', 0.08, 0.08, 0.005, 0.06), 70); // B5
    setTimeout(() => this.playTone(1174.66, 'square', 0.1, 0.09, 0.005, 0.08), 140); // D6
  }

  milestone() {
    this.playTone(523.25, 'sine', 0.2, 0.1); 
    setTimeout(() => this.playTone(659.25, 'sine', 0.2, 0.1), 100); 
    setTimeout(() => this.playTone(783.99, 'sine', 0.4, 0.1), 200); 
  }

  win() {
    this.playTone(523.25, 'triangle', 0.15, 0.1);
    setTimeout(() => this.playTone(523.25, 'triangle', 0.15, 0.1), 150);
    setTimeout(() => this.playTone(523.25, 'triangle', 0.15, 0.1), 300);
    setTimeout(() => this.playTone(698.46, 'triangle', 0.6, 0.1), 450);
  }
}
