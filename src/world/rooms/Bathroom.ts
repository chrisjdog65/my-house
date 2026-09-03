/**
 * Hall bathroom (upper floor, room id 'bath'): subway-tile wainscot and tub surround, a vanity with
 * hinged shaker doors and a running faucet, framed mirror with sconces, flushing toilet, tub/shower
 * combo with a bowed curtain rod and running spray, towels, toiletries (pickups), hamper, scale,
 * framed prints, exhaust fan and recessed lights on a switch by the door.
 *
 * Layout (metres, +x east, +z front): door on the west wall at z=0 swinging into the room; toilet in
 * the south-west corner facing north; vanity + mirror on the north wall; tub along the east wall with
 * its head at the north wall (shower fixtures there); hamper in the north-west corner.
 */
import * as THREE from 'three';
import { Prim, place } from '../Builder';
import type { Ctx } from '../Context';
import type { Structure } from '../Structure';
import { addStatic, lightSwitch, pickup, recessedLight } from '../Props';
import { C, EX, F, LIGHT_GROUP, NZ, ROD, SZ, TILE_T, TUB, VANITY_X, WX, buildToilet, buildTub, buildVanity } from './Bathroom.fixtures';

export function buildBathroom(ctx: Ctx, structure: Structure) {
  void structure;
  buildTilework(ctx);
  buildLighting(ctx);
  buildVanity(ctx);
  buildToilet(ctx, 2.05, SZ - 0.26, Math.PI);
  buildTub(ctx);
  buildTowels(ctx);
  buildWallBits(ctx);
  buildFloorBits(ctx);
  buildShelf(ctx);
  miniPlant(ctx, VANITY_X + 0.5, F + 0.89, NZ + 0.16, 0.32);
}

/** Small static faux plant on the vanity (alpha-tested leaf cards batch fine, unlike Props.plant). */
function miniPlant(ctx: Ctx, x: number, y: number, z: number, size = 0.32) {
  const m = ctx.mats;
  const g = new THREE.Group();
  const potH = size * 0.3, potR = size * 0.15;
  const pot = Prim.lathe([[potR * 0.7, 0], [potR * 0.95, 0], [potR, potH * 0.9], [potR * 1.08, potH * 0.9], [potR * 1.08, potH], [potR * 0.88, potH], [potR * 0.88, potH * 0.85], [0, potH * 0.85]], m.solid(0xe8e4dc, { roughness: 0.7 }), { segments: 18 });
  g.add(pot);
  const soil = Prim.cylinder(potR * 0.86, potR * 0.86, 0.01, m.soil, { cast: false });
  soil.position.y = potH * 0.85; g.add(soil);
  const leafMat = m.image(ctx.tex.foliage('leaf'), { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8, envMapIntensity: 0.3 });
  const stemMat = m.solid(0x4c6b3c, { roughness: 0.8 });
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + ctx.rng() * 0.6;
    const tilt = 0.3 + ctx.rng() * 0.3;
    const len = size * (0.45 + ctx.rng() * 0.2);
    const stem = Prim.cylinder(0.004, 0.006, len, stemMat, { segments: 6 });
    stem.position.set(Math.sin(a) * len * 0.5 * Math.sin(tilt), potH * 0.85 + Math.cos(tilt) * len * 0.5, Math.cos(a) * len * 0.5 * Math.sin(tilt));
    stem.rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt);
    g.add(stem);
    const card = Prim.quad(size * 0.45, size * 0.45, leafMat, { keepUV: true });
    card.position.set(Math.sin(a) * len * Math.sin(tilt) * 0.9, potH * 0.85 + Math.cos(tilt) * len * 0.9 + size * 0.08, Math.cos(a) * len * Math.sin(tilt) * 0.9);
    card.rotation.y = a + Math.PI / 2 + (ctx.rng() - 0.5);
    card.rotation.x = (ctx.rng() - 0.5) * 0.5;
    g.add(card);
    const card2 = card.clone();
    card2.rotation.y += Math.PI / 2;
    g.add(card2);
  }
  place(g, x, y, z, ctx.rng() * Math.PI * 2);
  addStatic(ctx, g);
}

// -------------------------------------------------------------------------------------------
// Tilework: 1.2 m subway wainscot on every wall with a painted cap rail; 2 m surround around the tub
// -------------------------------------------------------------------------------------------

type Side = 'n' | 's' | 'e' | 'w';

