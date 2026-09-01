/**
 * Shared helpers for the upper-floor bedroom builders (hall, kids room, guest room, office, closet).
 *
 * Furniture convention used by every builder here: a piece is built in its own group, centred at the
 * origin on the floor, with its FRONT facing +Z and its back at -Z. It is then rotated with one of the
 * FACE constants to sit against a wall (FACE.posZ = front faces +z, i.e. the piece stands against a
 * wall on its -z side).
 */
import * as THREE from 'three';
import { Prim, mergeByMaterial, place } from '../Builder';
import type { Ctx } from '../Context';
import { LEVELS } from '../Plan';
import { addStatic } from '../Props';

export const FLOOR = LEVELS.upper.y;
export const CEIL = FLOOR + LEVELS.upper.ceiling;

/** rotY that makes a +z-facing object face the given world direction. */
export const FACE = { posX: Math.PI / 2, negX: -Math.PI / 2, posZ: 0, negZ: Math.PI } as const;

export type BoxCollider = { size: [number, number, number]; center?: [number, number, number] };

// -------------------------------------------------------------------------------------------
// Canvas textures (posters, charts, screens) — private cache so the shared TextureLibrary is untouched
// -------------------------------------------------------------------------------------------

const canvasCache = new Map<string, THREE.Texture>();

export function canvasTex(name: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Texture {
  const hit = canvasCache.get(name);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  canvasCache.set(name, t);
  return t;
}

/** A live canvas texture (redrawn by the caller; call `update()` after drawing). */
export function liveCanvas(w: number, h: number): { tex: THREE.CanvasTexture; ctx: CanvasRenderingContext2D; update: () => void } {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return { tex, ctx, update: () => { tex.needsUpdate = true; } };
}

/** Deterministic tiny RNG for canvas art. */
export function rng32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -------------------------------------------------------------------------------------------
// Static wall decor
// -------------------------------------------------------------------------------------------

/**
 * Static framed (or unframed) picture. Position is the centre; rotY per FACE. Unlike Props.pictureFrame
 * everything is batched (the image material still gets its own draw call, but nothing lives in `dynamic`).
 */
export function poster(ctx: Ctx, x: number, y: number, z: number, rotY: number, w: number, h: number, tex: THREE.Texture, opts: { frame?: number | null; frameW?: number; matte?: number } = {}) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  let picZ = 0.004;
  if (opts.frame !== null) {
    const fw = opts.frameW ?? 0.03;
    const fm = mats.solid(opts.frame ?? 0x2a2018, { roughness: 0.5 });
    const top = Prim.box(w + 2 * fw, fw, 0.025, fm); top.position.set(0, h / 2 + fw / 2, 0.0125);
    const bot = Prim.box(w + 2 * fw, fw, 0.025, fm); bot.position.set(0, -h / 2 - fw / 2, 0.0125);
    const l = Prim.box(fw, h, 0.025, fm); l.position.set(-w / 2 - fw / 2, 0, 0.0125);
    const r = Prim.box(fw, h, 0.025, fm); r.position.set(w / 2 + fw / 2, 0, 0.0125);
    const back = Prim.box(w, h, 0.012, mats.solid(opts.matte ?? 0xf5f5f0, { roughness: 0.9 })); back.position.z = 0.006;
    g.add(top, bot, l, r, back);
    picZ = 0.014;
  } else {
    // unframed paper poster: a thin backing so it reads as a sheet
    const sheet = Prim.box(w, h, 0.004, mats.solid(0xf7f7f2, { roughness: 0.9 })); sheet.position.z = 0.002;
    g.add(sheet);
    picZ = 0.0045;
  }
  const pic = Prim.quad(w, h, mats.image(tex, { roughness: 0.85, envMapIntensity: 0.25 }), { keepUV: true, cast: false });
  pic.position.z = picZ;
  g.add(pic);
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
}

/** Flat label plate (e.g. bin label, name plate) as a static quad. */
export function labelQuad(ctx: Ctx, tex: THREE.Texture, w: number, h: number): THREE.Mesh {
  return Prim.quad(w, h, ctx.mats.image(tex, { roughness: 0.8, envMapIntensity: 0.2 }), { keepUV: true, cast: false });
}

// -------------------------------------------------------------------------------------------
// Small furniture pieces reused across rooms
// -------------------------------------------------------------------------------------------

/** Soft cushion / pillow. */
export function cushion(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  return Prim.rbox(w, h, d, Math.min(h * 0.48, 0.06), mat, { segments: 3 });
}

