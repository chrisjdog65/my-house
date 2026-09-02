/**
 * FoyerHallStudy.props.ts — furniture & prop builders used by the foyer, hall, stairwell and
 * study. Every builder returns a THREE.Group in local space (front = +z, floor at y = 0) so the
 * room builder can `place()` it and hand it to `addStatic()` with colliders. Only the parts that
 * animate, toggle or are transparent go to `ctx.dynamic`.
 */
import * as THREE from 'three';
import { Prim, mergeByMaterial, place } from '../Builder';
import type { Ctx } from '../Context';
import type { Interactable } from '../Interactables';
import { Toggle, pickup, bulbMaterials, addStatic } from '../Props';

// -------------------------------------------------------------------------------------------
// Shared caches (per Ctx so a rebuilt world never reuses stale materials)
// -------------------------------------------------------------------------------------------

const matCaches = new WeakMap<Ctx, Map<string, THREE.Material>>();
function cacheFor(ctx: Ctx) {
  let m = matCaches.get(ctx);
  if (!m) { m = new Map(); matCaches.set(ctx, m); }
  return m;
}

/** `mats.image()` creates a new material on every call; cache by texture so equal pictures batch together. */
export function imageMat(ctx: Ctx, tex: THREE.Texture, opts: Parameters<Ctx['mats']['image']>[1] = {}) {
  const c = cacheFor(ctx);
  const key = 'img:' + tex.uuid + ':' + JSON.stringify(opts);
  let m = c.get(key);
  if (!m) { m = ctx.mats.image(tex, opts); c.set(key, m); }
  return m;
}

const canvasCache = new Map<string, THREE.CanvasTexture>();
/** Small canvas-art helper for the textures the shared library doesn't provide. */
export function canvasTex(name: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Texture {
  const hit = canvasCache.get(name);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  canvasCache.set(name, t);
  return t;
}

/** Batch a decor group that needs no collider. */
export function stat(ctx: Ctx, g: THREE.Object3D) { addStatic(ctx, g, []); }

// -------------------------------------------------------------------------------------------
// Canvas artwork
// -------------------------------------------------------------------------------------------

export function desktopTexture(): THREE.Texture {
  return canvasTex('fhs-desktop', 512, 320, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#173a5e'); grad.addColorStop(0.55, '#2d6f9e'); grad.addColorStop(1, '#6fb1c9');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    // soft light blobs
    for (const [x, y, r, a] of [[400, 60, 140, 0.18], [120, 260, 120, 0.14], [300, 200, 80, 0.1]]) {
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
    }
    // desktop icons
    const icons = ['#e9c46a', '#f4a261', '#2a9d8f', '#e76f51', '#8ecae6', '#ffb703'];
    icons.forEach((c, i) => {
      const x = 18, y = 18 + i * 44;
      g.fillStyle = c; g.beginPath(); g.roundRect(x, y, 28, 24, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(x + 4, y + 30, 20, 3);
    });
    // a document window
    g.fillStyle = 'rgba(245,245,240,0.96)'; g.beginPath(); g.roundRect(120, 40, 330, 230, 6); g.fill();
    g.fillStyle = '#d9d9d4'; g.beginPath(); g.roundRect(120, 40, 330, 22, 6); g.fill();
    for (const [c, x] of [['#ff5f57', 132], ['#febc2e', 148], ['#28c840', 164]] as [string, number][]) { g.fillStyle = c; g.beginPath(); g.arc(x, 51, 5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#333'; g.font = 'bold 14px Georgia, serif'; g.fillText('Quarterly report — draft', 140, 86);
    g.fillStyle = '#777';
    for (let i = 0; i < 9; i++) { const lw = 200 + ((i * 53) % 90); g.fillRect(140, 100 + i * 16, lw, 4); }
    g.fillStyle = '#2a9d8f'; g.fillRect(140, 250, 90, 10); g.fillStyle = '#e76f51'; g.fillRect(240, 250, 60, 10);
    // taskbar
    g.fillStyle = 'rgba(12,18,28,0.9)'; g.fillRect(0, h - 26, w, 26);
    g.fillStyle = '#8ecae6'; g.beginPath(); g.arc(18, h - 13, 8, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 4; i++) { g.fillStyle = icons[i]; g.fillRect(44 + i * 30, h - 20, 16, 14); }
    g.fillStyle = '#ddd'; g.font = '12px sans-serif'; g.textAlign = 'right'; g.fillText('9:41', w - 12, h - 9);
  });
}

export function globeTexture(): THREE.Texture {
  return canvasTex('fhs-globe', 512, 256, (g, w, h) => {
    const rnd = seededRandom(77);
    g.fillStyle = '#9fc2d8'; g.fillRect(0, 0, w, h);
    // parchment-like ocean tint
    g.fillStyle = 'rgba(230,214,170,0.35)'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7f9a5e';
    const blob = (cx: number, cy: number, rx: number, ry: number, n: number) => {
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = 0.7 + rnd() * 0.5;
        const x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr;
        i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.closePath(); g.fill();
    };
    blob(110, 95, 55, 60, 14); blob(150, 175, 30, 45, 12); // americas
    blob(275, 85, 60, 40, 14); blob(280, 150, 35, 50, 12);  // europe / africa
    blob(390, 90, 80, 45, 16); blob(430, 185, 30, 22, 10);  // asia / oceania
    g.fillStyle = '#e8eef0'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 16, w, 16); // ice caps
    g.strokeStyle = 'rgba(60,50,30,0.35)'; g.lineWidth = 1;
    for (let i = 1; i < 12; i++) { g.beginPath(); g.moveTo((i / 12) * w, 0); g.lineTo((i / 12) * w, h); g.stroke(); }
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, (i / 6) * h); g.lineTo(w, (i / 6) * h); g.stroke(); }
    g.strokeStyle = 'rgba(120,20,20,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  });
}

export function keyboardTexture(): THREE.Texture {
  return canvasTex('fhs-keyboard', 512, 172, (g, w, h) => {
    g.fillStyle = '#1b1b1e'; g.fillRect(0, 0, w, h);
    const rows = [14, 14, 13, 12, 8];
    rows.forEach((n, r) => {
      const kw = (w - 16) / 14, y = 10 + r * 31;
      for (let i = 0; i < n; i++) {
        let x = 8 + i * kw, ww = kw - 4;
        if (r === 4) { if (i === 3) { ww = kw * 5 - 4; } else if (i > 3) { x = 8 + (i + 4) * kw; } }
        g.fillStyle = '#3a3a40'; g.beginPath(); g.roundRect(x, y, ww, 26, 4); g.fill();
        g.fillStyle = '#4a4a52'; g.beginPath(); g.roundRect(x + 2, y + 2, ww - 4, 20, 3); g.fill();
      }
    });
  });
}

export function paperTexture(): THREE.Texture {
  return canvasTex('fhs-paper', 256, 362, (g, w, h) => {
    g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2b2b2b'; g.font = 'bold 16px Georgia, serif'; g.fillText('MEMORANDUM', 28, 44);
    g.fillStyle = '#666';
    for (let i = 0; i < 18; i++) { const lw = 120 + ((i * 37) % 80); g.fillRect(28, 70 + i * 14, lw, 3); }
    g.fillStyle = '#1c3d8a'; g.font = 'italic 18px cursive'; g.fillText('J. Harper', 150, 330);
  });
}

export function keypadTexture(): THREE.Texture {
  return canvasTex('fhs-keypad', 128, 160, (g, w, h) => {
    g.fillStyle = '#17171a'; g.fillRect(0, 0, w, h);
    const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    labels.forEach((l, i) => {
      const x = 10 + (i % 3) * 38, y = 8 + Math.floor(i / 3) * 38;
      g.fillStyle = '#3b3b40'; g.beginPath(); g.roundRect(x, y, 30, 30, 5); g.fill();
      g.fillStyle = '#e8e8e8'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l, x + 15, y + 15);
    });
  });
}

function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// -------------------------------------------------------------------------------------------
// Pictures & books
// -------------------------------------------------------------------------------------------

/** Framed picture, fully static. Group is centred on the picture, faces +z, back plane at z = 0. */
export function framed(ctx: Ctx, tex: THREE.Texture, w: number, h: number, opts: { frameColor?: number; frameW?: number; matte?: number; mat?: THREE.Material; depth?: number } = {}): THREE.Group {
  const mats = ctx.mats;
  const fw = opts.frameW ?? 0.035, d = opts.depth ?? 0.03, mw = opts.matte ?? 0;
  const g = new THREE.Group();
  const frameMat = mats.solid(opts.frameColor ?? 0x2a2018, { roughness: 0.45, envMapIntensity: 0.5 });
  const W = w + 2 * mw, H = h + 2 * mw;
  const top = Prim.box(W + 2 * fw, fw, d, frameMat); top.position.set(0, H / 2 + fw / 2, d / 2);
  const bot = Prim.box(W + 2 * fw, fw, d, frameMat); bot.position.set(0, -H / 2 - fw / 2, d / 2);
  const l = Prim.box(fw, H, d, frameMat); l.position.set(-W / 2 - fw / 2, 0, d / 2);
  const r = Prim.box(fw, H, d, frameMat); r.position.set(W / 2 + fw / 2, 0, d / 2);
  const back = Prim.box(W, H, d * 0.5, mats.solid(mw > 0 ? 0xf4f1ea : 0xf5f5f0, { roughness: 0.9 }), { cast: false }); back.position.z = d * 0.25;
  const pic = Prim.quad(w, h, opts.mat ?? imageMat(ctx, tex, { roughness: 0.85, envMapIntensity: 0.25 }), { keepUV: true, cast: false });
  pic.position.z = d * 0.5 + 0.002;
  g.add(top, bot, l, r, back, pic);
  return g;
}

/** Row of books (bottom at y = 0, spines facing +z, centred on x). Materials are cached per seed. */
export function bookRowMesh(ctx: Ctx, width: number, height: number, seed: number, depth = 0.2): THREE.Mesh {
  const c = cacheFor(ctx);
  const key = 'books:' + seed;
  let mat = c.get(key);
  if (!mat) { mat = ctx.mats.image(ctx.tex.bookRow(seed), { roughness: 0.75, envMapIntensity: 0.3 }); c.set(key, mat); }
  const m = Prim.box(width, height, depth, mat, { keepUV: true });
  const g = m.geometry;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const nor = g.attributes.normal, pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (nor.getZ(i) > 0.5) uv.setXY(i, pos.getX(i) / width + 0.5, pos.getY(i) / height + 0.5);
    else if (nor.getY(i) > 0.5) uv.setXY(i, pos.getX(i) / width + 0.5, 0.98);
    else uv.setXY(i, 0.5, 0.05);
  }
  uv.needsUpdate = true;
  // bake the lift into the geometry so a caller's position.set() can't sink the row through the shelf
  m.geometry.translate(0, height / 2, 0);
  return m;
}

