/**
 * Kitchen.props — small kitchen props: counter clutter (kettle, coffee maker, knife block,
 * dish rack, canisters…), pickups (fruit, soap bottle), bar stools, roman shades, chalkboard,
 * and cabinet interiors revealed by the hinged doors.
 */
import * as THREE from 'three';
import { Prim, place } from '../Builder';
import type { Ctx } from '../Context';
import { addStatic, pickup, bookRow } from '../Props';
import { type Box, shelf } from './Kitchen.cabinets';

const box = (g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, opts: { cast?: boolean } = {}) => {
  const b = Prim.box(w, h, d, mat, opts);
  b.position.set(x, y, z);
  g.add(b);
  return b;
};

/** Hollow vessel lathe: outer profile up, rim, inner profile down. */
function vessel(r: number, h: number, mat: THREE.Material, opts: { wall?: number; flare?: number; foot?: number; segments?: number } = {}) {
  const wall = opts.wall ?? 0.006, flare = opts.flare ?? 0, foot = opts.foot ?? r * 0.6;
  const pts: [number, number][] = [
    [0, 0], [foot, 0], [r, h * 0.35], [r + flare, h], [r + flare - wall, h], [r - wall, h * 0.35 + wall], [foot - wall, wall * 1.5], [0, wall * 1.5],
  ];
  return Prim.lathe(pts, mat, { segments: opts.segments ?? 24 });
}

// -------------------------------------------------------------------------------------------
// Stove-top / counter appliances
// -------------------------------------------------------------------------------------------

export function kettle(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const enamel = m.solid(0xb8382c, { roughness: 0.25, envMapIntensity: 0.9, physical: true, clearcoat: 0.8 });
  const body = Prim.lathe([[0, 0], [0.085, 0], [0.1, 0.02], [0.095, 0.1], [0.07, 0.15], [0.04, 0.16], [0.04, 0.175], [0.02, 0.18], [0, 0.18]], enamel, { segments: 28 });
  g.add(body);
  const knob = Prim.sphere(0.012, m.plasticBlack, { segments: 10 });
  knob.position.y = 0.185;
  g.add(knob);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.009, 8, 20, Math.PI), m.plasticBlack);
  handle.position.set(0, 0.16, 0);
  handle.castShadow = true;
  g.add(handle);
  const spout = Prim.cylinder(0.008, 0.016, 0.11, enamel, { segments: 12 });
  spout.rotation.z = -0.75;
  spout.position.set(0.1, 0.125, 0);
  g.add(spout);
  addStatic(ctx, g, []);
}

export function saucepan(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const pan = Prim.lathe([[0, 0], [0.09, 0], [0.09, 0.085], [0.083, 0.085], [0.083, 0.006], [0, 0.006]], m.steel, { segments: 28 });
  g.add(pan);
  const handle = Prim.rbox(0.19, 0.016, 0.03, 0.006, m.plasticBlack, { segments: 2 });
  handle.position.set(0.17, 0.075, 0);
  g.add(handle);
  const water = Prim.cylinder(0.08, 0.08, 0.004, m.water, { segments: 20, cast: false });
  water.position.y = 0.05;
  g.add(water);
  addStatic(ctx, g, []);
}

export function coffeeMaker(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const black = m.plasticBlack;
  const tower = Prim.rbox(0.2, 0.34, 0.12, 0.008, black, { segments: 2 });
  tower.position.set(0, 0.17, 0.06);
  g.add(tower);
  const base = Prim.rbox(0.2, 0.03, 0.26, 0.006, black, { segments: 2 });
  base.position.set(0, 0.015, 0.13);
  g.add(base);
  const head = Prim.rbox(0.2, 0.07, 0.24, 0.008, black, { segments: 2 });
  head.position.set(0, 0.305, 0.12);
  g.add(head);
  const plate = Prim.cylinder(0.07, 0.07, 0.006, m.darkMetal, { segments: 20 });
  plate.position.set(0, 0.033, 0.17);
  g.add(plate);
  box(g, 0.01, 0.01, 0.004, 0.07, 0.1, 0.122, m.emissive(0xff4030, 1.2, 0x300000), { cast: false });
  box(g, 0.05, 0.02, 0.004, 0.02, 0.1, 0.122, m.solid(0x2c2e33, { roughness: 0.5 }), { cast: false });
  // glass carafe with coffee
  const carafe = Prim.lathe([[0.03, 0], [0.062, 0], [0.066, 0.02], [0.06, 0.1], [0.045, 0.14], [0.04, 0.14], [0.055, 0.1], [0.06, 0.02], [0.03, 0.006]], m.glassClear, { segments: 22, cast: false });
  carafe.position.set(0, 0.036, 0.17);
  g.add(carafe);
  const coffee = Prim.cylinder(0.052, 0.058, 0.06, m.solid(0x2a1a10, { roughness: 0.3, envMapIntensity: 0.8 }), { segments: 22, cast: false });
  coffee.position.set(0, 0.036 + 0.036, 0.17);
  g.add(coffee);
  const lid = Prim.cylinder(0.046, 0.05, 0.02, black, { segments: 22 });
  lid.position.set(0, 0.036 + 0.15, 0.17);
  g.add(lid);
  const handle = Prim.rbox(0.022, 0.1, 0.03, 0.008, black, { segments: 2 });
  handle.position.set(0.08, 0.036 + 0.08, 0.17);
  g.add(handle);
  addStatic(ctx, g, []);
}

