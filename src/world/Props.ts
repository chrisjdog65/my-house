/**
 * Reusable props and behaviours shared by the room builders:
 * static placement with colliders, pickups, lamps & switches, frames, rugs, plants, books.
 */
import * as THREE from 'three';
import { Prim, place } from './Builder';
import type { Ctx } from './Context';
import type { Interactable } from './Interactables';
import type { VirtualLight } from '../graphics/Lighting';
import { GROUP } from '../core/Physics';

/** Add a finished group as static scenery (batched) with box colliders given in the group's local space. */
export function addStatic(ctx: Ctx, obj: THREE.Object3D, colliders: { size: THREE.Vector3 | [number, number, number]; center?: THREE.Vector3 | [number, number, number] }[] = [], opts: { surface?: string; worldUV?: boolean } = {}) {
  ctx.scene.add(obj); // temporarily to compute world matrices
  obj.updateWorldMatrix(true, true);
  ctx.batch.add(obj, { worldUV: opts.worldUV });
  for (const c of colliders) {
    const size = Array.isArray(c.size) ? new THREE.Vector3(...c.size) : c.size;
    const center = c.center ? (Array.isArray(c.center) ? new THREE.Vector3(...c.center) : c.center) : new THREE.Vector3();
    ctx.physics.addBoxForObject(obj, size, center, { meta: { surface: opts.surface ?? 'wood' } });
  }
  ctx.scene.remove(obj);
}

/** Simple static box collider helper in world space (for things placed manually). */
export function collider(ctx: Ctx, x: number, y: number, z: number, w: number, h: number, d: number, rotY = 0) {
  ctx.physics.addBox({ x, y, z }, { x: w, y: h, z: d }, rotY);
}

// -------------------------------------------------------------------------------------------
// Pickups (dynamic props you can carry and throw)
// -------------------------------------------------------------------------------------------

export interface PickupOpts {
  name: string;
  mass?: number;
  shape?: { type: 'box'; size: THREE.Vector3 } | { type: 'sphere'; radius: number } | { type: 'cylinder'; radius: number; height: number };
  restitution?: number;
  friction?: number;
  /** offset of the collider centre in mesh local space */
  offset?: THREE.Vector3;
}

export class Pickup implements Interactable {
  object: THREE.Object3D;
  dyn: ReturnType<Ctx['physics']['addDynamic']>;
  radius = 2.2;
  held = false;
  name: string;

  constructor(private ctx: Ctx, mesh: THREE.Object3D, opts: PickupOpts) {
    this.object = mesh;
    this.name = opts.name;
    ctx.dynamic.add(mesh);
    mesh.updateWorldMatrix(true, true);
    let shape = opts.shape;
    if (!shape) {
      const box = new THREE.Box3().setFromObject(mesh);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3()).sub(mesh.getWorldPosition(new THREE.Vector3()));
      shape = { type: 'box', size };
      opts.offset = opts.offset ?? center;
    }
    this.dyn = ctx.physics.addDynamic(mesh, shape, {
      mass: opts.mass ?? 0.8,
      restitution: opts.restitution ?? 0.25,
      friction: opts.friction ?? 0.7,
      name: opts.name,
      offset: opts.offset,
      meta: { pickup: this },
      ccd: true,
    });
    mesh.userData.pickup = this;
  }

  getPrompt() {
    return this.held ? null : `Pick up ${this.name}`;
  }

  interact() {
    (this.ctx as any).carry?.pickUp(this);
  }
}

/** Register a mesh as a pickup. */
export function pickup(ctx: Ctx, mesh: THREE.Object3D, opts: PickupOpts): Pickup {
  return ctx.interact.add(new Pickup(ctx, mesh, opts));
}

// -------------------------------------------------------------------------------------------
// Lights: lamps, switches, fixtures
// -------------------------------------------------------------------------------------------