/** Thin panel against one wall face, spanning `a0..a1` along the wall (x for n/s, z for e/w). */
function wallPanel(g: THREE.Group, side: Side, a0: number, a1: number, yb: number, yt: number, mat: THREE.Material, th: number) {
  if (a1 - a0 < 0.005) return;
  const len = a1 - a0, h = yt - yb, mid = (a0 + a1) / 2, yc = (yb + yt) / 2;
  let b: THREE.Mesh;
  if (side === 'n' || side === 's') {
    b = Prim.box(len, h, th, mat);
    b.position.set(mid, yc, side === 'n' ? NZ + th / 2 : SZ - th / 2);
  } else {
    b = Prim.box(th, h, len, mat);
    b.position.set(side === 'w' ? WX + th / 2 : EX - th / 2, yc, mid);
  }
  g.add(b);
}

function buildTilework(ctx: Ctx) {
  const m = ctx.mats;
  const g = new THREE.Group();
  const tile = m.subway, T = TILE_T;
  const cap = m.trim, edge = m.ceramic;
  const y0 = F + 0.11, y1 = F + 1.2;   // on top of the baseboard, up to the chair rail
  const DOOR = 0.535;                   // half-width of the door casing on the west wall
  const SW0 = 0.56, SW1 = 0.68;         // cap-rail cut-out for the light switch
  // wainscot
  wallPanel(g, 'n', WX, TUB.x0, y0, y1, tile, T);
  wallPanel(g, 's', WX, EX, y0, y1, tile, T);
  wallPanel(g, 'w', NZ + T, -DOOR, y0, y1, tile, T);
  wallPanel(g, 'w', DOOR, SZ - T, y0, y1, tile, T);
  wallPanel(g, 'e', ROD.z1 + 0.03, SZ - T, y0, y1, tile, T);
  // cap rail
  const CD = 0.028, CH = 0.03;
  wallPanel(g, 'n', WX + CD, TUB.x0, y1, y1 + CH, cap, CD);
  wallPanel(g, 's', WX + CD, EX - CD, y1, y1 + CH, cap, CD);
  wallPanel(g, 'w', NZ + CD, -DOOR, y1, y1 + CH, cap, CD);
  wallPanel(g, 'w', DOOR, SW0, y1, y1 + CH, cap, CD);
  wallPanel(g, 'w', SW1, SZ - CD, y1, y1 + CH, cap, CD);
  wallPanel(g, 'e', ROD.z1 + 0.03, SZ - CD, y1, y1 + CH, cap, CD);
  // tub surround (behind the tub up to 2 m) with ceramic bullnose edges
  const s0 = F + 0.5, s1 = F + 2.0, ED = 0.02;
  wallPanel(g, 'e', NZ + T, ROD.z1, s0, s1, tile, T);
  wallPanel(g, 'n', TUB.x0, EX - T, s0, s1, tile, T);
  wallPanel(g, 'e', ROD.z1, ROD.z1 + 0.03, s0, s1 + 0.03, edge, ED);
  wallPanel(g, 'e', NZ + ED, ROD.z1, s1, s1 + 0.03, edge, ED);
  wallPanel(g, 'n', TUB.x0 - 0.03, EX, s1, s1 + 0.03, edge, ED);
  wallPanel(g, 'n', TUB.x0 - 0.03, TUB.x0, s0, s1, edge, ED);
  addStatic(ctx, g, [], { worldUV: true });
}

// -------------------------------------------------------------------------------------------
// Lighting: two recessed cans + the sconces (in the fixtures file), switch by the door, fan grille
// -------------------------------------------------------------------------------------------

function buildLighting(ctx: Ctx) {
  const m = ctx.mats;
  recessedLight(ctx, 2.9, C, 0.2, LIGHT_GROUP, { intensity: 11, distance: 6 });
  recessedLight(ctx, 4.3, C, -0.7, LIGHT_GROUP, { intensity: 9, distance: 5.5 });
  // latch side of the door (hinge at z=-0.38), 1.2 m up, plate just proud of the tile
  lightSwitch(ctx, WX + 0.014, F + 1.2, 0.62, Math.PI / 2, LIGHT_GROUP, 'bathroom lights');
  // exhaust fan grille
  const g = new THREE.Group();
  const frame = Prim.box(0.3, 0.02, 0.3, m.plasticWhite, { cast: false });
  frame.position.set(3.7, C - 0.01, -0.9);
  g.add(frame);
  const slatMat = m.solid(0x8e8e8c, { roughness: 0.6 });
  for (let i = 0; i < 6; i++) {
    const slat = Prim.box(0.26, 0.004, 0.018, slatMat, { cast: false });
    slat.position.set(3.7, C - 0.022, -0.9 - 0.11 + i * 0.044);
    g.add(slat);
  }
  addStatic(ctx, g);
}