/** A few books lying flat in a stack. */
export function bookStack(ctx: Ctx, colors: number[]): THREE.Group {
  const g = new THREE.Group();
  let y = 0;
  colors.forEach((c, i) => {
    const w = 0.15 + ((i * 7) % 3) * 0.015, d = 0.21 + ((i * 5) % 3) * 0.01, h = 0.025 + ((i * 3) % 2) * 0.008;
    const cover = Prim.rbox(w, h, d, 0.003, ctx.mats.solid(c, { roughness: 0.6 }));
    cover.position.set(((i * 13) % 5 - 2) * 0.006, y + h / 2, 0);
    cover.rotation.y = (((i * 11) % 7) - 3) * 0.04;
    g.add(cover);
    const pages = Prim.box(w - 0.01, h - 0.006, d - 0.012, ctx.mats.solid(0xf1ead6, { roughness: 0.9 }));
    pages.position.copy(cover.position); pages.position.x += 0.006; pages.rotation.copy(cover.rotation);
    g.add(pages);
    y += h;
  });
  return g;
}

// -------------------------------------------------------------------------------------------
// Foyer props
// -------------------------------------------------------------------------------------------

/** Console table with turned legs. `drawer` adds a drawer front with brass knobs. */
export function consoleTable(ctx: Ctx, w: number, d: number, h: number, mat: THREE.Material, opts: { drawer?: boolean; shelf?: boolean } = {}): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const top = Prim.rbox(w, 0.03, d, 0.006, mat); top.position.y = h - 0.015; g.add(top);
  const apron = Prim.box(w - 0.09, 0.1, d - 0.09, mat); apron.position.y = h - 0.085; g.add(apron);
  if (opts.drawer) {
    const front = Prim.rbox(w * 0.55, 0.075, 0.015, 0.004, mat); front.position.set(0, h - 0.085, d / 2 - 0.05); g.add(front);
    for (const s of [-1, 1]) { const knob = Prim.sphere(0.012, mats.brass, { segments: 12 }); knob.position.set(s * w * 0.18, h - 0.085, d / 2 - 0.035); g.add(knob); }
  }
  const legH = h - 0.03;
  const profile: [number, number][] = [[0.024, 0], [0.018, 0.04], [0.026, 0.1], [0.02, 0.2], [0.03, legH * 0.45], [0.02, legH * 0.62], [0.028, legH * 0.8], [0.024, legH]];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = Prim.lathe(profile, mat, { segments: 12 });
    leg.position.set(sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05));
    g.add(leg);
  }
  if (opts.shelf) {
    const shelf = Prim.box(w - 0.14, 0.02, d - 0.12, mat); shelf.position.y = 0.16; g.add(shelf);
  }
  return g;
}

/** Shallow ceramic key bowl (open lathe). */
export function keyBowl(ctx: Ctx, color = 0x2c4a6e): THREE.Mesh {
  const mat = ctx.mats.solid(color, { roughness: 0.25, envMapIntensity: 0.8, physical: true, clearcoat: 0.8, side: THREE.DoubleSide });
  return Prim.lathe([[0, 0], [0.06, 0], [0.095, 0.02], [0.105, 0.045], [0.098, 0.048], [0.088, 0.032], [0.05, 0.012], [0, 0.01]], mat, { segments: 24 });
}

/** Bunch of keys on a ring (pickup). Placed with the ring resting on the surface at y. */
export function keysPickup(ctx: Ctx, x: number, y: number, z: number, rotY = 0) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const ring = Prim.torus(0.017, 0.0025, mats.chrome); g.add(ring);
  const keyMat = mats.solid(0xd8c27a, { roughness: 0.3, metalness: 1, envMapIntensity: 1.2 });
  for (let i = 0; i < 3; i++) {
    const a = 0.4 + i * 0.5;
    const k = new THREE.Group();
    const head = Prim.cylinder(0.011, 0.011, 0.0022, keyMat, { segments: 12 }); head.position.set(0.026, 0, 0); k.add(head);
    const blade = Prim.box(0.032, 0.002, 0.0065, keyMat); blade.position.set(0.05, 0, 0); k.add(blade);
    for (let t = 0; t < 3; t++) { const tooth = Prim.box(0.004, 0.002, 0.003, keyMat); tooth.position.set(0.04 + t * 0.009, 0, 0.0045); k.add(tooth); }
    k.rotation.y = a; k.position.y = 0.0022 * i - 0.002;
    g.add(k);
  }
  const fob = Prim.rbox(0.028, 0.006, 0.045, 0.003, mats.leather(0x6b3f2a)); fob.position.set(-0.035, 0.001, 0); fob.rotation.y = 0.3; g.add(fob);
  g.position.set(x, y + 0.004, z);
  g.rotation.y = rotY;
  return pickup(ctx, g, { name: 'keys', mass: 0.12, shape: { type: 'box', size: new THREE.Vector3(0.1, 0.012, 0.07) }, offset: new THREE.Vector3(0, 0.002, 0), friction: 0.9 });
}

