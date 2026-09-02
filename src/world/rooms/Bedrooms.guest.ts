/**
 * Guest bedroom (bedroom3): queen bed with an upholstered headboard, nightstands with lamps,
 * armoire with hinged doors, dresser + mirror, luggage rack, reading chair, rug, curtains, art.
 */
import * as THREE from 'three';
import { Prim, place, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import { addStatic, ceilingDome, curtains, hinged, lightSwitch, looseBook, pictureFrame, plant, recessedLight, rug, tableLamp } from '../Props';
import { FLOOR, CEIL, FACE, cushion, foldedStack, hangingGarment, placeStatic } from './Bedrooms.shared';

/** Queen bed; head (with headboard) at local -z, foot at +z. */
function queenBed(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const w = 1.6, l = 2.05;
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = Prim.rbox(0.06, 0.12, 0.06, 0.008, mats.walnut); leg.position.set(sx * (w / 2 - 0.06), 0.06, sz * (l / 2 - 0.08)); g.add(leg); }
  const base = Prim.rbox(w, 0.22, l, 0.02, mats.fabric(0x8a8378)); base.position.y = 0.23; g.add(base);
  const matt = Prim.rbox(w - 0.04, 0.22, l - 0.04, 0.05, mats.fabric(0xf4f1ea)); matt.position.y = 0.45; g.add(matt);
  const quiltL = l * 0.68;
  const quilt = Prim.rbox(w + 0.1, 0.3, quiltL, 0.05, mats.quilt(0xd8cdbb)); quilt.position.set(0, 0.45, l / 2 - quiltL / 2 + 0.02); g.add(quilt);
  const fold = Prim.rbox(w + 0.06, 0.035, 0.18, 0.012, mats.fabric(0xfbf8f0)); fold.position.set(0, 0.615, l / 2 - quiltL + 0.09); g.add(fold);
  const pillowMat = mats.fabric(0xfbf8f0), accentMat = mats.fabric(0xb7a17f);
  for (const sx of [-1, 1]) {
    const back = cushion(0.68, 0.17, 0.42, pillowMat); back.position.set(sx * 0.38, 0.69, -l / 2 + 0.18); back.rotation.x = -0.55; g.add(back);
    const front = cushion(0.6, 0.14, 0.4, sx < 0 ? pillowMat : accentMat); front.position.set(sx * 0.36, 0.63, -l / 2 + 0.4); front.rotation.x = -0.2; front.rotation.y = sx * 0.05; g.add(front);
  }
  const throwB = Prim.rbox(w * 0.78, 0.055, 0.5, 0.025, mats.fabric(0x5f6f86)); throwB.position.set(0.03, 0.628, l / 2 - 0.36); throwB.rotation.y = 0.04; g.add(throwB);
  const throwFold = Prim.rbox(w * 0.78, 0.03, 0.22, 0.012, mats.fabric(0x5f6f86)); throwFold.position.set(0.03, 0.668, l / 2 - 0.3); throwFold.rotation.y = 0.04; g.add(throwFold);
  // upholstered headboard with a walnut frame and tufting buttons
  const frame = Prim.rbox(w + 0.22, 1.22, 0.05, 0.012, mats.walnut); frame.position.set(0, 0.86, -l / 2 - 0.09); g.add(frame);
  const head = Prim.rbox(w + 0.14, 1.12, 0.1, 0.035, mats.fabric(0x8f9aa8)); head.position.set(0, 0.86, -l / 2 - 0.06); g.add(head);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    const b = Prim.sphere(0.011, mats.brass, { segments: 7 });
    b.position.set(-0.6 + c * 0.3 + (r % 2) * 0.15, 0.62 + r * 0.24, -l / 2 - 0.06 + 0.052);
    g.add(b);
  }
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [
    { size: [w + 0.1, 0.62, l + 0.06], center: [0, 0.31, 0] },
    { size: [w + 0.22, 1.5, 0.14], center: [0, 0.75, -l / 2 - 0.075] },
  ], { surface: 'fabric' });
}

