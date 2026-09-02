/**
 * Master bedroom: king bed with a low channel-tufted headboard under the west window, nightstands
 * with lamps / clock / phone / book, a six-drawer walnut dresser with a mirror and perfume, a bench,
 * a reading corner (armchair, side table, floor lamp), a spinning ceiling fan with a light kit,
 * curtains on all three windows, two paintings, a rug, a laundry basket, slippers and a robe.
 *
 * Furniture is built centred at the origin with its FRONT facing +z, then rotated with FACE.
 */
import * as THREE from 'three';
import { Prim, place, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import { addStatic, curtains, floorLamp, lightSwitch, looseBook, mug, pickup, plant, recessedLight, rug, tableLamp, Toggle } from '../Props';
import { FLOOR, CEIL, FACE, cushion, framedPicture, labelQuad, placeStatic, upholsteredBench, wickerBasket } from './MasterSuite.shared';

// wall faces (interior)
const WEST = -7.85, EAST = -1.56, SOUTH = 1.56, FRONT = 5.85;

/** King bed 1.9 x 2.1; head (with the low headboard) at local -z, foot at +z. */
function kingBed(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const w = 1.9, l = 2.1;
  const g = new THREE.Group();
  // platform with a pleated bed skirt to the floor
  const base = Prim.rbox(w, 0.22, l, 0.02, mats.fabric(0x6d675e)); base.position.y = 0.19; g.add(base);
  const skirtMat = mats.fabric(0xe9e4d8);
  const skirtH = 0.29;
  for (const s of [-1, 1]) { const side = Prim.box(0.016, skirtH, l, skirtMat); side.position.set(s * (w / 2 + 0.008), skirtH / 2, 0); g.add(side); }
  const foot = Prim.box(w + 0.032, skirtH, 0.016, skirtMat); foot.position.set(0, skirtH / 2, l / 2 + 0.008); g.add(foot);
  for (const [px, pz] of [[-w / 2, l / 2], [w / 2, l / 2], [-w / 2, 0], [w / 2, 0], [0, l / 2]]) {
    const pleat = Prim.box(px === 0 ? 0.1 : 0.034, skirtH, px === 0 ? 0.034 : 0.1, skirtMat);
    pleat.position.set(px * 1.006, skirtH / 2, pz * 1.006); g.add(pleat);
  }
  // mattress
  const matt = Prim.rbox(w - 0.02, 0.26, l - 0.02, 0.06, mats.fabric(0xf7f4ee)); matt.position.y = 0.43; g.add(matt);
  const tape = Prim.box(w - 0.01, 0.012, l - 0.01, mats.fabric(0xe3ddd2), { cast: false }); tape.position.y = 0.37; g.add(tape);
  // quilted duvet, rolled back at the top with the sheet turned over it
  const duvetCol = 0xc6d0d6;
  const quiltL = l * 0.64;
  const duvet = Prim.rbox(w + 0.14, 0.2, quiltL, 0.06, mats.quilt(duvetCol)); duvet.position.set(0, 0.58, l / 2 - quiltL / 2 + 0.04); g.add(duvet);
  const roll = Prim.cylinder(0.06, 0.06, w + 0.12, mats.quilt(duvetCol), { segments: 14 }); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.64, l / 2 - quiltL + 0.05); g.add(roll);
  const sheet = Prim.rbox(w + 0.1, 0.025, 0.24, 0.01, mats.fabric(0xfbfaf6)); sheet.position.set(0, 0.705, l / 2 - quiltL + 0.14); g.add(sheet);
  // pillows: two euro shams standing against the headboard, two sleeping pillows, a lumbar cushion
  const shamMat = mats.fabric(0xdad3c4), pillowMat = mats.fabric(0xfbfaf6);
  for (const sx of [-1, 1]) {
    const sham = cushion(0.66, 0.5, 0.16, shamMat); sham.position.set(sx * 0.42, 0.78, -l / 2 + 0.2); sham.rotation.x = -0.32; g.add(sham);
    const pil = cushion(0.7, 0.15, 0.44, pillowMat); pil.position.set(sx * 0.42, 0.62, -l / 2 + 0.43); pil.rotation.x = -0.22; pil.rotation.y = sx * 0.04; g.add(pil);
  }
  const lumbar = cushion(0.5, 0.12, 0.3, mats.fabric(0x7e8a6b)); lumbar.position.set(0.05, 0.63, -l / 2 + 0.62); lumbar.rotation.set(-0.35, 0.08, 0); g.add(lumbar);
  // folded blanket across the foot
  const blMat = mats.fabric(0x8a6f5c);
  const bl = Prim.rbox(w * 0.82, 0.07, 0.5, 0.03, blMat); bl.position.set(0.02, 0.715, l / 2 - 0.32); bl.rotation.y = 0.03; g.add(bl);
  const bl2 = Prim.rbox(w * 0.82, 0.035, 0.26, 0.015, blMat); bl2.position.set(0.02, 0.765, l / 2 - 0.26); bl2.rotation.y = 0.03; g.add(bl2);
  const fringe = Prim.box(w * 0.82, 0.02, 0.03, mats.fabric(0xb9a58c), { cast: false }); fringe.position.set(0.02, 0.7, l / 2 - 0.06); g.add(fringe);
  // low upholstered headboard (top just below the window sill) with a walnut frame and channel tufting
  const hbH = 0.78;
  const frame = Prim.rbox(w + 0.22, hbH, 0.05, 0.012, mats.walnut); frame.position.set(0, hbH / 2, -l / 2 - 0.115); g.add(frame);
  const head = Prim.rbox(w + 0.12, hbH - 0.1, 0.09, 0.03, mats.fabric(0x5a6878)); head.position.set(0, hbH / 2 + 0.02, -l / 2 - 0.075); g.add(head);
  for (let i = -3; i <= 3; i++) {
    const groove = Prim.box(0.014, hbH - 0.2, 0.012, mats.fabric(0x46535f), { cast: false });
    groove.position.set(i * 0.27, hbH / 2 + 0.02, -l / 2 - 0.075 + 0.045); g.add(groove);
  }
  placeStatic(ctx, g, x, z, rotY, [
    { size: [w + 0.14, 0.66, l + 0.06], center: [0, 0.33, 0.02] },
    { size: [w + 0.22, hbH, 0.14], center: [0, hbH / 2, -l / 2 - 0.09] },
  ], 'fabric');
}