export function knifeBlock(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(0.15, 0); shape.lineTo(0.15, 0.1); shape.lineTo(0, 0.21); shape.closePath();
  const block = Prim.extrude(shape, 0.11, m.walnut, { curveSegments: 1 });
  block.rotation.y = -Math.PI / 2;
  g.add(block);
  const tilt = Math.atan2(0.11, 0.15);
  const handleMat = m.solid(0x1a1a1c, { roughness: 0.45 });
  for (let i = 0; i < 4; i++) {
    const t = 0.03 + i * 0.03;
    const px = t, py = 0.21 - (0.11 / 0.15) * t;
    const h = Prim.rbox(0.02, 0.1, 0.014, 0.004, handleMat, { segments: 2 });
    h.rotation.x = tilt;
    h.position.set(-0.03 + (i % 2) * 0.05, py + 0.04, px + 0.03);
    g.add(h);
  }
  addStatic(ctx, g, []);
}

export function dishRack(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const tray = Prim.rbox(0.42, 0.018, 0.32, 0.006, m.plasticWhite, { segments: 2 });
  tray.position.y = 0.009;
  g.add(tray);
  const wire = m.chrome;
  for (const zz of [-0.14, 0.14]) {
    const rail = Prim.cylinder(0.004, 0.004, 0.4, wire, { segments: 6 });
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 0.14, zz);
    g.add(rail);
  }
  for (let i = 0; i < 6; i++) {
    for (const zz of [-0.14, 0.14]) {
      const post = Prim.cylinder(0.003, 0.003, 0.13, wire, { segments: 6 });
      post.position.set(-0.18 + i * 0.072, 0.083, zz);
      g.add(post);
    }
  }
  for (let i = 0; i < 4; i++) {
    const plate = Prim.cylinder(0.11, 0.11, 0.006, m.ceramic, { segments: 24 });
    plate.rotation.x = Math.PI / 2 + 0.18;
    plate.position.set(-0.11 + i * 0.062, 0.12, 0.02);
    g.add(plate);
  }
  for (const [gx, gz] of [[0.15, -0.09], [0.15, 0.08]]) {
    const glass = Prim.cylinder(0.034, 0.03, 0.11, m.glassClear, { segments: 14, cast: false });
    glass.position.set(gx, 0.073, gz);
    g.add(glass);
  }
  addStatic(ctx, g, []);
}

export function paperTowels(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const base = Prim.cylinder(0.075, 0.08, 0.012, m.steel, { segments: 20 });
  base.position.y = 0.006;
  g.add(base);
  const rod = Prim.cylinder(0.007, 0.007, 0.32, m.steel, { segments: 10 });
  rod.position.y = 0.17;
  g.add(rod);
  const roll = Prim.cylinder(0.057, 0.057, 0.28, m.solid(0xf7f5f0, { roughness: 0.95 }), { segments: 22 });
  roll.position.y = 0.152;
  g.add(roll);
  const sheet = Prim.box(0.24, 0.1, 0.003, m.solid(0xf7f5f0, { roughness: 0.95 }), { cast: false });
  sheet.position.set(-0.12, 0.05, 0.058);
  sheet.rotation.y = 0.2;
  g.add(sheet);
  addStatic(ctx, g, []);
}