function nightstand(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const W = 0.5, H = 0.6, D = 0.45;
  const wood = mats.walnut;
  const g = new THREE.Group();
  const body = Prim.rbox(W, 0.4, D, 0.008, wood); body.position.y = H - 0.2; g.add(body);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = Prim.cylinder(0.014, 0.022, 0.2, wood, { segments: 10 }); leg.position.set(sx * (W / 2 - 0.05), 0.1, sz * (D / 2 - 0.05)); g.add(leg); }
  const drawer = Prim.rbox(W - 0.08, 0.15, 0.015, 0.004, wood); drawer.position.set(0, H - 0.12, D / 2 + 0.006); g.add(drawer);
  const drawer2 = Prim.rbox(W - 0.08, 0.15, 0.015, 0.004, wood); drawer2.position.set(0, H - 0.29, D / 2 + 0.006); g.add(drawer2);
  for (const yy of [H - 0.12, H - 0.29]) { const pull = Prim.rbox(0.1, 0.012, 0.012, 0.005, mats.brass); pull.position.set(0, yy, D / 2 + 0.02); g.add(pull); }
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [W, H, D], center: [0, H / 2, 0] }]);
}

/** Armoire: static carcass + interior, two hinged doors (dynamic). Front +z. */
function armoire(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const W = 1.1, H = 2.0, D = 0.6, t = 0.025;
  const wood = mats.walnut;
  const g = new THREE.Group();
  const panel = (w: number, h: number, d: number, px: number, py: number, pz: number, m: THREE.Material = wood) => { const b = Prim.box(w, h, d, m); b.position.set(px, py, pz); g.add(b); return b; };
  panel(t, H - 0.1, D, -W / 2 + t / 2, (H - 0.1) / 2 + 0.06, 0); panel(t, H - 0.1, D, W / 2 - t / 2, (H - 0.1) / 2 + 0.06, 0);
  panel(W, t, D, 0, H - 0.04 - t / 2, 0); panel(W - 2 * t, t, D, 0, 0.06 + t / 2, 0);
  panel(W - 2 * t, H - 0.1, 0.012, 0, (H - 0.1) / 2 + 0.06, -D / 2 + 0.006, mats.solid(0x4a3626, { roughness: 0.7 }));
  panel(W - 0.06, 0.06, D - 0.06, 0, 0.03, -0.03); // plinth
  const cornice = Prim.rbox(W + 0.06, 0.06, D + 0.04, 0.012, wood); cornice.position.set(0, H - 0.03, 0.01); g.add(cornice);
  panel(W - 2 * t, t, D - 0.03, 0, 0.55, 0); // mid shelf
  // interior: rod + garments, folded stacks on the shelf
  const rod = Prim.cylinder(0.012, 0.012, W - 0.08, mats.chrome, { segments: 10 }); rod.rotation.z = Math.PI / 2; rod.position.set(0, H - 0.25, 0.02); g.add(rod);
  const garmentCols = [0x2c3e50, 0xb56576, 0xf1f1ec, 0x6d8b74, 0x8c6a4a, 0x355070];
  garmentCols.forEach((c, i) => {
    const gm = hangingGarment(ctx, c, i === 3 ? 'coat' : i === 1 ? 'dress' : 'shirt');
    gm.position.set(-0.36 + i * 0.145, H - 0.25 + 0.012, 0.02);
    gm.rotation.y = Math.PI / 2 + (ctx.rng() - 0.5) * 0.15;
    g.add(gm);
  });
  const stackA = foldedStack(ctx, [0xe8e2d4, 0x9db4c0, 0xc9ad8f], 0.32, 0.3); stackA.position.set(-0.25, 0.5625, 0.02); g.add(stackA);
  const stackB = foldedStack(ctx, [0x556270, 0xf5f0e6], 0.32, 0.3); stackB.position.set(0.15, 0.5625, 0.02); g.add(stackB);
  const hatbox = Prim.cylinder(0.14, 0.14, 0.14, mats.solid(0xc7b8a4, { roughness: 0.8 }), { segments: 18 }); hatbox.position.set(0.3, 0.16, 0.05); g.add(hatbox);
  const shoes = new THREE.Group();
  for (const sx of [-1, 1]) { const s = Prim.rbox(0.09, 0.07, 0.26, 0.025, mats.leather(0x3b2a20)); s.position.set(sx * 0.06, 0.035, 0); shoes.add(s); }
  shoes.position.set(-0.2, 0.0725, 0.08); g.add(shoes);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [W + 0.06, H, D + 0.04], center: [0, H / 2, 0] }]);
  // doors
  const doors = new THREE.Group();
  place(doors, x, FLOOR, z, rotY);
  ctx.dynamic.add(doors);
  const doorW = W / 2 - 0.035, doorH = H - 0.2;
  const makeDoor = (sign: number) => {
    hinged(ctx, doors, new THREE.Vector3(sign * (W / 2 - 0.03), 0, D / 2 + 0.005), (pivot) => {
      const leaf = new THREE.Group();
      const slab = Prim.rbox(doorW, doorH, 0.025, 0.006, wood); slab.position.set(-sign * doorW / 2, 0.1 + doorH / 2, 0.0125); leaf.add(slab);
      const raised = Prim.rbox(doorW - 0.12, doorH - 0.24, 0.012, 0.004, mats.mahogany); raised.position.set(-sign * doorW / 2, 0.1 + doorH / 2, 0.03); leaf.add(raised);
      const inner = Prim.box(doorW - 0.2, doorH - 0.32, 0.006, wood); inner.position.set(-sign * doorW / 2, 0.1 + doorH / 2, 0.037); leaf.add(inner);
      const knob = Prim.sphere(0.018, mats.brass, { segments: 10 }); knob.position.set(-sign * (doorW - 0.07), 1.05, 0.05); leaf.add(knob);
      const stem = Prim.cylinder(0.006, 0.006, 0.03, mats.brass, { segments: 6 }); stem.rotation.x = Math.PI / 2; stem.position.set(-sign * (doorW - 0.07), 1.05, 0.03); leaf.add(stem);
      pivot.add(mergeByMaterial(leaf));
    }, sign < 0 ? 'left armoire door' : 'right armoire door', { maxAngle: sign * Math.PI * 0.55, sfx: 'doorOpen' });
  };
  makeDoor(-1); makeDoor(1);
}

