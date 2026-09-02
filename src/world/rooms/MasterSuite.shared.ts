/**
 * Shared helpers for the master-suite builders (bedroom, en-suite bath, walk-in closet): level
 * constants, static placement, soft goods (cushions, towels, folded stacks, hanging garments),
 * wicker baskets, toiletry bottles, static framed pictures and a live canvas texture for screens.
 *
 * Furniture convention: a piece is built in its own group, centred at the origin on the floor, with
 * its FRONT facing +Z. It is then rotated with a FACE constant to stand against a wall.
 */
import * as THREE from 'three';
import { Prim, place } from '../Builder';
import type { Ctx } from '../Context';
import { LEVELS } from '../Plan';
import { addStatic } from '../Props';

export const FLOOR = LEVELS.upper.y;
export const CEIL = FLOOR + LEVELS.upper.ceiling;

/** rotY that makes a +z-facing object face the given world direction. */
export const FACE = { posX: Math.PI / 2, negX: -Math.PI / 2, posZ: 0, negZ: Math.PI } as const;

export type BoxCollider = { size: [number, number, number]; center?: [number, number, number] };

/** Place a floor-standing group at (x, z) with the given facing and batch it with colliders. */
export function placeStatic(ctx: Ctx, g: THREE.Object3D, x: number, z: number, rotY: number, colliders: BoxCollider[] = [], surface = 'wood') {
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, colliders, { surface });
}

/** Soft cushion / pillow. */
export function cushion(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  return Prim.rbox(w, h, d, Math.min(h * 0.48, 0.06), mat, { segments: 3 });
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

/** Static framed picture (batched; only the image quad gets its own draw call). Position is the centre; rotY per FACE. */
export function framedPicture(ctx: Ctx, x: number, y: number, z: number, rotY: number, w: number, h: number, tex: THREE.Texture, opts: { frame?: number; frameW?: number; matte?: number } = {}) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const fw = opts.frameW ?? 0.035;
  const fm = mats.solid(opts.frame ?? 0x2a2018, { roughness: 0.5 });
  const top = Prim.box(w + 2 * fw, fw, 0.028, fm); top.position.set(0, h / 2 + fw / 2, 0.014);
  const bot = Prim.box(w + 2 * fw, fw, 0.028, fm); bot.position.set(0, -h / 2 - fw / 2, 0.014);
  const l = Prim.box(fw, h, 0.028, fm); l.position.set(-w / 2 - fw / 2, 0, 0.014);
  const r = Prim.box(fw, h, 0.028, fm); r.position.set(w / 2 + fw / 2, 0, 0.014);
  const back = Prim.box(w, h, 0.014, mats.solid(opts.matte ?? 0xf5f5f0, { roughness: 0.9 })); back.position.z = 0.007;
  g.add(top, bot, l, r, back);
  const pic = Prim.quad(w, h, mats.image(tex, { roughness: 0.85, envMapIntensity: 0.25 }), { keepUV: true, cast: false });
  pic.position.z = 0.0155;
  g.add(pic);
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
}

/** Folded towel (a soft rounded slab). */
export function foldedTowel(ctx: Ctx, w: number, d: number, color: number, h = 0.05): THREE.Mesh {
  return Prim.rbox(w, h, d, Math.min(0.022, h * 0.45), ctx.mats.fabric(color), { segments: 2 });
}

/** Stack of folded garments / towels (bottom at y=0). */
export function foldedStack(ctx: Ctx, colors: number[], w = 0.3, d = 0.25, h = 0.04): THREE.Group {
  const g = new THREE.Group();
  let y = 0;
  for (const c of colors) {
    const m = Prim.rbox(w, h, d, Math.min(0.015, h * 0.4), ctx.mats.fabric(c), { segments: 2 });
    m.position.set((ctx.rng() - 0.5) * 0.02, y + h / 2, (ctx.rng() - 0.5) * 0.02);
    m.rotation.y = (ctx.rng() - 0.5) * 0.14;
    g.add(m);
    y += h;
  }
  return g;
}

export type GarmentKind = 'shirt' | 'blouse' | 'dress' | 'coat' | 'jacket' | 'pants' | 'skirt';