export function canisters(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const cer = m.ceramic;
  const lidMat = m.oak;
  const sizes: [number, number, number][] = [[0.06, 0.2, 0], [0.052, 0.16, 0.14], [0.045, 0.13, 0.26]];
  for (const [r, h, off] of sizes) {
    const c = Prim.cylinder(r, r * 0.95, h, cer, { segments: 22 });
    c.position.set(off, h / 2, 0);
    g.add(c);
    const lid = Prim.cylinder(r + 0.004, r + 0.004, 0.018, lidMat, { segments: 22 });
    lid.position.set(off, h + 0.009, 0);
    g.add(lid);
    const band = Prim.cylinder(r + 0.001, r + 0.001, 0.03, m.solid(0x5b7c6b, { roughness: 0.4 }), { segments: 22, cast: false });
    band.position.set(off, h * 0.5, 0);
    g.add(band);
  }
  addStatic(ctx, g, []);
}

export function utensilCrock(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const crock = vessel(0.055, 0.14, m.solid(0x5b6f7a, { roughness: 0.3, physical: true, clearcoat: 0.6 }), { foot: 0.045, segments: 22 });
  g.add(crock);
  const wood = m.oak;
  const specs: [number, number, number, THREE.Material][] = [[0.012, 0.3, 0.3, wood], [-0.012, 0.28, -0.4, wood], [0.02, 0.26, 0.5, m.plasticBlack], [-0.02, 0.32, -0.2, m.chrome]];
  for (const [ox, h, a, mat] of specs) {
    const s = Prim.cylinder(0.006, 0.008, h, mat, { segments: 8 });
    s.position.set(ox, 0.02 + h / 2 * Math.cos(0.15), ox * 0.6);
    s.rotation.z = a * 0.35;
    s.rotation.x = Math.sin(a) * 0.12;
    g.add(s);
  }
  const whisk = Prim.lathe([[0, 0.2], [0.02, 0.24], [0.028, 0.3], [0.02, 0.36], [0, 0.4]], m.chrome, { segments: 10 });
  whisk.position.set(0.028, 0.02, -0.02);
  whisk.rotation.z = -0.15;
  g.add(whisk);
  addStatic(ctx, g, []);
}

export function oilBottles(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const tray = Prim.rbox(0.24, 0.014, 0.14, 0.005, m.walnut, { segments: 2 });
  tray.position.y = 0.007;
  g.add(tray);
  const green = m.solid(0x5a7a3a, { roughness: 0.15, envMapIntensity: 1.0, opacity: 0.9, transparent: true, physical: true, clearcoat: 0.8 });
  const amber = m.solid(0x9a6a2a, { roughness: 0.15, envMapIntensity: 1.0, opacity: 0.9, transparent: true, physical: true, clearcoat: 0.8 });
  for (const [ox, mat, h] of [[-0.06, green, 0.26], [0.05, amber, 0.2]] as [number, THREE.Material, number][]) {
    const b = Prim.lathe([[0, 0], [0.03, 0], [0.032, 0.02], [0.032, h * 0.6], [0.012, h * 0.75], [0.012, h], [0, h]], mat, { segments: 16, cast: false });
    b.position.set(ox, 0.014, 0);
    g.add(b);
    const cap = Prim.cylinder(0.013, 0.013, 0.03, m.darkMetal, { segments: 12 });
    cap.position.set(ox, 0.014 + h + 0.01, 0);
    g.add(cap);
  }
  const salt = Prim.cylinder(0.025, 0.028, 0.06, m.glassFrosted, { segments: 14, cast: false });
  salt.position.set(0.1, 0.044, 0.03);
  g.add(salt);
  addStatic(ctx, g, []);
}

export function openCookbook(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const stand = Prim.rbox(0.26, 0.012, 0.16, 0.004, m.walnut, { segments: 2 });
  stand.rotation.x = -0.5;
  stand.position.set(0, 0.06, 0.02);
  g.add(stand);
  const ledge = Prim.rbox(0.26, 0.03, 0.02, 0.004, m.walnut, { segments: 2 });
  ledge.position.set(0, 0.02, 0.095);
  g.add(ledge);
  const pages = m.solid(0xf4efe2, { roughness: 0.95 });
  for (const s of [-1, 1]) {
    const p = Prim.box(0.12, 0.014, 0.17, pages);
    p.rotation.x = -0.5;
    p.rotation.y = s * 0.08;
    p.position.set(s * 0.065, 0.075, 0.02);
    g.add(p);
    const tex = Prim.box(0.09, 0.002, 0.12, m.solid(0x8a8a8a, { roughness: 0.9 }), { cast: false });
    tex.rotation.x = -0.5;
    tex.rotation.y = s * 0.08;
    tex.position.set(s * 0.065, 0.083, 0.024);
    g.add(tex);
  }
  addStatic(ctx, g, []);
}