function dresserWithMirror(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const W = 1.0, H = 0.85, D = 0.5;
  const wood = mats.walnut;
  const g = new THREE.Group();
  const body = Prim.rbox(W, H - 0.06, D, 0.008, wood); body.position.y = (H - 0.06) / 2 + 0.06; g.add(body);
  const plinth = Prim.box(W - 0.06, 0.06, D - 0.06, wood); plinth.position.set(0, 0.03, -0.02); g.add(plinth);
  const top = Prim.rbox(W + 0.03, 0.025, D + 0.02, 0.006, wood); top.position.y = H - 0.0125; g.add(top);
  for (let r = 0; r < 3; r++) for (const sx of [-1, 1]) {
    const f = Prim.rbox(W / 2 - 0.06, 0.2, 0.015, 0.004, wood); f.position.set(sx * (W / 4 - 0.005), 0.18 + r * 0.24, D / 2 + 0.006); g.add(f);
    const pull = Prim.rbox(0.12, 0.012, 0.012, 0.005, mats.brass); pull.position.set(sx * (W / 4 - 0.005), 0.18 + r * 0.24, D / 2 + 0.02); g.add(pull);
  }
  // mirror
  const mframe = Prim.rbox(0.72, 0.92, 0.03, 0.01, wood); mframe.position.set(0, 1.55, -D / 2 - 0.005); g.add(mframe);
  const glass = Prim.quad(0.64, 0.84, mats.mirror, { cast: false }); glass.position.set(0, 1.55, -D / 2 + 0.011); g.add(glass);
  // top clutter: tray, perfume bottle, small plant
  const tray = Prim.rbox(0.26, 0.012, 0.18, 0.004, mats.solid(0xcfc4b0, { roughness: 0.6 })); tray.position.set(-0.28, H + 0.006, 0.02); g.add(tray);
  const bottle = Prim.cylinder(0.025, 0.025, 0.09, mats.solid(0xd9a7b0, { roughness: 0.15, physical: true, clearcoat: 0.9 }), { segments: 12 }); bottle.position.set(-0.32, H + 0.057, 0.02); g.add(bottle);
  const cap = Prim.cylinder(0.014, 0.014, 0.03, mats.brass, { segments: 10 }); cap.position.set(-0.32, H + 0.117, 0.02); g.add(cap);
  const jar = Prim.lathe([[0, 0], [0.035, 0], [0.04, 0.05], [0.03, 0.07], [0.032, 0.08], [0, 0.08]], mats.ceramic, { segments: 18 }); jar.position.set(-0.2, H + 0.012, 0.0); g.add(jar);
  const bookStack = new THREE.Group();
  for (let i = 0; i < 3; i++) { const b = Prim.rbox(0.17 - i * 0.01, 0.03, 0.23 - i * 0.02, 0.004, mats.solid([0x5b3a29, 0x2f4858, 0x9c6644][i], { roughness: 0.6 })); b.position.y = 0.015 + i * 0.03; b.rotation.y = (i - 1) * 0.12; bookStack.add(b); }
  bookStack.position.set(0.3, H, 0.03); g.add(bookStack);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [W + 0.03, H, D + 0.02], center: [0, H / 2, 0] }]);
}