/** Nightstand: drawer box over an open cubby with magazines, on tapered legs. Top at 0.62. */
function nightstand(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const W = 0.52, H = 0.62, D = 0.44;
  const wood = mats.walnut;
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = Prim.cylinder(0.014, 0.022, 0.23, wood, { segments: 10 });
    leg.position.set(sx * (W / 2 - 0.05), 0.115, sz * (D / 2 - 0.05)); leg.rotation.z = sx * 0.06; leg.rotation.x = -sz * 0.06; g.add(leg);
  }
  const shelf = Prim.box(W, 0.02, D, wood); shelf.position.y = 0.23; g.add(shelf);
  for (const sx of [-1, 1]) { const side = Prim.box(0.02, 0.18, D, wood); side.position.set(sx * (W / 2 - 0.01), 0.33, 0); g.add(side); }
  const back = Prim.box(W - 0.04, 0.18, 0.012, mats.solid(0x4a3626, { roughness: 0.7 }), { cast: false }); back.position.set(0, 0.33, -D / 2 + 0.006); g.add(back);
  const upper = Prim.rbox(W, 0.2, D, 0.008, wood); upper.position.y = H - 0.1 - 0.0125; g.add(upper);
  const top = Prim.rbox(W + 0.03, 0.025, D + 0.02, 0.006, wood); top.position.y = H - 0.0125; g.add(top);
  const drawer = Prim.rbox(W - 0.06, 0.15, 0.014, 0.004, wood); drawer.position.set(0, H - 0.115, D / 2 + 0.006); g.add(drawer);
  const pull = Prim.rbox(0.11, 0.012, 0.012, 0.005, mats.brass); pull.position.set(0, H - 0.115, D / 2 + 0.02); g.add(pull);
  // magazines in the cubby
  const magCols = [0x2f4858, 0xc9a24a, 0xf1eee6];
  magCols.forEach((c, i) => { const m = Prim.rbox(0.3, 0.012, 0.22, 0.003, mats.solid(c, { roughness: 0.6 })); m.position.set(-0.04 + i * 0.01, 0.246 + i * 0.012, 0.02); m.rotation.y = (i - 1) * 0.1; g.add(m); });
  placeStatic(ctx, g, x, z, rotY, [{ size: [W + 0.03, H, D + 0.02], center: [0, H / 2, 0] }]);
}