export function cuttingBoard(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const board = Prim.rbox(0.4, 0.022, 0.28, 0.008, m.walnut, { segments: 2 });
  board.position.y = 0.011;
  g.add(board);
  // chef's knife
  const blade = Prim.box(0.2, 0.003, 0.035, m.chrome);
  blade.position.set(-0.05, 0.025, 0.06);
  blade.rotation.y = 0.15;
  g.add(blade);
  const handle = Prim.rbox(0.11, 0.02, 0.024, 0.006, m.solid(0x1c1c1e, { roughness: 0.45 }), { segments: 2 });
  handle.position.set(0.1, 0.032, 0.037);
  handle.rotation.y = 0.15;
  g.add(handle);
  // halved lemon
  const lemonMat = m.solid(0xf2d43a, { roughness: 0.6 });
  const fleshMat = m.solid(0xfaf0a0, { roughness: 0.7 });
  for (const [lx, lz, a] of [[-0.09, -0.06, 0.4], [0.03, -0.07, -1.2]]) {
    const half = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lemonMat);
    half.position.set(lx, 0.022, lz);
    half.rotation.z = Math.PI;
    half.rotation.y = a;
    half.castShadow = true;
    g.add(half);
    const flesh = Prim.cylinder(0.028, 0.028, 0.004, fleshMat, { segments: 14, cast: false });
    flesh.position.set(lx, 0.024, lz);
    g.add(flesh);
  }
  addStatic(ctx, g, []);
}

export function mixingBowl(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const bowl = vessel(0.13, 0.1, m.steel, { flare: 0.01, foot: 0.06, segments: 28 });
  g.add(bowl);
  const spoon = Prim.rbox(0.03, 0.01, 0.26, 0.005, m.oak, { segments: 2 });
  spoon.rotation.x = -0.9;
  spoon.rotation.y = 0.6;
  spoon.position.set(0.06, 0.1, -0.02);
  g.add(spoon);
  addStatic(ctx, g, []);
}

// -------------------------------------------------------------------------------------------
// Bowls with fruit pickups
// -------------------------------------------------------------------------------------------

export type FruitKind = 'apple' | 'greenApple' | 'orange' | 'lemon';

export function fruit(ctx: Ctx, kind: FruitKind, x: number, y: number, z: number) {
  const m = ctx.mats;
  const spec = {
    apple: { r: 0.037, c: 0xb8302a, rough: 0.35, name: 'apple' },
    greenApple: { r: 0.036, c: 0x8fb545, rough: 0.35, name: 'green apple' },
    orange: { r: 0.041, c: 0xe98a1e, rough: 0.75, name: 'orange' },
    lemon: { r: 0.033, c: 0xf2d43a, rough: 0.6, name: 'lemon' },
  }[kind];
  const g = new THREE.Group();
  const body = Prim.sphere(spec.r, m.solid(spec.c, { roughness: spec.rough, envMapIntensity: 0.7 }), { segments: 16 });
  if (kind === 'lemon') body.scale.set(1, 0.9, 1.2);
  g.add(body);
  if (kind !== 'orange') {
    const stem = Prim.cylinder(0.0025, 0.003, 0.022, m.solid(0x4a3320, { roughness: 0.9 }), { segments: 6 });
    stem.position.y = spec.r + 0.004;
    stem.rotation.z = 0.2;
    g.add(stem);
  }
  g.position.set(x, y + spec.r, z);
  return pickup(ctx, g, { name: spec.name, mass: 0.2, shape: { type: 'sphere', radius: spec.r }, restitution: 0.3, friction: 0.8 });
}

/** A bowl (static) with an invisible floor + rim so the fruit pickups stay put. */
export function fruitBowl(ctx: Ctx, x: number, y: number, z: number, mat: THREE.Material, fruits: FruitKind[], r = 0.16) {
  const g = new THREE.Group();
  place(g, x, y, z, 0);
  const bowl = vessel(r, r * 0.55, mat, { flare: 0.004, foot: r * 0.5, segments: 28 });
  g.add(bowl);
  addStatic(ctx, g, []);
  const floorY = y + 0.012;
  ctx.physics.addCylinder({ x, y: floorY - 0.01, z }, r * 0.75, 0.02);
  const rimR = r * 0.72;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.physics.addBox({ x: x + Math.cos(a) * rimR, y: floorY + 0.03, z: z + Math.sin(a) * rimR }, { x: 0.02, y: 0.06, z: rimR * 1.1 }, -a);
  }
  const spots: [number, number][] = [[0.055, 0], [-0.055, 0.005], [0.005, 0.058], [-0.005, -0.058], [0, 0]];
  fruits.forEach((k, i) => {
    const [ox, oz] = spots[i % spots.length];
    const lift = i >= 4 ? 0.07 : 0;
    fruit(ctx, k, x + ox * (r / 0.16), floorY + lift, z + oz * (r / 0.16));
  });
}