// -------------------------------------------------------------------------------------------
// Towels: bar with two folded towels (south wall), towel ring with a hand towel (north wall)
// -------------------------------------------------------------------------------------------

function buildTowels(ctx: Ctx) {
  const m = ctx.mats;
  const ch = m.chrome;
  const g = new THREE.Group();
  const T = TILE_T;
  // towel bar
  const bx = 3.4, by = F + 1.38, off = 0.075;
  for (const sx of [-1, 1]) {
    const post = Prim.cylinder(0.011, 0.011, off, ch, { segments: 10 });
    post.rotation.x = Math.PI / 2; post.position.set(bx + sx * 0.32, by, SZ - T - off / 2); g.add(post);
    const pl = Prim.cylinder(0.02, 0.02, 0.008, ch, { segments: 12 });
    pl.rotation.x = Math.PI / 2; pl.position.set(bx + sx * 0.32, by, SZ - T - 0.004); g.add(pl);
  }
  const bar = Prim.cylinder(0.01, 0.01, 0.68, ch, { segments: 10 });
  bar.rotation.z = Math.PI / 2; bar.position.set(bx, by, SZ - T - off); g.add(bar);
  const cols = [0x8fb0b8, 0xd9c7b2, 0xa9b9a2];
  const accent = cols[Math.floor(ctx.rng() * cols.length)];
  const towels: [number, number][] = [[bx - 0.17, accent], [bx + 0.17, 0xf2efe9]];
  for (const [tx, col] of towels) {
    const fab = m.fabric(col);
    const zb = SZ - T - off;
    const front = Prim.rbox(0.28, 0.36, 0.045, 0.012, fab, { segments: 2 });
    front.position.set(tx, by - 0.17, zb - 0.03); front.rotation.y = (ctx.rng() - 0.5) * 0.06; g.add(front);
    const loop = Prim.rbox(0.28, 0.05, 0.1, 0.02, fab, { segments: 2 });
    loop.position.set(tx, by + 0.012, zb); g.add(loop);
    const back = Prim.rbox(0.28, 0.28, 0.03, 0.01, fab, { segments: 2 });
    back.position.set(tx, by - 0.14, zb + 0.03); g.add(back);
    // stitched border band on the front
    const band = Prim.box(0.28, 0.02, 0.002, m.fabric(col === 0xf2efe9 ? accent : 0xf2efe9));
    band.position.set(tx, by - 0.3, zb - 0.053); g.add(band);
  }
  // towel ring beside the vanity
  const rx = 3.92, ry = F + 1.1;
  const plate = Prim.cylinder(0.025, 0.025, 0.008, ch, { segments: 14 });
  plate.rotation.x = Math.PI / 2; plate.position.set(rx, ry, NZ + T + 0.004); g.add(plate);
  const arm = Prim.cylinder(0.008, 0.008, 0.04, ch, { segments: 8 });
  arm.rotation.x = Math.PI / 2; arm.position.set(rx, ry, NZ + T + 0.028); g.add(arm);
  const ringY = ry - 0.06, ringZ = NZ + T + 0.05;
  const ring = Prim.torus(0.075, 0.006, ch);
  ring.rotation.x = Math.PI / 2; ring.position.set(rx, ringY, ringZ); g.add(ring);
  const handFab = m.fabric(0xf2efe9);
  const fold = Prim.rbox(0.16, 0.04, 0.05, 0.015, handFab, { segments: 2 });
  fold.position.set(rx, ringY - 0.075, ringZ); g.add(fold);
  const hand = Prim.rbox(0.16, 0.3, 0.025, 0.01, handFab, { segments: 2 });
  hand.position.set(rx, ringY - 0.075 - 0.13, ringZ + 0.006); hand.rotation.y = 0.05; g.add(hand);
  addStatic(ctx, g);
}

// -------------------------------------------------------------------------------------------
// Wall bits: toilet-paper holder, robe on a hook, framed prints
// -------------------------------------------------------------------------------------------