/** Small tabletop photo frame leaning back on an easel strut. */
export function standingFrame(ctx: Ctx, tex: THREE.Texture, w = 0.13, h = 0.1, frameColor = 0x3b2a1e): THREE.Group {
  const g = new THREE.Group();
  const f = framed(ctx, tex, w, h, { frameColor, frameW: 0.012, depth: 0.014 });
  f.rotation.x = -0.22;
  f.position.set(0, h / 2 + 0.02, 0);
  g.add(f);
  const strut = Prim.box(0.02, h * 0.9, 0.006, ctx.mats.solid(frameColor, { roughness: 0.5 }));
  strut.position.set(0, h * 0.42, -0.028);
  strut.rotation.x = 0.4;
  g.add(strut);
  return g;
}

/** Vase with dried stems. */
export function vase(ctx: Ctx, color = 0xd9d2c4, h = 0.22): THREE.Group {
  const g = new THREE.Group();
  const mat = ctx.mats.solid(color, { roughness: 0.35, envMapIntensity: 0.7, physical: true, clearcoat: 0.5 });
  g.add(Prim.lathe([[0, 0], [0.04, 0], [0.06, h * 0.3], [0.055, h * 0.6], [0.03, h * 0.85], [0.035, h], [0.028, h], [0.024, h * 0.9], [0, h * 0.9]], mat, { segments: 20 }));
  const stemMat = ctx.mats.solid(0x8a7a55, { roughness: 0.9 });
  const headMat = ctx.mats.solid(0xc9b48a, { roughness: 0.9 });
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3, tilt = 0.12 + (i % 3) * 0.08, len = 0.3 + (i % 2) * 0.08;
    const s = Prim.cylinder(0.002, 0.003, len, stemMat, { segments: 6 });
    s.position.set(Math.sin(a) * tilt * len * 0.5, h * 0.7 + len / 2 * Math.cos(tilt), Math.cos(a) * tilt * len * 0.5);
    s.rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt);
    g.add(s);
    const head = Prim.sphere(0.014, headMat, { segments: 8 });
    head.position.set(Math.sin(a) * tilt * len, h * 0.7 + len * Math.cos(tilt), Math.cos(a) * tilt * len);
    g.add(head);
  }
  return g;
}

/** Hook rail: walnut board with brass hooks. Board centred, on the wall plane z=0, hooks pointing +z. */
export function hookRail(ctx: Ctx, len: number, hooks: number): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const board = Prim.rbox(len, 0.09, 0.022, 0.005, mats.walnut); board.position.z = 0.011; g.add(board);
  for (let i = 0; i < hooks; i++) {
    const x = -len / 2 + 0.08 + (i / (hooks - 1)) * (len - 0.16);
    const stem = Prim.cylinder(0.007, 0.007, 0.06, mats.brass, { segments: 10 });
    stem.rotation.x = Math.PI / 2; stem.position.set(x, -0.01, 0.05); g.add(stem);
    const tip = Prim.sphere(0.011, mats.brass, { segments: 10 }); tip.position.set(x, 0.005, 0.08); g.add(tip);
    const plate = Prim.cylinder(0.018, 0.018, 0.006, mats.brass, { segments: 12 }); plate.rotation.x = Math.PI / 2; plate.position.set(x, -0.01, 0.024); g.add(plate);
  }
  return g;
}

/** A hanging coat. Origin at the hook point; the coat hangs down along -y, front facing +z. */
export function coat(ctx: Ctx, color: number, opts: { scarf?: number; buttons?: number } = {}): THREE.Group {
  const mats = ctx.mats;
  const fab = mats.fabric(color);
  const g = new THREE.Group();
  // hung from a hook the coat drapes narrow: sleeves fall close to the body
  const shoulders = Prim.rbox(0.32, 0.13, 0.14, 0.05, fab); shoulders.position.set(0, -0.09, 0); g.add(shoulders);
  const body = Prim.rbox(0.28, 0.74, 0.12, 0.05, fab); body.position.set(0, -0.47, 0); g.add(body);
  const collarMat = mats.fabric(new THREE.Color(color).multiplyScalar(0.7).getHex());
  for (const s of [-1, 1]) {
    const c = Prim.rbox(0.12, 0.09, 0.02, 0.008, collarMat); c.position.set(s * 0.06, -0.07, 0.07); c.rotation.z = s * 0.55; g.add(c);
    const sleeve = Prim.capsule(0.045, 0.4, fab); sleeve.position.set(s * 0.15, -0.4, 0.0); sleeve.rotation.z = s * 0.05; g.add(sleeve);
  }
  const btn = mats.solid(opts.buttons ?? 0x1e1a16, { roughness: 0.4 });
  for (let i = 0; i < 3; i++) { const b = Prim.cylinder(0.011, 0.011, 0.005, btn, { segments: 10 }); b.rotation.x = Math.PI / 2; b.position.set(0.025, -0.24 - i * 0.13, 0.062); g.add(b); }
  if (opts.scarf !== undefined) {
    const sf = mats.fabric(opts.scarf);
    const s1 = Prim.capsule(0.032, 0.46, sf); s1.position.set(-0.06, -0.36, 0.07); s1.rotation.z = -0.08; g.add(s1);
    const s2 = Prim.capsule(0.03, 0.2, sf); s2.position.set(0.02, -0.12, 0.075); s2.rotation.z = 1.2; g.add(s2);
  }
  return g;
}

/** Fedora hat: brim at y=0, crown up. */
export function fedora(ctx: Ctx, color = 0x4a3f36): THREE.Group {
  const mats = ctx.mats;
  const fab = mats.fabric(color);
  const g = new THREE.Group();
  const brim = Prim.cylinder(0.148, 0.152, 0.012, fab, { segments: 24 }); brim.position.y = 0.006; g.add(brim);
  g.add(Prim.lathe([[0.1, 0.012], [0.106, 0.05], [0.096, 0.1], [0.06, 0.115], [0, 0.115]], fab, { segments: 24 }));
  const band = Prim.cylinder(0.109, 0.108, 0.028, mats.fabric(0x1e1a18), { segments: 24 }); band.position.y = 0.03; g.add(band);
  return g;
}

/** Canvas tote bag hanging by its straps. Origin at the hook point; front = +z. */
export function toteBag(ctx: Ctx, color = 0xd8cdb4, stripe = 0x2b3a55): THREE.Group {
  const mats = ctx.mats;
  const fab = mats.fabric(color);
  const trim = mats.fabric(stripe);
  const g = new THREE.Group();
  // the bag hangs a little out from the wall (+z) so it clears coats on the neighbouring hooks
  const body = Prim.rbox(0.3, 0.32, 0.07, 0.02, fab); body.position.set(0, -0.36, 0.13); g.add(body);
  const band = Prim.box(0.302, 0.06, 0.074, trim); band.position.set(0, -0.29, 0.13); g.add(band);
  const pocket = Prim.rbox(0.12, 0.1, 0.012, 0.005, trim); pocket.position.set(0.02, -0.41, 0.17); g.add(pocket);
  for (const s of [-1, 1]) {
    // straps run from the hook point diagonally down and out to the bag's top corners (±0.1, -0.2, 0.13)
    const strap = Prim.box(0.02, 0.26, 0.006, trim); strap.position.set(s * 0.05, -0.105, 0.06); strap.rotation.set(-0.52, 0, s * 0.46); g.add(strap);
  }
  return g;
}