/** Open bookshelf carcass (front +z), origin at floor centre. Returns group and shelf Y positions. */
export function shelfUnit(ctx: Ctx, w: number, h: number, d: number, shelves: number, mat: THREE.Material, opts: { backMat?: THREE.Material; plinth?: number; thick?: number } = {}): { g: THREE.Group; shelfY: number[] } {
  const t = opts.thick ?? 0.022;
  const g = new THREE.Group();
  const side = (x: number) => { const m = Prim.box(t, h, d, mat); m.position.set(x, h / 2, 0); g.add(m); };
  side(-w / 2 + t / 2); side(w / 2 - t / 2);
  const top = Prim.box(w, t, d, mat); top.position.y = h - t / 2; g.add(top);
  const plinth = opts.plinth ?? 0.06;
  const bottom = Prim.box(w - 2 * t, t, d, mat); bottom.position.set(0, plinth + t / 2, 0); g.add(bottom);
  const kick = Prim.box(w - 2 * t, plinth, d - 0.04, mat); kick.position.set(0, plinth / 2, -0.02); g.add(kick);
  const back = Prim.box(w - 2 * t, h - plinth - t, 0.01, opts.backMat ?? mat); back.position.set(0, plinth + (h - plinth - t) / 2, -d / 2 + 0.005); g.add(back);
  const shelfY: number[] = [plinth + t];
  const inner = h - t - plinth - t;
  for (let i = 1; i < shelves; i++) {
    const y = plinth + t + (inner * i) / shelves;
    const s = Prim.box(w - 2 * t, t, d - 0.01, mat); s.position.set(0, y - t / 2, 0.005); g.add(s);
    shelfY.push(y);
  }
  return { g, shelfY };
}

/** Simple four-leg chair (front +z, seat height ~0.45). */
export function simpleChair(ctx: Ctx, opts: { seatH?: number; w?: number; wood?: THREE.Material; seatMat?: THREE.Material; back?: 'slats' | 'panel' } = {}): THREE.Group {
  const mats = ctx.mats;
  const seatH = opts.seatH ?? 0.45, w = opts.w ?? 0.42;
  const wood = opts.wood ?? mats.walnut;
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = Prim.cylinder(0.016, 0.02, seatH - 0.02, wood, { segments: 10 });
    leg.position.set(sx * (w / 2 - 0.04), (seatH - 0.02) / 2, sz * (w / 2 - 0.04));
    g.add(leg);
  }
  const seat = Prim.rbox(w, 0.035, w, 0.01, wood); seat.position.y = seatH - 0.0175; g.add(seat);
  if (opts.seatMat) { const pad = Prim.rbox(w - 0.04, 0.03, w - 0.04, 0.012, opts.seatMat); pad.position.y = seatH + 0.012; g.add(pad); }
  const bh = 0.42;
  for (const sx of [-1, 1]) {
    const post = Prim.box(0.03, bh, 0.03, wood); post.position.set(sx * (w / 2 - 0.035), seatH + bh / 2, -w / 2 + 0.03); post.rotation.x = -0.08; g.add(post);
  }
  if ((opts.back ?? 'slats') === 'slats') {
    for (let i = 0; i < 3; i++) { const s = Prim.box(w - 0.09, 0.05, 0.015, wood); s.position.set(0, seatH + 0.12 + i * 0.12, -w / 2 + 0.03 + 0.01 * i); s.rotation.x = -0.08; g.add(s); }
  } else {
    const p = Prim.rbox(w - 0.07, 0.3, 0.02, 0.008, wood); p.position.set(0, seatH + 0.25, -w / 2 + 0.04); p.rotation.x = -0.08; g.add(p);
  }
  return g;
}

/** Teddy bear (sitting). Returns a merged group ~0.34 m tall at scale 1. */
export function teddy(ctx: Ctx, color = 0x9a6a3c, scale = 1): THREE.Group {
  const mats = ctx.mats;
  const fur = mats.fabric(color);
  const muzzle = mats.fabric(0xd9bb8f);
  const g = new THREE.Group();
  const body = Prim.sphere(0.09, fur, { segments: 14 }); body.scale.set(1, 1.15, 0.9); body.position.y = 0.11; g.add(body);
  const head = Prim.sphere(0.075, fur, { segments: 14 }); head.position.y = 0.26; g.add(head);
  for (const s of [-1, 1]) { const ear = Prim.sphere(0.028, fur, { segments: 8 }); ear.position.set(s * 0.058, 0.32, -0.01); g.add(ear); }
  const snout = Prim.sphere(0.035, muzzle, { segments: 10 }); snout.position.set(0, 0.242, 0.06); snout.scale.set(1, 0.8, 0.8); g.add(snout);
  const nose = Prim.sphere(0.012, mats.black, { segments: 6 }); nose.position.set(0, 0.252, 0.088); g.add(nose);
  for (const s of [-1, 1]) { const eye = Prim.sphere(0.009, mats.black, { segments: 6 }); eye.position.set(s * 0.03, 0.28, 0.064); g.add(eye); }
  for (const s of [-1, 1]) {
    const arm = Prim.capsule(0.025, 0.07, fur); arm.position.set(s * 0.1, 0.14, 0.02); arm.rotation.z = s * 1.0; g.add(arm);
    const leg = Prim.capsule(0.03, 0.06, fur); leg.position.set(s * 0.05, 0.035, 0.07); leg.rotation.x = Math.PI / 2 * 0.85; g.add(leg);
  }
  const bow = Prim.box(0.07, 0.022, 0.02, mats.solid(0xd03a3a, { roughness: 0.6 })); bow.position.set(0, 0.19, 0.078); g.add(bow);
  g.scale.setScalar(scale);
  return mergeByMaterial(g);
}