/** A toggleable lamp: a virtual light + emissive mesh(es). */
export class Lamp implements Interactable {
  object: THREE.Object3D;
  light: VirtualLight;
  proximity = true;
  radius = 2.2;
  constructor(private ctx: Ctx, obj: THREE.Object3D, light: VirtualLight, public label = 'lamp') {
    this.object = obj;
    this.light = light;
  }
  getPrompt() { return this.light.on ? `Turn off ${this.label}` : `Turn on ${this.label}`; }
  interact() {
    this.ctx.lights.toggle(this.light);
    this.ctx.audio.play('switch', this.object.getWorldPosition(new THREE.Vector3()));
  }
  onHover(h: boolean) {
    // subtle: nothing (emissive already indicates state). Highlight base only.
    this.object.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.base) {
        const m = o.material as THREE.MeshStandardMaterial;
        if (h) { o.userData.origMat = m; const c = m.clone(); c.emissive = new THREE.Color(0xf0b35b); c.emissiveIntensity = 0.25; o.material = c; }
        else if (o.userData.origMat) { (o.material as THREE.Material).dispose(); o.material = o.userData.origMat; delete o.userData.origMat; }
      }
    });
  }
}

/** Wall switch that toggles a light group. */
export class LightSwitch implements Interactable {
  object: THREE.Group;
  private toggleMesh: THREE.Mesh;
  proximity = true;
  radius = 2.0;
  constructor(private ctx: Ctx, x: number, y: number, z: number, rotY: number, readonly group: string, public label = 'lights') {
    const mats = ctx.mats;
    this.object = new THREE.Group();
    const plate = Prim.rbox(0.075, 0.12, 0.008, 0.003, mats.plasticWhite);
    plate.position.z = 0.004;
    this.object.add(plate);
    this.toggleMesh = Prim.rbox(0.02, 0.035, 0.014, 0.003, mats.plasticWhite);
    this.toggleMesh.position.set(0, 0, 0.012);
    this.object.add(this.toggleMesh);
    this.object.position.set(x, y, z);
    this.object.rotation.y = rotY;
    ctx.dynamic.add(this.object);
    this.syncVisual();
  }
  private syncVisual() {
    const on = this.ctx.lights.groupOn(this.group);
    this.toggleMesh.rotation.x = on ? -0.35 : 0.35;
  }
  getPrompt() { return this.ctx.lights.groupOn(this.group) ? `Turn off ${this.label}` : `Turn on ${this.label}`; }
  interact() {
    this.ctx.lights.toggleGroup(this.group);
    this.ctx.audio.play('switch', this.object.getWorldPosition(new THREE.Vector3()));
    this.syncVisual();
  }
  update() { this.syncVisual(); }
}

/** Place a light switch on a wall. `rotY` faces the plate: 0 faces +z, PI faces -z, PI/2 faces +x, -PI/2 faces -x. */
export function lightSwitch(ctx: Ctx, x: number, y: number, z: number, rotY: number, group: string, label?: string): LightSwitch {
  return ctx.interact.add(new LightSwitch(ctx, x, y, z, rotY, group, label));
}

/** Warm bulb material pair (on/off) */
export function bulbMaterials(ctx: Ctx, color: THREE.ColorRepresentation = 0xffe2b8, intensity = 1.1) {
  return { on: ctx.mats.emissive(color, intensity, 0xfff6e8), off: ctx.mats.solid(0xf1ece2, { roughness: 0.4 }) };
}

/** Recessed ceiling can light (spot). Returns the virtual light. */
export function recessedLight(ctx: Ctx, x: number, y: number, z: number, group: string, opts: Partial<VirtualLight> = {}) {
  const mats = ctx.mats;
  const trim = Prim.cylinder(0.075, 0.075, 0.012, mats.plasticWhite, { cast: false });
  trim.position.set(x, y - 0.006, z);
  ctx.batch.add(trim);
  const bulbs = bulbMaterials(ctx, 0xfff0d8, 1.2);
  const lens = Prim.cylinder(0.055, 0.055, 0.006, bulbs.on, { cast: false });
  lens.position.set(x, y - 0.014, z);
  ctx.dynamic.add(lens);
  const light = ctx.lights.spot(x, y - 0.05, z, { group, intensity: opts.intensity ?? 12, distance: opts.distance ?? 6.5, color: opts.color ?? 0xfff0dc, on: opts.on ?? true, ...opts, emissives: [{ mesh: lens, on: bulbs.on, off: bulbs.off }] });
  return light;
}