/** Pair of shoes centred at origin, toes toward +z. */
export function shoePair(ctx: Ctx, color: number, kind: 'shoe' | 'sneaker' | 'boot' = 'shoe', soleColor = 0x2a2622): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const bodyMat = kind === 'sneaker' ? mats.fabric(color) : mats.leather(color);
  const soleMat = mats.solid(soleColor, { roughness: 0.7 });
  const h = kind === 'boot' ? 0.17 : kind === 'sneaker' ? 0.075 : 0.065;
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    const sole = Prim.rbox(0.092, 0.018, 0.27, 0.007, soleMat); sole.position.y = 0.009; sh.add(sole);
    const body = Prim.rbox(0.084, h, 0.255, 0.028, bodyMat); body.position.set(0, 0.016 + h / 2, -0.005); sh.add(body);
    if (kind === 'boot') { const shaft = Prim.rbox(0.08, 0.12, 0.11, 0.03, bodyMat); shaft.position.set(0, 0.16, -0.06); sh.add(shaft); }
    if (kind !== 'boot') { const lace = Prim.rbox(0.045, 0.012, 0.09, 0.005, kind === 'sneaker' ? mats.solid(0xf0efe8, { roughness: 0.8 }) : soleMat); lace.position.set(0, 0.016 + h, -0.02); sh.add(lace); }
    sh.position.x = s * 0.06;
    sh.rotation.y = s * 0.08;
    g.add(sh);
  }
  return g;
}

/** Storage bench (oak) with a cushion and a low shelf. Front = +z. */
export function shoeBench(ctx: Ctx, w = 0.7, d = 0.34, h = 0.45, cushion = 0x7a5c48): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const seat = Prim.rbox(w, 0.035, d, 0.008, mats.oak); seat.position.y = h - 0.06; g.add(seat);
  const pad = Prim.rbox(w - 0.04, 0.05, d - 0.04, 0.02, mats.fabric(cushion)); pad.position.y = h - 0.02; g.add(pad);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = Prim.box(0.04, h - 0.08, 0.04, mats.oak); leg.position.set(sx * (w / 2 - 0.03), (h - 0.08) / 2, sz * (d / 2 - 0.03)); g.add(leg); }
  const shelf = Prim.box(w - 0.06, 0.02, d - 0.08, mats.oak); shelf.position.y = 0.14; g.add(shelf);
  for (const sz of [-1, 1]) { const st = Prim.box(w - 0.06, 0.03, 0.03, mats.oak); st.position.set(0, h - 0.11, sz * (d / 2 - 0.03)); g.add(st); }
  return g;
}

/** Umbrella stand with two umbrellas. */
export function umbrellaStand(ctx: Ctx): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const metal = mats.solid(0x2c2e33, { roughness: 0.35, metalness: 0.8, envMapIntensity: 0.9, side: THREE.DoubleSide });
  g.add(Prim.lathe([[0.105, 0], [0.115, 0.01], [0.11, 0.5], [0.12, 0.52], [0.1, 0.52], [0.1, 0.04], [0, 0.04]], metal, { segments: 20 }));
  const umb = (color: number, tilt: number, ang: number, handle: boolean) => {
    const u = new THREE.Group();
    const canopy = Prim.cylinder(0.012, 0.038, 0.62, mats.fabric(color), { segments: 12 }); canopy.position.y = 0.36; u.add(canopy);
    const shaft = Prim.cylinder(0.006, 0.006, 0.9, mats.darkMetal, { segments: 8 }); shaft.position.y = 0.45; u.add(shaft);
    const tip = Prim.cylinder(0.004, 0.009, 0.05, mats.darkMetal, { segments: 8 }); tip.position.y = 0.7; u.add(tip);
    if (handle) { const hk = Prim.torus(0.04, 0.008, mats.walnut, { arc: Math.PI }); hk.rotation.x = -Math.PI / 2; hk.position.set(0.04, 0.9, 0); u.add(hk); }
    else { const knob = Prim.sphere(0.018, mats.walnut, { segments: 10 }); knob.position.y = 0.91; u.add(knob); }
    u.position.set(Math.sin(ang) * 0.03, 0.05, Math.cos(ang) * 0.03);
    u.rotation.set(Math.cos(ang) * tilt, 0, -Math.sin(ang) * tilt);
    return u;
  };
  g.add(umb(0x1d1f26, 0.08, 0.6, true), umb(0x8c2b2b, 0.1, 3.4, false));
  return g;
}

/** Small brass chandelier: static body + a merged emissive "flames" mesh for toggling. */
export function chandelier(ctx: Ctx, x: number, ceilY: number, z: number, group: string) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const canopy = Prim.cylinder(0.06, 0.07, 0.025, mats.brass); canopy.position.y = -0.012; g.add(canopy);
  const chain = Prim.cylinder(0.005, 0.005, 0.32, mats.brass, { segments: 8 }); chain.position.y = -0.18; g.add(chain);
  const hub = Prim.sphere(0.05, mats.brass, { segments: 16 }); hub.position.y = -0.4; g.add(hub);
  const stem = Prim.cylinder(0.012, 0.02, 0.1, mats.brass, { segments: 10 }); stem.position.y = -0.47; g.add(stem);
  const drop = Prim.sphere(0.03, mats.brass, { segments: 12 }); drop.position.y = -0.53; g.add(drop);
  const ring = Prim.torus(0.2, 0.011, mats.brass); ring.position.y = -0.43; g.add(ring);
  const flames = new THREE.Group();
  const bulbs = bulbMaterials(ctx, 0xffd9a0, 1.3);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const px = Math.sin(a) * 0.2, pz = Math.cos(a) * 0.2;
    const arm = Prim.cylinder(0.006, 0.006, 0.2, mats.brass, { segments: 8 });
    arm.position.set(px / 2, -0.415, pz / 2);
    arm.rotation.order = 'YXZ'; arm.rotation.set(Math.PI / 2, a, 0); // tip Y->Z, then swing to angle a
    g.add(arm);
    const cup = Prim.cylinder(0.024, 0.016, 0.035, mats.brass, { segments: 12 }); cup.position.set(px, -0.4, pz); g.add(cup);
    const candle = Prim.cylinder(0.012, 0.012, 0.11, mats.solid(0xf3ecdc, { roughness: 0.6 }), { segments: 10 }); candle.position.set(px, -0.33, pz); g.add(candle);
    const flame = Prim.sphere(0.017, bulbs.on, { segments: 10, cast: false }); flame.scale.set(1, 1.7, 1); flame.position.set(px, -0.255, pz); flames.add(flame);
  }
  g.position.set(x, ceilY, z);
  stat(ctx, g);
  flames.position.set(x, ceilY, z);
  const merged = mergeByMaterial(flames);
  ctx.dynamic.add(merged);
  const mesh = merged.children[0] as THREE.Mesh;
  return ctx.lights.point(x, ceilY - 0.38, z, { group, intensity: 13, distance: 8, color: 0xffe2bc, on: true, emissives: [{ mesh, on: bulbs.on, off: bulbs.off }] });
}

/** Bare bulb on a cord (basement stair). */
export function bareBulb(ctx: Ctx, x: number, ceilY: number, z: number, drop: number, group: string) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const rose = Prim.cylinder(0.045, 0.05, 0.02, mats.plasticWhite); rose.position.y = -0.01; g.add(rose);
  const cord = Prim.cylinder(0.004, 0.004, drop, mats.black, { segments: 6 }); cord.position.y = -drop / 2; g.add(cord);
  const holder = Prim.cylinder(0.014, 0.016, 0.045, mats.darkMetal, { segments: 10 }); holder.position.y = -drop - 0.02; g.add(holder);
  g.position.set(x, ceilY, z);
  stat(ctx, g);
  const bulbs = bulbMaterials(ctx, 0xffe0b0, 1.5);
  const bulb = Prim.sphere(0.032, bulbs.on, { segments: 14, cast: false });
  bulb.position.set(x, ceilY - drop - 0.07, z);
  ctx.dynamic.add(bulb);
  return ctx.lights.point(x, ceilY - drop - 0.1, z, { group, intensity: 8, distance: 9, color: 0xffdcae, on: true, flicker: 0.04, emissives: [{ mesh: bulb, on: bulbs.on, off: bulbs.off }] });
}