export function soapBottle(ctx: Ctx, x: number, y: number, z: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.lathe([[0, 0], [0.03, 0], [0.033, 0.02], [0.033, 0.12], [0.02, 0.15], [0.012, 0.155], [0, 0.155]], m.solid(0x8fb7c9, { roughness: 0.3, envMapIntensity: 0.8, physical: true, clearcoat: 0.5 }), { segments: 18 });
  g.add(body);
  const pumpBase = Prim.cylinder(0.013, 0.013, 0.02, m.chrome, { segments: 12 });
  pumpBase.position.y = 0.16;
  g.add(pumpBase);
  const stem = Prim.cylinder(0.005, 0.005, 0.03, m.chrome, { segments: 8 });
  stem.position.y = 0.185;
  g.add(stem);
  const head = Prim.rbox(0.04, 0.012, 0.016, 0.005, m.chrome, { segments: 2 });
  head.position.set(0.012, 0.204, 0);
  g.add(head);
  const label = Prim.quad(0.045, 0.06, m.solid(0xf4f4f0, { roughness: 0.8 }), { cast: false });
  label.position.set(0, 0.075, 0.0335);
  g.add(label);
  g.position.set(x, y, z);
  return pickup(ctx, g, { name: 'soap bottle', mass: 0.3, shape: { type: 'cylinder', radius: 0.034, height: 0.21 }, offset: new THREE.Vector3(0, 0.105, 0) });
}

// -------------------------------------------------------------------------------------------
// Furniture: bar stool
// -------------------------------------------------------------------------------------------

export function barStool(ctx: Ctx, x: number, y: number, z: number, rotY: number, seatColor = 0x7a5636) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const metal = m.darkMetal;
  const seatH = 0.66;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = Prim.cylinder(0.011, 0.014, seatH - 0.04, metal, { segments: 10 });
    leg.position.set(sx * 0.14, (seatH - 0.04) / 2, sz * 0.14);
    leg.rotation.z = -sx * 0.05;
    leg.rotation.x = sz * 0.05;
    g.add(leg);
  }
  const ring = Prim.torus(0.165, 0.007, metal);
  ring.position.y = 0.24;
  g.add(ring);
  const leather = m.leather(seatColor);
  const seat = Prim.cylinder(0.19, 0.175, 0.05, leather, { segments: 28 });
  seat.position.y = seatH - 0.025;
  g.add(seat);
  const plate = Prim.cylinder(0.14, 0.14, 0.012, metal, { segments: 20 });
  plate.position.y = seatH - 0.055;
  g.add(plate);
  for (const s of [-1, 1]) {
    const post = Prim.cylinder(0.009, 0.009, 0.24, metal, { segments: 8 });
    post.position.set(s * 0.12, seatH + 0.1, -0.15);
    g.add(post);
  }
  const back = Prim.rbox(0.32, 0.12, 0.03, 0.012, leather, { segments: 2 });
  back.position.set(0, seatH + 0.21, -0.15);
  g.add(back);
  addStatic(ctx, g, []);
  ctx.physics.addCylinder({ x, y: y + 0.42, z }, 0.2, 0.84);
}

// -------------------------------------------------------------------------------------------
// Window shade, chalkboard, open shelves
// -------------------------------------------------------------------------------------------

/** Roman shade folded at the top of a window. rotY 0 => the shade faces +z (into the room). */
export function romanShade(ctx: Ctx, x: number, y: number, z: number, rotY: number, w: number, top: number, color: number) {
  const fab = ctx.mats.fabric(color);
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const header = Prim.box(w + 0.12, 0.05, 0.06, fab);
  header.position.set(0, top + 0.075, 0.04);
  g.add(header);
  for (let i = 0; i < 3; i++) {
    const fold = Prim.rbox(w + 0.1, 0.11, 0.035, 0.012, fab, { segments: 2 });
    fold.position.set(0, top + 0.02 - i * 0.085, 0.045 + i * 0.008);
    g.add(fold);
  }
  addStatic(ctx, g, []);
}

