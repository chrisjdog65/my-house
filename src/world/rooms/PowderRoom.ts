/**
 * Powder room (ground floor, room id 'powder'): beadboard wainscot with a cap rail, pedestal sink
 * with a running faucet, oval mirror flanked by sconces, flushing toilet, toilet-paper holder, towel
 * ring with a hand towel, soap dispenser (pickup) on a marble dish, wastebasket, framed print, a
 * shelf over the toilet with a plant and a candle you can light, exhaust fan grille, recessed light
 * and a switch beside the door.
 *
 * Layout (metres): door on the west wall at z 1.5 swinging into the room (+x); sink + mirror on the
 * south wall; toilet against the east wall facing west; wastebasket in the north-west corner.
 */
import * as THREE from 'three';
import { Prim, place, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import type { Structure } from '../Structure';
import { addStatic, lightSwitch, plant, recessedLight, Toggle } from '../Props';
import { BB, C, DOOR_Z0, DOOR_Z1, EX, F, LIGHT_GROUP, NZ, SINK_X, SZ, TOILET_Z, WAIN, WX, wallPanel, type Side } from './PowderRoom.layout';
import { SINK, SINK_CZ, buildMirrorAndSconces, buildPedestalSink, buildToilet } from './PowderRoom.fixtures';

export function buildPowderRoom(ctx: Ctx, structure: Structure) {
  void structure;
  buildWainscot(ctx);
  buildLighting(ctx);
  buildPedestalSink(ctx);
  buildMirrorAndSconces(ctx);
  buildToilet(ctx);
  buildWallBits(ctx);
  buildShelf(ctx);
  buildFloorBits(ctx);
}

// -------------------------------------------------------------------------------------------
// Beadboard wainscot (1.1 m) with a cove strip and cap rail on every wall
// -------------------------------------------------------------------------------------------

function buildWainscot(ctx: Ctx) {
  const m = ctx.mats;
  const g = new THREE.Group();
  const bead = m.beadboard, cap = m.trim;
  const CD = 0.028, CH = 0.03;   // cap rail depth / height
  const SD = 0.02, SH = 0.014;   // cove strip under the cap
  const y0 = F + 0.11, y1 = F + WAIN - CH; // on top of the baseboard, up to the cap
  wallPanel(g, 'n', WX, EX, y0, y1, bead, BB);
  wallPanel(g, 's', WX, EX, y0, y1, bead, BB);
  wallPanel(g, 'w', NZ + BB, DOOR_Z0, y0, y1, bead, BB);
  wallPanel(g, 'w', DOOR_Z1, SZ - BB, y0, y1, bead, BB);
  wallPanel(g, 'e', NZ + BB, SZ - BB, y0, y1, bead, BB);
  const rail = (side: Side, a0: number, a1: number, inset: boolean) => {
    const i0 = inset ? 1 : 0, i1 = inset ? -1 : 0;
    wallPanel(g, side, a0 + i0 * SD, a1 + i1 * SD, y1 - SH, y1, cap, SD);
    wallPanel(g, side, a0 + i0 * CD, a1 + i1 * CD, y1, y1 + CH, cap, CD);
  };
  rail('n', WX, EX, true);
  rail('s', WX, EX, true);
  rail('w', NZ, DOOR_Z0, false);
  rail('w', DOOR_Z1, SZ, false);
  rail('e', NZ, SZ, false);
  addStatic(ctx, g, [], { worldUV: true });
}

// -------------------------------------------------------------------------------------------
// Lighting: recessed can + the sconces (fixtures file), switch by the door, exhaust fan grille
// -------------------------------------------------------------------------------------------

function buildLighting(ctx: Ctx) {
  const m = ctx.mats;
  recessedLight(ctx, 2.45, C, 1.35, LIGHT_GROUP, { intensity: 4, distance: 4 });
  // latch side of the door (hinge on the south jamb), 1.2 m up, plate just proud of the beadboard
  lightSwitch(ctx, WX + BB + 0.002, F + 1.2, 0.84, Math.PI / 2, LIGHT_GROUP, 'powder room lights');
  // exhaust fan grille in the ceiling over the toilet
  const g = new THREE.Group();
  const fx = 2.75, fz = 0.95;
  const frame = Prim.box(0.28, 0.02, 0.28, m.plasticWhite, { cast: false });
  frame.position.set(fx, C - 0.01, fz);
  g.add(frame);
  const slatMat = m.solid(0x8e8e8c, { roughness: 0.6 });
  for (let i = 0; i < 6; i++) {
    const slat = Prim.box(0.24, 0.004, 0.017, slatMat, { cast: false });
    slat.position.set(fx, C - 0.022, fz - 0.1 + i * 0.04);
    g.add(slat);
  }
  addStatic(ctx, g);
}

// -------------------------------------------------------------------------------------------
// Wall bits: toilet-paper holder, towel ring + hand towel, framed print, door stop
// -------------------------------------------------------------------------------------------

function framedPrint(ctx: Ctx, x: number, y: number, z: number, rotY: number, w: number, h: number, tex: THREE.Texture) {
  const m = ctx.mats;
  const g = new THREE.Group();
  const fw = 0.028;
  const fm = m.solid(0x3a3129, { roughness: 0.45, metalness: 0.4, envMapIntensity: 0.8 });
  const bar = (bw: number, bh: number, bx: number, by: number) => { const b = Prim.box(bw, bh, 0.022, fm); b.position.set(bx, by, 0.011); g.add(b); };
  bar(w + 2 * fw, fw, 0, h / 2 + fw / 2);
  bar(w + 2 * fw, fw, 0, -h / 2 - fw / 2);
  bar(fw, h, -w / 2 - fw / 2, 0);
  bar(fw, h, w / 2 + fw / 2, 0);
  const matte = Prim.box(w, h, 0.01, m.solid(0xf5f5f0, { roughness: 0.9 }));
  matte.position.z = 0.005; g.add(matte);
  const pic = Prim.quad(w - 0.06, h - 0.06, m.image(tex, { roughness: 0.85, envMapIntensity: 0.25 }), { keepUV: true, cast: false });
  pic.position.z = 0.012; g.add(pic);
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
}

function buildWallBits(ctx: Ctx) {
  const m = ctx.mats;
  const ch = m.chrome;
  const g = new THREE.Group();

  // toilet-paper holder on the north wall, just in front of the bowl
  const hx = 2.5, hy = F + 0.68, wz = NZ + BB;
  const plate = Prim.cylinder(0.026, 0.026, 0.008, ch, { segments: 14 });
  plate.rotation.x = Math.PI / 2; plate.position.set(hx, hy, wz + 0.004); g.add(plate);
  const arm = Prim.cylinder(0.007, 0.007, 0.08, ch, { segments: 8 });
  arm.rotation.x = Math.PI / 2; arm.position.set(hx, hy, wz + 0.044); g.add(arm);
  const spindle = Prim.cylinder(0.008, 0.008, 0.17, ch, { segments: 8 });
  spindle.rotation.z = Math.PI / 2; spindle.position.set(hx, hy, wz + 0.084); g.add(spindle);
  for (const s of [-1, 1]) {
    const cap = Prim.sphere(0.013, ch, { segments: 10 }); cap.position.set(hx + s * 0.085, hy, wz + 0.084); g.add(cap);
  }
  const paper = m.solid(0xf7f7f4, { roughness: 0.92 });
  const roll = Prim.cylinder(0.056, 0.056, 0.1, paper, { segments: 20 });
  roll.rotation.z = Math.PI / 2; roll.position.set(hx, hy, wz + 0.084); g.add(roll);
  const tail = Prim.box(0.098, 0.15, 0.002, paper, { cast: false });
  tail.position.set(hx, hy - 0.07, wz + 0.141); tail.rotation.x = 0.06; g.add(tail);

  // towel ring on the east wall beside the sink, hand towel folded over it
  const rx = EX - BB, ry = F + 1.2, rz = 1.95;
  const rplate = Prim.cylinder(0.025, 0.025, 0.008, ch, { segments: 14 });
  rplate.rotation.z = Math.PI / 2; rplate.position.set(rx - 0.004, ry, rz); g.add(rplate);
  const rarm = Prim.cylinder(0.008, 0.008, 0.04, ch, { segments: 8 });
  rarm.rotation.z = Math.PI / 2; rarm.position.set(rx - 0.028, ry, rz); g.add(rarm);
  const ringX = rx - 0.05, ringY = ry - 0.055;
  const ring = Prim.torus(0.07, 0.006, ch);
  ring.rotation.z = Math.PI / 2; ring.position.set(ringX, ringY, rz); g.add(ring);
  const accents = [0x8a9fb0, 0xb9c6cf, 0xd9cfc0];
  const towelCol = accents[Math.floor(ctx.rng() * accents.length)];
  const handFab = m.fabric(towelCol);
  const fold = Prim.rbox(0.05, 0.04, 0.16, 0.015, handFab, { segments: 2 });
  fold.position.set(ringX, ringY - 0.07, rz); g.add(fold);
  const hand = Prim.rbox(0.026, 0.3, 0.16, 0.01, handFab, { segments: 2 });
  hand.position.set(ringX - 0.006, ringY - 0.07 - 0.13, rz); hand.rotation.x = 0.04; g.add(hand);
  const band = Prim.box(0.003, 0.018, 0.16, m.fabric(0xf2efe9));
  band.position.set(ringX - 0.021, ringY - 0.07 - 0.25, rz); g.add(band);

  // floor door stop where the leaf lands when the door is opened into the room
  const stop = Prim.lathe([[0, 0], [0.024, 0], [0.024, 0.01], [0.02, 0.02], [0.012, 0.028], [0, 0.03]], ch, { segments: 16 });
  stop.position.set(2.15, F, 1.975); g.add(stop);
  const rubber = Prim.cylinder(0.011, 0.011, 0.006, m.solid(0x2a2a2a, { roughness: 0.9 }), { segments: 10, cast: false });
  rubber.position.set(2.15, F + 0.031, 1.975); g.add(rubber);
  addStatic(ctx, g);

  // framed print on the north wall, west of the toilet
  framedPrint(ctx, 2.05, F + 1.62, NZ + BB + 0.001, 0, 0.26, 0.34, ctx.tex.art(7, 0.76));
}

// -------------------------------------------------------------------------------------------
// Shelf over the toilet: walnut board on brackets, a small plant and a candle you can light
// -------------------------------------------------------------------------------------------

function buildShelf(ctx: Ctx) {
  const m = ctx.mats;
  const g = new THREE.Group();
  const sy = F + 1.42, sd = 0.24, sw = 0.52;
  const sx = EX - BB - sd / 2, sz = TOILET_Z;
  const board = Prim.rbox(sd, 0.022, sw, 0.004, m.walnut, { segments: 1 });
  board.position.set(sx, sy - 0.011, sz); g.add(board);
  const brMat = m.solid(0x1d1d1f, { roughness: 0.45, metalness: 0.6, envMapIntensity: 0.8 });
  for (const dz of [-0.19, 0.19]) {
    const up = Prim.rbox(0.014, 0.1, 0.02, 0.003, brMat, { segments: 1 });
    up.position.set(EX - BB - 0.007, sy - 0.072, sz + dz); g.add(up);
    const out = Prim.rbox(0.18, 0.012, 0.02, 0.003, brMat, { segments: 1 });
    out.position.set(EX - BB - 0.09, sy - 0.028, sz + dz); g.add(out);
  }
  addStatic(ctx, g);

  // small plant (Props.plant, then collapsed to one mesh per material and flattened a little
  // toward the wall so its leaves stay in front of the plaster)
  const before = ctx.dynamic.children.length;
  plant(ctx, EX - BB - 0.13, sy, sz - 0.14, 0.4, { potColor: 0xe6e1d6 });
  const raw = ctx.dynamic.children[before];
  if (raw) {
    const merged = mergeByMaterial(raw);
    merged.scale.x = 0.6;
    ctx.dynamic.remove(raw);
    ctx.dynamic.add(merged);
  }

  buildCandle(ctx, sx, sy, sz + 0.15);
}

/** Candle in a glass jar: toggle to light / blow out, flickering flame + light. */
function buildCandle(ctx: Ctx, x: number, y: number, z: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  const glass = m.solid(0xd4e2e8, { roughness: 0.08, envMapIntensity: 1.2, physical: true, clearcoat: 0.9, opacity: 0.45, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const jar = Prim.lathe([[0.029, 0.002], [0.032, 0.02], [0.032, 0.07], [0.03, 0.076]], glass, { segments: 18, cast: false });
  g.add(jar);
  const bottom = Prim.cylinder(0.029, 0.029, 0.004, m.solid(0xc9d6da, { roughness: 0.2 }), { segments: 18, cast: false });
  bottom.position.y = 0.002; g.add(bottom);
  const wax = Prim.cylinder(0.027, 0.027, 0.046, m.solid(0xf1e7d0, { roughness: 0.85 }), { segments: 18 });
  wax.position.y = 0.027; g.add(wax);
  const wick = Prim.cylinder(0.0015, 0.0015, 0.012, m.black, { segments: 6, cast: false });
  wick.position.y = 0.056; g.add(wick);
  const flame = Prim.sphere(0.007, m.emissive(0xffb347, 3, 0xffe6b0), { segments: 8, cast: false });
  flame.scale.set(1, 1.7, 1);
  flame.position.y = 0.07;
  flame.name = 'flame';
  flame.userData.keepSeparate = true;
  g.add(flame);
  const merged = mergeByMaterial(g);
  merged.position.set(x, y, z);
  ctx.dynamic.add(merged);
  const flameMesh = merged.children.find((c) => c.name === 'flame') as THREE.Mesh;
  const pos = new THREE.Vector3(x, y + 0.07, z);
  const light = ctx.lights.point(x, y + 0.09, z - 0.02, { intensity: 0.35, distance: 1.8, color: 0xffa552, flicker: 0.6, on: true });
  const toggle = new Toggle(merged, { on: 'Blow out candle', off: 'Light candle' }, (on) => {
    flameMesh.visible = on;
    ctx.lights.setOn(light, on);
    ctx.audio.play(on ? 'fireIgnite' : 'fireOut', pos, 0.3);
  }, pos);
  toggle.on = true;
  ctx.interact.add(toggle);
  ctx.onUpdate((_dt, t) => {
    if (!toggle.on) return;
    flameMesh.scale.set(1 + 0.15 * Math.sin(t * 23), 1.7 + 0.35 * Math.sin(t * 17 + 1), 1 + 0.15 * Math.cos(t * 19));
    flameMesh.position.x = 0.002 * Math.sin(t * 13);
  });
}

// -------------------------------------------------------------------------------------------
// Floor bits: wastebasket in the north-west corner, mat in front of the sink
// -------------------------------------------------------------------------------------------

function buildFloorBits(ctx: Ctx) {
  const m = ctx.mats;
  const g = new THREE.Group();
  const wx = 1.84, wz = 0.82;
  const steel = m.solid(0x9a9ea3, { roughness: 0.35, metalness: 0.85, envMapIntensity: 1.0 });
  const bin = Prim.lathe([[0, 0], [0.095, 0], [0.1, 0.01], [0.105, 0.26], [0.11, 0.28], [0.098, 0.28], [0.095, 0.05], [0, 0.05]], steel, { segments: 22 });
  bin.position.set(wx, F, wz); g.add(bin);
  const liner = Prim.cylinder(0.098, 0.092, 0.03, m.solid(0x2b2b2e, { roughness: 0.6 }), { segments: 22, cast: false });
  liner.position.set(wx, F + 0.27, wz); g.add(liner);
  const crumple = Prim.sphere(0.03, m.solid(0xfafaf8, { roughness: 0.95 }), { segments: 8 });
  crumple.position.set(wx + 0.02, F + 0.1, wz - 0.01); g.add(crumple);
  // mat in front of the sink
  const matCol = [0x7f93a3, 0x9aaab6, 0xb5b0a3][Math.floor(ctx.rng() * 3)];
  const mat = Prim.rbox(0.52, 0.016, 0.34, 0.008, m.fabric(matCol), { segments: 2, cast: false });
  mat.position.set(SINK_X, F + 0.008, SINK_CZ - SINK.d / 2 - 0.2); g.add(mat);
  const matIn = Prim.rbox(0.44, 0.006, 0.26, 0.003, m.fabric(0xe9ecee), { segments: 1, cast: false });
  matIn.position.set(SINK_X, F + 0.018, SINK_CZ - SINK.d / 2 - 0.2); g.add(matIn);
  addStatic(ctx, g, [], { surface: 'tile' });
  ctx.physics.addCylinder({ x: wx, y: F + 0.14, z: wz }, 0.11, 0.28);
}