function framedPrint(ctx: Ctx, x: number, y: number, z: number, rotY: number, w: number, h: number, tex: THREE.Texture, frameColor = 0x2a2623) {
  const m = ctx.mats;
  const g = new THREE.Group();
  const fw = 0.03;
  const fm = m.solid(frameColor, { roughness: 0.5 });
  const bar = (bw: number, bh: number, bx: number, by: number) => { const b = Prim.box(bw, bh, 0.025, fm); b.position.set(bx, by, 0.0125); g.add(b); };
  bar(w + 2 * fw, fw, 0, h / 2 + fw / 2);
  bar(w + 2 * fw, fw, 0, -h / 2 - fw / 2);
  bar(fw, h, -w / 2 - fw / 2, 0);
  bar(fw, h, w / 2 + fw / 2, 0);
  const matte = Prim.box(w, h, 0.012, m.solid(0xf5f5f0, { roughness: 0.9 }));
  matte.position.z = 0.006; g.add(matte);
  const pic = Prim.quad(w - 0.06, h - 0.06, m.image(tex, { roughness: 0.85, envMapIntensity: 0.25 }), { keepUV: true, cast: false });
  pic.position.z = 0.014; g.add(pic);
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
}

function buildWallBits(ctx: Ctx) {
  const m = ctx.mats;
  const ch = m.chrome;
  const T = TILE_T;
  const g = new THREE.Group();
  // toilet-paper holder on the west wall, beside the toilet
  const hy = F + 0.68, hz = 0.66;
  const plate = Prim.cylinder(0.028, 0.028, 0.008, ch, { segments: 14 });
  plate.rotation.z = Math.PI / 2; plate.position.set(WX + T + 0.004, hy, hz); g.add(plate);
  const rod = Prim.cylinder(0.008, 0.008, 0.14, ch, { segments: 8 });
  rod.rotation.z = Math.PI / 2; rod.position.set(WX + T + 0.078, hy, hz); g.add(rod);
  const knob = Prim.sphere(0.014, ch, { segments: 10 }); knob.position.set(WX + T + 0.15, hy, hz); g.add(knob);
  const paper = m.solid(0xf7f7f4, { roughness: 0.92 });
  const roll = Prim.cylinder(0.058, 0.058, 0.1, paper, { segments: 20 });
  roll.rotation.z = Math.PI / 2; roll.position.set(WX + T + 0.08, hy, hz); g.add(roll);
  const tail = Prim.box(0.098, 0.16, 0.002, paper, { cast: false });
  tail.position.set(WX + T + 0.08, hy - 0.06, hz + 0.058); g.add(tail);
  // robe on a hook, south of the door
  const rz = 1.15, hookY = F + 1.72;
  const hplate = Prim.cylinder(0.02, 0.02, 0.008, ch, { segments: 12 });
  hplate.rotation.z = Math.PI / 2; hplate.position.set(WX + T + 0.004, hookY, rz); g.add(hplate);
  const hook = Prim.cylinder(0.006, 0.006, 0.05, ch, { segments: 8 });
  hook.rotation.z = Math.PI / 2; hook.position.set(WX + T + 0.03, hookY, rz); g.add(hook);
  const hookUp = Prim.cylinder(0.006, 0.006, 0.035, ch, { segments: 8 });
  hookUp.position.set(WX + T + 0.055, hookY + 0.015, rz); g.add(hookUp);
  // the robe hangs flat on the west wall: its width runs along z, its thickness along x (0.085 off
  // the wall face like the sleeves, which clears the cap rail at WX+0.028)
  const robeFab = m.fabric(0xf1ece2);
  const robe = Prim.rbox(0.09, 0.95, 0.36, 0.03, robeFab, { segments: 3 });
  robe.position.set(WX + 0.085, hookY - 0.455, rz); robe.rotation.y = 0.04; g.add(robe);
  const collar = Prim.rbox(0.03, 0.12, 0.2, 0.012, robeFab, { segments: 2 });
  collar.position.set(WX + 0.135, hookY - 0.04, rz); g.add(collar);
  for (const s of [-1, 1]) {
    const sleeve = Prim.rbox(0.09, 0.5, 0.11, 0.035, robeFab, { segments: 3 });
    sleeve.position.set(WX + 0.085, hookY - 0.33, rz + s * 0.2); sleeve.rotation.x = s * 0.12; g.add(sleeve);
  }
  const belt = Prim.rbox(0.012, 0.05, 0.38, 0.005, m.fabric(0xe1d9cb), { segments: 1 });
  belt.position.set(WX + 0.128, hookY - 0.56, rz); g.add(belt);
  const tie = Prim.rbox(0.012, 0.3, 0.05, 0.005, m.fabric(0xe1d9cb), { segments: 1 });
  tie.position.set(WX + 0.128, hookY - 0.72, rz + 0.06); tie.rotation.x = 0.1; g.add(tie);
  addStatic(ctx, g);
  // framed prints: over the toilet and on the east wall by the scale
  framedPrint(ctx, 2.05, F + 1.72, SZ - T, Math.PI, 0.36, 0.46, ctx.tex.art(6, 0.78));
  framedPrint(ctx, EX - T, F + 1.62, 1.0, -Math.PI / 2, 0.3, 0.38, ctx.tex.art(3, 0.8), 0xf4f1ea);
}

