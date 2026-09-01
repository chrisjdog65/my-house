/**
 * DiningRoom.furniture — builders for the dining room's larger pieces: the table, chairs,
 * place settings, the chandelier, the sideboard, the china cabinet (hinged glass doors) and
 * the bar cart. Everything static goes through addStatic (batched); glassware is collected
 * into one shared transparent mesh by the caller.
 */
import * as THREE from 'three';
import { Prim, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import { addStatic, bulbMaterials, hinged } from '../Props';

/** A lathe wine glass (profile in metres, bottom of the foot at y=0). */
export function wineGlass(ctx: Ctx): THREE.Mesh {
  return Prim.lathe([[0, 0], [0.032, 0], [0.032, 0.003], [0.02, 0.006], [0.005, 0.012], [0.004, 0.075], [0.012, 0.085], [0.03, 0.1], [0.034, 0.13], [0.03, 0.165], [0.026, 0.18]], ctx.mats.glassClear, { segments: 18, cast: false });
}

/** Short tumbler / rocks glass. */
export function tumbler(ctx: Ctx): THREE.Mesh {
  return Prim.lathe([[0, 0], [0.03, 0], [0.032, 0.01], [0.036, 0.085], [0.034, 0.085], [0.03, 0.012], [0, 0.012]], ctx.mats.glassClear, { segments: 16, cast: false });
}

/** Dinner plate (lathe dish), bottom at y=0. */
export function dinnerPlate(ctx: Ctx, r = 0.135): THREE.Mesh {
  const s = r / 0.135;
  return Prim.lathe([[0, 0], [0.09 * s, 0], [0.1 * s, 0.004], [0.125 * s, 0.008], [0.135 * s, 0.018], [0.132 * s, 0.021], [0.12 * s, 0.013], [0.095 * s, 0.01], [0, 0.009]], ctx.mats.ceramic, { segments: 28 });
}

// -------------------------------------------------------------------------------------------
// Table & chairs
// -------------------------------------------------------------------------------------------

/** Long dining table (2.1 x 1.0, top at 0.75 above the group origin). */
export function buildTable(ctx: Ctx, x: number, y: number, z: number) {
  const mats = ctx.mats;
  const wood = mats.mahogany;
  const g = new THREE.Group();
  const top = Prim.rbox(2.1, 0.04, 1.0, 0.012, wood);
  top.position.y = 0.73;
  g.add(top);
  // thin edge band under the top for a thicker-looking bevelled edge
  const band = Prim.rbox(2.04, 0.025, 0.94, 0.008, wood);
  band.position.y = 0.7;
  g.add(band);
  const apron = Prim.box(1.82, 0.09, 0.72, wood);
  apron.position.y = 0.655;
  g.add(apron);
  const legProfile: [number, number][] = [[0, 0], [0.034, 0], [0.034, 0.03], [0.026, 0.05], [0.026, 0.16], [0.042, 0.2], [0.03, 0.245], [0.03, 0.4], [0.046, 0.46], [0.036, 0.5], [0.036, 0.6], [0.043, 0.635], [0.043, 0.71], [0, 0.71]];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = Prim.lathe(legProfile, wood, { segments: 16 });
    leg.position.set(sx * 0.86, 0, sz * 0.31);
    g.add(leg);
  }
  // stretcher between the leg pairs
  const stretcher = Prim.rbox(1.68, 0.035, 0.05, 0.008, wood);
  stretcher.position.y = 0.16;
  g.add(stretcher);
  g.position.set(x, y, z);
  addStatic(ctx, g, [{ size: [2.1, 0.75, 1.0], center: [0, 0.375, 0] }]);
}

/**
 * Dining chair prototype: seat 0.45, slatted back, upholstered pad. Faces +z locally (back
 * at -z). Returns a merged group (one mesh per material) the caller clones, places and
 * passes to addStatic with a [0.45, 0.98, 0.45] collider.
 */