/** Small toy car (~0.16 m long, front +x). */
export function toyCar(ctx: Ctx, color = 0xd33b2f): THREE.Group {
  const mats = ctx.mats;
  const paint = mats.solid(color, { roughness: 0.3, physical: true, clearcoat: 0.8 });
  const g = new THREE.Group();
  const body = Prim.rbox(0.16, 0.05, 0.08, 0.012, paint); body.position.y = 0.05; g.add(body);
  const cabin = Prim.rbox(0.085, 0.045, 0.072, 0.012, paint); cabin.position.set(-0.012, 0.093, 0); g.add(cabin);
  const glass = Prim.box(0.06, 0.028, 0.075, mats.solid(0x203040, { roughness: 0.15, metalness: 0.3 })); glass.position.set(-0.012, 0.095, 0); g.add(glass);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wheel = Prim.cylinder(0.022, 0.022, 0.018, mats.plasticBlack, { segments: 12 });
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(sx * 0.052, 0.022, sz * 0.044);
    g.add(wheel);
    const hub = Prim.cylinder(0.01, 0.01, 0.02, mats.chrome, { segments: 8 });
    hub.rotation.x = Math.PI / 2;
    hub.position.set(sx * 0.052, 0.022, sz * 0.045);
    g.add(hub);
  }
  const lamp = Prim.box(0.006, 0.014, 0.05, mats.solid(0xfff1b0, { roughness: 0.3 })); lamp.position.set(0.08, 0.055, 0); g.add(lamp);
  return mergeByMaterial(g);
}

/** Folded garment stack (for shelves). */
export function foldedStack(ctx: Ctx, colors: number[], w = 0.3, d = 0.25): THREE.Group {
  const g = new THREE.Group();
  let y = 0;
  for (const c of colors) {
    const m = Prim.rbox(w, 0.04, d, 0.012, ctx.mats.fabric(c));
    m.position.y = y + 0.02;
    m.rotation.y = (ctx.rng() - 0.5) * 0.12;
    g.add(m);
    y += 0.04;
  }
  return g;
}

/** Hanging garment on a hanger; hook top at local y=0, garment hangs below. */
export function hangingGarment(ctx: Ctx, color: number, kind: 'shirt' | 'dress' | 'coat' = 'shirt'): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const hook = Prim.torus(0.02, 0.003, mats.chrome, { arc: Math.PI });
  hook.rotation.set(Math.PI / 2, 0, 0);
  hook.position.y = -0.02;
  g.add(hook);
  const neck = Prim.cylinder(0.003, 0.003, 0.05, mats.chrome, { segments: 6 }); neck.position.y = -0.065; g.add(neck);
  const shoulders = Prim.box(0.4, 0.012, 0.012, mats.walnut); shoulders.position.y = -0.1; g.add(shoulders);
  const fab = mats.fabric(color);
  const len = kind === 'dress' ? 1.0 : kind === 'coat' ? 0.85 : 0.62;
  const th = kind === 'coat' ? 0.06 : 0.03;
  const body = Prim.rbox(0.4, len, th, 0.012, fab); body.position.y = -0.1 - len / 2 + 0.02; g.add(body);
  if (kind !== 'dress') {
    for (const s of [-1, 1]) { const sleeve = Prim.rbox(0.09, len * 0.55, th, 0.012, fab); sleeve.position.set(s * 0.22, -0.1 - len * 0.3, 0); sleeve.rotation.z = s * 0.12; g.add(sleeve); }
  }
  return g;
}

/** Register colliders + batch a group at world transform. Thin wrapper to keep call sites short. */
export function placeStatic(ctx: Ctx, g: THREE.Object3D, x: number, z: number, rotY: number, colliders: BoxCollider[] = [], surface = 'wood') {
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, colliders, { surface });
}