// -------------------------------------------------------------------------------------------
// Floor bits: bath mat, laundry hamper, wastebasket, scale, toilet brush
// -------------------------------------------------------------------------------------------

function buildFloorBits(ctx: Ctx) {
  const m = ctx.mats;
  const g = new THREE.Group();
  // bath mat in front of the tub
  const mat = Prim.rbox(0.55, 0.018, 0.85, 0.008, m.fabric(0xcfe0e6), { segments: 2, cast: false });
  mat.position.set(3.85, F + 0.009, -0.48); g.add(mat);
  const matIn = Prim.rbox(0.47, 0.006, 0.77, 0.003, m.fabric(0xe6f0f3), { segments: 1, cast: false });
  matIn.position.set(3.85, F + 0.02, -0.48); g.add(matIn);
  // laundry hamper (ribbed rattan) with the lid ajar over a towel
  const hx = 1.9, hz = -1.15;
  const ratt = m.solid(0xb89a6c, { roughness: 0.9 });
  const prof: [number, number][] = [[0, 0], [0.19, 0]];
  for (let i = 0; i <= 20; i++) prof.push([0.205 + (i % 2) * 0.01 + (i / 20) * 0.02, i * 0.03]);
  prof.push([0.24, 0.6], [0.24, 0.625], [0.21, 0.625], [0.2, 0.6], [0, 0.6]);
  const hamper = Prim.lathe(prof, ratt, { segments: 24 });
  hamper.position.set(hx, F, hz); g.add(hamper);
  const lid = Prim.lathe([[0, 0], [0.245, 0], [0.25, 0.015], [0.24, 0.03], [0.1, 0.045], [0, 0.05]], ratt, { segments: 24 });
  lid.geometry.translate(0, 0, 0.245);
  lid.position.set(hx, F + 0.625, hz - 0.245); lid.rotation.x = -0.2; g.add(lid);
  const peek = Prim.rbox(0.2, 0.05, 0.16, 0.02, m.fabric(0x9cb7c3), { segments: 2 });
  peek.position.set(hx + 0.02, F + 0.63, hz + 0.16); peek.rotation.set(0.35, 0.2, 0); g.add(peek);
  // wastebasket by the vanity
  const wx = 2.26, wz = -1.27;
  const bin = Prim.lathe([[0, 0], [0.1, 0], [0.11, 0.02], [0.12, 0.28], [0.125, 0.3], [0.112, 0.3], [0.108, 0.05], [0, 0.05]], m.plasticWhite, { segments: 22 });
  bin.position.set(wx, F, wz); g.add(bin);
  const crumple = Prim.sphere(0.035, m.solid(0xfafaf8, { roughness: 0.95 }), { segments: 8 });
  crumple.position.set(wx + 0.02, F + 0.09, wz); g.add(crumple);
  // scale in the south-east corner
  const sx = 4.6, sz = 1.1;
  const scale = Prim.rbox(0.3, 0.025, 0.3, 0.006, m.solid(0xeaeaea, { roughness: 0.3 }), { segments: 2 });
  scale.position.set(sx, F + 0.0125, sz); scale.rotation.y = 0.15; g.add(scale);
  const glassTop = Prim.rbox(0.28, 0.006, 0.28, 0.003, m.solid(0x22262a, { roughness: 0.15, metalness: 0.2, envMapIntensity: 1.2 }), { segments: 1 });
  glassTop.position.set(sx, F + 0.028, sz); glassTop.rotation.y = 0.15; g.add(glassTop);
  const display = Prim.box(0.06, 0.002, 0.02, m.solid(0x9fb7c8, { roughness: 0.3 }));
  display.position.set(sx - Math.sin(0.15) * 0.1, F + 0.032, sz - Math.cos(0.15) * 0.1); display.rotation.y = 0.15; g.add(display);
  // toilet brush beside the toilet
  const tx = 2.45, tz = 1.3;
  const holder = Prim.lathe([[0, 0], [0.045, 0], [0.05, 0.02], [0.05, 0.2], [0.04, 0.21], [0, 0.21]], m.plasticWhite, { segments: 18 });
  holder.position.set(tx, F, tz); g.add(holder);
  const handle = Prim.cylinder(0.008, 0.008, 0.25, m.chrome, { segments: 8 });
  handle.position.set(tx, F + 0.32, tz); g.add(handle);
  const handleTop = Prim.sphere(0.013, m.chrome, { segments: 8 }); handleTop.position.set(tx, F + 0.45, tz); g.add(handleTop);
  addStatic(ctx, g, [], { surface: 'tile' });
  ctx.physics.addCylinder({ x: hx, y: F + 0.33, z: hz }, 0.24, 0.66);
  ctx.physics.addCylinder({ x: wx, y: F + 0.15, z: wz }, 0.125, 0.3);
}