export function chalkboard(ctx: Ctx, x: number, y: number, z: number, rotY: number, w = 0.8, h = 0.55) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const fw = 0.045;
  const frame = m.walnut;
  box(g, w + 2 * fw, fw, 0.025, 0, h / 2 + fw / 2, 0.0125, frame);
  box(g, w + 2 * fw, fw, 0.025, 0, -h / 2 - fw / 2, 0.0125, frame);
  box(g, fw, h, 0.025, -w / 2 - fw / 2, 0, 0.0125, frame);
  box(g, fw, h, 0.025, w / 2 + fw / 2, 0, 0.0125, frame);
  box(g, w, h, 0.012, 0, 0, 0.006, m.solid(0x1e2a22, { roughness: 0.95 }), { cast: false });
  const board = Prim.quad(w, h, m.image(ctx.tex.chalkboard(), { roughness: 0.95, envMapIntensity: 0.1 }), { keepUV: true, cast: false });
  board.position.z = 0.0125;
  g.add(board);
  box(g, w * 0.6, 0.02, 0.05, 0, -h / 2 - fw - 0.01, 0.03, frame);
  for (const [cx, col] of [[-0.08, 0xffffff], [0.02, 0xf2a7c3]] as [number, number][]) {
    const chalk = Prim.cylinder(0.005, 0.005, 0.06, m.solid(col, { roughness: 0.95 }), { segments: 8 });
    chalk.rotation.z = Math.PI / 2;
    chalk.position.set(cx, -h / 2 - fw + 0.005, 0.04);
    g.add(chalk);
  }
  addStatic(ctx, g, []);
}

/** Two floating shelves with jars and cookbooks. Local frame: wall at z=0, shelves stick out +z. */
export function openShelves(ctx: Ctx, x: number, y: number, z: number, rotY: number, w: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const d = 0.25;
  for (const sy of [0, 0.4]) {
    const s = Prim.rbox(w, 0.035, d, 0.005, m.walnut, { segments: 2 });
    s.position.set(0, sy, d / 2);
    g.add(s);
    for (const bx of [-w / 2 + 0.05, w / 2 - 0.05]) {
      const br = Prim.box(0.02, 0.05, d - 0.03, m.darkMetal);
      br.position.set(bx, sy - 0.04, d / 2 - 0.01);
      g.add(br);
    }
  }
  // jars on the lower shelf
  const jarSpecs: [number, number, number, number][] = [[-0.17, 0.045, 0.16, 0xd8b26a], [-0.06, 0.04, 0.13, 0xb3552a], [0.05, 0.045, 0.16, 0xe9dcc0]];
  for (const [jx, r, h, col] of jarSpecs) {
    const c = Prim.cylinder(r - 0.004, r - 0.004, h * 0.8, m.solid(col, { roughness: 0.6 }), { segments: 14 });
    c.position.set(jx, 0.0175 + h * 0.42, 0.12);
    g.add(c);
    const glass = Prim.cylinder(r, r, h * 0.85, m.glassClear, { segments: 14, cast: false });
    glass.position.set(jx, 0.0175 + h * 0.43, 0.12);
    g.add(glass);
    const lid = Prim.cylinder(r * 0.96, r * 0.96, h * 0.14, m.darkMetal, { segments: 14 });
    lid.position.set(jx, 0.0175 + h * 0.92, 0.12);
    g.add(lid);
  }
  const mugM = m.solid(0xd8e0dc, { roughness: 0.3, physical: true, clearcoat: 0.6 });
  const mugS = Prim.cylinder(0.04, 0.036, 0.09, mugM, { segments: 16 });
  mugS.position.set(0.17, 0.0175 + 0.045, 0.12);
  g.add(mugS);
  addStatic(ctx, g, []);
  // cookbooks on the upper shelf
  g.updateMatrixWorld(true);
  const p = g.localToWorld(new THREE.Vector3(0.03, 0.4 + 0.0175, 0.12));
  bookRow(ctx, p.x, p.y, p.z, w * 0.55, rotY, 0.22, 7);
  const p2 = g.localToWorld(new THREE.Vector3(-w / 2 + 0.08, 0.4 + 0.0175, 0.12));
  const plantPot = Prim.cylinder(0.04, 0.032, 0.07, m.solid(0xd9d2c4, { roughness: 0.8 }), { segments: 16 });
  plantPot.position.set(p2.x, p2.y + 0.035, p2.z);
  ctx.batch.add(plantPot);
  const succ = Prim.sphere(0.04, m.solid(0x6f9a5a, { roughness: 0.85 }), { segments: 10 });
  succ.scale.set(1, 0.7, 1);
  succ.position.set(p2.x, p2.y + 0.085, p2.z);
  ctx.batch.add(succ);
}

