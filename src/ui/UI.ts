/**
 * Screens (loading / menu / pause / settings / controls) and the in-game HUD.
 */
import { settings, type Quality } from '../core/Settings';
import { ROOMS, WALLS, OPENINGS, STAIRS, type FloorId } from '../world/Plan';

export type GameState = 'loading' | 'menu' | 'playing' | 'paused' | 'settings' | 'controls';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class UI {
  state: GameState = 'loading';
  private returnTo: GameState = 'menu';
  onPlay?: () => void;
  onResume?: () => void;
  onQuit?: () => void;
  onTeleport?: () => void;
  onStateChange?: (s: GameState) => void;
  private roomTimer = 0;
  private lastRoom: string | null = null;
  private toastTimer: number | null = null;
  private mapCtx: CanvasRenderingContext2D;
  private mapVisible = false;
  private helpVisible = true;

  constructor() {
    $('btn-play').onclick = () => { this.play(); };
    $('btn-settings').onclick = () => this.showSettings('menu');
    $('btn-controls').onclick = () => this.showControls('menu');
    $('btn-resume').onclick = () => this.resume();
    $('btn-pause-settings').onclick = () => this.showSettings('paused');
    $('btn-pause-controls').onclick = () => this.showControls('paused');
    $('btn-teleport').onclick = () => { this.onTeleport?.(); this.resume(); };
    $('btn-quit').onclick = () => { this.setState('menu'); this.onQuit?.(); };
    $('btn-settings-back').onclick = () => this.setState(this.returnTo);
    $('btn-controls-back').onclick = () => this.setState(this.returnTo);
    $('btn-settings-reset').onclick = () => { settings.reset(); this.syncSettings(); };
    this.bindSettings();
    this.mapCtx = $<HTMLCanvasElement>('map-canvas').getContext('2d')!;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.state === 'paused') this.resume();
        else if (this.state === 'settings' || this.state === 'controls') this.setState(this.returnTo);
      }
    });
  }

  // -------------------------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------------------------

  setState(s: GameState) {
    this.state = s;
    const show = (id: string, v: boolean) => $(id).classList.toggle('hidden', !v);
    show('loading', s === 'loading');
    show('menu', s === 'menu');
    show('pause', s === 'paused');
    show('settings', s === 'settings');
    show('controls', s === 'controls');
    show('hud', s === 'playing' || s === 'paused' || s === 'settings' || s === 'controls');
    document.body.style.cursor = s === 'playing' ? 'none' : 'auto';
    this.onStateChange?.(s);
  }

  play() { this.setState('playing'); this.onPlay?.(); }
  pause() { if (this.state === 'playing') this.setState('paused'); }
  resume() { this.setState('playing'); this.onResume?.(); }
  showSettings(from: GameState) { this.returnTo = from; this.syncSettings(); this.setState('settings'); }
  showControls(from: GameState) { this.returnTo = from; this.setState('controls'); }
  showMenu() { this.setState('menu'); }

  setProgress(p: number, label?: string) {
    $('progress-bar').style.width = `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`;
    if (label) $('progress-label').textContent = label;
  }

  // -------------------------------------------------------------------------------------------
  // Settings bindings
  // -------------------------------------------------------------------------------------------

  private bindSettings() {
    const q = $<HTMLSelectElement>('s-quality');
    q.onchange = () => { settings.applyQualityPreset(q.value as Quality); this.syncSettings(); };
    const bindRange = (id: string, key: any, fmt: (v: number) => string) => {
      const el = $<HTMLInputElement>(id);
      const out = $<HTMLOutputElement>('o-' + id.slice(2));
      el.oninput = () => { settings.set(key, parseFloat(el.value)); out.value = fmt(parseFloat(el.value)); };
    };
    const bindCheck = (id: string, key: any) => {
      const el = $<HTMLInputElement>(id);
      el.onchange = () => settings.set(key, el.checked);
    };
    bindRange('s-scale', 'resolutionScale', (v) => `${Math.round(v * 100)}%`);
    bindRange('s-fov', 'fov', (v) => `${Math.round(v)}°`);
    bindRange('s-time', 'timeOfDay', (v) => fmtHour(v));
    bindRange('s-sens', 'sensitivity', (v) => v.toFixed(2));
    bindRange('s-camdist', 'cameraDistance', (v) => `${v.toFixed(1)} m`);
    bindRange('s-volume', 'volume', (v) => `${Math.round(v * 100)}%`);
    bindCheck('s-shadows', 'shadows');
    bindCheck('s-ao', 'ao');
    bindCheck('s-bloom', 'bloom');
    bindCheck('s-aa', 'antialias');
    bindCheck('s-fps', 'showFps');
    bindCheck('s-cycle', 'dayCycle');
    bindCheck('s-invert', 'invertY');
    bindCheck('s-bob', 'headBob');
    this.syncSettings();
  }

  syncSettings() {
    const d = settings.data;
    $<HTMLSelectElement>('s-quality').value = d.quality;
    const setR = (id: string, v: number, fmt: (v: number) => string) => { $<HTMLInputElement>(id).value = String(v); $<HTMLOutputElement>('o-' + id.slice(2)).value = fmt(v); };
    setR('s-scale', d.resolutionScale, (v) => `${Math.round(v * 100)}%`);
    setR('s-fov', d.fov, (v) => `${Math.round(v)}°`);
    setR('s-time', d.timeOfDay, (v) => fmtHour(v));
    setR('s-sens', d.sensitivity, (v) => v.toFixed(2));
    setR('s-camdist', d.cameraDistance, (v) => `${v.toFixed(1)} m`);
    setR('s-volume', d.volume, (v) => `${Math.round(v * 100)}%`);
    $<HTMLInputElement>('s-shadows').checked = d.shadows;
    $<HTMLInputElement>('s-ao').checked = d.ao;
    $<HTMLInputElement>('s-bloom').checked = d.bloom;
    $<HTMLInputElement>('s-aa').checked = d.antialias;
    $<HTMLInputElement>('s-fps').checked = d.showFps;
    $<HTMLInputElement>('s-cycle').checked = d.dayCycle;
    $<HTMLInputElement>('s-invert').checked = d.invertY;
    $<HTMLInputElement>('s-bob').checked = d.headBob;
  }

  // -------------------------------------------------------------------------------------------
  // HUD
  // -------------------------------------------------------------------------------------------

  setPrompt(text: string | null, key = 'E') {
    const el = $('prompt');
    if (!text) { el.classList.add('hidden'); $('reticle').classList.remove('active'); return; }
    if ($('prompt-text').textContent !== text) $('prompt-text').textContent = text;
    $('prompt-key').textContent = key;
    el.classList.remove('hidden');
    $('reticle').classList.add('active');
  }

  setHeld(name: string | null) {
    const el = $('held');
    if (!name) { el.classList.add('hidden'); return; }
    $('held-text').textContent = `Holding: ${name}`;
    el.classList.remove('hidden');
  }

  setFps(fps: number) {
    const el = $('fps');
    const show = settings.get('showFps');
    el.classList.toggle('hidden', !show);
    if (show) el.textContent = `${Math.round(fps)} fps`;
  }

  setClock(hour: number) {
    $('clock').textContent = fmtHour(hour);
  }

  /** Show the room name briefly when it changes. */
  setRoom(name: string | null, dt: number) {
    const el = $('room-label');
    if (name !== this.lastRoom) {
      this.lastRoom = name;
      if (name) {
        $('room-name').textContent = name;
        el.classList.remove('hidden');
        el.style.animation = 'none';
        void el.offsetHeight;
        el.style.animation = '';
        this.roomTimer = 3.2;
      } else {
        el.classList.add('hidden');
      }
    }
    if (this.roomTimer > 0) {
      this.roomTimer -= dt;
      el.style.opacity = String(Math.min(1, this.roomTimer / 0.6));
      if (this.roomTimer <= 0) el.classList.add('hidden');
    }
  }

  toast(msg: string, ms = 2600) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.classList.add('hidden'), ms);
  }

  toggleMap(): boolean {
    this.mapVisible = !this.mapVisible;
    $('map').classList.toggle('hidden', !this.mapVisible);
    return this.mapVisible;
  }

  toggleHelp() {
    this.helpVisible = !this.helpVisible;
    $('hint-bar').classList.toggle('hidden', !this.helpVisible);
    $('clock').classList.toggle('hidden', !this.helpVisible);
  }

  get mapShown() { return this.mapVisible; }

  /** Draw the floor plan for the player's floor with the player marker. */
  updateMap(floor: FloorId, px: number, pz: number, yaw: number) {
    if (!this.mapVisible) return;
    const c = this.mapCtx;
    const W = c.canvas.width, H = c.canvas.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(10,14,20,0.9)';
    c.fillRect(0, 0, W, H);
    const scale = W / 20;
    const tx = (x: number) => W / 2 + x * scale;
    const tz = (z: number) => H / 2 + z * scale; // +z (front) at the bottom
    // rooms
    for (const r of ROOMS) {
      if (r.floor !== floor) continue;
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.fillRect(tx(r.x0), tz(r.z0), (r.x1 - r.x0) * scale, (r.z1 - r.z0) * scale);
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.font = '10px Inter, sans-serif';
      c.textAlign = 'center';
      const words = r.name.split(' ');
      words.forEach((w, i) => c.fillText(w, tx((r.x0 + r.x1) / 2), tz((r.z0 + r.z1) / 2) + (i - (words.length - 1) / 2) * 11 + 4));
    }
    // stairs
    for (const s of STAIRS) {
      if (s.floorBottom !== floor && s.floorTop !== floor) continue;
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 1;
      const n = s.risers - 1;
      for (let i = 0; i <= n; i++) {
        const z = s.zStart + s.dir * i * s.tread;
        c.beginPath(); c.moveTo(tx(s.x0), tz(z)); c.lineTo(tx(s.x1), tz(z)); c.stroke();
      }
    }
    // walls
    c.strokeStyle = '#e8e2d4';
    c.lineCap = 'butt';
    for (const w of WALLS) {
      if (w.floor !== floor) continue;
      c.lineWidth = w.exterior ? 4 : 2.5;
      c.beginPath(); c.moveTo(tx(w.x0), tz(w.z0)); c.lineTo(tx(w.x1), tz(w.z1)); c.stroke();
    }
    // openings: erase wall segment, draw door leaf
    for (const o of OPENINGS[floor]) {
      const onXWall = WALLS.some((w) => w.floor === floor && Math.abs(w.z0 - w.z1) < 1e-6 && Math.abs(w.z0 - o.z) < 0.01 && o.x >= w.x0 && o.x <= w.x1);
      c.strokeStyle = 'rgba(10,14,20,1)';
      c.lineWidth = 6;
      c.beginPath();
      if (onXWall) { c.moveTo(tx(o.x - o.w / 2), tz(o.z)); c.lineTo(tx(o.x + o.w / 2), tz(o.z)); }
      else { c.moveTo(tx(o.x), tz(o.z - o.w / 2)); c.lineTo(tx(o.x), tz(o.z + o.w / 2)); }
      c.stroke();
      if (o.kind === 'window' || o.kind === 'basementWindow') {
        c.strokeStyle = '#7cc6ff'; c.lineWidth = 2; c.stroke();
      } else if (o.kind === 'door' || o.kind === 'exteriorDoor') {
        c.strokeStyle = '#f0b35b'; c.lineWidth = 1.5;
        c.beginPath();
        const sw = o.swing ?? 1;
        if (onXWall) { c.moveTo(tx(o.x - o.w / 2), tz(o.z)); c.lineTo(tx(o.x - o.w / 2), tz(o.z + sw * o.w)); }
        else { c.moveTo(tx(o.x), tz(o.z - o.w / 2)); c.lineTo(tx(o.x + sw * o.w), tz(o.z - o.w / 2)); }
        c.stroke();
      }
    }
    // player
    c.save();
    c.translate(tx(px), tz(pz));
    c.rotate(-yaw + Math.PI);
    c.fillStyle = '#f0b35b';
    c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 6); c.lineTo(0, 3); c.lineTo(-6, 6); c.closePath(); c.fill();
    c.restore();
    $('map-title').textContent = floor === 'ground' ? 'Ground Floor' : floor === 'upper' ? 'Upper Floor' : 'Basement';
  }
}

export function fmtHour(h: number) {
  const hh = Math.floor(h) % 24, mm = Math.round((h - Math.floor(h)) * 60);
  const ap = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${mm.toString().padStart(2, '0')} ${ap}`;
}