/** Flush-mount ceiling dome light (point). */
export function ceilingDome(ctx: Ctx, x: number, y: number, z: number, group: string, opts: Partial<VirtualLight> = {}) {
  const mats = ctx.mats;
  const base = Prim.cylinder(0.16, 0.16, 0.03, mats.brass, { cast: false });
  base.position.set(x, y - 0.015, z);
  ctx.batch.add(base);
  const bulbs = { on: ctx.mats.emissive(0xffe6c4, 0.75, 0xfff7ea), off: mats.glassFrosted };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bulbs.on);
  dome.position.set(x, y - 0.03, z);
  dome.castShadow = false;
  ctx.dynamic.add(dome);
  const light = ctx.lights.point(x, y - 0.18, z, { group, intensity: opts.intensity ?? 10, distance: opts.distance ?? 8, on: opts.on ?? true, ...opts, emissives: [{ mesh: dome, on: bulbs.on, off: bulbs.off }] });
  return light;
}

/** Pendant lamp hanging from the ceiling. */
export function pendant(ctx: Ctx, x: number, ceilY: number, z: number, drop: number, group: string, opts: Partial<VirtualLight> & { shadeColor?: number; shadeR?: number } = {}) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const cord = Prim.cylinder(0.006, 0.006, drop, mats.black, { cast: false });
  cord.position.set(0, -drop / 2, 0);
  g.add(cord);
  const canopy = Prim.cylinder(0.06, 0.06, 0.02, mats.darkMetal);
  canopy.position.y = -0.01;
  g.add(canopy);
  const r = opts.shadeR ?? 0.18;
  const shade = Prim.lathe([[0.03, 0], [r, -0.22], [r + 0.01, -0.22], [0.035, 0.0]], mats.solid(opts.shadeColor ?? 0x2b2f36, { roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }));
  shade.position.y = -drop + 0.2;
  g.add(shade);
  g.position.set(x, ceilY, z);
  ctx.batch.add(g);
  const bulbs = bulbMaterials(ctx, 0xffe0b0, 1.4);
  const bulb = Prim.sphere(0.035, bulbs.on, { cast: false });
  bulb.position.set(x, ceilY - drop + 0.06, z);
  ctx.dynamic.add(bulb);
  return ctx.lights.point(x, ceilY - drop + 0.02, z, { group, intensity: opts.intensity ?? 12, distance: opts.distance ?? 7, on: opts.on ?? true, ...opts, emissives: [{ mesh: bulb, on: bulbs.on, off: bulbs.off }] });
}

