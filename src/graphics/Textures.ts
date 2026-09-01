/**
 * Texture library: procedural PBR texture sets generated in a worker pool, plus 2D-canvas
 * artwork textures (rugs, paintings, foliage cards, screens).
 */
import * as THREE from 'three';
import { TEXTURE_SPECS, generateTexture, type GeneratedTexture } from './painters';
import { mulberry32 } from './Noise';

/** Bump when painters change so stale cached textures are regenerated. */
export const TEXTURE_CACHE_VERSION = 'v1';

/** Tiny IndexedDB cache for generated texture data (makes repeat visits load instantly). */
class TextureCache {
  private dbp: Promise<IDBDatabase | null>;
  constructor() {
    this.dbp = new Promise((resolve) => {
      try {
        if (!('indexedDB' in window)) { resolve(null); return; }
        const req = indexedDB.open('myhouse-textures', 1);
        req.onupgradeneeded = () => { req.result.createObjectStore('tex'); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch { resolve(null); }
    });
  }
  async get(key: string): Promise<GeneratedTexture | null> {
    const db = await this.dbp;
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('tex', 'readonly');
        const req = tx.objectStore('tex').get(key);
        req.onsuccess = () => {
          const v = req.result;
          if (v && v.color && v.normal && v.orm) resolve({ name: v.name, size: v.size, height: v.height, color: new Uint8Array(v.color), normal: new Uint8Array(v.normal), orm: new Uint8Array(v.orm) });
          else resolve(null);
        };
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }
  async put(key: string, t: GeneratedTexture): Promise<void> {
    const db = await this.dbp;
    if (!db) return;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction('tex', 'readwrite');
        tx.objectStore('tex').put({ name: t.name, size: t.size, height: t.height, color: t.color.buffer, normal: t.normal.buffer, orm: t.orm.buffer }, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (e) { reject(e); }
    });
  }
}
const textureCache = new TextureCache();

export interface TextureSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  ormMap: THREE.Texture; // R=ao, G=roughness, B=metalness
  /** metres per repeat (U) */
  size: number;
  sizeV: number;
}

export class TextureLibrary {
  private sets = new Map<string, TextureSet>();
  private canvasTex = new Map<string, THREE.Texture>();
  private workers: Worker[] = [];
  private nextId = 1;
  private pending = new Map<number, { resolve: (t: GeneratedTexture) => void; reject: (e: any) => void }>();
  private queue: { name: string; size: number; resolve: (t: GeneratedTexture) => void; reject: (e: any) => void }[] = [];
  private busy = new Set<Worker>();
  maxAnisotropy = 8;
  /** resolution multiplier (1 = full) */
  scale = 1;