export function buildChair(ctx: Ctx, cushion: THREE.Material): THREE.Group {
  const wood = ctx.mats.mahogany;
  const g = new THREE.Group();
  const seat = Prim.rbox(0.44, 0.035, 0.44, 0.008, wood);
  seat.position.y = 0.4325;
  g.add(seat);
  const pad = Prim.rbox(0.4, 0.06, 0.39, 0.025, cushion);
  pad.position.set(0, 0.475, 0.02);
  g.add(pad);
  for (const sx of [-1, 1]) {
    const leg = Prim.cylinder(0.017, 0.024, 0.415, wood, { segments: 10 });
    leg.position.set(sx * 0.19, 0.2075, 0.19);
    g.add(leg);
    const stile = Prim.rbox(0.035, 0.98, 0.035, 0.006, wood);
    stile.position.set(sx * 0.19, 0.49, -0.19);
    g.add(stile);
    const stretcher = Prim.box(0.02, 0.02, 0.34, wood);
    stretcher.position.set(sx * 0.19, 0.15, 0.0);
    g.add(stretcher);
  }
  const topRail = Prim.rbox(0.42, 0.07, 0.03, 0.008, wood);
  topRail.position.set(0, 0.935, -0.19);
  g.add(topRail);
  const midRail = Prim.box(0.38, 0.03, 0.025, wood);
  midRail.position.set(0, 0.53, -0.19);
  g.add(midRail);
  for (const sx of [-0.1, 0, 0.1]) {
    const slat = Prim.box(0.045, 0.36, 0.014, wood);
    slat.position.set(sx, 0.725, -0.19);
    g.add(slat);
  }
  return mergeByMaterial(g);
}

/**
 * One place setting prototype (plate, side plate, napkin, cutlery). Local frame: origin at
 * the plate centre on the table top, +z toward the table centre (away from the diner).
 * Returns a merged group for the caller to clone and place; the glass is added separately.
 */
export function placeSetting(ctx: Ctx, napkin: THREE.Material): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  g.add(dinnerPlate(ctx));
  // side plate (bread) up-left
  const side = dinnerPlate(ctx, 0.08);
  side.position.set(0.22, 0, 0.16);
  g.add(side);
  // napkin (folded) on the left with the fork on top
  const nap = Prim.rbox(0.1, 0.008, 0.2, 0.003, napkin);
  nap.position.set(0.195, 0.004, 0);
  g.add(nap);
  const chrome = mats.chrome;
  const forkHandle = Prim.box(0.013, 0.004, 0.115, chrome);
  forkHandle.position.set(0.195, 0.01, -0.035);
  const forkHead = Prim.box(0.026, 0.004, 0.07, chrome);
  forkHead.position.set(0.195, 0.01, 0.06);
  g.add(forkHandle, forkHead);
  const knife = Prim.box(0.017, 0.004, 0.22, chrome);
  knife.position.set(-0.18, 0.002, 0.01);
  g.add(knife);
  const spoonHandle = Prim.box(0.011, 0.004, 0.11, chrome);
  spoonHandle.position.set(-0.215, 0.002, -0.03);
  const spoonBowl = Prim.sphere(0.02, chrome, { segments: 10 });
  spoonBowl.scale.set(0.9, 0.22, 1.3);
  spoonBowl.position.set(-0.215, 0.004, 0.05);
  g.add(spoonHandle, spoonBowl);
  return mergeByMaterial(g);
}

// -------------------------------------------------------------------------------------------
// Chandelier
// -------------------------------------------------------------------------------------------