/** Table lamp: base + shade + toggle interaction. Placed with its base at (x, y, z). */
export function tableLamp(ctx: Ctx, x: number, y: number, z: number, opts: { group?: string; on?: boolean; color?: number; shadeColor?: number; height?: number; label?: string } = {}) {
  const mats = ctx.mats;
  const h = opts.height ?? 0.55;
  const g = new THREE.Group();
  const base = Prim.lathe([[0.0, 0], [0.09, 0], [0.09, 0.02], [0.05, 0.04], [0.045, h * 0.45], [0.06, h * 0.5], [0.03, h * 0.55], [0.015, h * 0.7], [0.0, h * 0.7]], mats.solid(opts.color ?? 0x3d5a6c, { roughness: 0.3, metalness: 0.2, envMapIntensity: 0.8 }));
  base.userData.base = true;
  g.add(base);
  const shadeMat = mats.solid(opts.shadeColor ?? 0xf3e9d2, { roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
  const shade = Prim.lathe([[0.1, h * 0.62], [0.16, h * 0.62], [0.13, h + 0.04], [0.09, h + 0.04]], shadeMat);
  g.add(shade);
  const bulbs = bulbMaterials(ctx, 0xffdcae, 1.2);
  const bulb = Prim.sphere(0.03, bulbs.on, { cast: false });
  bulb.position.y = h * 0.8;
  g.add(bulb);
  g.position.set(x, y, z);
  ctx.dynamic.add(g);
  const light = ctx.lights.point(x, y + h * 0.82, z, { group: opts.group, intensity: 6, distance: 5, color: 0xffd6a5, on: opts.on ?? true, emissives: [{ mesh: bulb, on: bulbs.on, off: bulbs.off }] });
  ctx.interact.add(new Lamp(ctx, g, light, opts.label ?? 'lamp'));
  ctx.physics.addCylinder({ x, y: y + h / 2, z }, 0.1, h, {});
  return light;
}

/** Floor lamp (tall) */
export function floorLamp(ctx: Ctx, x: number, y: number, z: number, opts: { group?: string; on?: boolean; label?: string } = {}) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const base = Prim.cylinder(0.14, 0.16, 0.02, mats.darkMetal);
  base.userData.base = true;
  g.add(base);
  const pole = Prim.cylinder(0.012, 0.012, 1.5, mats.darkMetal);
  pole.position.y = 0.76;
  g.add(pole);
  const shade = Prim.lathe([[0.14, 1.45], [0.2, 1.45], [0.17, 1.75], [0.12, 1.75]], mats.solid(0xf0e6cf, { roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.96 }));
  g.add(shade);
  const bulbs = bulbMaterials(ctx, 0xffdcae, 1.2);
  const bulb = Prim.sphere(0.03, bulbs.on, { cast: false });
  bulb.position.y = 1.58;
  g.add(bulb);
  g.position.set(x, y, z);
  ctx.dynamic.add(g);
  const light = ctx.lights.point(x, y + 1.62, z, { group: opts.group, intensity: 8, distance: 6, color: 0xffd6a5, on: opts.on ?? true, emissives: [{ mesh: bulb, on: bulbs.on, off: bulbs.off }] });
  ctx.interact.add(new Lamp(ctx, g, light, opts.label ?? 'floor lamp'));
  ctx.physics.addCylinder({ x, y: y + 0.8, z }, 0.14, 1.6, {});
  return light;
}

// -------------------------------------------------------------------------------------------
// Decor
// -------------------------------------------------------------------------------------------

/** Framed picture on a wall. rotY: 0 => faces +z. Position is the centre of the frame. */
export function pictureFrame(ctx: Ctx, x: number, y: number, z: number, rotY: number, w: number, h: number, texture: THREE.Texture, opts: { frameColor?: number; frameW?: number; mat?: THREE.Material } = {}) {
  const mats = ctx.mats;
  const fw = opts.frameW ?? 0.04;
  const g = new THREE.Group();
  const frameMat = mats.solid(opts.frameColor ?? 0x2a2018, { roughness: 0.5 });
  const top = Prim.box(w + 2 * fw, fw, 0.03, frameMat); top.position.set(0, h / 2 + fw / 2, 0.015);
  const bot = Prim.box(w + 2 * fw, fw, 0.03, frameMat); bot.position.set(0, -h / 2 - fw / 2, 0.015);
  const l = Prim.box(fw, h, 0.03, frameMat); l.position.set(-w / 2 - fw / 2, 0, 0.015);
  const r = Prim.box(fw, h, 0.03, frameMat); r.position.set(w / 2 + fw / 2, 0, 0.015);
  const back = Prim.box(w, h, 0.015, mats.solid(0xf5f5f0, { roughness: 0.9 })); back.position.z = 0.0075;
  g.add(top, bot, l, r, back);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  ctx.batch.add(g);
  const pic = Prim.quad(w, h, opts.mat ?? mats.image(texture, { roughness: 0.85, envMapIntensity: 0.25 }), { keepUV: true, cast: false });
  pic.position.set(x, y, z);
  pic.rotation.y = rotY;
  pic.translateZ(0.017);
  ctx.dynamic.add(pic);
}

/** Rug on the floor. */
export function rug(ctx: Ctx, x: number, y: number, z: number, w: number, d: number, variant: 'red' | 'blue' | 'neutral' | 'green' = 'red', rotY = 0) {
  const tex = ctx.tex.rug(variant, w / d);
  const mat = ctx.mats.image(tex, { roughness: 1, envMapIntensity: 0.15 });
  const m = Prim.rbox(w, 0.014, d, 0.006, mat, { keepUV: true, cast: false });
  // rbox UVs: recompute planar UVs for top face only
  const g = m.geometry;
  const pos = g.attributes.position, nor = g.attributes.normal;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / w + 0.5, v = pos.getZ(i) / d + 0.5;
    if (nor.getY(i) > 0.5) uv.setXY(i, u, 1 - v); else uv.setXY(i, 0.02, 0.02);
  }
  uv.needsUpdate = true;
  m.position.set(x, y + 0.007, z);
  m.rotation.y = rotY;
  ctx.dynamic.add(m);
}