  constructor(private renderer: THREE.WebGLRenderer) {
    this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const n = Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 4) - 1));
    try {
      for (let i = 0; i < n; i++) {
        const w = new Worker(new URL('./texWorker.ts', import.meta.url), { type: 'module' });
        w.onmessage = (e) => this.onWorkerMessage(w, e);
        w.onerror = () => { /* fall back to main thread */ };
        this.workers.push(w);
      }
    } catch {
      this.workers = [];
    }
  }

  private onWorkerMessage(w: Worker, e: MessageEvent) {
    const { id, ok, tex, error } = e.data;
    const p = this.pending.get(id);
    this.pending.delete(id);
    this.busy.delete(w);
    if (p) ok ? p.resolve(tex) : p.reject(new Error(error));
    this.pump();
  }

  private pump() {
    while (this.queue.length) {
      const free = this.workers.find((w) => !this.busy.has(w));
      if (!free) return;
      const job = this.queue.shift()!;
      const id = this.nextId++;
      this.pending.set(id, { resolve: job.resolve, reject: job.reject });
      this.busy.add(free);
      free.postMessage({ id, name: job.name, size: job.size });
    }
  }

  private generate(name: string, size: number): Promise<GeneratedTexture> {
    if (!this.workers.length) {
      return new Promise((resolve) => setTimeout(() => resolve(generateTexture(name, size)), 0));
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ name, size, resolve, reject });
      this.pump();
    });
  }

  private toTexture(data: Uint8Array, w: number, h: number, srgb: boolean): THREE.DataTexture {
    const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = this.maxAnisotropy;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  }

  /** Preload every procedural texture, reporting progress 0..1. */
  async preload(onProgress?: (p: number, label: string) => void): Promise<void> {
    const names = Object.keys(TEXTURE_SPECS);
    let done = 0;
    const jobs = names.map(async (name) => {
      await this.load(name);
      done++;
      onProgress?.(done / names.length, `Painting ${name}…`);
    });
    await Promise.all(jobs);
    // Upload to GPU now to avoid hitches later
    for (const s of this.sets.values()) {
      this.renderer.initTexture(s.map);
      this.renderer.initTexture(s.normalMap);
      this.renderer.initTexture(s.ormMap);
    }
  }

  async load(name: string): Promise<TextureSet> {
    const existing = this.sets.get(name);
    if (existing) return existing;
    const spec = TEXTURE_SPECS[name];
    if (!spec) throw new Error('Unknown texture: ' + name);
    const size = Math.max(256, Math.round(spec.size * this.scale));
    const cacheKey = `${TEXTURE_CACHE_VERSION}:${name}:${size}`;
    let gen: GeneratedTexture | null = await textureCache.get(cacheKey);
    if (!gen) {
      try {
        gen = await this.generate(name, size);
      } catch {
        gen = generateTexture(name, size);
      }
      textureCache.put(cacheKey, gen).catch(() => { /* ignore quota errors */ });
    }
    const set: TextureSet = {
      map: this.toTexture(gen.color, gen.size, gen.height, true),
      normalMap: this.toTexture(gen.normal, gen.size, gen.height, false),
      ormMap: this.toTexture(gen.orm, gen.size, gen.height, false),
      size: spec.period,
      sizeV: spec.aspect ? spec.period / spec.aspect : spec.period,
    };
    this.sets.set(name, set);
    return set;
  }

  get(name: string): TextureSet {
    const s = this.sets.get(name);
    if (!s) throw new Error('Texture not loaded: ' + name);
    return s;
  }

  has(name: string) {
    return this.sets.has(name);
  }

  dispose() {
    for (const w of this.workers) w.terminate();
  }

  // -------------------------------------------------------------------------------------------
  // Canvas artwork
  // -------------------------------------------------------------------------------------------

  private canvas(name: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, opts: { srgb?: boolean; repeat?: boolean; aniso?: boolean } = {}): THREE.Texture {
    const cached = this.canvasTex.get(name);
    if (cached) return cached;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.anisotropy = opts.aniso === false ? 1 : this.maxAnisotropy;
    t.wrapS = t.wrapT = opts.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.needsUpdate = true;
    this.canvasTex.set(name, t);
    return t;
  }

  /** Oriental-style rug artwork. aspect = w/h */
  rug(variant: 'red' | 'blue' | 'neutral' | 'green' = 'red', aspect = 1.5): THREE.Texture {
    return this.canvas(`rug-${variant}-${aspect}`, 1024, Math.round(1024 / aspect), (ctx, w, h) => {
      const pal = {
        red: { bg: '#7a1f1f', border: '#3a1212', accent: '#d9a441', accent2: '#e9dcc0', field: '#8f2a2a' },
        blue: { bg: '#243a5c', border: '#151f33', accent: '#c9b27c', accent2: '#e8e2d0', field: '#2c4a73' },
        neutral: { bg: '#b9ab94', border: '#7a6d58', accent: '#e8dfcc', accent2: '#5d5344', field: '#c8bba4' },
        green: { bg: '#2f4f3e', border: '#1b2e24', accent: '#d2b56a', accent2: '#e6dfcf', field: '#3b6350' },
      }[variant];
      const rnd = mulberry32(variant.length * 31 + Math.round(aspect * 10));
      ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, w, h);
      // fringe-y edge
      ctx.fillStyle = pal.border; ctx.fillRect(0, 0, w, h);
      const m = Math.round(w * 0.045);
      ctx.fillStyle = pal.bg; ctx.fillRect(m, m, w - 2 * m, h - 2 * m);
      // border pattern
      ctx.strokeStyle = pal.accent; ctx.lineWidth = 6;
      ctx.strokeRect(m * 1.6, m * 1.6, w - 3.2 * m, h - 3.2 * m);
      ctx.strokeRect(m * 2.6, m * 2.6, w - 5.2 * m, h - 5.2 * m);
      ctx.fillStyle = pal.accent;
      const step = w / 24;
      for (let x = m * 2.6; x < w - m * 2.6; x += step) {
        ctx.beginPath(); ctx.moveTo(x, m * 2.1); ctx.lineTo(x + step / 2, m * 1.7); ctx.lineTo(x + step, m * 2.1); ctx.lineTo(x + step / 2, m * 2.5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, h - m * 2.1); ctx.lineTo(x + step / 2, h - m * 1.7); ctx.lineTo(x + step, h - m * 2.1); ctx.lineTo(x + step / 2, h - m * 2.5); ctx.closePath(); ctx.fill();
      }
      for (let y = m * 2.6; y < h - m * 2.6; y += step) {
        ctx.beginPath(); ctx.moveTo(m * 2.1, y); ctx.lineTo(m * 1.7, y + step / 2); ctx.lineTo(m * 2.1, y + step); ctx.lineTo(m * 2.5, y + step / 2); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(w - m * 2.1, y); ctx.lineTo(w - m * 1.7, y + step / 2); ctx.lineTo(w - m * 2.1, y + step); ctx.lineTo(w - m * 2.5, y + step / 2); ctx.closePath(); ctx.fill();
      }
      // field
      ctx.fillStyle = pal.field; ctx.fillRect(m * 3, m * 3, w - 6 * m, h - 6 * m);
      // lattice of diamonds
      const cell = w / 10;
      ctx.strokeStyle = pal.accent2; ctx.lineWidth = 2; ctx.globalAlpha = 0.55;
      for (let x = m * 3; x < w - m * 3; x += cell) {
        for (let y = m * 3; y < h - m * 3; y += cell) {
          ctx.beginPath(); ctx.moveTo(x + cell / 2, y); ctx.lineTo(x + cell, y + cell / 2); ctx.lineTo(x + cell / 2, y + cell); ctx.lineTo(x, y + cell / 2); ctx.closePath(); ctx.stroke();
          if (rnd() < 0.5) { ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(x + cell / 2, y + cell / 2, cell * 0.08, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      ctx.globalAlpha = 1;
      // medallion
      ctx.save();
      ctx.translate(w / 2, h / 2);
      const R = Math.min(w, h) * 0.22;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let a = 0; a < 16; a++) {
          const ang = (a / 16) * Math.PI * 2;
          const rr = R * (1 - i * 0.28) * (a % 2 ? 0.8 : 1);
          const x = Math.cos(ang) * rr * (aspect > 1 ? 1.3 : 1), y = Math.sin(ang) * rr;
          a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? pal.accent : pal.field;
        ctx.fill();
        ctx.strokeStyle = pal.accent2; ctx.lineWidth = 3; ctx.stroke();
      }
      ctx.restore();
      // corner ornaments
      const cornerR = Math.min(w, h) * 0.12;
      for (const [cx, cy] of [[m * 3, m * 3], [w - m * 3, m * 3], [m * 3, h - m * 3], [w - m * 3, h - m * 3]]) {
        ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, cornerR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pal.border; ctx.beginPath(); ctx.arc(cx, cy, cornerR * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      // fibre noise overlay
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 40000; i++) {
        const x = rnd() * w, y = rnd() * h;
        ctx.fillStyle = rnd() < 0.5 ? '#000' : '#fff';
        ctx.fillRect(x, y, 2, 1);
      }
      ctx.globalAlpha = 1;
    });
  }

  /** Generative abstract painting. */
  art(index: number, aspect = 1.33): THREE.Texture {
    return this.canvas(`art-${index}-${aspect}`, 768, Math.round(768 / aspect), (ctx, w, h) => {
      const rnd = mulberry32(1000 + index * 77);
      const palettes = [
        ['#0f1c2e', '#1f4e79', '#e8a33d', '#f2e9dc', '#b83b2e'],
        ['#f4efe6', '#2b2d42', '#8d99ae', '#ef8354', '#4f5d75'],
        ['#1b1b1b', '#e63946', '#f1faee', '#a8dadc', '#457b9d'],
        ['#fdf6e3', '#586e75', '#b58900', '#cb4b16', '#268bd2'],
        ['#20262e', '#c8a97e', '#e0d5c1', '#5b7c6b', '#8c4a3c'],
        ['#e9e4d8', '#3a506b', '#5bc0be', '#1c2541', '#f0a202'],
        ['#101820', '#f2aa4c', '#e7e7e7', '#7a8b99', '#c14953'],
        ['#f7f3ea', '#0b3d2e', '#c9a227', '#6e8b74', '#3d2b1f'],
      ];
      const pal = palettes[index % palettes.length];
      ctx.fillStyle = pal[0]; ctx.fillRect(0, 0, w, h);
      const style = index % 4;
      if (style === 0) {
        // colour field blocks
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = pal[1 + Math.floor(rnd() * 4)];
          ctx.globalAlpha = 0.85;
          const bw = w * (0.2 + rnd() * 0.6), bh = h * (0.15 + rnd() * 0.5);
          ctx.fillRect(rnd() * (w - bw), rnd() * (h - bh), bw, bh);
        }
      } else if (style === 1) {
        // landscape-ish gradient with sun and hills
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, pal[1]); g.addColorStop(0.6, pal[3]); g.addColorStop(1, pal[4]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = pal[2]; ctx.beginPath(); ctx.arc(w * (0.3 + rnd() * 0.4), h * 0.35, h * 0.12, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? pal[4] : pal[1]; ctx.globalAlpha = 0.7;
          ctx.beginPath(); ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * (0.55 + i * 0.1) + Math.sin(x * 0.01 + i) * h * 0.06 + rnd() * 4);
          ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        }
      } else if (style === 2) {
        // circles
        for (let i = 0; i < 24; i++) {
          ctx.fillStyle = pal[1 + Math.floor(rnd() * 4)]; ctx.globalAlpha = 0.75;
          ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, (0.05 + rnd() * 0.2) * w, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        // brush strokes
        for (let i = 0; i < 60; i++) {
          ctx.strokeStyle = pal[1 + Math.floor(rnd() * 4)]; ctx.globalAlpha = 0.6; ctx.lineWidth = 8 + rnd() * 30; ctx.lineCap = 'round';
          ctx.beginPath(); const x = rnd() * w, y = rnd() * h;
          ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (rnd() - 0.5) * 300, y + (rnd() - 0.5) * 300, x + (rnd() - 0.5) * 400, y + (rnd() - 0.5) * 200); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // canvas texture speckle
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < 20000; i++) { ctx.fillStyle = rnd() < 0.5 ? '#000' : '#fff'; ctx.fillRect(rnd() * w, rnd() * h, 2, 2); }
      ctx.globalAlpha = 1;
    });
  }

  /** Photo-like family picture placeholder (soft gradient portrait silhouettes). */
  photo(index: number): THREE.Texture {
    return this.canvas(`photo-${index}`, 512, 384, (ctx, w, h) => {
      const rnd = mulberry32(500 + index * 13);
      const g = ctx.createLinearGradient(0, 0, w, h);
      const hues = [[200, 60], [30, 70], [120, 40], [280, 40]][index % 4];
      g.addColorStop(0, `hsl(${hues[0]}, ${hues[1]}%, 75%)`); g.addColorStop(1, `hsl(${hues[0] + 40}, ${hues[1]}%, 45%)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // silhouettes
      const n = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const cx = w * (0.25 + (i + 0.5) / n * 0.5), s = 0.6 + rnd() * 0.5;
        ctx.fillStyle = 'rgba(20,20,30,0.85)';
        ctx.beginPath(); ctx.arc(cx, h * 0.45, 40 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx, h * 0.95, 80 * s, 110 * s, 0, Math.PI, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, w, h * 0.08);
    });
  }

  /** Foliage card: cluster of leaves with alpha. */
  foliage(kind: 'leaf' | 'needle' | 'bush' = 'leaf'): THREE.Texture {
    return this.canvas(`foliage-${kind}`, 512, 512, (ctx, w, h) => {
      const rnd = mulberry32(kind === 'leaf' ? 42 : kind === 'needle' ? 43 : 44);
      ctx.clearRect(0, 0, w, h);
      const count = kind === 'needle' ? 260 : kind === 'bush' ? 120 : 70;
      for (let i = 0; i < count; i++) {
        const cx = w * 0.5 + (rnd() - 0.5) * w * 0.8, cy = h * 0.5 + (rnd() - 0.5) * h * 0.8;
        const d = Math.hypot(cx - w / 2, cy - h / 2) / (w / 2);
        if (d > 0.95) continue;
        const hue = kind === 'needle' ? 120 + rnd() * 20 : 85 + rnd() * 40;
        const light = 22 + rnd() * 25 + (1 - d) * 8;
        ctx.fillStyle = `hsl(${hue}, ${45 + rnd() * 25}%, ${light}%)`;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rnd() * Math.PI * 2);
        if (kind === 'needle') {
          ctx.fillRect(-2, -30 - rnd() * 30, 4, 60 + rnd() * 40);
        } else {
          const L = (kind === 'bush' ? 22 : 34) + rnd() * 26, W = L * (0.4 + rnd() * 0.3);
          ctx.beginPath(); ctx.moveTo(0, -L / 2);
          ctx.quadraticCurveTo(W, -L * 0.1, 0, L / 2);
          ctx.quadraticCurveTo(-W, -L * 0.1, 0, -L / 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -L / 2); ctx.lineTo(0, L / 2); ctx.stroke();
        }
        ctx.restore();
      }
    }, { aniso: true });
  }

  /** Single grass blade alpha card (for instanced grass). */
  grassBlade(): THREE.Texture {
    return this.canvas('grass-blade', 128, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, '#2f5a1e'); g.addColorStop(0.6, '#4f8a2c'); g.addColorStop(1, '#8dbb4f');
      ctx.fillStyle = g;
      for (const [x0, wid, lean] of [[w * 0.5, 22, 0], [w * 0.3, 16, -18], [w * 0.7, 16, 22]]) {
        ctx.beginPath();
        ctx.moveTo(x0 - wid / 2, h);
        ctx.quadraticCurveTo(x0 + lean * 0.5, h * 0.5, x0 + lean, 4);
        ctx.quadraticCurveTo(x0 + lean * 0.5, h * 0.5, x0 + wid / 2, h);
        ctx.closePath(); ctx.fill();
      }
    });
  }

  /** Book spine strip: several books with random colours across U. */
  bookRow(seed: number): THREE.Texture {
    return this.canvas(`books-${seed}`, 1024, 256, (ctx, w, h) => {
      const rnd = mulberry32(seed);
      let x = 0;
      while (x < w) {
        const bw = 28 + rnd() * 50;
        const hue = rnd() * 360, sat = 30 + rnd() * 50, lig = 25 + rnd() * 40;
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lig}%)`;
        const bh = h * (0.7 + rnd() * 0.3);
        ctx.fillRect(x, h - bh, bw, bh);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, h - bh, 3, bh); ctx.fillRect(x + bw - 3, h - bh, 3, bh);
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,230,160,0.8)' : 'rgba(255,255,255,0.7)';
        for (let y = h - bh + 20; y < h - 30; y += 24 + rnd() * 30) ctx.fillRect(x + 6, y, bw - 12, 3);
        x += bw + 1;
      }
    });
  }

  /** Clock face. */
  clockFace(): THREE.Texture {
    return this.canvas('clock', 512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#f5f1e6'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 6;
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const r0 = i % 5 === 0 ? w * 0.38 : w * 0.43, r1 = w * 0.46;
        ctx.lineWidth = i % 5 === 0 ? 8 : 3;
        ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(a) * r0, h / 2 + Math.sin(a) * r0); ctx.lineTo(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1); ctx.stroke();
      }
      ctx.fillStyle = '#222'; ctx.font = 'bold 54px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let n = 1; n <= 12; n++) {
        const a = (n / 12) * Math.PI * 2 - Math.PI / 2;
        ctx.fillText(String(n), w / 2 + Math.cos(a) * w * 0.31, h / 2 + Math.sin(a) * h * 0.31);
      }
    });
  }

  /** Map / poster / label text texture. */
  label(text: string, opts: { bg?: string; fg?: string; font?: string; w?: number; h?: number; sub?: string } = {}): THREE.Texture {
    const w = opts.w ?? 512, h = opts.h ?? 256;
    return this.canvas(`label-${text}-${JSON.stringify(opts)}`, w, h, (ctx) => {
      ctx.fillStyle = opts.bg ?? '#f4efe4'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = opts.fg ?? '#222'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = opts.font ?? `bold ${Math.round(h * 0.28)}px Georgia, serif`;
      ctx.fillText(text, w / 2, opts.sub ? h * 0.42 : h / 2);
      if (opts.sub) { ctx.font = `${Math.round(h * 0.12)}px sans-serif`; ctx.fillText(opts.sub, w / 2, h * 0.68); }
    });
  }

  /** Chalkboard / whiteboard doodle texture. */
  chalkboard(): THREE.Texture {
    return this.canvas('chalkboard', 1024, 512, (ctx, w, h) => {
      ctx.fillStyle = '#243328'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.font = '48px "Comic Sans MS", cursive, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText('Groceries:', 50, 80);
      ctx.font = '38px "Comic Sans MS", cursive, sans-serif';
      ['- milk', '- eggs', '- coffee!!', '- apples'].forEach((t, i) => ctx.fillText(t, 70, 140 + i * 52));
      ctx.fillText('Sat: garden + BBQ', 560, 120);
      ctx.beginPath(); ctx.arc(760, 300, 80, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(730, 280, 8, 0, Math.PI * 2); ctx.arc(790, 280, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(760, 310, 40, 0.2, Math.PI - 0.2); ctx.stroke();
    });
  }
}