/** Wall thermostat with a lit display. Faces +z, back on z=0. */
export function thermostat(ctx: Ctx): THREE.Group {
  const g = new THREE.Group();
  const body = Prim.rbox(0.085, 0.085, 0.022, 0.01, ctx.mats.plasticWhite); body.position.z = 0.011; g.add(body);
  const tex = ctx.tex.label('70°', { bg: '#16232c', fg: '#bfe8ff', w: 256, h: 128, font: 'bold 64px sans-serif' });
  const disp = Prim.quad(0.05, 0.024, imageMat(ctx, tex, { emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.3 }), { keepUV: true, cast: false });
  disp.position.set(0, 0.008, 0.0225); g.add(disp);
  const dial = Prim.cylinder(0.012, 0.012, 0.006, ctx.mats.solid(0xdedcd6, { roughness: 0.4 }), { segments: 12 }); dial.rotation.x = Math.PI / 2; dial.position.set(0, -0.025, 0.024); g.add(dial);
  return g;
}

/** Ceiling smoke detector with a green LED. Origin at the ceiling, hangs down. */
export function smokeDetector(ctx: Ctx): THREE.Group {
  const g = new THREE.Group();
  const body = Prim.cylinder(0.062, 0.068, 0.028, ctx.mats.plasticWhite, { segments: 20 }); body.position.y = -0.014; g.add(body);
  const groove = Prim.torus(0.05, 0.004, ctx.mats.solid(0xd8d8d2, { roughness: 0.6 })); groove.position.y = -0.028; g.add(groove);
  const led = Prim.sphere(0.005, ctx.mats.emissive(0x40ff70, 1.6, 0x104020), { segments: 8, cast: false }); led.position.set(0.03, -0.03, 0); g.add(led);
  return g;
}

// -------------------------------------------------------------------------------------------
// Study props
// -------------------------------------------------------------------------------------------

/** Executive pedestal desk. Front (modesty panel) = +z, drawers on the -z (sitter's) side. */
export function executiveDesk(ctx: Ctx, w = 1.8, d = 0.85, h = 0.75): THREE.Group {
  const mats = ctx.mats;
  const wood = mats.mahogany;
  const g = new THREE.Group();
  const top = Prim.rbox(w, 0.04, d, 0.01, wood); top.position.y = h - 0.02; g.add(top);
  const inlay = Prim.rbox(w * 0.62, 0.006, d * 0.58, 0.002, mats.solid(0x2f4a3a, { roughness: 0.55, envMapIntensity: 0.4 })); inlay.position.set(0, h + 0.002, -0.02); g.add(inlay);
  const sub = Prim.box(w - 0.06, 0.035, d - 0.06, wood); sub.position.y = h - 0.055; g.add(sub);
  const pedW = 0.48, pedH = h - 0.09, pedD = d - 0.13;
  for (const s of [-1, 1]) {
    const px = s * (w / 2 - pedW / 2 - 0.04);
    const ped = Prim.box(pedW, pedH, pedD, wood); ped.position.set(px, 0.03 + pedH / 2, 0); g.add(ped);
    const plinth = Prim.box(pedW - 0.03, 0.035, pedD - 0.03, mats.black); plinth.position.set(px, 0.0175, 0); g.add(plinth);
    for (let i = 0; i < 3; i++) {
      const dy = 0.15 + i * 0.2;
      const front = Prim.rbox(pedW - 0.06, 0.16, 0.014, 0.004, wood); front.position.set(px, dy, -pedD / 2 - 0.007); g.add(front);
      const pull = Prim.rbox(0.1, 0.016, 0.022, 0.006, mats.brass); pull.position.set(px, dy, -pedD / 2 - 0.022); g.add(pull);
    }
  }
  const modesty = Prim.box(w - 2 * pedW - 0.1, h - 0.22, 0.02, wood); modesty.position.set(0, (h - 0.22) / 2 + 0.1, pedD / 2 - 0.03); g.add(modesty);
  const panel = Prim.rbox(w - 2 * pedW - 0.26, h - 0.4, 0.012, 0.004, wood); panel.position.set(0, (h - 0.22) / 2 + 0.1, pedD / 2 - 0.014); g.add(panel);
  return g;
}

/** Office chair: 5-star base, gas column, padded seat & back. Front = +z, seat height 0.45. */
export function officeChair(ctx: Ctx): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const leather = mats.leatherBlack;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
    const arm = Prim.rbox(0.05, 0.03, 0.3, 0.01, mats.darkMetal); arm.position.set(Math.sin(a) * 0.15, 0.045, Math.cos(a) * 0.15); arm.rotation.y = a; g.add(arm);
    const caster = Prim.sphere(0.024, mats.plasticBlack, { segments: 10 }); caster.position.set(Math.sin(a) * 0.29, 0.024, Math.cos(a) * 0.29); g.add(caster);
  }
  const hubCyl = Prim.cylinder(0.045, 0.05, 0.1, mats.darkMetal, { segments: 16 }); hubCyl.position.y = 0.09; g.add(hubCyl);
  const column = Prim.cylinder(0.026, 0.026, 0.3, mats.chrome, { segments: 14 }); column.position.y = 0.26; g.add(column);
  const mech = Prim.box(0.3, 0.05, 0.3, mats.plasticBlack); mech.position.y = 0.385; g.add(mech);
  const seat = Prim.rbox(0.5, 0.09, 0.5, 0.035, leather); seat.position.set(0, 0.455, 0.02); g.add(seat);
  const support = Prim.rbox(0.06, 0.34, 0.04, 0.012, mats.darkMetal); support.position.set(0, 0.6, -0.245); support.rotation.x = -0.1; g.add(support);
  const back = Prim.rbox(0.47, 0.58, 0.075, 0.035, leather); back.position.set(0, 0.84, -0.245); back.rotation.x = -0.12; g.add(back);
  const lumbar = Prim.rbox(0.4, 0.2, 0.03, 0.012, leather); lumbar.position.set(0, 0.68, -0.2); lumbar.rotation.x = -0.12; g.add(lumbar);
  const head = Prim.rbox(0.3, 0.14, 0.07, 0.03, leather); head.position.set(0, 1.2, -0.29); head.rotation.x = -0.15; g.add(head);
  for (const s of [-1, 1]) {
    const post = Prim.box(0.03, 0.22, 0.03, mats.darkMetal); post.position.set(s * 0.27, 0.6, 0.0); g.add(post);
    const pad = Prim.rbox(0.07, 0.03, 0.27, 0.012, mats.plasticBlack); pad.position.set(s * 0.27, 0.72, 0.03); g.add(pad);
  }
  return g;
}

/** Leather club armchair with a throw. Front = +z. */
export function clubArmchair(ctx: Ctx, color = 0xffffff, throwColor = 0x8f2f2f): THREE.Group {
  const mats = ctx.mats;
  const lea = mats.leather(color);
  const g = new THREE.Group();
  const base = Prim.rbox(0.82, 0.36, 0.82, 0.06, lea); base.position.y = 0.21; g.add(base);
  const cushion = Prim.rbox(0.56, 0.13, 0.62, 0.05, lea); cushion.position.set(0, 0.43, 0.07); g.add(cushion);
  for (const s of [-1, 1]) { const arm = Prim.rbox(0.14, 0.32, 0.8, 0.055, lea); arm.position.set(s * 0.34, 0.5, -0.01); g.add(arm); }
  const back = Prim.rbox(0.8, 0.52, 0.16, 0.06, lea); back.position.set(0, 0.72, -0.34); back.rotation.x = -0.14; g.add(back);
  const backCushion = Prim.rbox(0.56, 0.36, 0.1, 0.045, lea); backCushion.position.set(0, 0.64, -0.23); backCushion.rotation.x = -0.14; g.add(backCushion);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const foot = Prim.cylinder(0.03, 0.035, 0.05, mats.walnut, { segments: 10 }); foot.position.set(sx * 0.35, 0.025, sz * 0.35); g.add(foot); }
  // throw blanket over the right arm
  const th = mats.fabric(throwColor);
  const t1 = Prim.rbox(0.36, 0.03, 0.5, 0.012, th); t1.position.set(0.32, 0.68, 0.0); t1.rotation.z = 0.05; g.add(t1);
  const t2 = Prim.rbox(0.03, 0.34, 0.44, 0.012, th); t2.position.set(0.43, 0.5, 0.0); t2.rotation.z = -0.06; g.add(t2);
  return g;
}