// -------------------------------------------------------------------------------------------
// Cabinet interiors (run-local frames; `g` is the run's static group)
// -------------------------------------------------------------------------------------------

export function interiorPlates(ctx: Ctx) {
  return (g: THREE.Group, b: Box) => {
    const m = ctx.mats;
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2 - 0.02;
    const midY = (b.y0 + b.y1) / 2;
    shelf(g, m.maple, b, midY);
    for (let i = 0; i < 5; i++) {
      const p = Prim.cylinder(0.11, 0.1, 0.012, m.ceramic, { segments: 22 });
      p.position.set(cx, b.y0 + 0.006 + i * 0.013, cz);
      g.add(p);
    }
    const bowlMat = m.solid(0x9fb8c8, { roughness: 0.3, physical: true, clearcoat: 0.6 });
    for (let i = 0; i < 3; i++) {
      const bw = vessel(0.075, 0.05, bowlMat, { foot: 0.04, segments: 20 });
      bw.position.set(cx, b.y0 + 0.07 + i * 0.03, cz);
      g.add(bw);
    }
    for (let i = 0; i < 4; i++) {
      const gl = Prim.cylinder(0.033, 0.03, 0.12, m.glassClear, { segments: 14, cast: false });
      gl.position.set(b.x0 + 0.06 + (i % 2) * 0.08, midY + 0.07, cz - 0.05 + Math.floor(i / 2) * 0.09);
      g.add(gl);
    }
    const mugM = m.solid(0xc9483b, { roughness: 0.3, physical: true, clearcoat: 0.6 });
    for (let i = 0; i < 2; i++) {
      const mg = Prim.cylinder(0.04, 0.036, 0.09, mugM, { segments: 16 });
      mg.position.set(b.x1 - 0.07, midY + 0.055, cz - 0.05 + i * 0.1);
      g.add(mg);
    }
  };
}

export function interiorPots(ctx: Ctx) {
  return (g: THREE.Group, b: Box) => {
    const m = ctx.mats;
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const pot = Prim.lathe([[0, 0], [0.12, 0], [0.12, 0.16], [0.113, 0.16], [0.113, 0.006], [0, 0.006]], m.steel, { segments: 24 });
    pot.position.set(cx - 0.05, b.y0, cz + 0.02);
    g.add(pot);
    const lid = Prim.lathe([[0, 0], [0.124, 0], [0.124, 0.012], [0.03, 0.02], [0.03, 0.04], [0.012, 0.045], [0, 0.045]], m.steel, { segments: 24 });
    lid.position.set(cx - 0.05, b.y0 + 0.16, cz + 0.02);
    g.add(lid);
    const pan = Prim.lathe([[0, 0], [0.1, 0], [0.105, 0.05], [0.098, 0.05], [0.093, 0.006], [0, 0.006]], m.steel, { segments: 24 });
    pan.position.set(cx + 0.12, b.y0, cz - 0.08);
    g.add(pan);
    const handle = Prim.rbox(0.16, 0.014, 0.026, 0.005, m.plasticBlack, { segments: 2 });
    handle.position.set(cx + 0.12, b.y0 + 0.045, cz + 0.05);
    handle.rotation.y = Math.PI / 2;
    g.add(handle);
    const tray = Prim.box(0.3, 0.02, 0.2, m.darkMetal);
    tray.position.set(cx + 0.02, b.y0 + 0.21, cz - 0.05);
    tray.rotation.z = 0.02;
    g.add(tray);
  };
}