/** Potted plant. size ~ overall height in metres. */
export function plant(ctx: Ctx, x: number, y: number, z: number, size = 1.0, opts: { potColor?: number; kind?: 'leaf' | 'bush' } = {}) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const potH = size * 0.28, potR = size * 0.16;
  const pot = Prim.lathe([[potR * 0.7, 0], [potR * 0.95, 0], [potR, potH * 0.9], [potR * 1.08, potH * 0.9], [potR * 1.08, potH], [potR * 0.9, potH], [potR * 0.9, potH * 0.85], [0, potH * 0.85]], mats.solid(opts.potColor ?? 0xb5573e, { roughness: 0.8 }));
  g.add(pot);
  const soilM = Prim.cylinder(potR * 0.88, potR * 0.88, 0.01, mats.soil, { cast: false });
  soilM.position.y = potH * 0.85;
  g.add(soilM);
  const foliageTex = ctx.tex.foliage(opts.kind ?? 'leaf');
  const leafMat = mats.image(foliageTex, { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8, envMapIntensity: 0.3 });
  const rnd = ctx.rng;
  const stemMat = mats.solid(0x4c6b3c, { roughness: 0.8 });
  const n = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.5;
    const tilt = 0.35 + rnd() * 0.45;
    const len = size * (0.45 + rnd() * 0.35);
    const stem = Prim.cylinder(0.006, 0.01, len, stemMat);
    stem.position.set(Math.sin(a) * len * 0.5 * Math.sin(tilt), potH * 0.85 + Math.cos(tilt) * len * 0.5, Math.cos(a) * len * 0.5 * Math.sin(tilt));
    stem.rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt);
    g.add(stem);
    const card = Prim.quad(size * 0.5, size * 0.5, leafMat, { keepUV: true });
    card.position.set(Math.sin(a) * len * Math.sin(tilt) * 0.95, potH * 0.85 + Math.cos(tilt) * len * 0.95 + size * 0.1, Math.cos(a) * len * Math.sin(tilt) * 0.95);
    card.rotation.y = a + Math.PI / 2 + (rnd() - 0.5);
    card.rotation.x = (rnd() - 0.5) * 0.6;
    g.add(card);
    const card2 = card.clone();
    card2.rotation.y += Math.PI / 2;
    g.add(card2);
  }
  g.position.set(x, y, z);
  g.rotation.y = rnd() * Math.PI * 2;
  ctx.dynamic.add(g);
  ctx.physics.addCylinder({ x, y: y + potH / 2, z }, potR, potH);
}

/** Row of books on a shelf: centre position, width along local x. rotY rotates. */
export function bookRow(ctx: Ctx, x: number, y: number, z: number, width: number, rotY = 0, height = 0.24, seed = 1) {
  const tex = ctx.tex.bookRow(seed);
  const mat = ctx.mats.image(tex, { roughness: 0.75, envMapIntensity: 0.3 });
  const m = Prim.box(width, height, 0.2, mat, { keepUV: true });
  // map spines texture on the front face, dark on others
  const g = m.geometry;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const nor = g.attributes.normal;
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (nor.getZ(i) > 0.5) uv.setXY(i, pos.getX(i) / width + 0.5, pos.getY(i) / height + 0.5);
    else if (nor.getY(i) > 0.5) uv.setXY(i, pos.getX(i) / width + 0.5, 0.98);
    else uv.setXY(i, 0.5, 0.05);
  }
  uv.needsUpdate = true;
  m.position.set(x, y + height / 2, z);
  m.rotation.y = rotY;
  ctx.batch.add(m);
}