/** Six-drawer walnut dresser with a mirror above and dressing-table clutter. Front +z, back against the wall at local -D/2 - 0.02. */
function dresser(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const W = 1.5, H = 0.9, D = 0.5;
  const wood = mats.walnut;
  const g = new THREE.Group();
  const plinth = Prim.box(W - 0.08, 0.08, D - 0.06, mats.solid(0x2c211a, { roughness: 0.6 })); plinth.position.set(0, 0.04, -0.02); g.add(plinth);
  const body = Prim.rbox(W, H - 0.11, D, 0.008, wood); body.position.y = 0.08 + (H - 0.11) / 2; g.add(body);
  const top = Prim.rbox(W + 0.04, 0.03, D + 0.03, 0.006, wood); top.position.set(0, H - 0.015, 0.01); g.add(top);
  for (let r = 0; r < 3; r++) for (const sx of [-1, 1]) {
    const f = Prim.rbox(0.68, 0.22, 0.016, 0.004, wood); f.position.set(sx * 0.365, 0.2 + r * 0.255, D / 2 + 0.008); g.add(f);
    const pull = Prim.rbox(0.14, 0.014, 0.014, 0.006, mats.brass); pull.position.set(sx * 0.365, 0.2 + r * 0.255, D / 2 + 0.024); g.add(pull);
  }
  // mirror above (frame back sits on the wall face)
  const mframe = Prim.rbox(1.1, 0.8, 0.03, 0.01, wood); mframe.position.set(0, 1.6, -D / 2 - 0.005); g.add(mframe);
  const glass = Prim.quad(1.02, 0.72, mats.mirror, { cast: false }); glass.position.set(0, 1.6, -D / 2 + 0.011); g.add(glass);
  // dressing-table clutter: jewelry box (lid ajar), necklace, tray of perfume bottles, candle, photo
  const jbW = 0.24, jbD = 0.16;
  const jbox = Prim.rbox(jbW, 0.09, jbD, 0.006, mats.mahogany); jbox.position.set(-0.5, H + 0.045, 0.0); g.add(jbox);
  const lining = Prim.box(jbW - 0.03, 0.01, jbD - 0.03, mats.fabric(0x6b1f2a), { cast: false }); lining.position.set(-0.5, H + 0.088, 0.0); g.add(lining);
  const lid = new THREE.Group();
  const lidM = Prim.rbox(jbW, 0.02, jbD, 0.005, mats.mahogany); lidM.position.set(0, 0.01, jbD / 2); lid.add(lidM);
  lid.position.set(-0.5, H + 0.09, -jbD / 2); lid.rotation.x = -0.9; g.add(lid);
  const clasp = Prim.box(0.02, 0.02, 0.006, mats.brass, { cast: false }); clasp.position.set(-0.5, H + 0.05, jbD / 2 + 0.003); g.add(clasp);
  const necklace = Prim.torus(0.05, 0.003, mats.brass); necklace.position.set(-0.25, H + 0.004, 0.08); necklace.scale.set(1, 1, 0.7); g.add(necklace);
  const tray = Prim.rbox(0.34, 0.014, 0.2, 0.005, mats.solid(0xd9d2c4, { roughness: 0.5, metalness: 0.2 })); tray.position.set(0.35, H + 0.007, 0.03); g.add(tray);
  const perfumes: [number, number, number, number][] = [[0.24, 0.05, 0.06, 0xd9a7b0], [0.34, 0.03, 0.045, 0xb9c6d1], [0.44, 0.04, 0.075, 0xe6c992]];
  for (const [px, pw, ph, pc] of perfumes) {
    const glassM = mats.solid(pc, { roughness: 0.08, physical: true, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 });
    const b = Prim.rbox(pw, ph, pw * 0.7, 0.008, glassM); b.position.set(px, H + 0.014 + ph / 2, 0.02); b.rotation.y = (ctx.rng() - 0.5) * 0.6; g.add(b);
    const cap = Prim.cylinder(pw * 0.25, pw * 0.25, 0.025, pc === 0xb9c6d1 ? mats.plasticBlack : mats.brass, { segments: 10 }); cap.position.set(px, H + 0.014 + ph + 0.0125, 0.02); g.add(cap);
  }
  const candle = Prim.cylinder(0.035, 0.035, 0.08, mats.solid(0xf3ecdc, { roughness: 0.5, physical: true, clearcoat: 0.3 }), { segments: 14 }); candle.position.set(0.08, H + 0.04, 0.1); g.add(candle);
  const wick = Prim.cylinder(0.002, 0.002, 0.012, mats.black, { segments: 6, cast: false }); wick.position.set(0.08, H + 0.086, 0.1); g.add(wick);
  const photo = new THREE.Group();
  const pf = Prim.rbox(0.16, 0.12, 0.012, 0.003, mats.solid(0x3a3a3a, { roughness: 0.5 })); photo.add(pf);
  const pq = labelQuad(ctx, ctx.tex.photo(2), 0.13, 0.095); pq.position.z = 0.007; photo.add(pq);
  photo.position.set(-0.14, H + 0.065, -0.18); photo.rotation.x = -0.18; g.add(photo);
  placeStatic(ctx, g, x, z, rotY, [{ size: [W + 0.04, H, D + 0.03], center: [0, H / 2, 0] }]);
}