export function interiorPlumbing(ctx: Ctx) {
  return (g: THREE.Group, b: Box) => {
    const m = ctx.mats;
    const chrome = m.chrome;
    const cx = (b.x0 + b.x1) / 2 + 0.1, cz = (b.z0 + b.z1) / 2 - 0.05;
    const down = Prim.cylinder(0.02, 0.02, 0.16, chrome, { segments: 12 });
    down.position.set(cx, b.y1 - 0.08, cz);
    g.add(down);
    const trap = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 10, 18, Math.PI), chrome);
    trap.rotation.z = Math.PI;
    trap.rotation.y = Math.PI / 2;
    trap.position.set(cx, b.y1 - 0.16, cz - 0.05);
    g.add(trap);
    const up = Prim.cylinder(0.02, 0.02, 0.1, chrome, { segments: 12 });
    up.position.set(cx, b.y1 - 0.13, cz - 0.1);
    g.add(up);
    const back = Prim.cylinder(0.02, 0.02, cz - 0.1 - b.z0 + 0.02, chrome, { segments: 12 });
    back.rotation.x = Math.PI / 2;
    back.position.set(cx, b.y1 - 0.09, (cz - 0.1 + b.z0) / 2);
    g.add(back);
    for (const s of [-1, 1]) {
      const supply = Prim.cylinder(0.006, 0.006, 0.3, chrome, { segments: 8 });
      supply.position.set(cx - 0.08 + s * 0.03, b.y1 - 0.2, b.z0 + 0.05);
      g.add(supply);
    }
    // cleaning things
    const spray = Prim.lathe([[0, 0], [0.03, 0], [0.032, 0.14], [0.02, 0.17], [0.02, 0.2], [0.03, 0.22], [0, 0.22]], m.solid(0x3b7fd6, { roughness: 0.4 }), { segments: 14 });
    spray.position.set(b.x0 + 0.08, b.y0, cz + 0.08);
    g.add(spray);
    const tabs = Prim.rbox(0.16, 0.1, 0.1, 0.006, m.solid(0xe4b53a, { roughness: 0.7 }), { segments: 2 });
    tabs.position.set(b.x0 + 0.25, b.y0 + 0.05, cz + 0.1);
    g.add(tabs);
    const bin = Prim.box(0.24, 0.3, 0.22, m.solid(0x9aa3a8, { roughness: 0.6 }));
    bin.position.set(b.x1 - 0.16, b.y0 + 0.15, cz - 0.02);
    g.add(bin);
  };
}

export function interiorPantry(ctx: Ctx) {
  return (g: THREE.Group, b: Box) => {
    const m = ctx.mats;
    const cz = (b.z0 + b.z1) / 2;
    const shelves = [b.y0 + 0.42, b.y0 + 0.82, b.y0 + 1.22, b.y0 + 1.62];
    for (const sy of shelves) shelf(g, m.maple, b, sy);
    const levels = [b.y0, ...shelves.map((s) => s + 0.009)];
    const canCols = [0xd94a3a, 0x3a7d44, 0xe8b93a, 0x3b6fb3, 0xd94a3a, 0xe8b93a];
    const rnd = ctx.rng;
    levels.forEach((ly, li) => {
      if (li === 0) {
        const flour = Prim.rbox(0.16, 0.24, 0.1, 0.02, m.solid(0xf0ead8, { roughness: 0.95 }), { segments: 2 });
        flour.position.set(b.x0 + 0.12, ly + 0.12, cz);
        g.add(flour);
        const bottle = Prim.cylinder(0.04, 0.04, 0.3, m.solid(0x3a4a2e, { roughness: 0.2, envMapIntensity: 0.9 }), { segments: 14 });
        bottle.position.set(b.x1 - 0.12, ly + 0.15, cz);
        g.add(bottle);
        return;
      }
      if (li === 1 || li === 3) {
        for (let i = 0; i < 4; i++) {
          const can = Prim.cylinder(0.035, 0.035, 0.11, m.solid(canCols[(i + li) % canCols.length], { roughness: 0.5, metalness: 0.2 }), { segments: 14 });
          can.position.set(b.x0 + 0.07 + i * 0.085 + (rnd() - 0.5) * 0.01, ly + 0.055, cz + (rnd() - 0.5) * 0.08);
          g.add(can);
        }
      } else {
        const boxes: [number, number][] = [[0xe0512f, 0.28], [0x2f7ad9, 0.26], [0xe3c04a, 0.24]];
        boxes.forEach(([col, h], i) => {
          const cereal = Prim.rbox(0.07, h, 0.2, 0.004, m.solid(col, { roughness: 0.7 }), { segments: 2 });
          cereal.position.set(b.x0 + 0.06 + i * 0.09, ly + h / 2, cz);
          g.add(cereal);
        });
        const jarG = Prim.cylinder(0.045, 0.045, 0.15, m.glassClear, { segments: 14, cast: false });
        jarG.position.set(b.x1 - 0.1, ly + 0.078, cz);
        g.add(jarG);
        const jarC = Prim.cylinder(0.04, 0.04, 0.12, m.solid(0xd8b26a, { roughness: 0.6 }), { segments: 14 });
        jarC.position.set(b.x1 - 0.1, ly + 0.062, cz);
        g.add(jarC);
      }
    });
  };
}