function armchair(ctx: Ctx, x: number, z: number, rotY: number, color: number) {
  const mats = ctx.mats;
  const fab = mats.fabric(color);
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = Prim.cylinder(0.02, 0.025, 0.1, mats.walnut, { segments: 8 }); leg.position.set(sx * 0.3, 0.05, sz * 0.28); g.add(leg); }
  const base = Prim.rbox(0.74, 0.34, 0.7, 0.04, fab); base.position.set(0, 0.27, 0); g.add(base);
  const seat = cushion(0.56, 0.11, 0.58, mats.fabric(color)); seat.position.set(0, 0.49, 0.04); g.add(seat);
  const back = Prim.rbox(0.74, 0.6, 0.17, 0.05, fab); back.position.set(0, 0.7, -0.28); back.rotation.x = -0.14; g.add(back);
  for (const sx of [-1, 1]) { const arm = Prim.rbox(0.11, 0.26, 0.66, 0.035, fab); arm.position.set(sx * 0.315, 0.57, -0.01); g.add(arm); }
  const pillow = cushion(0.36, 0.1, 0.36, mats.fabric(0xd9c6a5)); pillow.position.set(-0.1, 0.65, -0.14); pillow.rotation.set(-0.5, 0.15, 0); g.add(pillow);
  const throwB = Prim.rbox(0.14, 0.05, 0.5, 0.02, mats.fabric(0x8c6b52)); throwB.position.set(0.32, 0.73, 0.02); g.add(throwB);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [0.76, 1.0, 0.74], center: [0, 0.5, 0] }], { surface: 'fabric' });
}

function luggageRack(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const wood = mats.walnut;
  for (const sx of [-1, 1]) for (const s of [-1, 1]) {
    const rod = Prim.cylinder(0.014, 0.014, 0.66, wood, { segments: 8 });
    rod.rotation.x = s * 0.62;
    rod.position.set(sx * 0.27, 0.27, 0);
    g.add(rod);
  }
  for (const zz of [-0.18, 0, 0.18]) { const strap = Prim.rbox(0.62, 0.01, 0.05, 0.004, mats.leather(0x2e2018)); strap.position.set(0, 0.54, zz); g.add(strap); }
  const bar = Prim.cylinder(0.01, 0.01, 0.6, wood, { segments: 8 }); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.53, 0.25); g.add(bar);
  const bar2 = bar.clone(); bar2.position.z = -0.25; g.add(bar2);
  // suitcase
  const shell = mats.solid(0x2b3a55, { roughness: 0.35, physical: true, clearcoat: 0.5 });
  const sc = Prim.rbox(0.56, 0.2, 0.4, 0.025, shell); sc.position.set(0, 0.65, 0); g.add(sc);
  const lid = Prim.rbox(0.56, 0.02, 0.4, 0.008, mats.solid(0x1f2a3e, { roughness: 0.4 })); lid.position.set(0, 0.76, 0); g.add(lid);
  const handle = Prim.rbox(0.14, 0.02, 0.03, 0.008, mats.plasticBlack); handle.position.set(0.3, 0.65, 0); g.add(handle);
  for (const zz of [-0.12, 0.12]) { const band = Prim.box(0.565, 0.21, 0.02, mats.plasticBlack); band.position.set(0, 0.65, zz); g.add(band); }
  for (const sx of [-1, 1]) { const wheel = Prim.cylinder(0.022, 0.022, 0.02, mats.plasticBlack, { segments: 10 }); wheel.rotation.z = Math.PI / 2; wheel.position.set(sx * 0.24, 0.57, 0.19); g.add(wheel); }
  const tag = Prim.rbox(0.05, 0.03, 0.004, 0.003, mats.leather(0x9c6644)); tag.position.set(0.31, 0.6, 0.12); tag.rotation.x = 0.3; g.add(tag);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [0.64, 0.78, 0.46], center: [0, 0.39, 0] }]);
}

