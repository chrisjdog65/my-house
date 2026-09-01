/**
 * Procedural audio: no sound files. Everything is synthesised with the Web Audio API.
 * Sounds are positional-ish: gain falls off with distance from the listener (the player).
 */
import * as THREE from 'three';
import { settings } from './Settings';

type SoundName =
  | 'click' | 'switch' | 'doorOpen' | 'doorClose' | 'doorCreak' | 'pickup' | 'drop' | 'impact'
  | 'footstepWood' | 'footstepTile' | 'footstepCarpet' | 'footstepConcrete' | 'footstepGrass'
  | 'jump' | 'land' | 'fireIgnite' | 'fireOut' | 'water' | 'tvOn' | 'tvOff' | 'fridge' | 'toast' | 'flush' | 'drawer' | 'bell' | 'thud' | 'menu';

export class AudioManager {
  ctx: AudioContext | null = null;
  master!: GainNode;
  private noiseBuffer!: AudioBuffer;
  private loops = new Map<string, { gain: GainNode; nodes: AudioNode[]; position?: THREE.Vector3; baseGain: number }>();
  listener = new THREE.Vector3();
  private unlocked = false;

  constructor() {
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
  }

  unlock() {
    if (this.unlocked) { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = settings.get('volume');
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.unlocked = true;
      settings.onChange((s, k) => { if (k === 'volume' || k === null) this.master.gain.value = s.volume; });
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  private distGain(pos?: THREE.Vector3, range = 12): number {
    if (!pos) return 1;
    const d = pos.distanceTo(this.listener);
    return Math.max(0, 1 - d / range) ** 1.6;
  }

  private noise(duration: number, gain: number, filterType: BiquadFilterType, freq: number, q = 1, when = 0, pos?: THREE.Vector3, range = 12, decay = duration) {
    if (!this.ctx) return;
    const g = this.distGain(pos, range);
    if (g <= 0.001) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const env = this.ctx.createGain();
    const t0 = this.ctx.currentTime + when;
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain * g, t0 + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
    src.connect(f).connect(env).connect(this.master);
    src.start(t0);
    src.stop(t0 + duration + 0.05);
  }

  private tone(freq: number, duration: number, gain: number, type: OscillatorType = 'sine', when = 0, pos?: THREE.Vector3, slideTo?: number, range = 12) {
    if (!this.ctx) return;
    const g = this.distGain(pos, range);
    if (g <= 0.001) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    const t0 = this.ctx.currentTime + when;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain * g, t0 + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    o.connect(env).connect(this.master);
    o.start(t0);
    o.stop(t0 + duration + 0.05);
  }

  play(name: SoundName, pos?: THREE.Vector3, volume = 1) {
    if (!this.ctx) return;
    const v = volume;
    switch (name) {
      case 'click': this.tone(1800, 0.04, 0.12 * v, 'square', 0, pos); break;
      case 'menu': this.tone(880, 0.06, 0.08 * v, 'sine'); this.tone(1320, 0.08, 0.06 * v, 'sine', 0.04); break;
      case 'switch': this.noise(0.03, 0.5 * v, 'highpass', 2500, 1, 0, pos, 8); this.tone(2400, 0.03, 0.08 * v, 'square', 0.005, pos); break;
      case 'doorOpen':
        this.noise(0.35, 0.25 * v, 'bandpass', 900, 2, 0, pos, 14);
        this.tone(220, 0.5, 0.05 * v, 'sawtooth', 0.05, pos, 320);
        break;
      case 'doorCreak':
        this.tone(180, 0.7, 0.04 * v, 'sawtooth', 0, pos, 260);
        this.noise(0.6, 0.12 * v, 'bandpass', 1200, 3, 0, pos, 14);
        break;
      case 'doorClose':
        this.noise(0.12, 0.7 * v, 'lowpass', 500, 1, 0, pos, 16);
        this.tone(90, 0.18, 0.25 * v, 'sine', 0, pos, 50);
        this.noise(0.05, 0.3 * v, 'highpass', 3000, 1, 0.02, pos, 12);
        break;
      case 'pickup': this.tone(520, 0.08, 0.1 * v, 'triangle', 0, pos, 780); break;
      case 'drop': this.noise(0.08, 0.4 * v, 'lowpass', 900, 1, 0, pos); break;
      case 'impact': this.noise(0.09, 0.5 * v, 'lowpass', 700, 1, 0, pos, 14); this.tone(140, 0.1, 0.12 * v, 'sine', 0, pos, 60); break;
      case 'thud': this.noise(0.14, 0.6 * v, 'lowpass', 300, 1, 0, pos, 14); break;
      case 'footstepWood': this.noise(0.07, 0.35 * v, 'lowpass', 900, 1); this.tone(110, 0.06, 0.06 * v, 'sine', 0, undefined, 70); break;
      case 'footstepTile': this.noise(0.06, 0.32 * v, 'bandpass', 2200, 1.5); this.tone(180, 0.04, 0.04 * v, 'sine'); break;
      case 'footstepCarpet': this.noise(0.09, 0.22 * v, 'lowpass', 500, 1); break;
      case 'footstepConcrete': this.noise(0.06, 0.3 * v, 'bandpass', 1400, 1.2); break;
      case 'footstepGrass': this.noise(0.11, 0.24 * v, 'highpass', 1800, 0.8); break;
      case 'jump': this.noise(0.12, 0.2 * v, 'lowpass', 700, 1); break;
      case 'land': this.noise(0.12, 0.45 * v, 'lowpass', 500, 1); break;
      case 'fireIgnite': this.noise(0.5, 0.5 * v, 'lowpass', 1200, 1, 0, pos, 14, 0.5); this.tone(60, 0.4, 0.15 * v, 'sine', 0, pos, 30); break;
      case 'fireOut': this.noise(0.8, 0.35 * v, 'highpass', 3000, 1, 0, pos, 14); break;
      case 'water': this.noise(0.3, 0.3 * v, 'bandpass', 3000, 0.7, 0, pos, 10); break;
      case 'tvOn': this.tone(600, 0.12, 0.08 * v, 'square', 0, pos, 1200); this.noise(0.2, 0.15 * v, 'highpass', 4000, 1, 0, pos); break;
      case 'tvOff': this.tone(900, 0.15, 0.08 * v, 'square', 0, pos, 200); break;
      case 'fridge': this.noise(0.25, 0.3 * v, 'lowpass', 600, 1, 0, pos); this.tone(400, 0.1, 0.06 * v, 'triangle', 0.05, pos, 300); break;
      case 'toast': this.tone(1500, 0.08, 0.1 * v, 'square', 0, pos); this.tone(1100, 0.1, 0.1 * v, 'square', 0.1, pos); break;
      case 'flush': this.noise(1.6, 0.4 * v, 'bandpass', 1200, 0.8, 0, pos, 12, 1.6); this.noise(1.0, 0.3 * v, 'lowpass', 400, 1, 0.3, pos, 12, 1.2); break;
      case 'drawer': this.noise(0.25, 0.25 * v, 'bandpass', 700, 1.5, 0, pos); this.noise(0.05, 0.3 * v, 'lowpass', 600, 1, 0.22, pos); break;
      case 'bell': this.tone(1046, 0.8, 0.12 * v, 'sine', 0, pos); this.tone(1568, 0.6, 0.06 * v, 'sine', 0.02, pos); break;
    }
  }

  /** Start a looping ambient sound. */
  startLoop(id: string, kind: 'fire' | 'water' | 'outdoor' | 'hum' | 'tv' | 'rain', pos?: THREE.Vector3, baseGain = 0.3) {
    if (!this.ctx || this.loops.has(id)) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);
    const nodes: AudioNode[] = [];
    const mk = (type: BiquadFilterType, freq: number, q: number, lfoRate = 0, lfoDepth = 0) => {
      const src = this.ctx!.createBufferSource();
      src.buffer = this.noiseBuffer; src.loop = true;
      const f = this.ctx!.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      src.connect(f).connect(gain);
      if (lfoRate) {
        const lfo = this.ctx!.createOscillator();
        lfo.frequency.value = lfoRate;
        const lg = this.ctx!.createGain(); lg.gain.value = lfoDepth;
        lfo.connect(lg).connect(f.frequency);
        lfo.start();
        nodes.push(lfo);
      }
      src.start();
      nodes.push(src, f);
    };
    switch (kind) {
      case 'fire': mk('lowpass', 500, 0.7, 0.8, 200); mk('bandpass', 2400, 4, 6.3, 900); break;
      case 'water': mk('bandpass', 2800, 0.6, 3.1, 500); mk('highpass', 5000, 1); break;
      case 'outdoor': mk('lowpass', 320, 0.5, 0.13, 120); mk('bandpass', 3800, 8, 0.7, 1500); break;
      case 'hum': mk('lowpass', 120, 6); break;
      case 'tv': mk('bandpass', 1200, 1.5, 0.35, 600); break;
      case 'rain': mk('highpass', 2000, 0.5); mk('lowpass', 800, 0.5); break;
    }
    this.loops.set(id, { gain, nodes, position: pos, baseGain });
    gain.gain.linearRampToValueAtTime(baseGain * this.distGain(pos, 14), this.ctx.currentTime + 0.5);
  }

  stopLoop(id: string) {
    const l = this.loops.get(id);
    if (!l || !this.ctx) return;
    l.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    const nodes = l.nodes;
    setTimeout(() => { for (const n of nodes) { try { (n as any).stop?.(); n.disconnect(); } catch { /* ignore */ } } }, 500);
    this.loops.delete(id);
  }

  hasLoop(id: string) { return this.loops.has(id); }

  /** Update listener position and loop attenuation. */
  update(listener: THREE.Vector3, outdoorness: number) {
    this.listener.copy(listener);
    if (!this.ctx) return;
    for (const [id, l] of this.loops) {
      let g = l.baseGain * this.distGain(l.position, 14);
      if (id === 'outdoor') g = l.baseGain * (0.15 + 0.85 * outdoorness);
      l.gain.gain.setTargetAtTime(g, this.ctx.currentTime, 0.1);
    }
  }
}
