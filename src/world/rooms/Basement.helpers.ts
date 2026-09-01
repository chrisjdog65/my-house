/**
 * Basement — helpers shared by the hall / rec room / laundry / workshop builders.
 * (Only the basement files import this; nothing here touches shared engine files.)
 */
import * as THREE from 'three';
import { Prim, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import type { Interactable } from '../Interactables';
import type { VirtualLight } from '../../graphics/Lighting';
import { LEVELS } from '../Plan';
import { addStatic, bulbMaterials } from '../Props';

export const FLOOR_Y = LEVELS.basement.y; // -2.95
export const CEIL_H = LEVELS.basement.ceiling; // 2.6 (joist undersides / rec ceiling, above the floor)
export const CEIL_Y = FLOOR_Y + CEIL_H; // -0.35
export const JOIST_H = 0.24; // joists span CEIL_Y .. CEIL_Y + 0.24 in the unfinished rooms

/** Shared material shortcuts (all cached in ctx.mats so they batch across rooms). */
export function bmats(ctx: Ctx) {
  const m = ctx.mats;
  return {
    galv: m.solid(0x9da2a6, { roughness: 0.42, metalness: 0.85, envMapIntensity: 0.9 }),
    galvDark: m.solid(0x7d8286, { roughness: 0.5, metalness: 0.8, envMapIntensity: 0.8 }),
    copper: m.solid(0xb87333, { roughness: 0.35, metalness: 0.9, envMapIntensity: 1.1 }),
    pvc: m.solid(0xf0f0ea, { roughness: 0.5 }),
    ironPipe: m.solid(0x2b2b2d, { roughness: 0.6, metalness: 0.6 }),
    cardboard: m.solid(0xb99062, { roughness: 0.95, envMapIntensity: 0.2 }),
    cardboardDark: m.solid(0x9e7a50, { roughness: 0.95, envMapIntensity: 0.2 }),
    tape: m.solid(0xc8b48a, { roughness: 0.7 }),
    steelGrey: m.paintedMetal(0x8f9296),
    steelLight: m.paintedMetal(0xb4b7ba),
    steelDark: m.solid(0x4a4e54, { roughness: 0.55, metalness: 0.5 }),
    shelfMetal: m.solid(0x5a5f66, { roughness: 0.5, metalness: 0.55 }),
    rubber: m.solid(0x1e1f21, { roughness: 0.9 }),
    whiteAppliance: m.solid(0xf1f1ee, { roughness: 0.32, envMapIntensity: 0.7, physical: true, clearcoat: 0.4 }),
    plasticGrey: m.solid(0xd2d5d2, { roughness: 0.55 }),
    wood: m.solid(0xc9a06a, { roughness: 0.7 }),
    paper: m.solid(0xf1e9d6, { roughness: 0.9 }),
    sawdust: m.solid(0xd9c39a, { roughness: 1, envMapIntensity: 0.1 }),
  };
}

/** Cached image material per texture so repeated labels batch together. */
const imageMatCache = new WeakMap<THREE.Texture, THREE.Material>();
export function imageMat(ctx: Ctx, tex: THREE.Texture, opts: { emissive?: number; emissiveIntensity?: number; roughness?: number } = {}) {
  if (opts.emissive === undefined) {
    const hit = imageMatCache.get(tex);
    if (hit) return hit;
  }
  const m = ctx.mats.image(tex, { roughness: opts.roughness ?? 0.85, envMapIntensity: 0.25, emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity });
  if (opts.emissive === undefined) imageMatCache.set(tex, m);
  return m;
}

/** Label quad facing +z (centre at origin). */
export function labelQuad(ctx: Ctx, text: string, w: number, h: number, opts: { bg?: string; fg?: string; font?: string; sub?: string; tw?: number; th?: number } = {}) {
  const tw = opts.tw ?? 512, th = opts.th ?? Math.max(64, Math.round(512 * h / w));
  const tex = ctx.tex.label(text, { bg: opts.bg ?? '#f4efe4', fg: opts.fg ?? '#222', font: opts.font, sub: opts.sub, w: tw, h: th });
  return Prim.quad(w, h, imageMat(ctx, tex), { keepUV: true, cast: false });
}

/** Cylinder between two points. */
export function tube(a: THREE.Vector3 | [number, number, number], b: THREE.Vector3 | [number, number, number], r: number, mat: THREE.Material, segments = 10): THREE.Mesh {
  const A = Array.isArray(a) ? new THREE.Vector3(...a) : a, B = Array.isArray(b) ? new THREE.Vector3(...b) : b;
  const d = new THREE.Vector3().subVectors(B, A);
  const len = d.length();
  const m = Prim.cylinder(r, r, len, mat, { segments });
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

/** A run of pipe through several points with little elbow spheres at the joints. */
export function pipeRun(points: [number, number, number][], r: number, mat: THREE.Material, parent: THREE.Object3D) {
  for (let i = 0; i < points.length - 1; i++) parent.add(tube(points[i], points[i + 1], r, mat));
  for (let i = 1; i < points.length - 1; i++) {
    const s = Prim.sphere(r * 1.15, mat, { segments: 10 });
    s.position.set(...points[i]);
    parent.add(s);
  }
}

/** Place a group on the basement floor and batch it (colliders in group-local space). */
export function placeStatic(ctx: Ctx, g: THREE.Group, x: number, z: number, rotY: number, colliders: { size: [number, number, number]; center: [number, number, number] }[] = [], surface = 'wood') {
  g.position.set(x, FLOOR_Y, z);
  g.rotation.y = rotY;
  addStatic(ctx, g, colliders, { surface });
}

/** Cardboard moving box (bottom at y=0), optional marker label on the +z face. */
export function cardboardBox(ctx: Ctx, w: number, h: number, d: number, label?: string, opts: { open?: boolean } = {}): THREE.Group {
  const bm = bmats(ctx);
  const g = new THREE.Group();
  const body = Prim.rbox(w, h, d, 0.008, bm.cardboard);
  body.position.y = h / 2;
  g.add(body);
  if (opts.open) {
    // two flaps standing up
    for (const s of [-1, 1]) {
      const flap = Prim.box(w * 0.98, d * 0.45, 0.006, bm.cardboardDark);
      flap.position.set(0, h + d * 0.2, s * (d / 2 - 0.003));
      flap.rotation.x = s * 0.25;
      g.add(flap);
    }
  } else {
    const tape = Prim.box(0.05, 0.003, d + 0.004, bm.tape);
    tape.position.y = h + 0.0015;
    g.add(tape);
    const seam = Prim.box(0.004, 0.002, d, bm.cardboardDark);
    seam.position.set(0.03, h + 0.001, 0);
    g.add(seam);
  }
  if (label) {
    const q = labelQuad(ctx, label, Math.min(w * 0.7, 0.4), Math.min(h * 0.35, 0.16), { bg: '#c9a06a', fg: '#1f2a44', font: 'bold 96px "Arial Black", Impact, sans-serif' });
    q.position.set(0, h * 0.55, d / 2 + 0.002);
    g.add(q);
  }
  return g;
}

/** Paint can (bottom at y=0). */
export function paintCan(ctx: Ctx, bandColor: number, r = 0.085, h = 0.19): THREE.Group {
  const m = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.cylinder(r, r, h, m.solid(0xd8d8d2, { roughness: 0.35, metalness: 0.8 }), { segments: 18 });
  body.position.y = h / 2;
  g.add(body);
  const band = Prim.cylinder(r + 0.002, r + 0.002, h * 0.55, m.solid(bandColor, { roughness: 0.6 }), { segments: 18 });
  band.position.y = h * 0.5;
  g.add(band);
  const rim = Prim.torus(r - 0.004, 0.006, m.solid(0xc4c4be, { roughness: 0.4, metalness: 0.8 }));
  rim.position.y = h;
  g.add(rim);
  return g;
}

/** Bare porcelain bulb fixture with a pull chain; the chain toggles the light. */
export class PullChainLight implements Interactable {
  object: THREE.Group;
  light: VirtualLight;
  proximity = true;
  radius = 2.4;
  focus: THREE.Vector3;
  private chain: THREE.Group;
  private tug = 0;
  constructor(private ctx: Ctx, x: number, z: number, group: string, opts: { intensity?: number; distance?: number; shadow?: boolean; on?: boolean } = {}) {
    const m = ctx.mats;
    const g = new THREE.Group();
    const body = new THREE.Group();
    const box = Prim.cylinder(0.055, 0.055, 0.03, m.plasticWhite, { segments: 8 });
    box.position.y = -0.015;
    body.add(box);
    const socket = Prim.cylinder(0.022, 0.026, 0.06, m.ceramic, { segments: 16 });
    socket.position.y = -0.06;
    body.add(socket);
    const neck = Prim.cylinder(0.013, 0.015, 0.03, m.chrome, { segments: 12 });
    neck.position.y = -0.1;
    body.add(neck);
    g.add(mergeByMaterial(body));
    const bulbs = bulbMaterials(ctx, 0xffe0b6, 1.4);
    const bulb = Prim.sphere(0.031, bulbs.on, { cast: false, segments: 16 });
    bulb.position.y = -0.145;
    g.add(bulb);
    // chain
    this.chain = new THREE.Group();
    const link = Prim.cylinder(0.002, 0.002, 0.34, m.chrome, { segments: 6 });
    link.position.y = -0.17;
    this.chain.add(link);
    const knob = Prim.cylinder(0.006, 0.006, 0.02, m.chrome, { segments: 8 });
    knob.position.y = -0.35;
    this.chain.add(knob);
    this.chain.position.set(0.03, -0.06, 0);
    g.add(this.chain);
    g.position.set(x, CEIL_Y, z);
    ctx.dynamic.add(g);
    this.object = g;
    this.focus = new THREE.Vector3(x, CEIL_Y - 0.4, z);
    this.light = ctx.lights.point(x, CEIL_Y - 0.19, z, {
      group, intensity: opts.intensity ?? 9, distance: opts.distance ?? 7.5, color: 0xffdcb0, shadow: opts.shadow ?? false, on: opts.on ?? true,
      emissives: [{ mesh: bulb, on: bulbs.on, off: bulbs.off }],
    });
  }
  getPrompt() { return 'Pull light chain'; }
  interact() {
    this.ctx.lights.toggle(this.light);
    this.ctx.audio.play('click', this.focus, 0.8);
    this.tug = 1;
  }
  update(dt: number) {
    if (this.tug <= 0) return;
    this.tug = Math.max(0, this.tug - dt * 3);
    this.chain.position.y = -0.06 - Math.sin(this.tug * Math.PI) * 0.05;
  }
}

export function pullChainLight(ctx: Ctx, x: number, z: number, group: string, opts: { intensity?: number; distance?: number; shadow?: boolean } = {}) {
  return ctx.interact.add(new PullChainLight(ctx, x, z, group, opts));
}

/** Canvas texture that redraws itself while `on` (TV, arcade screen). */
export class AnimatedScreen {
  tex: THREE.CanvasTexture;
  private c2d: CanvasRenderingContext2D;
  on = false;
  private acc = 0;
  constructor(ctx: Ctx, readonly w: number, readonly h: number, private draw: (c: CanvasRenderingContext2D, w: number, h: number, t: number) => void, private fps = 12) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    this.c2d = canvas.getContext('2d')!;
    this.draw(this.c2d, w, h, 0);
    this.tex = new THREE.CanvasTexture(canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.generateMipmaps = false;
    this.tex.minFilter = THREE.LinearFilter;
    this.tex.magFilter = THREE.LinearFilter;
    this.tex.anisotropy = 4;
    ctx.onUpdate((dt, t) => {
      if (!this.on) return;
      this.acc += dt;
      if (this.acc < 1 / this.fps) return;
      this.acc = 0;
      this.draw(this.c2d, w, h, t);
      this.tex.needsUpdate = true;
    });
  }
}

/** Main breaker state shared by the basement rooms. */
export class BasementPower {
  readonly listeners: ((on: boolean) => void)[] = [];
  constructor(private ctx: Ctx, readonly groups: string[]) {}
  isOn() { return this.groups.some((g) => this.ctx.lights.groupOn(g)); }
  set(on: boolean) {
    for (const g of this.groups) this.ctx.lights.setGroup(g, on);
    for (const l of this.listeners) l(on);
  }
}

/** Small round pickup helper for spheres (pool balls) built with low segment counts. */
export function lowSphere(r: number, mat: THREE.Material, segments = 12) {
  return Prim.sphere(r, mat, { segments });
}

export { mergeByMaterial };