/** Reading armchair (front +z). */
function armchair(ctx: Ctx, x: number, z: number, rotY: number, color: number) {
  const mats = ctx.mats;
  const fab = mats.fabric(color);
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = Prim.cylinder(0.02, 0.026, 0.12, mats.walnut, { segments: 8 }); leg.position.set(sx * 0.3, 0.06, sz * 0.28); leg.rotation.z = sx * 0.08; leg.rotation.x = -sz * 0.08; g.add(leg); }
  const base = Prim.rbox(0.76, 0.32, 0.7, 0.04, fab); base.position.set(0, 0.28, 0); g.add(base);
  const seat = cushion(0.56, 0.12, 0.58, fab); seat.position.set(0, 0.5, 0.04); g.add(seat);
  const back = Prim.rbox(0.76, 0.62, 0.17, 0.05, fab); back.position.set(0, 0.71, -0.28); back.rotation.x = -0.14; g.add(back);
  for (const sx of [-1, 1]) { const arm = Prim.rbox(0.11, 0.27, 0.66, 0.035, fab); arm.position.set(sx * 0.325, 0.575, -0.01); g.add(arm); }
  const pillow = cushion(0.36, 0.1, 0.36, mats.fabric(0xc9b79a)); pillow.position.set(-0.08, 0.68, -0.15); pillow.rotation.set(-0.5, 0.15, 0); g.add(pillow);
  const throwB = Prim.rbox(0.16, 0.05, 0.5, 0.02, mats.fabric(0x5f6f86)); throwB.position.set(0.33, 0.735, 0.02); g.add(throwB);
  placeStatic(ctx, g, x, z, rotY, [{ size: [0.78, 1.0, 0.74], center: [0, 0.5, 0] }], 'fabric');
}

/** Small round side table on three splayed legs. Top at 0.55. */
function sideTable(ctx: Ctx, x: number, z: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const wood = mats.walnut;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = Prim.cylinder(0.012, 0.018, 0.54, wood, { segments: 8 });
    leg.position.set(Math.sin(a) * 0.13, 0.27, Math.cos(a) * 0.13);
    leg.rotation.set(Math.cos(a) * 0.16, 0, -Math.sin(a) * 0.16);
    g.add(leg);
  }
  const top = Prim.cylinder(0.23, 0.23, 0.03, wood, { segments: 24 }); top.position.y = 0.535; g.add(top);
  const coaster = Prim.cylinder(0.05, 0.05, 0.006, mats.solid(0x4a3a2a, { roughness: 0.8 }), { segments: 14, cast: false }); coaster.position.set(0.08, 0.553, -0.06); g.add(coaster);
  placeStatic(ctx, g, x, z, 0, [{ size: [0.46, 0.55, 0.46], center: [0, 0.275, 0] }]);
}