/** Round pedestal side table. */
export function sideTable(ctx: Ctx, r = 0.24, h = 0.55): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const top = Prim.cylinder(r, r - 0.01, 0.03, mats.walnut, { segments: 28 }); top.position.y = h - 0.015; g.add(top);
  const column = Prim.lathe([[0.03, 0.02], [0.05, 0.05], [0.028, 0.15], [0.035, h * 0.6], [0.028, h - 0.05], [0.06, h - 0.03]], mats.walnut, { segments: 16 }); g.add(column);
  const base = Prim.lathe([[0, 0], [0.16, 0], [0.15, 0.015], [0.09, 0.03], [0, 0.03]], mats.walnut, { segments: 20 }); g.add(base);
  return g;
}

/** Filing cabinet (2 drawers). Front = +z. Returns the body (static) and registers a sliding top drawer. */
export function filingCabinet(ctx: Ctx, x: number, y: number, z: number, rotY: number, color = 0x3b4a3f) {
  const mats = ctx.mats;
  const paint = mats.paintedMetal(color);
  const w = 0.4, h = 1.04, d = 0.58;
  const g = new THREE.Group();
  const body = Prim.rbox(w, h - 0.03, d, 0.008, paint); body.position.set(0, 0.03 + (h - 0.03) / 2, 0); g.add(body);
  const plinth = Prim.box(w - 0.04, 0.03, d - 0.04, mats.black); plinth.position.y = 0.015; g.add(plinth);
  // bottom drawer (static)
  const bottom = drawerFront(ctx, w, paint); bottom.position.set(0, 0.29, d / 2); g.add(bottom);
  place(g, x, y, z, rotY);
  addStatic(ctx, g, [{ size: [w, h, d], center: [0, h / 2, 0] }], { surface: 'metal' });
  // top drawer: sliding, in the dynamic group
  const drawer = new THREE.Group();
  const front = drawerFront(ctx, w, paint); drawer.add(front);
  const box = Prim.box(w - 0.06, 0.34, d - 0.06, mats.solid(0x2a2d2b, { roughness: 0.6, metalness: 0.4 })); box.position.set(0, -0.02, -(d - 0.06) / 2 - 0.01); drawer.add(box);
  const inner = Prim.box(w - 0.09, 0.32, d - 0.1, mats.solid(0x3c3f3d, { roughness: 0.7 })); inner.position.set(0, 0.0, -(d - 0.06) / 2 - 0.01); drawer.add(inner);
  const folderMat = mats.solid(0xd9c58f, { roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const f = Prim.box(w - 0.12, 0.26, 0.004, folderMat); f.position.set(0, 0.02, -0.07 - i * 0.075); drawer.add(f);
    const tab = Prim.box(0.07, 0.02, 0.004, folderMat); tab.position.set(-0.1 + (i % 3) * 0.1, 0.16, -0.07 - i * 0.075); drawer.add(tab);
  }
  drawer.position.set(0, 0.77, d / 2);
  const holder = new THREE.Group();
  place(holder, x, y, z, rotY);
  const merged = mergeByMaterial(drawer);
  holder.add(merged);
  ctx.dynamic.add(holder);
  ctx.interact.add(new Slider(ctx, merged, 'filing drawer', new THREE.Vector3(0, 0, 1), 0.36));
}

function drawerFront(ctx: Ctx, w: number, paint: THREE.Material): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const f = Prim.rbox(w - 0.03, 0.44, 0.02, 0.006, paint); f.position.z = 0.01; g.add(f);
  const handle = Prim.rbox(0.13, 0.024, 0.02, 0.008, mats.chrome); handle.position.set(0, 0.06, 0.03); g.add(handle);
  const label = Prim.box(0.07, 0.03, 0.004, mats.plasticWhite); label.position.set(0, 0.14, 0.022); g.add(label);
  return g;
}

/** Sliding drawer interactable (translates along an axis in local space). */
export class Slider implements Interactable {
  object: THREE.Object3D;
  open = false;
  private t = 0;
  private rest: THREE.Vector3;
  proximity = true;
  radius = 2.0;
  constructor(private ctx: Ctx, obj: THREE.Object3D, private label: string, private axis: THREE.Vector3, private dist: number) {
    this.object = obj;
    this.rest = obj.position.clone();
  }
  getPrompt() { return (this.open ? 'Close ' : 'Open ') + this.label; }
  interact() {
    this.open = !this.open;
    this.ctx.audio.play('drawer', this.object.getWorldPosition(new THREE.Vector3()));
  }
  update(dt: number) {
    const target = this.open ? 1 : 0;
    if (Math.abs(target - this.t) < 0.0005) return;
    this.t += (target - this.t) * (1 - Math.exp(-dt * 9));
    this.object.position.copy(this.rest).addScaledVector(this.axis, this.t * this.dist);
  }
}

/** Wire wastebasket with some crumpled paper. */
export function wastebasket(ctx: Ctx): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const mesh = mats.solid(0x2e3034, { roughness: 0.4, metalness: 0.8, envMapIntensity: 0.9, side: THREE.DoubleSide });
  g.add(Prim.lathe([[0.1, 0], [0.12, 0.005], [0.14, 0.3], [0.13, 0.3], [0.11, 0.01], [0, 0.01]], mesh, { segments: 18 }));
  const rim = Prim.torus(0.14, 0.006, mesh); rim.position.y = 0.3; g.add(rim);
  const paper = mats.solid(0xf2efe6, { roughness: 0.95, flatShading: true });
  for (let i = 0; i < 3; i++) { const p = Prim.sphere(0.035 + i * 0.005, paper, { segments: 7 }); p.position.set((i - 1) * 0.05, 0.05 + i * 0.03, (i % 2) * 0.04 - 0.02); p.scale.set(1, 0.8, 1.1); g.add(p); }
  return g;
}

/** Desk monitor with a toggleable screen. Screen faces +z. Returns nothing; registers the Toggle. */
export function monitor(ctx: Ctx, x: number, y: number, z: number, rotY: number, glowGroup?: string) {
  const mats = ctx.mats;
  const w = 0.56, h = 0.34;
  const g = new THREE.Group();
  const base = Prim.rbox(0.24, 0.016, 0.17, 0.006, mats.plasticBlack); base.position.y = 0.008; g.add(base);
  const neck = Prim.box(0.05, 0.16, 0.03, mats.plasticBlack); neck.position.set(0, 0.09, -0.02); g.add(neck);
  const bezel = Prim.rbox(w, h, 0.03, 0.006, mats.plasticBlack); bezel.position.set(0, 0.17 + h / 2, 0); g.add(bezel);
  const chin = Prim.box(w, 0.012, 0.031, mats.solid(0x555a60, { roughness: 0.4, metalness: 0.6 })); chin.position.set(0, 0.176, 0); g.add(chin);
  place(g, x, y, z, rotY);
  stat(ctx, g);
  const offMat = mats.screenOff;
  const onMat = imageMat(ctx, desktopTexture(), { emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.25, envMapIntensity: 0.3 });
  const screen = Prim.quad(w - 0.03, h - 0.03, offMat, { keepUV: true, cast: false });
  screen.position.set(0, 0.17 + h / 2, 0.0165);
  const holder = new THREE.Group();
  place(holder, x, y, z, rotY);
  holder.add(screen);
  ctx.dynamic.add(holder);
  const focus = screen.getWorldPosition(new THREE.Vector3());
  const glow = ctx.lights.point(x, y + 0.5, z, { intensity: 1.6, distance: 2.2, color: 0x9fc4ff, on: false, group: glowGroup });
  ctx.interact.add(new Toggle(screen, { on: 'Turn off monitor', off: 'Turn on monitor' }, (on) => {
    screen.material = on ? onMat : offMat;
    ctx.lights.setOn(glow, on);
    ctx.audio.play(on ? 'tvOn' : 'tvOff', focus);
  }, focus));
}