/** Six-arm brass chandelier hanging from (x, ceilY, z). Adds one virtual light in `group`. */
export function chandelier(ctx: Ctx, glassGroup: THREE.Group, x: number, ceilY: number, z: number, group: string) {
  const mats = ctx.mats;
  const brass = mats.brass;
  const g = new THREE.Group();
  const canopy = Prim.lathe([[0, 0], [0.075, 0], [0.07, -0.01], [0.04, -0.03], [0.012, -0.035], [0, -0.035]], brass, { segments: 20, cast: false });
  g.add(canopy);
  const chain = Prim.cylinder(0.006, 0.006, 0.6, brass, { segments: 8 });
  chain.position.y = -0.33;
  g.add(chain);
  // chain "links": small tori every 6 cm
  for (let i = 0; i < 9; i++) {
    const link = Prim.torus(0.014, 0.004, brass);
    link.rotation.x = Math.PI / 2;
    link.rotation.y = i % 2 ? Math.PI / 2 : 0;
    link.position.y = -0.08 - i * 0.06;
    g.add(link);
  }
  const bodyY = -1.05;
  const body = Prim.lathe([[0, 0], [0.028, 0], [0.05, 0.02], [0.056, 0.06], [0.04, 0.1], [0.034, 0.17], [0.062, 0.22], [0.068, 0.26], [0.052, 0.3], [0.03, 0.36], [0.026, 0.42], [0, 0.42]], brass, { segments: 20 });
  body.position.y = bodyY;
  g.add(body);
  const armY = bodyY + 0.235;
  // one arm: three tangent torus arcs + riser + cup + candle sleeve
  const arm = new THREE.Group();
  const seg = (r: number, rotZ: number, cx: number, cy: number) => {
    const geo = new THREE.TorusGeometry(r, 0.008, 8, 10, Math.PI / 2);
    geo.rotateZ(rotZ);
    geo.translate(cx, cy, 0);
    const m = new THREE.Mesh(geo, brass);
    m.castShadow = true; m.receiveShadow = true;
    arm.add(m);
  };
  seg(0.12, 0, 0.06, -0.12);              // (0.06,0) -> (0.18,-0.12), leaves horizontally, ends heading down
  seg(0.08, Math.PI, 0.26, -0.12);        // (0.18,-0.12) -> (0.26,-0.20)
  seg(0.08, Math.PI * 1.5, 0.26, -0.12);  // (0.26,-0.20) -> (0.34,-0.12)
  const riser = Prim.cylinder(0.008, 0.008, 0.05, brass, { segments: 8 });
  riser.position.set(0.34, -0.095, 0);
  arm.add(riser);
  const cup = Prim.lathe([[0, 0], [0.02, 0], [0.034, 0.02], [0.036, 0.03], [0.03, 0.03], [0.02, 0.012], [0, 0.012]], brass, { segments: 14 });
  cup.position.set(0.34, -0.07, 0);
  arm.add(cup);
  const sleeve = Prim.cylinder(0.011, 0.012, 0.1, mats.solid(0xf4efe4, { roughness: 0.5 }), { segments: 12 });
  sleeve.position.set(0.34, -0.008, 0);
  arm.add(sleeve);
  const armProto = mergeByMaterial(arm);
  for (let i = 0; i < 6; i++) {
    const a = armProto.clone();
    a.rotation.y = (i / 6) * Math.PI * 2;
    a.position.y = armY;
    g.add(a);
  }
  // decorative ring under the arms
  const ring = Prim.torus(0.1, 0.006, brass);
  ring.position.y = armY - 0.03;
  g.add(ring);
  g.position.set(x, ceilY, z);
  addStatic(ctx, g, []);

  // crystal drops hanging from the ring (shared transparent mesh)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const drop = Prim.cone(0.011, 0.05, mats.glassClear, { segments: 8, cast: false });
    drop.rotation.x = Math.PI;
    drop.position.set(x + Math.cos(a) * 0.1, ceilY + armY - 0.065, z + Math.sin(a) * 0.1);
    glassGroup.add(drop);
  }

  // flame bulbs (one merged emissive mesh, toggled with the light)
  const bulbs = bulbMaterials(ctx, 0xffd9a0, 1.2);
  const flames = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const f = Prim.sphere(0.02, bulbs.on, { segments: 10, cast: false });
    f.scale.set(0.75, 1.5, 0.75);
    f.position.set(x + Math.cos(a) * 0.34, ceilY + armY + 0.06, z - Math.sin(a) * 0.34);
    flames.add(f);
  }
  const merged = mergeByMaterial(flames);
  ctx.dynamic.add(merged);
  const flameMesh = merged.children[0] as THREE.Mesh;
  return ctx.lights.point(x, ceilY + armY - 0.02, z, { group, intensity: 12, distance: 9, color: 0xffe2bb, shadow: true, emissives: [{ mesh: flameMesh, on: bulbs.on, off: bulbs.off }] });
}