/** Digital alarm clock with glowing digits (front +z). */
function alarmClock(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.rbox(0.14, 0.065, 0.065, 0.012, mats.plasticBlack); body.position.y = 0.0325; g.add(body);
  const tex = ctx.tex.label('6:42', { bg: '#120000', fg: '#ff4a30', w: 256, h: 128, font: 'bold 92px "Courier New", monospace' });
  const face = labelQuad(ctx, tex, 0.105, 0.038, { emissive: 0.8 }); face.position.set(0, 0.033, 0.0335); g.add(face);
  const btn = Prim.rbox(0.05, 0.008, 0.02, 0.003, mats.solid(0x555555)); btn.position.set(0, 0.069, -0.01); g.add(btn);
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
}

/** Smartphone lying face-up (pickup). */
function phone(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.rbox(0.074, 0.008, 0.15, 0.004, mats.plasticBlack); body.position.y = 0.004; g.add(body);
  const tex = ctx.tex.label('10:42', { bg: '#0a1020', fg: '#e8eef7', w: 128, h: 256, font: 'bold 40px sans-serif', sub: 'Tue 12 · 3 messages' });
  const screen = labelQuad(ctx, tex, 0.066, 0.138, { emissive: 0.35 }); screen.rotation.x = -Math.PI / 2; screen.position.y = 0.0085; g.add(screen);
  const cam = Prim.rbox(0.016, 0.003, 0.016, 0.002, mats.solid(0x333338, { roughness: 0.3 }), { cast: false }); cam.position.set(-0.024, 0.0005, 0.06); g.add(cam);
  place(g, x, y, z, rotY);
  pickup(ctx, g, { name: 'phone', mass: 0.2, shape: { type: 'box', size: new THREE.Vector3(0.074, 0.01, 0.15) }, offset: new THREE.Vector3(0, 0.005, 0) });
}

/** Pair of slippers on the floor (toes +z). */
function slippers(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const sole = Prim.rbox(0.1, 0.02, 0.27, 0.01, mats.fabric(0x6b5a4c)); sole.position.set(s * 0.075, 0.01, 0); sole.rotation.y = -s * 0.08; g.add(sole);
    const vamp = Prim.rbox(0.1, 0.055, 0.12, 0.03, mats.fabric(0xa08974)); vamp.position.set(s * 0.075, 0.04, 0.06); vamp.rotation.y = -s * 0.08; g.add(vamp);
    const fleece = Prim.box(0.08, 0.01, 0.12, mats.fabric(0xf2ece0), { cast: false }); fleece.position.set(s * 0.075, 0.025, -0.06); fleece.rotation.y = -s * 0.08; g.add(fleece);
  }
  placeStatic(ctx, g, x, z, rotY);
}

/** Robe hanging from a brass hook on the wall (front +z = out of the wall). */
function robeOnHook(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const plate = Prim.rbox(0.06, 0.08, 0.012, 0.004, mats.walnut); plate.position.z = 0.006; g.add(plate);
  const hook = Prim.torus(0.02, 0.006, mats.brass, { arc: Math.PI }); hook.rotation.set(0, Math.PI / 2, 0); hook.position.set(0, 0.0, 0.03); g.add(hook);
  const robeM = mats.fabric(0x7f8fa6);
  const robe = Prim.rbox(0.32, 0.95, 0.07, 0.03, robeM); robe.position.set(0.02, -0.5, 0.06); robe.rotation.z = 0.04; g.add(robe);
  const collar = Prim.rbox(0.2, 0.12, 0.08, 0.02, mats.fabric(0x6a7a90)); collar.position.set(0.02, -0.06, 0.065); g.add(collar);
  const belt = Prim.rbox(0.3, 0.035, 0.08, 0.012, mats.fabric(0x6a7a90)); belt.position.set(0.02, -0.52, 0.06); belt.rotation.z = 0.04; g.add(belt);
  const tail = Prim.rbox(0.035, 0.32, 0.03, 0.01, mats.fabric(0x6a7a90)); tail.position.set(0.1, -0.68, 0.09); tail.rotation.z = 0.12; g.add(tail);
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
}