function sideTable(ctx: Ctx, x: number, z: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const base = Prim.cylinder(0.16, 0.18, 0.02, mats.darkMetal, { segments: 20 }); base.position.y = 0.01; g.add(base);
  const stem = Prim.cylinder(0.02, 0.02, 0.5, mats.darkMetal, { segments: 10 }); stem.position.y = 0.27; g.add(stem);
  const top = Prim.cylinder(0.23, 0.23, 0.03, mats.walnut, { segments: 24 }); top.position.y = 0.535; g.add(top);
  const book = Prim.rbox(0.15, 0.03, 0.21, 0.004, mats.solid(0x6b4f3a, { roughness: 0.6 })); book.position.set(-0.03, 0.565, 0.02); book.rotation.y = 0.4; g.add(book);
  const coaster = Prim.cylinder(0.05, 0.05, 0.006, mats.solid(0x4a3a2a, { roughness: 0.8 }), { segments: 14 }); coaster.position.set(0.1, 0.553, -0.06); g.add(coaster);
  place(g, x, FLOOR, z, 0);
  addStatic(ctx, g, [{ size: [0.46, 0.55, 0.46], center: [0, 0.275, 0] }]);
}

function alarmClock(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.rbox(0.13, 0.06, 0.06, 0.012, mats.plasticBlack); body.position.y = 0.03; g.add(body);
  const tex = ctx.tex.label('7:15', { bg: '#140000', fg: '#ff3b28', w: 256, h: 128, font: 'bold 92px "Courier New", monospace' });
  const face = Prim.quad(0.1, 0.035, mats.image(tex, { emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.3 }), { keepUV: true, cast: false });
  face.position.set(0, 0.03, 0.031); g.add(face);
  const btn = Prim.rbox(0.05, 0.008, 0.02, 0.003, mats.solid(0x555555)); btn.position.set(0, 0.064, -0.01); g.add(btn);
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
}

function carafeAndGlass(ctx: Ctx, x: number, y: number, z: number) {
  const mats = ctx.mats;
  const carafe = Prim.lathe([[0, 0], [0.045, 0], [0.05, 0.03], [0.046, 0.1], [0.022, 0.16], [0.024, 0.2], [0.032, 0.215]], mats.glassClear, { segments: 20 });
  carafe.position.set(x, y, z);
  carafe.renderOrder = 5;
  ctx.dynamic.add(carafe);
  const water = Prim.lathe([[0, 0.004], [0.042, 0.004], [0.046, 0.03], [0.043, 0.09], [0, 0.09]], mats.water, { segments: 20 });
  water.position.set(x, y, z);
  ctx.dynamic.add(water);
  const glass = Prim.cylinder(0.032, 0.027, 0.085, mats.glassClear, { segments: 16 });
  glass.position.set(x + 0.1, y + 0.0425, z + 0.03);
  glass.renderOrder = 5;
  ctx.dynamic.add(glass);
}