// -------------------------------------------------------------------------------------------
// Shelf over the tub with toiletries (pickups)
// -------------------------------------------------------------------------------------------

function bottle(ctx: Ctx, x: number, y: number, z: number, color: number, h: number, name: string) {
  const m = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.lathe([[0, 0], [0.028, 0], [0.033, 0.015], [0.033, h - 0.05], [0.026, h - 0.025], [0.014, h - 0.02], [0, h - 0.02]], m.solid(color, { roughness: 0.45 }), { segments: 18 });
  g.add(body);
  const cap = Prim.cylinder(0.013, 0.013, 0.025, m.plasticWhite, { segments: 10 });
  cap.position.y = h - 0.012; g.add(cap);
  const label = Prim.cylinder(0.0345, 0.0345, h * 0.36, m.plasticWhite, { segments: 18, cast: false });
  label.position.y = h * 0.42; g.add(label);
  g.position.set(x, y, z);
  g.rotation.y = ctx.rng() * Math.PI * 2;
  return pickup(ctx, g, { name, mass: 0.4, shape: { type: 'cylinder', radius: 0.034, height: h }, offset: new THREE.Vector3(0, h / 2, 0) });
}

function buildShelf(ctx: Ctx) {
  const m = ctx.mats;
  const ch = m.chrome;
  const T = TILE_T;
  const sx = EX - T - 0.07, sy = F + 1.3, sz = -0.75;
  const g = new THREE.Group();
  const shelf = Prim.box(0.14, 0.02, 0.42, m.ceramic);
  shelf.position.set(sx, sy, sz); g.add(shelf);
  for (const dz of [-0.16, 0.16]) {
    const up = Prim.rbox(0.02, 0.07, 0.02, 0.004, ch, { segments: 1 });
    up.position.set(EX - T - 0.01, sy - 0.045, sz + dz); g.add(up);
    const out = Prim.rbox(0.11, 0.012, 0.02, 0.004, ch, { segments: 1 });
    out.position.set(EX - T - 0.055, sy - 0.016, sz + dz); g.add(out);
  }
  const dish = Prim.rbox(0.09, 0.012, 0.07, 0.005, m.ceramic, { segments: 1 });
  dish.position.set(sx, sy + 0.016, sz - 0.15); g.add(dish);
  addStatic(ctx, g, [{ size: [0.14, 0.02, 0.42], center: [sx, sy, sz] }]);
  bottle(ctx, sx, sy + 0.01, sz + 0.13, 0x3a76b8, 0.19, 'shampoo');
  bottle(ctx, sx, sy + 0.01, sz - 0.03, 0xe9dfc8, 0.17, 'conditioner');
  const soap = Prim.rbox(0.075, 0.028, 0.05, 0.012, m.solid(0xf3ead2, { roughness: 0.55 }), { segments: 2 });
  soap.position.set(sx, sy + 0.022 + 0.014, sz - 0.15);
  pickup(ctx, soap, { name: 'bar of soap', mass: 0.15 });
}