/** Laundry basket with the lid ajar and clothes peeking out. */
function laundryBasket(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = wickerBasket(ctx, 0.23, 0.5, 0xb99a6b, { lid: true, lidAjar: 0.55 });
  const c1 = Prim.rbox(0.28, 0.06, 0.22, 0.025, mats.fabric(0x8fb3c9)); c1.position.set(0.02, 0.5, 0.04); c1.rotation.set(0.15, 0.4, 0.1); g.add(c1);
  const c2 = Prim.rbox(0.2, 0.05, 0.16, 0.02, mats.fabric(0xf2f2ec)); c2.position.set(-0.05, 0.53, -0.05); c2.rotation.set(-0.1, -0.3, 0.2); g.add(c2);
  const sock = Prim.rbox(0.08, 0.04, 0.2, 0.018, mats.fabric(0x3b3f4a)); sock.position.set(0.12, 0.47, 0.12); sock.rotation.set(0.3, 0.7, 0.6); g.add(sock);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [], { surface: 'fabric' });
  ctx.physics.addCylinder({ x, y: FLOOR + 0.3, z }, 0.25, 0.6, { meta: { surface: 'fabric' } });
}

/** Ceiling fan with four walnut blades and a light kit. The blades spin (Toggle) and the light joins group `master`. */
function ceilingFan(ctx: Ctx, x: number, z: number) {
  const mats = ctx.mats;
  const y = CEIL;
  const st = new THREE.Group();
  const canopy = Prim.cylinder(0.08, 0.1, 0.05, mats.darkMetal, { segments: 20 }); canopy.position.y = -0.025; st.add(canopy);
  const rod = Prim.cylinder(0.012, 0.012, 0.22, mats.darkMetal, { segments: 8 }); rod.position.y = -0.16; st.add(rod);
  const motor = Prim.cylinder(0.11, 0.1, 0.12, mats.darkMetal, { segments: 24 }); motor.position.y = -0.33; st.add(motor);
  const collar = Prim.cylinder(0.075, 0.075, 0.02, mats.brass, { segments: 20 }); collar.position.y = -0.4; st.add(collar);
  const chain = Prim.cylinder(0.003, 0.003, 0.3, mats.brass, { segments: 6, cast: false }); chain.position.set(0.05, -0.62, 0.05); st.add(chain);
  const knob = Prim.sphere(0.012, mats.walnut, { segments: 8 }); knob.position.set(0.05, -0.78, 0.05); st.add(knob);
  st.position.set(x, y, z);
  addStatic(ctx, st);
  // blades (dynamic, rotate about the hub)
  const bg = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const holder = new THREE.Group();
    const arm = Prim.box(0.18, 0.012, 0.045, mats.darkMetal); arm.position.set(0.17, 0, 0); holder.add(arm);
    const blade = Prim.rbox(0.52, 0.008, 0.14, 0.004, mats.walnut); blade.position.set(0.5, -0.004, 0); blade.rotation.x = 0.2; holder.add(blade);
    holder.rotation.y = i * Math.PI / 2;
    bg.add(holder);
  }
  const blades = mergeByMaterial(bg);
  blades.position.set(x, y - 0.37, z);
  ctx.dynamic.add(blades);
  // light kit: a frosted bowl under the motor
  const bulbs = { on: mats.emissive(0xffe6c4, 0.85, 0xfff7ea), off: mats.glassFrosted };
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bulbs.on);
  bowl.position.set(x, y - 0.41, z); bowl.castShadow = false; bowl.renderOrder = 4;
  ctx.dynamic.add(bowl);
  ctx.lights.point(x, y - 0.56, z, { group: 'master', intensity: 11, distance: 8.5, color: 0xffe8cc, shadow: true, emissives: [{ mesh: bowl, on: bulbs.on, off: bulbs.off }] });
  // spin
  const hub = new THREE.Vector3(x, y - 0.37, z);
  let speed = 0, target = 0;
  const toggle = new Toggle(blades, { on: 'Turn off ceiling fan', off: 'Turn on ceiling fan' }, (on) => {
    target = on ? 7 : 0;
    ctx.audio.play('switch', hub);
    if (on) ctx.audio.startLoop('masterFan', 'hum', hub, 0.05); else ctx.audio.stopLoop('masterFan');
  }, hub);
  toggle.radius = 3.4;
  ctx.interact.add(toggle);
  ctx.onUpdate((dt) => {
    speed += (target - speed) * (1 - Math.exp(-dt * (target > speed ? 0.9 : 0.45)));
    if (speed > 0.002) blades.rotation.y = (blades.rotation.y + speed * dt) % (Math.PI * 2);
  });
}