/** Hanging garment on a wooden hanger; hook top at local y=0, the garment hangs below, faces ±z. */
export function hangingGarment(ctx: Ctx, color: number, kind: GarmentKind = 'shirt'): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const hook = Prim.torus(0.02, 0.003, mats.chrome, { arc: Math.PI });
  hook.rotation.set(Math.PI / 2, 0, 0);
  hook.position.y = -0.02;
  g.add(hook);
  const neck = Prim.cylinder(0.003, 0.003, 0.05, mats.chrome, { segments: 6 }); neck.position.y = -0.065; g.add(neck);
  const hangerW = kind === 'pants' || kind === 'skirt' ? 0.34 : 0.4;
  const shoulders = Prim.box(hangerW, 0.012, 0.012, mats.walnut); shoulders.position.y = -0.1; g.add(shoulders);
  const fab = mats.fabric(color);
  const wobble = (ctx.rng() - 0.5) * 0.03;
  if (kind === 'pants') {
    // trousers folded over the bar
    const bar = Prim.box(hangerW, 0.012, 0.012, mats.walnut); bar.position.y = -0.2; g.add(bar);
    for (const s of [-1, 1]) { const side = Prim.box(0.012, 0.11, 0.012, mats.walnut); side.position.set(s * (hangerW / 2 - 0.006), -0.15, 0); side.rotation.z = -s * 0.32; g.add(side); }
    const body = Prim.rbox(0.28, 0.55, 0.045, 0.014, fab); body.position.set(0, -0.2 - 0.27 + 0.01, 0); body.rotation.y = wobble; g.add(body);
    return g;
  }
  if (kind === 'skirt') {
    const body = Prim.rbox(0.3, 0.5, 0.035, 0.014, fab); body.position.set(0, -0.1 - 0.25 + 0.01, 0); body.rotation.y = wobble; g.add(body);
    const band = Prim.rbox(0.3, 0.04, 0.04, 0.01, mats.fabric(0x333333)); band.position.set(0, -0.1 - 0.01, 0); g.add(band);
    return g;
  }
  const len = kind === 'dress' ? 1.0 + ctx.rng() * 0.12 : kind === 'coat' ? 0.9 : kind === 'jacket' ? 0.68 : kind === 'blouse' ? 0.58 : 0.64;
  const th = kind === 'coat' ? 0.065 : kind === 'jacket' ? 0.05 : 0.03;
  const bw = kind === 'blouse' ? 0.36 : kind === 'dress' ? 0.38 : 0.4;
  const body = Prim.rbox(bw, len, th, 0.014, fab); body.position.y = -0.1 - len / 2 + 0.02; body.rotation.y = wobble; g.add(body);
  if (kind === 'dress') {
    // a slightly flared hem
    const hem = Prim.rbox(bw + 0.06, len * 0.35, th + 0.01, 0.014, fab); hem.position.y = -0.1 - len + 0.02 + len * 0.175; hem.rotation.y = wobble; g.add(hem);
  } else {
    const sl = kind === 'coat' || kind === 'jacket' ? len * 0.6 : len * 0.52;
    for (const s of [-1, 1]) { const sleeve = Prim.rbox(0.09, sl, th, 0.014, fab); sleeve.position.set(s * (bw / 2 + 0.025), -0.1 - sl * 0.5 - 0.02, 0); sleeve.rotation.z = s * 0.1; sleeve.rotation.y = wobble; g.add(sleeve); }
    if (kind === 'shirt' || kind === 'blouse') {
      const collar = Prim.rbox(0.12, 0.035, th + 0.012, 0.008, fab); collar.position.set(0, -0.09, 0); g.add(collar);
    } else {
      const lapel = Prim.rbox(0.14, 0.2, 0.01, 0.004, mats.fabric(new THREE.Color(color).multiplyScalar(0.8).getHex())); lapel.position.set(0, -0.2, th / 2 + 0.004); g.add(lapel);
    }
  }
  return g;
}