/** A single loose book (pickup). */
export function looseBook(ctx: Ctx, x: number, y: number, z: number, rotY = 0, color = 0x8b2f2f, name = 'book') {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const cover = Prim.rbox(0.16, 0.035, 0.22, 0.004, mats.solid(color, { roughness: 0.6 }));
  g.add(cover);
  const pages = Prim.box(0.15, 0.028, 0.21, mats.solid(0xf2ecd8, { roughness: 0.9 }));
  pages.position.x = 0.008;
  g.add(pages);
  g.position.set(x, y + 0.018, z);
  g.rotation.y = rotY;
  return pickup(ctx, g, { name, mass: 0.6, shape: { type: 'box', size: new THREE.Vector3(0.16, 0.035, 0.22) } });
}

/** Coffee mug (pickup). */
export function mug(ctx: Ctx, x: number, y: number, z: number, color = 0xffffff, name = 'mug') {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.cylinder(0.042, 0.038, 0.095, mats.solid(color, { roughness: 0.25, envMapIntensity: 0.8, physical: true, clearcoat: 0.6 }));
  body.position.y = 0.0475;
  g.add(body);
  const inner = Prim.cylinder(0.036, 0.034, 0.09, mats.solid(0x3a2a1e, { roughness: 0.4 }), { cast: false });
  inner.position.y = 0.055;
  g.add(inner);
  const handle = Prim.torus(0.028, 0.007, mats.solid(color, { roughness: 0.25 }));
  handle.rotation.x = Math.PI / 2;
  handle.rotation.z = 0;
  handle.position.set(0.05, 0.05, 0);
  handle.rotation.set(0, 0, Math.PI / 2);
  g.add(handle);
  g.position.set(x, y, z);
  return pickup(ctx, g, { name, mass: 0.35, shape: { type: 'cylinder', radius: 0.045, height: 0.095 }, offset: new THREE.Vector3(0, 0.0475, 0) });
}

/** Ball (pickup, bouncy) */
export function ball(ctx: Ctx, x: number, y: number, z: number, r = 0.11, color = 0xd94a3a, name = 'ball') {
  const m = Prim.sphere(r, ctx.mats.solid(color, { roughness: 0.55 }));
  m.position.set(x, y + r, z);
  return pickup(ctx, m, { name, mass: 0.4, shape: { type: 'sphere', radius: r }, restitution: 0.75, friction: 0.5 });
}

/** Curtains on either side of a window. rotY: window faces +z when 0. Position is window centre at floor level. */
export function curtains(ctx: Ctx, x: number, y: number, z: number, rotY: number, windowW: number, top: number, color = 0xc8b8a2) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const rod = Prim.cylinder(0.014, 0.014, windowW + 0.7, mats.darkMetal);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, top + 0.12, 0.12);
  g.add(rod);
  for (const s of [-1, 1]) {
    const fin = Prim.sphere(0.03, mats.darkMetal);
    fin.position.set(s * (windowW / 2 + 0.36), top + 0.12, 0.12);
    g.add(fin);
    const geo = new THREE.BoxGeometry(0.34, top + 0.1, 0.08, 8, 1, 1);
    // pleats: displace along z with a sine across x
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      pos.setZ(i, pos.getZ(i) + Math.sin(px * 40) * 0.025);
    }
    geo.computeVertexNormals();
    const cur = new THREE.Mesh(geo, mats.fabric(color));
    cur.castShadow = true; cur.receiveShadow = true;
    cur.position.set(s * (windowW / 2 + 0.12), (top + 0.1) / 2, 0.11);
    g.add(cur);
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  ctx.batch.add(g);
}