export function buildGuestRoom(ctx: Ctx) {
  const mats = ctx.mats;
  const y = FLOOR;
  const W = 1.56, E = 7.85, S = 1.56, FRONT = 5.85;

  // ---- lighting ------------------------------------------------------------------------------
  ceilingDome(ctx, 4.75, CEIL, 3.75, 'bedroom3');
  recessedLight(ctx, 7.0, CEIL, 5.0, 'bedroom3');
  lightSwitch(ctx, W, y + 1.2, 3.38, FACE.posX, 'bedroom3', 'bedroom lights');

  // ---- bed wall -------------------------------------------------------------------------------
  queenBed(ctx, 5.0, S + 0.02 + 0.1 + 1.025, FACE.posZ);
  nightstand(ctx, 3.8, S + 0.02 + 0.225, FACE.posZ);
  nightstand(ctx, 6.2, S + 0.02 + 0.225, FACE.posZ);
  tableLamp(ctx, 3.8, y + 0.6, S + 0.16, { group: 'bedroom3-lamps', label: 'bedside lamp', color: 0x6b7a8f, shadeColor: 0xf3e9d2, height: 0.5 });
  tableLamp(ctx, 6.2, y + 0.6, S + 0.16, { group: 'bedroom3-lamps', label: 'bedside lamp', color: 0x6b7a8f, shadeColor: 0xf3e9d2, height: 0.5 });
  looseBook(ctx, 3.86, y + 0.6, S + 0.39, Math.PI / 2 + 0.1, 0x8b2f2f, 'novel');
  alarmClock(ctx, 3.63, y + 0.6, S + 0.39, 0.3);
  carafeAndGlass(ctx, 6.12, y + 0.6, S + 0.39);
  pictureFrame(ctx, 5.0, y + 2.05, S, FACE.posZ, 1.0, 0.66, ctx.tex.art(3, 1.5), { frameColor: 0x3b2a1e, frameW: 0.045 });

  // ---- west wall: armoire, painting, dresser + mirror -------------------------------------------
  armoire(ctx, W + 0.02 + 0.32, 2.25, FACE.posX);
  pictureFrame(ctx, W, y + 1.55, 3.05, FACE.posX, 0.5, 0.65, ctx.tex.art(4, 0.77), { frameColor: 0xd8d0c0, frameW: 0.035 });
  dresserWithMirror(ctx, W + 0.02 + 0.28, 5.25, FACE.posX); // +0.28: the mirror frame sits 0.27 behind the body centre

  // ---- east / front corner: reading chair, side table, plant, luggage rack --------------------
  armchair(ctx, 7.05, 5.05, -Math.PI * 0.72, 0x7c8b6f);
  sideTable(ctx, 7.35, 4.15);
  plant(ctx, 6.05, y, 5.4, 1.3, { potColor: 0xe8e0d0 });
  luggageRack(ctx, E - 0.02 - 0.24, 2.2, FACE.negX);

  // ---- soft goods -------------------------------------------------------------------------------
  rug(ctx, 5.0, y, 4.2, 2.6, 1.7, 'neutral', 0);
  curtains(ctx, 4.75, y, FRONT, FACE.negZ, 1.5, 2.3, 0xc8b8a2);
  curtains(ctx, E, y, 3.75, FACE.negX, 1.4, 2.3, 0xc8b8a2);

  // luggage-rack corner: a little wall hook rail with a robe
  {
    const g = new THREE.Group();
    const rail = Prim.rbox(0.4, 0.05, 0.02, 0.006, mats.walnut); rail.position.z = 0.01; g.add(rail);
    for (const sx of [-0.12, 0.12]) { const hook = Prim.sphere(0.014, mats.brass, { segments: 8 }); hook.position.set(sx, -0.01, 0.04); g.add(hook); }
    const robe = Prim.rbox(0.3, 0.9, 0.06, 0.03, mats.fabric(0xf1efe8)); robe.position.set(0.12, -0.5, 0.05); g.add(robe);
    const belt = Prim.rbox(0.28, 0.03, 0.07, 0.01, mats.fabric(0xe4dfd2)); belt.position.set(0.12, -0.55, 0.05); g.add(belt);
    place(g, E, y + 1.75, 1.8, FACE.negX);
    addStatic(ctx, g);
  }
}