/** Wicker basket (ribbed lathe) with an optional lid. Origin at the floor centre. */
export function wickerBasket(ctx: Ctx, r: number, h: number, color = 0xb99a6b, opts: { lid?: boolean; lidAjar?: number } = {}): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const wicker = mats.solid(color, { roughness: 0.9 });
  const pts: [number, number][] = [[0, 0.01], [r * 0.82, 0.01]];
  const rows = Math.max(4, Math.round(h / 0.045));
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const rr = r * (0.86 + 0.14 * Math.min(1, t * 2.5)) + (i % 2 ? 0.006 : -0.004);
    pts.push([rr, 0.02 + t * (h - 0.05)]);
  }
  pts.push([r * 1.04, h - 0.02], [r * 1.04, h], [r * 0.9, h], [r * 0.9, h - 0.03], [r * 0.88, 0.04], [0, 0.04]);
  const body = Prim.lathe(pts, wicker, { segments: 20 });
  g.add(body);
  const dark = mats.solid(new THREE.Color(color).multiplyScalar(0.7).getHex(), { roughness: 0.9 });
  for (const yy of [0.08, h * 0.5, h - 0.08]) { const band = Prim.torus(r * (yy > h * 0.4 ? 1.0 : 0.94), 0.006, dark); band.position.y = yy; g.add(band); }
  if (opts.lid) {
    const lid = Prim.lathe([[0, 0], [r * 1.08, 0], [r * 1.08, 0.025], [r * 0.5, 0.045], [0, 0.05]], wicker, { segments: 20 });
    const knob = Prim.sphere(0.02, dark, { segments: 8 }); knob.position.y = 0.06; lid.add(knob);
    lid.position.y = h;
    if (opts.lidAjar) { lid.rotation.x = -opts.lidAjar; lid.position.z = -r * 0.9 * Math.sin(opts.lidAjar) * 0.5; lid.position.y = h + r * Math.sin(opts.lidAjar) * 0.45; }
    g.add(lid);
  }
  return g;
}

export type BottleKind = 'pump' | 'squeeze' | 'jar' | 'spray' | 'tube';

/** Toiletry bottle; origin at the bottom centre. Returns the group and its collider extents. */
export function toiletryBottle(ctx: Ctx, kind: BottleKind, color: number, capColor = 0xf2f2ef): { g: THREE.Group; r: number; h: number } {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const shell = mats.solid(color, { roughness: 0.3, physical: true, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const cap = mats.solid(capColor, { roughness: 0.35 });
  let r = 0.03, h = 0.16;
  if (kind === 'pump') {
    r = 0.032; h = 0.2;
    const body = Prim.cylinder(0.03, 0.032, 0.15, shell, { segments: 14 }); body.position.y = 0.075; g.add(body);
    const neck = Prim.cylinder(0.012, 0.012, 0.03, cap, { segments: 10 }); neck.position.y = 0.165; g.add(neck);
    const head = Prim.rbox(0.05, 0.016, 0.02, 0.005, cap); head.position.set(0.012, 0.19, 0); g.add(head);
  } else if (kind === 'squeeze') {
    r = 0.028; h = 0.19;
    const body = Prim.rbox(0.05, 0.16, 0.035, 0.014, shell); body.position.y = 0.085; g.add(body);
    const lid = Prim.rbox(0.045, 0.03, 0.03, 0.008, cap); lid.position.y = 0.18; g.add(lid);
  } else if (kind === 'jar') {
    r = 0.038; h = 0.07;
    const body = Prim.cylinder(0.037, 0.035, 0.05, shell, { segments: 16 }); body.position.y = 0.025; g.add(body);
    const lid = Prim.cylinder(0.038, 0.038, 0.018, cap, { segments: 16 }); lid.position.y = 0.059; g.add(lid);
  } else if (kind === 'spray') {
    r = 0.022; h = 0.17;
    const body = Prim.cylinder(0.02, 0.022, 0.12, shell, { segments: 12 }); body.position.y = 0.06; g.add(body);
    const top = Prim.cylinder(0.014, 0.02, 0.03, cap, { segments: 10 }); top.position.y = 0.135; g.add(top);
    const nozzle = Prim.box(0.02, 0.01, 0.01, cap); nozzle.position.set(0.012, 0.155, 0); g.add(nozzle);
  } else {
    r = 0.02; h = 0.13;
    const body = Prim.rbox(0.035, 0.11, 0.022, 0.01, shell); body.position.y = 0.065; g.add(body);
    const lid = Prim.cylinder(0.012, 0.012, 0.02, cap, { segments: 10 }); lid.position.y = 0.01; g.add(lid);
  }
  return { g, r, h };
}