/** Wall clock with moving hands. */
export function wallClock(ctx: Ctx, x: number, y: number, z: number, rotY: number, r = 0.16) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const rim = Prim.cylinder(r, r, 0.035, mats.walnut);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  const face = Prim.cylinder(r * 0.9, r * 0.9, 0.01, mats.image(ctx.tex.clockFace(), { roughness: 0.6 }), { keepUV: true });
  face.rotation.x = Math.PI / 2;
  face.position.z = 0.016;
  // fix UVs for the top cap of the cylinder: CylinderGeometry caps already have radial UVs
  g.add(face);
  const hands = new THREE.Group();
  hands.position.z = 0.024;
  const hour = Prim.box(0.012, r * 0.5, 0.004, mats.black); hour.position.y = r * 0.22;
  const hourP = new THREE.Group(); hourP.add(hour);
  const min = Prim.box(0.008, r * 0.75, 0.004, mats.black); min.position.y = r * 0.35;
  const minP = new THREE.Group(); minP.add(min); minP.position.z = 0.005;
  const sec = Prim.box(0.003, r * 0.8, 0.003, mats.solid(0xc0392b)); sec.position.y = r * 0.35;
  const secP = new THREE.Group(); secP.add(sec); secP.position.z = 0.01;
  hands.add(hourP, minP, secP);
  g.add(hands);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  ctx.dynamic.add(g);
  ctx.onUpdate(() => {
    const d = new Date();
    const s = d.getSeconds() + d.getMilliseconds() / 1000;
    const m = d.getMinutes() + s / 60;
    const h = (d.getHours() % 12) + m / 60;
    secP.rotation.z = -s / 60 * Math.PI * 2;
    minP.rotation.z = -m / 60 * Math.PI * 2;
    hourP.rotation.z = -h / 12 * Math.PI * 2;
  });
}

/** Generic toggle interactable (e.g. TV, faucet, appliance). */
export class Toggle implements Interactable {
  on = false;
  proximity = true;
  radius = 2.2;
  constructor(public object: THREE.Object3D, private labels: { on: string; off: string }, private onChange: (on: boolean) => void, public focus?: THREE.Vector3) {}
  getPrompt() { return this.on ? this.labels.on : this.labels.off; }
  interact() { this.on = !this.on; this.onChange(this.on); }
  set(v: boolean) { if (this.on !== v) { this.on = v; this.onChange(v); } }
}

/** A hinged panel (cabinet door, fridge door, oven door) that opens on interaction. */
export class HingedPanel implements Interactable {
  object: THREE.Group;
  open = false;
  angle = 0;
  private target = 0;
  proximity = true;
  radius = 2.0;
  constructor(private ctx: Ctx, readonly pivot: THREE.Group, private label: string, private maxAngle = Math.PI * 0.5, private axis: 'y' | 'x' = 'y', private sfx: 'drawer' | 'fridge' | 'doorOpen' = 'drawer') {
    this.object = pivot;
  }
  getPrompt() { return (this.open ? 'Close ' : 'Open ') + this.label; }
  interact() {
    this.open = !this.open;
    this.target = this.open ? this.maxAngle : 0;
    this.ctx.audio.play(this.sfx, this.pivot.getWorldPosition(new THREE.Vector3()));
  }
  update(dt: number) {
    const diff = this.target - this.angle;
    if (Math.abs(diff) < 0.001) return;
    this.angle += diff * (1 - Math.exp(-dt * 8));
    if (this.axis === 'y') this.pivot.rotation.y = this.angle; else this.pivot.rotation.x = this.angle;
  }
}

/** Convenience: make a mesh group hinge around a pivot placed at `hingePos` (local to `parent`). */
export function hinged(ctx: Ctx, parent: THREE.Object3D, hingePos: THREE.Vector3, build: (pivot: THREE.Group) => void, label: string, opts: { maxAngle?: number; axis?: 'y' | 'x'; sfx?: 'drawer' | 'fridge' | 'doorOpen' } = {}): HingedPanel {
  const pivot = new THREE.Group();
  pivot.position.copy(hingePos);
  build(pivot);
  parent.add(pivot);
  const hp = new HingedPanel(ctx, pivot, label, opts.maxAngle ?? Math.PI * 0.5, opts.axis ?? 'y', opts.sfx ?? 'drawer');
  ctx.interact.add(hp);
  return hp;
}

export { place, GROUP };