export function keyboard(ctx: Ctx): THREE.Group {
  const g = new THREE.Group();
  const body = Prim.rbox(0.42, 0.018, 0.14, 0.006, ctx.mats.plasticBlack); body.position.y = 0.009; g.add(body);
  const keys = Prim.quad(0.4, 0.125, imageMat(ctx, keyboardTexture(), { roughness: 0.6, envMapIntensity: 0.3 }), { keepUV: true, cast: false });
  keys.rotation.x = -Math.PI / 2; keys.position.y = 0.0185; g.add(keys);
  return g;
}

export function mouse(ctx: Ctx): THREE.Group {
  const g = new THREE.Group();
  const body = Prim.rbox(0.062, 0.036, 0.112, 0.016, ctx.mats.plasticBlack); body.position.y = 0.018; g.add(body);
  const wheel = Prim.cylinder(0.006, 0.006, 0.008, ctx.mats.solid(0x555, { roughness: 0.5 }), { segments: 10 }); wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 0.036, 0.03); g.add(wheel);
  return g;
}

export function deskPhone(ctx: Ctx): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.rbox(0.2, 0.05, 0.17, 0.01, mats.plasticBlack); body.position.set(0, 0.035, 0); body.rotation.x = 0.16; g.add(body);
  const pad = Prim.quad(0.075, 0.09, imageMat(ctx, keypadTexture(), { roughness: 0.6 }), { keepUV: true, cast: false });
  pad.rotation.x = -Math.PI / 2 + 0.16; pad.position.set(0.045, 0.0605, 0.012); g.add(pad);
  const disp = Prim.quad(0.075, 0.025, mats.emissive(0x8fd3a0, 0.6, 0x1c2a1c), { keepUV: true, cast: false });
  disp.rotation.x = -Math.PI / 2 + 0.16; disp.position.set(0.045, 0.071, -0.052); g.add(disp);
  const cradle = Prim.rbox(0.05, 0.02, 0.15, 0.006, mats.plasticBlack); cradle.position.set(-0.065, 0.065, 0); cradle.rotation.x = 0.16; g.add(cradle);
  const handset = Prim.capsule(0.019, 0.17, mats.plasticBlack); handset.position.set(-0.065, 0.095, 0); handset.rotation.set(Math.PI / 2 + 0.16, 0, 0); g.add(handset);
  const cord = Prim.cylinder(0.004, 0.004, 0.06, mats.plasticBlack, { segments: 6 }); cord.position.set(-0.09, 0.03, 0.09); cord.rotation.x = 0.6; g.add(cord);
  return g;
}

export function penCup(ctx: Ctx): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  g.add(Prim.lathe([[0, 0], [0.034, 0], [0.037, 0.01], [0.037, 0.095], [0.032, 0.095], [0.032, 0.012], [0, 0.012]], mats.leather(0x5a3a28), { segments: 18 }));
  const cols = [0x1a3d8c, 0x1f1f1f, 0xc0392b, 0xe8c547];
  cols.forEach((c, i) => {
    const a = i * 1.7;
    const pen = Prim.cylinder(0.0035, 0.0045, 0.145, mats.solid(c, { roughness: 0.4 }), { segments: 8 });
    pen.position.set(Math.sin(a) * 0.015, 0.075, Math.cos(a) * 0.015);
    pen.rotation.set(Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12);
    g.add(pen);
  });
  return g;
}

export function paperStack(ctx: Ctx): THREE.Group {
  const g = new THREE.Group();
  const white = ctx.mats.solid(0xf7f4ec, { roughness: 0.95 });
  for (let i = 0; i < 4; i++) {
    const s = Prim.box(0.21, 0.0012, 0.297, white, { cast: false });
    s.position.y = 0.0006 + i * 0.0013; s.rotation.y = (i - 1.5) * 0.06; g.add(s);
  }
  const top = Prim.quad(0.21, 0.297, imageMat(ctx, paperTexture(), { roughness: 0.95 }), { keepUV: true, cast: false });
  top.rotation.x = -Math.PI / 2; top.rotation.z = 0.09; top.position.y = 0.0062; g.add(top);
  return g;
}

/** Desk globe on a brass meridian stand. */
export function globe(ctx: Ctx, r = 0.13): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const base = Prim.lathe([[0, 0], [0.09, 0], [0.085, 0.012], [0.04, 0.02], [0, 0.02]], mats.walnut, { segments: 20 }); g.add(base);
  const post = Prim.cylinder(0.008, 0.01, 0.07, mats.brass, { segments: 10 }); post.position.y = 0.05; g.add(post);
  const tilt = new THREE.Group();
  tilt.position.y = r + 0.08;
  tilt.rotation.z = 0.41;
  const sphere = Prim.sphere(r, imageMat(ctx, globeTexture(), { roughness: 0.55, envMapIntensity: 0.5 }), { segments: 28, keepUV: true }); tilt.add(sphere);
  // Prim.torus lies flat in XZ; tipping it back by -90° gives a vertical half ring over the poles
  const meridian = Prim.torus(r + 0.012, 0.005, mats.brass, { arc: Math.PI }); meridian.rotation.x = -Math.PI / 2; tilt.add(meridian);
  const axis = Prim.cylinder(0.004, 0.004, r * 2 + 0.04, mats.brass, { segments: 8 }); tilt.add(axis);
  g.add(tilt);
  return g;
}

/** Decanter tray with whisky and tumblers. Transparent, so it lives in ctx.dynamic (one merged group). */
export function decanterTray(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const tray = new THREE.Group();
  const t = Prim.rbox(0.36, 0.012, 0.24, 0.004, mats.solid(0x1c1a18, { roughness: 0.3, envMapIntensity: 0.6 })); t.position.y = 0.006; tray.add(t);
  for (const s of [-1, 1]) {
    const rimL = Prim.box(0.36, 0.02, 0.008, mats.brass); rimL.position.set(0, 0.016, s * 0.116); tray.add(rimL);
    const rimS = Prim.box(0.008, 0.02, 0.24, mats.brass); rimS.position.set(s * 0.176, 0.016, 0); tray.add(rimS);
  }
  place(tray, x, y, z, rotY);
  stat(ctx, tray);
  const glass = mats.glass({ tint: 0xe8f0f4, opacity: 0.32, roughness: 0.04 });
  const whisky = mats.solid(0xb5651d, { roughness: 0.15, opacity: 0.85, envMapIntensity: 0.8, depthWrite: false });
  const g = new THREE.Group();
  const dec = Prim.lathe([[0, 0.012], [0.05, 0.012], [0.056, 0.03], [0.05, 0.12], [0.04, 0.14], [0.02, 0.16], [0.02, 0.21], [0.026, 0.215], [0.022, 0.225]], glass, { segments: 20 }); dec.position.set(-0.09, 0, 0); g.add(dec);
  const stopper = Prim.sphere(0.024, glass, { segments: 14 }); stopper.position.set(-0.09, 0.24, 0); g.add(stopper);
  const liquid = Prim.lathe([[0, 0.014], [0.046, 0.014], [0.05, 0.03], [0.047, 0.1], [0, 0.1]], whisky, { segments: 20 }); liquid.position.set(-0.09, 0, 0); g.add(liquid);
  for (const [gx, gz] of [[0.05, -0.05], [0.11, 0.05]]) {
    const tum = Prim.cylinder(0.033, 0.029, 0.085, glass, { segments: 16 }); tum.position.set(gx, 0.012 + 0.0425, gz); g.add(tum);
    const w2 = Prim.cylinder(0.027, 0.025, 0.028, whisky, { segments: 14 }); w2.position.set(gx, 0.012 + 0.02, gz); g.add(w2);
  }
  place(g, x, y, z, rotY);
  const merged = mergeByMaterial(g);
  merged.renderOrder = 5;
  ctx.dynamic.add(merged);
}

