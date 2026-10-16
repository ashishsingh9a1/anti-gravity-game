/**
 * ANTI-GRAVITY // OVERDRIVE - Procedural Web Audio Engine
 * Real-time synthesis of retro-futuristic synthwave music & punchy sound FX.
 * Zero external audio files required.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.isMuted = false;
    this.masterVolume = 0.7;

    // Music Sequencer State
    this.isPlayingMusic = false;
    this.bpm = 124;
    this.step = 0;
    this.timerId = null;
    this.nextNoteTime = 0;
    this.lookahead = 25.0; // ms
    this.scheduleAheadTime = 0.1; // seconds

    // Bassline notes in Hz (Cyberpunk D minor / Dorian progression)
    // D2, F2, C2, G2
    this.chordRoots = [73.42, 87.31, 65.41, 98.00];
    this.currentChordIndex = 0;
    this.intensity = 1; // 1 = calm, 2 = medium, 3 = boss
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master output bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Noise Buffer creation for percussion and explosions
      this.createNoiseBuffer();
    } catch (e) {
      console.warn("Web Audio API not supported or blocked", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  // ===================== SOUND EFFECTS ===================== //

  playLaser(pitchMod = 1) {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(850 * pitchMod, t);
    osc.frequency.exponentialRampToValueAtTime(120 * pitchMod, t + 0.12);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  playShotgun() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Dual detuned blast
    for (let i = -1; i <= 1; i += 2) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450 + i * 40, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.19);
    }
    this.playNoise(0.08, 1200, 0.12);
  }

  playRailgun() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // High energy beam chirp
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.35);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);

    // Deep sub bass impact
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(150, t);
    sub.frequency.exponentialRampToValueAtTime(35, t + 0.4);
    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 0.41);
  }

  playAntiGravPulse() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Warping gravity frequency sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(600, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.55);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.56);

    this.playNoise(0.35, 600, 0.25);
  }

  playDash() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.15);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.linearRampToValueAtTime(2000, t + 0.15);
    filter.Q.value = 3;

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  playExplosion(intensity = 1) {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const dur = Math.min(0.8, 0.25 + intensity * 0.2);
    const vol = Math.min(0.5, 0.18 + intensity * 0.1);
    this.playNoise(dur, 450 / Math.max(1, intensity * 0.5), vol);

    // Deep sub thump
    const t = this.ctx.currentTime;
    const sub = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(100 * intensity, t);
    sub.frequency.exponentialRampToValueAtTime(25, t + dur);
    gain.gain.setValueAtTime(vol * 1.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    sub.connect(gain);
    gain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + dur + 0.02);
  }

  playNoise(duration, filterFreq = 1000, volume = 0.2) {
    if (!this.noiseBuffer || !this.ctx) return;
    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(t);
    source.stop(t + duration + 0.01);
  }

  playXpPickup(comboCount = 1) {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Scale pitch up smoothly with combo
    const baseFreq = 587.33; // D5
    const pitchMultiplier = Math.min(2.5, 1 + (comboCount % 20) * 0.05);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * pitchMultiplier, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * pitchMultiplier * 1.5, t + 0.06);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  playHit() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  playShieldHit() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.15);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playLevelUp() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const notes = [293.66, 369.99, 440.00, 587.33, 739.99, 880.00]; // D major ascending arpeggio

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.07;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.2, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.26);
    });
  }

  playGameOver() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const notes = [293.66, 261.63, 220.00, 146.83]; // Descending melancholy minor

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.25;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.65);
    });
  }

  // ===================== PROCEDURAL SYNTHWAVE MUSIC ===================== //

  startMusic() {
    if (this.isPlayingMusic) return;
    this.init();
    this.resume();
    this.isPlayingMusic = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime;
    this.scheduler();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  setIntensity(level) {
    this.intensity = level; // 1 to 3
  }

  scheduler() {
    if (!this.isPlayingMusic || !this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.advanceStep();
    }
    this.timerId = setTimeout(() => this.scheduler(), this.lookahead);
  }

  advanceStep() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note steps
    this.step = (this.step + 1) % 64; // 4-bar loop
    if (this.step % 16 === 0) {
      this.currentChordIndex = (this.currentChordIndex + 1) % this.chordRoots.length;
    }
  }

  scheduleStep(step, time) {
    if (this.isMuted) return;

    // 1. Kick Drum on beats 1, 5, 9, 13 (every quarter note)
    if (step % 4 === 0) {
      this.playSynthKick(time);
    }

    // 2. Snare / Clap on beats 4 and 12 (backbeat)
    if (step % 8 === 4) {
      this.playSynthSnare(time);
    }

    // 3. Hi-Hat on offbeats (every 8th or 16th note depending on intensity)
    if (step % 2 === 1 || (this.intensity >= 2 && step % 1 === 0)) {
      this.playSynthHat(time, step % 4 === 2 ? 0.08 : 0.04);
    }

    // 4. Rolling Cyberpunk Bassline (16th notes)
    this.playSynthBass(time, step);

    // 5. Arpeggio / Lead synth (builds with wave intensity)
    if (this.intensity >= 2 && step % 2 === 0) {
      this.playSynthLead(time, step);
    }
  }

  playSynthKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  playSynthSnare(time) {
    if (!this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(time);
    noise.stop(time + 0.19);
  }

  playSynthHat(time, vol = 0.05) {
    if (!this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(8000, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(time);
    noise.stop(time + 0.05);
  }

  playSynthBass(time, step) {
    const root = this.chordRoots[this.currentChordIndex];
    // Octave bouncing pattern: root, root*2, root, root*1.5
    const patterns = [1, 2, 1, 1.5, 1, 2, 1.2, 1];
    const mult = patterns[step % patterns.length];
    const freq = root * mult;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450 + (step % 4) * 80, time);
    filter.Q.value = 4.5;

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.11);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.12);
  }

  playSynthLead(time, step) {
    const root = this.chordRoots[this.currentChordIndex] * 4;
    // Cyberpunk minor scale intervals: 1, b3, 4, 5, b7
    const scale = [1, 1.189, 1.335, 1.498, 1.782, 2];
    const noteIdx = (step * 3) % scale.length;
    const freq = root * scale[noteIdx];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.16);
  }
}

// Global singleton instance
window.audioEngine = new SoundEngine();