// -------------------------------------------------------------------------------------------
// Sideboard
// -------------------------------------------------------------------------------------------

/** Sideboard / buffet, 1.7 x 0.48 x 0.86. Local +z is the front. Returns the top height. */
export function buildSideboard(ctx: Ctx, x: number, y: number, z: number, rotY = 0): number {
  const mats = ctx.mats;
  const wood = mats.walnut;
  const g = new THREE.Group();
  const plinth = Prim.box(1.62, 0.06, 0.42, mats.espresso);
  plinth.position.set(0, 0.03, -0.01);
  g.add(plinth);
  const carcass = Prim.rbox(1.7, 0.76, 0.46, 0.006, wood);
  carcass.position.set(0, 0.44, 0);
  g.add(carcass);
  const top = Prim.rbox(1.76, 0.04, 0.5, 0.01, wood);
  top.position.set(0, 0.84, 0.01);
  g.add(top);
  // doors left / right with raised panels and brass knobs
  for (const sx of [-1, 1]) {
    const door = Prim.rbox(0.48, 0.66, 0.02, 0.004, wood);
    door.position.set(sx * 0.58, 0.45, 0.235);
    g.add(door);
    const panel = Prim.rbox(0.34, 0.5, 0.012, 0.004, wood);
    panel.position.set(sx * 0.58, 0.45, 0.25);
    g.add(panel);
    const knob = Prim.sphere(0.014, mats.brass, { segments: 10 });
    knob.position.set(sx * 0.58 - sx * 0.19, 0.45, 0.262);
    g.add(knob);
  }
  // three drawers in the middle
  for (let i = 0; i < 3; i++) {
    const dy = 0.19 + i * 0.245;
    const drawer = Prim.rbox(0.6, 0.22, 0.02, 0.004, wood);
    drawer.position.set(0, dy, 0.235);
    g.add(drawer);
    const pull = Prim.rbox(0.16, 0.012, 0.014, 0.005, mats.brass);
    pull.position.set(0, dy, 0.256);
    g.add(pull);
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  addStatic(ctx, g, [{ size: [1.76, 0.86, 0.5], center: [0, 0.43, 0.01] }]);
  return 0.86;
}

// -------------------------------------------------------------------------------------------
// China cabinet with hinged glass doors
// -------------------------------------------------------------------------------------------

/** China cabinet 1.2 wide x 0.45 deep x 2.06 tall; hutch with two hinged glass doors. Local +z front. */
export function buildChinaCabinet(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const wood = mats.walnut;
  const g = new THREE.Group();
  const plinth = Prim.box(1.14, 0.06, 0.4, mats.espresso);
  plinth.position.set(0, 0.03, -0.02);
  g.add(plinth);
  const base = Prim.rbox(1.2, 0.8, 0.45, 0.006, wood);
  base.position.set(0, 0.46, 0);
  g.add(base);
  const counter = Prim.rbox(1.24, 0.03, 0.48, 0.008, wood);
  counter.position.set(0, 0.875, 0.005);
  g.add(counter);
  for (const sx of [-1, 1]) {
    const door = Prim.rbox(0.56, 0.7, 0.02, 0.004, wood);
    door.position.set(sx * 0.3, 0.46, 0.235);
    g.add(door);
    const panel = Prim.rbox(0.42, 0.54, 0.012, 0.004, wood);
    panel.position.set(sx * 0.3, 0.46, 0.25);
    g.add(panel);
    const knob = Prim.sphere(0.013, mats.brass, { segments: 10 });
    knob.position.set(sx * 0.3 - sx * 0.22, 0.46, 0.262);
    g.add(knob);
  }
  // hutch
  const hutchY0 = 0.89, hutchH = 1.1;
  for (const sx of [-1, 1]) {
    const side = Prim.box(0.03, hutchH, 0.36, wood);
    side.position.set(sx * 0.585, hutchY0 + hutchH / 2, -0.045);
    g.add(side);
  }
  const back = Prim.box(1.17, hutchH, 0.02, mats.maple);
  back.position.set(0, hutchY0 + hutchH / 2, -0.215);
  g.add(back);
  const topBoard = Prim.box(1.2, 0.03, 0.36, wood);
  topBoard.position.set(0, hutchY0 + hutchH - 0.015, -0.045);
  g.add(topBoard);
  const crown = Prim.rbox(1.28, 0.06, 0.42, 0.012, wood);
  crown.position.set(0, hutchY0 + hutchH + 0.03, -0.03);
  g.add(crown);
  const shelfYs = [1.16, 1.46, 1.74];
  for (const sy of shelfYs) {
    const shelf = Prim.box(1.14, 0.02, 0.32, wood);
    shelf.position.set(0, sy, -0.055);
    g.add(shelf);
  }
  // display: standing plates leaning on the back, cups + bowls on the lowest shelf
  const rimMat = mats.solid(0x2f5c8a, { roughness: 0.2, physical: true, clearcoat: 0.8 });
  const goldRim = mats.solid(0xc9a44a, { roughness: 0.3, metalness: 0.8 });
  for (let s = 1; s < 3; s++) {
    for (const px of [-0.36, 0, 0.36]) {
      // plate stands on its edge, face toward +z, leaning back ~8 degrees against the back board
      const lean = 0.14;
      const plate = dinnerPlate(ctx, 0.105);
      plate.rotation.x = Math.PI / 2 - lean;
      const py = shelfYs[s] + 0.01 + 0.105 * Math.cos(lean);
      plate.position.set(px, py, -0.19);
      g.add(plate);
      const ring = Prim.torus(0.082, 0.005, s === 1 ? rimMat : goldRim);
      ring.rotation.x = Math.PI / 2 - lean;
      ring.position.set(px, py + 0.024 * Math.sin(lean), -0.19 + 0.024 * Math.cos(lean));
      g.add(ring);
    }
  }
  const cupProfile: [number, number][] = [[0, 0], [0.025, 0], [0.03, 0.006], [0.036, 0.055], [0.038, 0.065], [0.033, 0.065], [0.03, 0.012], [0, 0.01]];
  for (const px of [-0.4, -0.26, -0.12]) {
    const saucer = Prim.cylinder(0.052, 0.045, 0.006, mats.ceramic, { segments: 20 });
    saucer.position.set(px, shelfYs[0] + 0.013, 0.02);
    g.add(saucer);
    const cup = Prim.lathe(cupProfile, mats.ceramic, { segments: 16 });
    cup.position.set(px, shelfYs[0] + 0.016, 0.02);
    g.add(cup);
    const handle = Prim.torus(0.016, 0.004, mats.ceramic);
    handle.rotation.set(0, 0, Math.PI / 2);
    handle.position.set(px + 0.04, shelfYs[0] + 0.05, 0.02);
    g.add(handle);
  }
  for (let i = 0; i < 3; i++) {
    const bowl = Prim.lathe([[0, 0], [0.05, 0], [0.085, 0.03], [0.095, 0.06], [0.09, 0.06], [0.08, 0.035], [0.045, 0.012], [0, 0.01]], mats.ceramic, { segments: 20 });
    bowl.position.set(0.28, shelfYs[0] + 0.012 + i * 0.03, -0.02);
    g.add(bowl);
  }
  const teapot = Prim.lathe([[0, 0], [0.05, 0], [0.075, 0.03], [0.08, 0.08], [0.065, 0.12], [0.03, 0.135], [0.03, 0.15], [0.015, 0.165], [0, 0.17]], mats.ceramic, { segments: 20 });
  teapot.position.set(0.42, shelfYs[0] + 0.012, 0.0);
  g.add(teapot);
  const spout = Prim.cylinder(0.012, 0.02, 0.1, mats.ceramic, { segments: 8 });
  spout.rotation.z = -0.9;
  spout.position.set(0.5, shelfYs[0] + 0.1, 0.0);
  g.add(spout);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  addStatic(ctx, g, [{ size: [1.28, 2.06, 0.48], center: [0, 1.03, 0] }]);

  // hinged glass doors (dynamic)
  const dyn = new THREE.Group();
  dyn.position.set(x, y, z);
  dyn.rotation.y = rotY;
  ctx.dynamic.add(dyn);
  const doorW = 0.585, doorH = 1.06, doorZ = 0.147;
  const mkDoor = (dir: 1 | -1) => (pivot: THREE.Group) => {
    const d = new THREE.Group();
    const cx = dir * doorW / 2;
    const stileL = Prim.box(0.045, doorH, 0.02, wood); stileL.position.set(cx - dir * (doorW / 2 - 0.0225), 0, 0);
    const stileR = Prim.box(0.045, doorH, 0.02, wood); stileR.position.set(cx + dir * (doorW / 2 - 0.0225), 0, 0);
    const railT = Prim.box(doorW - 0.09, 0.06, 0.02, wood); railT.position.set(cx, doorH / 2 - 0.03, 0);
    const railB = Prim.box(doorW - 0.09, 0.06, 0.02, wood); railB.position.set(cx, -doorH / 2 + 0.03, 0);
    const pane = Prim.box(doorW - 0.09, doorH - 0.12, 0.004, mats.glassClear, { cast: false, receive: false });
    pane.position.set(cx, 0, 0);
    const knob = Prim.sphere(0.011, mats.brass, { segments: 10 });
    knob.position.set(cx + dir * (doorW / 2 - 0.05), -0.02, 0.018);
    d.add(stileL, stileR, railT, railB, pane, knob);
    pivot.add(mergeByMaterial(d));
  };
  hinged(ctx, dyn, new THREE.Vector3(-doorW, hutchY0 + hutchH / 2, doorZ), mkDoor(1), 'cabinet door', { maxAngle: -Math.PI * 0.55, sfx: 'drawer' });
  hinged(ctx, dyn, new THREE.Vector3(doorW, hutchY0 + hutchH / 2, doorZ), mkDoor(-1), 'cabinet door', { maxAngle: Math.PI * 0.55, sfx: 'drawer' });
}

// -------------------------------------------------------------------------------------------
// Bar cart
// -------------------------------------------------------------------------------------------

/** Brass bar cart with bottles, ice bucket and glasses. Local +x is the long side. */
export function buildBarCart(ctx: Ctx, glassGroup: THREE.Group, x: number, y: number, z: number, rotY = 0) {
  const mats = ctx.mats;
  const brass = mats.brass;
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const post = Prim.cylinder(0.01, 0.01, 0.78, brass, { segments: 8 });
    post.position.set(sx * 0.34, 0.45, sz * 0.19);
    g.add(post);
    const wheel = Prim.cylinder(0.035, 0.035, 0.018, mats.plasticBlack, { segments: 14 });
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(sx * 0.34, 0.035, sz * 0.19);
    g.add(wheel);
  }
  for (const sy of [0.16, 0.8]) {
    const shelf = Prim.rbox(0.72, 0.02, 0.42, 0.005, mats.espresso);
    shelf.position.set(0, sy, 0);
    g.add(shelf);
    // gallery rail
    for (const sz of [-1, 1]) {
      const r = Prim.cylinder(0.005, 0.005, 0.72, brass, { segments: 6 });
      r.rotation.z = Math.PI / 2;
      r.position.set(0, sy + 0.05, sz * 0.2);
      g.add(r);
    }
    for (const sx of [-1, 1]) {
      const r = Prim.cylinder(0.005, 0.005, 0.42, brass, { segments: 6 });
      r.rotation.x = Math.PI / 2;
      r.position.set(sx * 0.35, sy + 0.05, 0);
      g.add(r);
    }
  }
  const topY = 0.81;
  const paper = mats.solid(0xf1e9d6, { roughness: 0.9 });
  const label = (bx: number, by: number, bz: number, w: number, h: number, r: number) => {
    const l = Prim.box(w, h, 0.002, paper);
    l.position.set(bx, by, bz + r);
    g.add(l);
  };
  // whisky (amber)
  const whisky = Prim.lathe([[0, 0], [0.038, 0], [0.04, 0.01], [0.04, 0.16], [0.03, 0.2], [0.014, 0.23], [0.014, 0.27], [0.019, 0.275], [0.019, 0.29], [0, 0.29]], mats.solid(0x9a5a1a, { roughness: 0.12, physical: true, clearcoat: 1 }), { segments: 16 });
  whisky.position.set(-0.22, topY, 0.06);
  g.add(whisky);
  label(-0.22, topY + 0.09, 0.06, 0.05, 0.06, 0.04);
  // gin (square green bottle)
  const gin = Prim.rbox(0.07, 0.22, 0.07, 0.012, mats.solid(0x1e4d3a, { roughness: 0.1, physical: true, clearcoat: 1 }));
  gin.position.set(-0.1, topY + 0.11, -0.08);
  g.add(gin);
  const ginNeck = Prim.cylinder(0.014, 0.018, 0.06, mats.solid(0x1e4d3a, { roughness: 0.1, physical: true, clearcoat: 1 }), { segments: 10 });
  ginNeck.position.set(-0.1, topY + 0.25, -0.08);
  g.add(ginNeck);
  const ginCap = Prim.cylinder(0.016, 0.016, 0.025, mats.black, { segments: 10 });
  ginCap.position.set(-0.1, topY + 0.29, -0.08);
  g.add(ginCap);
  label(-0.1, topY + 0.11, -0.08, 0.05, 0.08, 0.035);
  // wine (dark green)
  const wine = Prim.lathe([[0, 0], [0.036, 0], [0.037, 0.19], [0.028, 0.22], [0.014, 0.25], [0.013, 0.31], [0, 0.31]], mats.solid(0x14301c, { roughness: 0.1, physical: true, clearcoat: 1 }), { segments: 16 });
  wine.position.set(0.0, topY, 0.08);
  g.add(wine);
  const foil = Prim.cylinder(0.0145, 0.0145, 0.05, mats.solid(0x8a1c1c, { roughness: 0.4 }), { segments: 10 });
  foil.position.set(0.0, topY + 0.29, 0.08);
  g.add(foil);
  label(0.0, topY + 0.1, 0.08, 0.05, 0.07, 0.037);
  // ice bucket
  const bucket = Prim.lathe([[0, 0], [0.06, 0], [0.065, 0.01], [0.075, 0.12], [0.08, 0.13], [0.072, 0.13], [0.062, 0.02], [0, 0.02]], mats.chrome, { segments: 20 });
  bucket.position.set(0.2, topY, -0.06);
  g.add(bucket);
  const ice = Prim.sphere(0.062, mats.glassFrosted, { segments: 10, cast: false });
  ice.scale.set(1, 0.35, 1);
  ice.position.set(0.2, topY + 0.115, -0.06);
  g.add(ice);
  // lower shelf: spare bottles + napkin stack
  const b2 = Prim.lathe([[0, 0], [0.036, 0], [0.037, 0.17], [0.026, 0.2], [0.013, 0.23], [0.013, 0.29], [0, 0.29]], mats.solid(0x2a1a10, { roughness: 0.1, physical: true, clearcoat: 1 }), { segments: 14 });
  b2.position.set(-0.2, 0.17, 0.05);
  g.add(b2);
  const b3 = Prim.lathe([[0, 0], [0.033, 0], [0.034, 0.16], [0.02, 0.2], [0.012, 0.22], [0.012, 0.27], [0, 0.27]], mats.solid(0x3b6a8a, { roughness: 0.1, physical: true, clearcoat: 1 }), { segments: 14 });
  b3.position.set(-0.1, 0.17, -0.06);
  g.add(b3);
  const napkins = Prim.rbox(0.14, 0.035, 0.14, 0.004, mats.solid(0xf7f4ec, { roughness: 0.95 }));
  napkins.position.set(0.18, 0.19, 0.0);
  g.add(napkins);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  addStatic(ctx, g, [{ size: [0.74, 0.86, 0.44], center: [0, 0.43, 0] }]);
  // two tumblers on the top shelf (shared glass mesh)
  g.updateMatrixWorld(true);
  for (const [lx, lz] of [[0.28, 0.1], [0.32, 0.0]] as [number, number][]) {
    const t = tumbler(ctx);
    t.position.copy(g.localToWorld(new THREE.Vector3(lx, topY, lz)));
    glassGroup.add(t);
  }
}