export function buildMasterBedroom(ctx: Ctx) {
  const y = FLOOR;

  // ---- lighting ------------------------------------------------------------------------------
  ceilingFan(ctx, -4.7, 3.75);
  recessedLight(ctx, -2.7, CEIL, 5.0, 'master');
  recessedLight(ctx, -4.9, CEIL, 2.3, 'master');
  lightSwitch(ctx, EAST, y + 1.2, 4.68, FACE.negX, 'master', 'bedroom lights'); // latch side of the hall door, inside

  // ---- bed wall (west, under the window) --------------------------------------------------------
  // headboard back at x=-7.65 leaves room for the floor-length curtains behind it
  kingBed(ctx, -6.46, 3.75, FACE.posX);
  nightstand(ctx, -7.38, 2.48, FACE.posX);
  nightstand(ctx, -7.38, 5.02, FACE.posX);
  tableLamp(ctx, -7.44, y + 0.62, 2.36, { group: 'master-lamps', label: 'bedside lamp', color: 0x4f5e6b, shadeColor: 0xf1e7d2, height: 0.52 });
  tableLamp(ctx, -7.44, y + 0.62, 5.14, { group: 'master-lamps', label: 'bedside lamp', color: 0x4f5e6b, shadeColor: 0xf1e7d2, height: 0.52 });
  looseBook(ctx, -7.26, y + 0.62, 2.63, Math.PI / 2 + 0.15, 0x3b5a7a, 'novel');
  phone(ctx, -7.2, y + 0.62, 2.3, Math.PI / 2 - 0.2);
  alarmClock(ctx, -7.24, y + 0.62, 4.9, Math.PI / 2 + 0.1);
  slippers(ctx, -6.9, 4.98, FACE.posZ + 0.3);
  upholsteredBench(ctx, -5.13, 3.75, FACE.posX, 1.3, 0x9aa3ad, { throwColor: 0xb89b7c });
  rug(ctx, -6.15, y, 3.75, 2.9, 3.3, 'neutral', 0);

  // ---- south wall: dresser + mirror between the bath and closet doors ---------------------------
  dresser(ctx, -4.875, SOUTH + 0.02 + 0.25, FACE.posZ);

  // ---- reading corner (front-east) ----------------------------------------------------------------
  armchair(ctx, -2.45, 5.02, -Math.PI * 0.75, 0x7d6f63);
  sideTable(ctx, -3.2, 5.26);
  mug(ctx, -3.12, y + 0.55, 5.2, 0x3d5a6c, 'mug');
  looseBook(ctx, -3.3, y + 0.55, 5.34, 0.4, 0x8b2f2f, 'paperback');
  floorLamp(ctx, -1.92, y, 5.52, { group: 'master-lamps', label: 'reading lamp' });
  plant(ctx, -5.7, y, 5.5, 1.15, { potColor: 0xd9d0c0 });

  // ---- windows, art, wall things -------------------------------------------------------------------
  curtains(ctx, -6, y, FRONT, FACE.negZ, 1.5, 2.3, 0xb8b0a4);
  curtains(ctx, -3.5, y, FRONT, FACE.negZ, 1.5, 2.3, 0xb8b0a4);
  curtains(ctx, WEST, y, 3.75, FACE.posX, 1.4, 2.3, 0xb8b0a4);
  framedPicture(ctx, -4.75, y + 1.62, FRONT, FACE.negZ, 0.6, 0.78, ctx.tex.art(6, 0.77), { frame: 0x3b2a1e, frameW: 0.04 });
  framedPicture(ctx, EAST, y + 1.55, 2.35, FACE.negX, 0.9, 0.6, ctx.tex.art(7, 1.5), { frame: 0x2a2018, frameW: 0.045 });
  robeOnHook(ctx, EAST, y + 1.78, 3.05, FACE.negX);
  laundryBasket(ctx, -2.0, 1.95, 0.4);
}