/** Marble bust on a plinth. */
export function bust(ctx: Ctx): THREE.Group {
  const mats = ctx.mats;
  const marble = mats.solid(0xe9e5dc, { roughness: 0.35, envMapIntensity: 0.6 });
  const g = new THREE.Group();
  const plinth = Prim.box(0.13, 0.05, 0.13, mats.black); plinth.position.y = 0.025; g.add(plinth);
  const shoulders = Prim.rbox(0.2, 0.09, 0.11, 0.035, marble); shoulders.position.y = 0.095; g.add(shoulders);
  const neck = Prim.cylinder(0.035, 0.04, 0.05, marble, { segments: 12 }); neck.position.y = 0.16; g.add(neck);
  const head = Prim.sphere(0.068, marble, { segments: 16 }); head.position.y = 0.245; head.scale.set(0.9, 1.1, 0.95); g.add(head);
  const nose = Prim.cone(0.012, 0.03, marble, { segments: 6 }); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.24, 0.07); g.add(nose);
  return g;
}

export function trophy(ctx: Ctx): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const base = Prim.box(0.09, 0.03, 0.09, mats.walnut); base.position.y = 0.015; g.add(base);
  g.add(Prim.lathe([[0.02, 0.03], [0.012, 0.05], [0.012, 0.08], [0.03, 0.09], [0.05, 0.16], [0.052, 0.18], [0.045, 0.18], [0.028, 0.1], [0, 0.1]], mats.brass, { segments: 16 }));
  for (const s of [-1, 1]) {
    // vertical half ring (XY plane) turned so it bulges outward from the cup
    const h = Prim.torus(0.02, 0.005, mats.brass, { arc: Math.PI });
    h.rotation.order = 'ZYX'; h.rotation.set(-Math.PI / 2, 0, -s * Math.PI / 2);
    h.position.set(s * 0.058, 0.135, 0);
    g.add(h);
  }
  return g;
}

export function woodenBox(ctx: Ctx, w = 0.24, h = 0.1, d = 0.16): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.rbox(w, h, d, 0.006, mats.walnut); body.position.y = h / 2; g.add(body);
  const lid = Prim.rbox(w + 0.01, 0.015, d + 0.01, 0.004, mats.walnut); lid.position.y = h + 0.0075; g.add(lid);
  const clasp = Prim.box(0.02, 0.025, 0.006, mats.brass); clasp.position.set(0, h - 0.01, d / 2 + 0.003); g.add(clasp);
  return g;
}

/** Two stacked cardboard archive boxes with labels, plus a rolled drawing tube leaning beside them. Front = +z. */
export function archiveBoxes(ctx: Ctx): THREE.Group {
  const mats = ctx.mats;
  const card = mats.solid(0xb9a077, { roughness: 0.95 });
  const cardDark = mats.solid(0xa48d66, { roughness: 0.95 });
  const g = new THREE.Group();
  const bw = 0.4, bh = 0.27, bd = 0.32;
  for (let i = 0; i < 2; i++) {
    const y = i * (bh + 0.035);
    const rot = (i - 0.5) * 0.09;
    const box = Prim.rbox(bw, bh, bd, 0.004, i ? card : cardDark); box.position.set(i * 0.012, y + bh / 2, -i * 0.01); box.rotation.y = rot; g.add(box);
    const lid = Prim.rbox(bw + 0.014, 0.05, bd + 0.014, 0.004, card); lid.position.set(box.position.x, y + bh + 0.01, box.position.z); lid.rotation.y = rot; g.add(lid);
    const tex = ctx.tex.label('ARCHIVE', { sub: i ? 'Contracts 2019 – 2021' : 'Drawings · Site plans', w: 256, h: 128, bg: '#f4efe4', fg: '#3a3229', font: 'bold 34px Georgia, serif' });
    const label = Prim.quad(0.15, 0.075, imageMat(ctx, tex, { roughness: 0.9, envMapIntensity: 0.2 }), { keepUV: true, cast: false });
    label.position.set(box.position.x, y + bh * 0.5, box.position.z + bd / 2 + 0.002); label.rotation.y = rot; g.add(label);
  }
  // drawing tube leaning against the wall on the +x side (top tips toward +x), rolled plans on the lid
  const tubeMat = mats.solid(0x8a7350, { roughness: 0.85 });
  const tube = new THREE.Group();
  tube.add(Prim.cylinder(0.035, 0.035, 0.78, tubeMat, { segments: 12 }));
  const cap = Prim.cylinder(0.038, 0.038, 0.03, mats.plasticBlack, { segments: 12 }); cap.position.y = 0.375; tube.add(cap);
  const capB = Prim.cylinder(0.038, 0.038, 0.02, mats.plasticBlack, { segments: 12 }); capB.position.y = -0.38; tube.add(capB);
  tube.position.set(0.3, 0.39, -0.04); tube.rotation.z = -0.1; g.add(tube);
  const roll = Prim.cylinder(0.028, 0.028, 0.5, mats.solid(0xf1ece0, { roughness: 0.9 }), { segments: 10 }); roll.position.set(0.02, 0.65, 0.03); roll.rotation.set(0, 0, Math.PI / 2); roll.rotation.y = 0.2; g.add(roll);
  const band = Prim.cylinder(0.031, 0.031, 0.02, mats.solid(0xb23a3a, { roughness: 0.6 }), { segments: 10 }); band.position.copy(roll.position); band.rotation.copy(roll.rotation); g.add(band);
  return g;
}

/** Bookcase: uprights, shelves, cornice and back; returns the group plus shelf slot helpers. */
export function bookcase(ctx: Ctx, width: number, height: number, depth: number, bays: number, shelves: number[], mat: THREE.Material): { group: THREE.Group; bayCentres: number[]; bayWidth: number } {
  const g = new THREE.Group();
  const back = Prim.box(width, height, 0.012, mat); back.position.set(0, height / 2, -depth / 2 + 0.006); g.add(back);
  const plinth = Prim.box(width, 0.08, depth - 0.02, mat); plinth.position.set(0, 0.04, 0.0); g.add(plinth);
  const bayWidth = width / bays;
  const bayCentres: number[] = [];
  for (let i = 0; i <= bays; i++) {
    const x = -width / 2 + i * bayWidth;
    const up = Prim.box(0.025, height, depth, mat); up.position.set(THREE.MathUtils.clamp(x, -width / 2 + 0.0125, width / 2 - 0.0125), height / 2, 0); g.add(up);
    if (i < bays) bayCentres.push(x + bayWidth / 2);
  }
  for (const y of shelves) { const s = Prim.box(width - 0.02, 0.025, depth - 0.03, mat); s.position.set(0, y - 0.0125, 0.01); g.add(s); }
  const top = Prim.box(width, 0.03, depth, mat); top.position.set(0, height - 0.015, 0); g.add(top);
  const cornice = Prim.rbox(width + 0.06, 0.07, depth + 0.04, 0.012, mat); cornice.position.set(0, height + 0.02, 0.01); g.add(cornice);
  return { group: g, bayCentres, bayWidth };
}
