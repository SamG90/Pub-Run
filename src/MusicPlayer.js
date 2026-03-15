/**
 * MusicPlayer - Web Audio API background music manager with crossfading.
 *
 * Usage:
 *   const music = new MusicPlayer();
 *   await music.init();                        // call after user gesture
 *   music.playTrack('/music/theme.mp3');        // loops by default
 *   music.playOneShot('/music/ding.mp3', 0.6);  // fire-and-forget SFX
 *   music.stop();
 */
export default class MusicPlayer {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;

    /** @type {Map<string, AudioBuffer>} */
    this.bufferCache = new Map();

    // Current background track state
    this._currentSource = null;   // AudioBufferSourceNode
    this._currentGain = null;     // GainNode
    this._currentUrl = null;      // string

    this._masterVolume = 0.4;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Create or resume the AudioContext. Must be called after a user gesture. */
  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Load and play a background track, crossfading from the current one.
   * If the same URL is already playing, this is a no-op.
   */
  async playTrack(url, { loop = true, volume = 0.4, crossfadeDuration = 2 } = {}) {
    if (!this.ctx) return;
    if (this._currentUrl === url) return;

    this._masterVolume = volume;

    let buffer;
    try {
      buffer = await this._loadBuffer(url);
    } catch {
      // Missing or bad file — stay silent, don't crash.
      return;
    }

    // Fade out the old track (if any)
    if (this._currentSource) {
      this._fadeOutAndStop(this._currentSource, this._currentGain, crossfadeDuration);
    }

    // Create new source + gain
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    source.buffer = buffer;
    source.loop = loop;
    source.connect(gain);
    gain.connect(this.ctx.destination);

    // Fade in
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + crossfadeDuration);

    source.start(0);

    this._currentSource = source;
    this._currentGain = gain;
    this._currentUrl = url;

    // Clean up reference when the track ends naturally (non-looping)
    source.onended = () => {
      if (this._currentSource === source) {
        this._currentSource = null;
        this._currentGain = null;
        this._currentUrl = null;
      }
    };
  }

  /** Fade out and stop the current background track. */
  stop(fadeDuration = 0.5) {
    if (!this.ctx || !this._currentSource) return;
    this._fadeOutAndStop(this._currentSource, this._currentGain, fadeDuration);
    this._currentSource = null;
    this._currentGain = null;
    this._currentUrl = null;
  }

  /** Set the master volume for the current background track (0-1). */
  setVolume(vol) {
    this._masterVolume = vol;
    if (this._currentGain && this.ctx) {
      this._currentGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.1);
    }
  }

  /** Play a one-shot sound effect. Does not affect the background track. */
  async playOneShot(url, volume = 0.5) {
    if (!this.ctx) return;

    let buffer;
    try {
      buffer = await this._loadBuffer(url);
    } catch {
      return;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    source.buffer = buffer;
    source.loop = false;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    gain.gain.value = volume;

    source.start(0);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** Fetch + decode an MP3, returning a cached AudioBuffer. */
  async _loadBuffer(url) {
    if (this.bufferCache.has(url)) {
      return this.bufferCache.get(url);
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    this.bufferCache.set(url, audioBuffer);
    return audioBuffer;
  }

  /** Fade a source node out over `duration` seconds, then stop it. */
  _fadeOutAndStop(source, gainNode, duration) {
    const now = this.ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    try {
      source.stop(now + duration);
    } catch {
      // Already stopped — ignore.
    }
  }
}
