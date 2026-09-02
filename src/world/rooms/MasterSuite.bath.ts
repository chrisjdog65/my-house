/**
 * Master bathroom (en-suite): subway-tile wainscot, a double vanity with two working faucets under
 * a wide mirror with three sconces, a freestanding tub with a floor-mounted filler under the frosted
 * window, a glass shower enclosure with a hinged door and a rain head that sprays, a toilet that
 * flushes, towels, a stool, toiletries (pickups), plants and recessed lights.
 */
import * as THREE from 'three';
import { Prim, place, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import type { Interactable } from '../Interactables';
import { addStatic, hinged, lightSwitch, pickup, recessedLight, Toggle } from '../Props';
import { FLOOR, CEIL, FACE, drapedTowel, foldedStack, foldedTowel, placeStatic, staticPlant, toiletryBottle, type BottleKind } from './MasterSuite.shared';

// wall faces (interior)
const WEST = -7.85, EAST = -5.06, SOUTH = -1.44, NORTH = 1.44;
const TILE_T = 0.02; // wainscot proud of the wall (covers the baseboard)
const WAINSCOT_H = 1.05;
const ROOM_H = CEIL - FLOOR;
// shower footprint (south-west corner); the door side is 0.98 wide so the player (0.74 incl. offset) fits through
const SH_X1 = -6.97, SH_Z1 = -0.44;

/** Subway-tile wainscot on every wall with a painted cap rail; full-height tile inside the shower. */
function tileWainscot(ctx: Ctx) {
  const mats = ctx.mats;
  const tile = mats.subway;
  const g = new THREE.Group();
  const seg = (w: number, h: number, d: number, x: number, yc: number, z: number, m: THREE.Material = tile) => { const b = Prim.box(w, h, d, m); b.position.set(x, yc, z); g.add(b); };
  const H = WAINSCOT_H;
  const doorL = -6.98, doorR = -6.02; // casing edges of the door on the north wall
  // wainscot
  seg(doorL - WEST, H, TILE_T, (WEST + doorL) / 2, H / 2, NORTH - TILE_T / 2);
  seg(EAST - doorR, H, TILE_T, (doorR + EAST) / 2, H / 2, NORTH - TILE_T / 2);
  seg(TILE_T, H, NORTH - SOUTH, EAST - TILE_T / 2, H / 2, 0);
  seg(EAST - WEST, H, TILE_T, (EAST + WEST) / 2, H / 2, SOUTH + TILE_T / 2);
  seg(TILE_T, H, NORTH - SOUTH, WEST + TILE_T / 2, H / 2, 0);
  // full-height tile inside the shower (west + south walls of the corner)
  const upH = ROOM_H - 0.06 - H;
  seg(TILE_T, upH, SH_Z1 - SOUTH, WEST + TILE_T / 2, H + upH / 2, (SOUTH + SH_Z1) / 2);
  seg(SH_X1 - WEST, upH, TILE_T, (WEST + SH_X1) / 2, H + upH / 2, SOUTH + TILE_T / 2);
  // cap rail (not inside the shower)
  const cap = mats.trim, cH = 0.04, cD = 0.035;
  seg(doorL - WEST, cH, cD, (WEST + doorL) / 2, H + cH / 2, NORTH - cD / 2, cap);
  seg(EAST - doorR, cH, cD, (doorR + EAST) / 2, H + cH / 2, NORTH - cD / 2, cap);
  seg(cD, cH, NORTH - SOUTH, EAST - cD / 2, H + cH / 2, 0, cap);
  seg(EAST - SH_X1, cH, cD, (SH_X1 + EAST) / 2, H + cH / 2, SOUTH + cD / 2, cap);
  seg(cD, cH, NORTH - SH_Z1, WEST + cD / 2, H + cH / 2, (SH_Z1 + NORTH) / 2, cap);
  place(g, 0, FLOOR, 0, 0);
  addStatic(ctx, g, [], { worldUV: true, surface: 'tile' });
}

/** Single-lever basin mixer (chrome), origin at its base, spout toward +z. */
function basinFaucet(ctx: Ctx): THREE.Group {
  const chrome = ctx.mats.chrome;
  const g = new THREE.Group();
  const flange = Prim.cylinder(0.024, 0.027, 0.01, chrome, { segments: 16 }); flange.position.y = 0.005; g.add(flange);
  const column = Prim.cylinder(0.016, 0.016, 0.155, chrome, { segments: 14 }); column.position.y = 0.0825; g.add(column);
  const elbow = Prim.sphere(0.016, chrome, { segments: 10 }); elbow.position.y = 0.16; g.add(elbow);
  const spout = Prim.cylinder(0.011, 0.013, 0.12, chrome, { segments: 12 }); spout.rotation.x = Math.PI / 2; spout.position.set(0, 0.16, 0.06); g.add(spout);
  const tip = Prim.cylinder(0.012, 0.012, 0.014, ctx.mats.darkMetal, { segments: 12 }); tip.position.set(0, 0.148, 0.115); g.add(tip);
  const lever = Prim.cylinder(0.007, 0.009, 0.075, chrome, { segments: 10 }); lever.rotation.x = 0.55; lever.position.set(0, 0.2, -0.025); g.add(lever);
  return mergeByMaterial(g);
}

/** Double vanity (front +z): painted cabinet, marble top with two drop-in basins, two working faucets, clutter. */
function doubleVanity(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const W = 1.8, D = 0.55, H = 0.86;
  const g = new THREE.Group();
  const paint = mats.solid(0x3f4d5a, { roughness: 0.5, envMapIntensity: 0.5 });
  const kick = Prim.box(W - 0.1, 0.1, D - 0.1, mats.solid(0x1e242b, { roughness: 0.6 })); kick.position.set(0, 0.05, -0.05); g.add(kick);
  const carcass = Prim.rbox(W, H - 0.13, D, 0.008, paint); carcass.position.y = 0.1 + (H - 0.13) / 2; g.add(carcass);
  // shaker doors (two pairs) and a centre drawer stack
  const door = (dx: number) => {
    const slab = Prim.rbox(0.3, 0.64, 0.012, 0.004, paint); slab.position.set(dx, 0.46, D / 2 + 0.006); g.add(slab);
    for (const [bw, bh, bx, by] of [[0.3, 0.05, 0, 0.295], [0.3, 0.05, 0, -0.295], [0.05, 0.54, -0.125, 0], [0.05, 0.54, 0.125, 0]]) {
      const rail = Prim.box(bw, bh, 0.008, paint, { cast: false }); rail.position.set(dx + bx, 0.46 + by, D / 2 + 0.016); g.add(rail);
    }
  };
  for (const dx of [-0.745, -0.425, 0.425, 0.745]) door(dx);
  for (const dx of [-0.6, 0.6]) { const pull = Prim.rbox(0.012, 0.12, 0.012, 0.005, mats.chrome); pull.position.set(dx + (dx < 0 ? -0.01 : 0.01), 0.46, D / 2 + 0.032); g.add(pull); }
  for (let r = 0; r < 3; r++) {
    const f = Prim.rbox(0.48, 0.19, 0.012, 0.004, paint); f.position.set(0, 0.22 + r * 0.24, D / 2 + 0.006); g.add(f);
    const pull = Prim.rbox(0.12, 0.012, 0.012, 0.005, mats.chrome); pull.position.set(0, 0.22 + r * 0.24, D / 2 + 0.028); g.add(pull);
  }
  // marble top with two circular cut-outs
  const shape = new THREE.Shape();
  const ox = W / 2 + 0.02, zb = -D / 2, zf = D / 2 + 0.025; // shape y = -local z
  shape.moveTo(-ox, -zf); shape.lineTo(ox, -zf); shape.lineTo(ox, -zb); shape.lineTo(-ox, -zb); shape.closePath();
  const basinX = 0.45, basinZ = 0.02;
  for (const bx of [-basinX, basinX]) { const hole = new THREE.Path(); hole.absarc(bx, -basinZ, 0.185, 0, Math.PI * 2, true); shape.holes.push(hole); }
  const top = Prim.extrude(shape, 0.03, mats.marble, { curveSegments: 28 }); top.rotation.x = -Math.PI / 2; top.position.y = H - 0.015; g.add(top);
  const splash = Prim.box(W + 0.04, 0.1, 0.02, mats.marble); splash.position.set(0, H + 0.05, -D / 2 + 0.01); g.add(splash);
  // basins (profile from the outer rim inward and down so the inside faces up)
  const basinPts: [number, number][] = [[0.21, 0], [0.21, 0.008], [0.2, 0.012], [0.19, 0.012], [0.185, 0], [0.165, -0.08], [0.11, -0.125], [0.04, -0.14], [0, -0.14]];
  for (const bx of [-basinX, basinX]) {
    const basin = Prim.lathe(basinPts, mats.ceramic, { segments: 28 }); basin.position.set(bx, H + 0.004, basinZ); g.add(basin);
    const drain = Prim.cylinder(0.02, 0.02, 0.004, mats.darkMetal, { segments: 12, cast: false }); drain.position.set(bx, H - 0.134, basinZ); g.add(drain);
  }
  // counter clutter (free zones: x<-0.66, |x|<0.24, x>0.66): toothbrush cup, folded hand towel, tray with a candle
  const cup = Prim.cylinder(0.035, 0.03, 0.09, mats.ceramic, { segments: 14 }); cup.position.set(-0.78, H + 0.045, 0.1); g.add(cup);
  for (const [tx, tc] of [[-0.79, 0x3d7a9a], [-0.77, 0xd94a3a]] as [number, number][]) { const tb = Prim.cylinder(0.005, 0.005, 0.19, mats.solid(tc, { roughness: 0.4 }), { segments: 6 }); tb.position.set(tx, H + 0.14, 0.1 + (tx + 0.78) * 2); tb.rotation.z = (tx + 0.78) * 4; g.add(tb); }
  const towel = foldedTowel(ctx, 0.22, 0.14, 0xdfd8ca, 0.035); towel.position.set(0.0, H + 0.0175, 0.18); towel.rotation.y = 0.1; g.add(towel);
  const tray = Prim.rbox(0.22, 0.014, 0.16, 0.005, mats.solid(0xd9d2c4, { roughness: 0.5, metalness: 0.2 })); tray.position.set(0.78, H + 0.007, 0.1); g.add(tray);
  const candle = Prim.cylinder(0.035, 0.035, 0.07, mats.solid(0xe9e2d0, { roughness: 0.5, physical: true, clearcoat: 0.3 }), { segments: 14 }); candle.position.set(0.72, H + 0.049, 0.06); g.add(candle);
  // collider top = the marble surface (H) so things set on the counter rest on it; the backsplash gets its own thin box
  placeStatic(ctx, g, x, z, rotY, [
    { size: [W + 0.04, H, D + 0.03], center: [0, H / 2, 0.01] },
    { size: [W + 0.04, 0.1, 0.02], center: [0, H + 0.05, -D / 2 + 0.01] },
  ], 'tile');

  // faucets (dynamic toggles) with water streams, in world space
  g.updateMatrixWorld(true);
  const local = (lx: number, ly: number, lz: number) => new THREE.Vector3(lx, ly, lz).applyMatrix4(g.matrixWorld);
  [-basinX, basinX].forEach((bx, i) => {
    const f = basinFaucet(ctx);
    const base = local(bx, H, -0.17);
    f.position.copy(base); f.rotation.y = rotY;
    ctx.dynamic.add(f);
    const tip = local(bx, H + 0.141, -0.17 + 0.115);
    const bottom = local(bx, H - 0.13, basinZ);
    const len = tip.y - bottom.y;
    const stream = Prim.cylinder(0.005, 0.0075, len, mats.water, { segments: 10, cast: false, receive: false });
    stream.position.set(tip.x, (tip.y + bottom.y) / 2, tip.z); stream.visible = false; stream.renderOrder = 12; ctx.dynamic.add(stream);
    const splashD = Prim.cylinder(0.05, 0.065, 0.006, mats.water, { segments: 18, cast: false, receive: false });
    splashD.position.set(bottom.x, bottom.y + 0.004, bottom.z); splashD.visible = false; splashD.renderOrder = 12; ctx.dynamic.add(splashD);
    const focus = base.clone().add(new THREE.Vector3(0, 0.15, 0));
    const id = 'mbFaucet' + i;
    const toggle = new Toggle(f, { on: 'Turn off faucet', off: 'Turn on faucet' }, (on) => {
      stream.visible = on; splashD.visible = on;
      if (on) { ctx.audio.play('water', focus); ctx.audio.startLoop(id, 'water', focus, 0.2); } else ctx.audio.stopLoop(id);
    }, focus);
    ctx.interact.add(toggle);
    ctx.onUpdate((_dt, t) => {
      if (!toggle.on) return;
      stream.scale.x = 1 + 0.25 * Math.sin(t * 43 + i); stream.scale.z = 1 + 0.25 * Math.cos(t * 37 + i);
      const s = 1 + 0.18 * Math.sin(t * 21 + i); splashD.scale.set(s, 1, 1 + 0.18 * Math.cos(t * 17));
    });
  });
}

/** Wide framed mirror on the east wall (faces -x). */
function vanityMirror(ctx: Ctx, x: number, y: number, z: number, w: number, h: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const bar = 0.025;
  const fm = mats.darkMetal;
  for (const sy of [-1, 1]) { const b = Prim.box(w + 2 * bar, bar, bar, fm); b.position.set(0, sy * (h / 2 + bar / 2), bar / 2); g.add(b); }
  for (const sx of [-1, 1]) { const b = Prim.box(bar, h, bar, fm); b.position.set(sx * (w / 2 + bar / 2), 0, bar / 2); g.add(b); }
  const back = Prim.box(w, h, 0.01, mats.solid(0x333333, { roughness: 0.7 }), { cast: false }); back.position.z = 0.005; g.add(back);
  const glass = Prim.quad(w, h, mats.mirror, { cast: false }); glass.position.z = 0.011; g.add(glass);
  place(g, x, y, z, FACE.negX);
  addStatic(ctx, g);
}

/** Wall sconce: chrome back plate + arm, frosted cylinder shade that glows (light group). Faces +z out of the wall. */
function sconce(ctx: Ctx, x: number, y: number, z: number, rotY: number, group: string) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const plate = Prim.cylinder(0.045, 0.045, 0.01, mats.chrome, { segments: 16 }); plate.rotation.x = Math.PI / 2; plate.position.z = 0.005; g.add(plate);
  const arm = Prim.box(0.02, 0.02, 0.09, mats.chrome); arm.position.set(0, 0, 0.055); g.add(arm);
  const cupM = Prim.cylinder(0.03, 0.03, 0.02, mats.chrome, { segments: 14 }); cupM.position.set(0, 0.08, 0.11); g.add(cupM);
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
  const bulbs = { on: mats.emissive(0xfff0dc, 1.0, 0xfff7ea), off: mats.glassFrosted };
  const shade = Prim.cylinder(0.05, 0.055, 0.15, bulbs.on, { segments: 16, cast: false });
  const up = new THREE.Vector3(0, 1, 0);
  const sp = new THREE.Vector3(0, 0.0, 0.11).applyAxisAngle(up, rotY).add(new THREE.Vector3(x, y, z));
  shade.position.copy(sp);
  ctx.dynamic.add(shade);
  const lp = new THREE.Vector3(0, 0.0, 0.16).applyAxisAngle(up, rotY).add(new THREE.Vector3(x, y, z));
  ctx.lights.point(lp.x, lp.y, lp.z, { group, intensity: 3.2, distance: 4.5, color: 0xfff1dd, emissives: [{ mesh: shade, on: bulbs.on, off: bulbs.off }] });
}

/** Freestanding oval tub (long axis along local z) with a bath caddy across it. */
function freestandingTub(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  // unit-radius profile: up the outside, over the rim, down the inside
  const pts: [number, number][] = [[0.34, 0], [0.42, 0.005], [0.47, 0.06], [0.495, 0.2], [0.5, 0.42], [0.5, 0.55], [0.485, 0.585], [0.455, 0.585], [0.43, 0.55], [0.4, 0.3], [0.33, 0.14], [0.2, 0.09], [0, 0.085]];
  const shell = Prim.lathe(pts, mats.ceramic, { segments: 32 });
  shell.scale.set(0.78, 1, 1.6);
  g.add(shell);
  const overflow = Prim.torus(0.03, 0.006, mats.chrome); overflow.rotation.x = Math.PI / 2; overflow.position.set(0, 0.42, -0.66); g.add(overflow);
  const drain = Prim.cylinder(0.03, 0.03, 0.004, mats.chrome, { segments: 14, cast: false }); drain.position.set(0, 0.088, -0.35); g.add(drain);
  // bath caddy across the tub: walnut tray with a candle, a folded washcloth and a book
  const caddy = Prim.rbox(0.84, 0.02, 0.2, 0.006, mats.walnut); caddy.position.set(0, 0.6, 0.3); g.add(caddy);
  for (const s of [-1, 1]) { const lip = Prim.box(0.84, 0.03, 0.012, mats.walnut); lip.position.set(0, 0.61, 0.3 + s * 0.094); g.add(lip); }
  const candle = Prim.cylinder(0.03, 0.03, 0.06, mats.solid(0xe9e2d0, { roughness: 0.5, physical: true, clearcoat: 0.3 }), { segments: 14 }); candle.position.set(-0.28, 0.64, 0.3); g.add(candle);
  const cloth = foldedTowel(ctx, 0.16, 0.12, 0xb9c6d1, 0.03); cloth.position.set(0.0, 0.625, 0.3); cloth.rotation.y = 0.15; g.add(cloth);
  const book = Prim.rbox(0.15, 0.03, 0.2, 0.004, mats.solid(0x6b4f3a, { roughness: 0.6 })); book.position.set(0.26, 0.625, 0.3); book.rotation.y = -0.1; g.add(book);
  placeStatic(ctx, g, x, z, rotY, [{ size: [0.8, 0.6, 1.62], center: [0, 0.3, 0] }], 'tile');
}

/** Floor-mounted tub filler: chrome riser with a curved spout over the tub (spout toward local +z) and a hand shower. */
function tubFiller(ctx: Ctx, x: number, z: number, rotY: number) {
  const chrome = ctx.mats.chrome;
  const g = new THREE.Group();
  const flange = Prim.cylinder(0.05, 0.055, 0.02, chrome, { segments: 18 }); flange.position.y = 0.01; g.add(flange);
  const riser = Prim.cylinder(0.018, 0.018, 0.9, chrome, { segments: 14 }); riser.position.y = 0.46; g.add(riser);
  // quarter bend from the vertical riser to the horizontal spout (arc in the y/z plane)
  const bend = Prim.torus(0.11, 0.016, chrome, { arc: Math.PI / 2 }); bend.rotation.set(0, Math.PI, Math.PI / 2); bend.position.set(0, 0.91, 0.11); g.add(bend);
  const spout = Prim.cylinder(0.015, 0.016, 0.16, chrome, { segments: 12 }); spout.rotation.x = Math.PI / 2; spout.position.set(0, 1.02, 0.19); g.add(spout);
  const tip = Prim.cylinder(0.014, 0.014, 0.05, chrome, { segments: 12 }); tip.position.set(0, 0.995, 0.27); g.add(tip);
  const valve = Prim.cylinder(0.035, 0.035, 0.03, chrome, { segments: 16 }); valve.rotation.x = Math.PI / 2; valve.position.set(0, 0.62, 0.03); g.add(valve);
  for (const a of [0, Math.PI / 2]) { const cross = Prim.box(0.09, 0.012, 0.012, chrome); cross.rotation.z = a; cross.position.set(0, 0.62, 0.05); g.add(cross); }
  // hand shower on a cradle
  const cradle = Prim.box(0.03, 0.03, 0.04, chrome); cradle.position.set(0.045, 0.8, -0.005); g.add(cradle);
  const handle = Prim.cylinder(0.012, 0.016, 0.2, chrome, { segments: 10 }); handle.position.set(0.075, 0.74, -0.01); g.add(handle);
  const head = Prim.cylinder(0.03, 0.02, 0.03, chrome, { segments: 14 }); head.rotation.x = 0.6; head.position.set(0.075, 0.855, 0.01); g.add(head);
  const hose = Prim.cylinder(0.006, 0.006, 0.55, ctx.mats.darkMetal, { segments: 6 }); hose.position.set(0.06, 0.34, -0.03); hose.rotation.z = 0.06; g.add(hose);
  placeStatic(ctx, g, x, z, rotY, [{ size: [0.12, 1.05, 0.12], center: [0, 0.525, 0] }], 'tile');
}

/** Toilet flush behaviour: a dynamic lever and water surface animate; the body is static. */
class Toilet implements Interactable {
  proximity = true;
  radius = 2.2;
  private t = -1;
  private baseY: number;
  constructor(private ctx: Ctx, public object: THREE.Object3D, private lever: THREE.Object3D, private water: THREE.Mesh, public focus: THREE.Vector3) {
    this.baseY = water.position.y;
  }
  getPrompt() { return this.t >= 0 && this.t < 1.0 ? null : 'Flush toilet'; }
  interact() { if (this.t < 0) { this.t = 0; this.ctx.audio.play('flush', this.focus); } }
  update(dt: number) {
    if (this.t < 0) return;
    this.t += dt;
    const t = this.t;
    this.lever.rotation.x = t < 0.5 ? -0.55 * Math.sin((t / 0.5) * Math.PI) : 0;
    const s = t < 1.6 ? 1 - 0.85 * (t / 1.6) : t < 4.5 ? 0.15 + 0.85 * ((t - 1.6) / 2.9) : 1;
    this.water.scale.set(s, 1, s * 1.3);
    this.water.position.y = this.baseY - (1 - s) * 0.06;
    this.water.rotation.y += dt * (t < 1.6 ? 7 : 0.8);
    if (t > 4.5) { this.t = -1; this.water.scale.set(1, 1, 1.3); this.water.position.y = this.baseY; this.water.rotation.y = 0; this.lever.rotation.x = 0; }
  }
}

/** Toilet (front +z, tank at -z) with a working flush. */
function toilet(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  // bowl: up the outside, over the rim, down inside
  const bowlPts: [number, number][] = [[0.14, 0], [0.19, 0.01], [0.2, 0.1], [0.17, 0.22], [0.2, 0.3], [0.23, 0.36], [0.235, 0.4], [0.2, 0.4], [0.18, 0.32], [0.1, 0.2], [0, 0.17]];
  const bowl = Prim.lathe(bowlPts, mats.ceramic, { segments: 28 }); bowl.scale.set(1, 1, 1.3); bowl.position.z = 0.06; g.add(bowl);
  const seatMat = mats.solid(0xf7f7f3, { roughness: 0.3, physical: true, clearcoat: 0.6 });
  const seat = Prim.torus(0.205, 0.028, seatMat); seat.scale.set(1, 1, 1.3); seat.position.set(0, 0.415, 0.06); g.add(seat);
  const lid = Prim.rbox(0.42, 0.025, 0.5, 0.012, seatMat); lid.position.set(0, 0.62, -0.13); lid.rotation.x = -1.35; g.add(lid);
  const tank = Prim.rbox(0.42, 0.38, 0.2, 0.012, mats.ceramic); tank.position.set(0, 0.6, -0.28); g.add(tank);
  const tankLid = Prim.rbox(0.44, 0.03, 0.22, 0.006, mats.ceramic); tankLid.position.set(0, 0.805, -0.28); g.add(tankLid);
  const hinge = Prim.box(0.2, 0.02, 0.05, mats.chrome); hinge.position.set(0, 0.42, -0.19); g.add(hinge);
  const supply = Prim.cylinder(0.006, 0.006, 0.25, mats.chrome, { segments: 6 }); supply.position.set(-0.18, 0.2, -0.33); g.add(supply);
  placeStatic(ctx, g, x, z, rotY, [{ size: [0.47, 0.82, 0.75], center: [0, 0.41, -0.06] }], 'tile');
  // dynamic: lever + water surface in a group placed on the toilet (so it can be picked / found)
  const tg = new THREE.Group();
  place(tg, x, FLOOR, z, rotY);
  const lever = new THREE.Group();
  const stem = Prim.cylinder(0.008, 0.008, 0.03, mats.chrome, { segments: 8 }); stem.rotation.x = Math.PI / 2; stem.position.z = 0.015; lever.add(stem);
  const paddle = Prim.rbox(0.08, 0.014, 0.014, 0.005, mats.chrome); paddle.position.set(-0.035, 0, 0.03); lever.add(paddle);
  const lv = mergeByMaterial(lever);
  lv.position.set(-0.15, 0.74, -0.18);
  tg.add(lv);
  const water = Prim.cylinder(0.12, 0.12, 0.004, mats.water, { segments: 20, cast: false, receive: false });
  water.scale.z = 1.3;
  water.position.set(0, 0.235, 0.06); water.renderOrder = 11;
  tg.add(water);
  ctx.dynamic.add(tg);
  tg.updateMatrixWorld(true);
  const focus = tg.localToWorld(new THREE.Vector3(0, 0.6, 0));
  ctx.interact.add(new Toilet(ctx, tg, lv, water, focus));
}

/** Glass shower enclosure in the south-west corner with a hinged door, rain head, mixer (Toggle) and a drop spray. */
function showerEnclosure(ctx: Ctx) {
  const mats = ctx.mats;
  const chrome = mats.chrome;
  const y = FLOOR;
  const x0 = WEST + TILE_T, x1 = SH_X1, z0 = SOUTH + TILE_T, z1 = SH_Z1;
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const H = 2.0;
  const st = new THREE.Group();
  const tray = Prim.rbox(w, 0.06, d, 0.012, mats.ceramic); tray.position.set(cx, 0.03, cz); st.add(tray);
  const drain = Prim.cylinder(0.04, 0.04, 0.004, chrome, { segments: 16, cast: false }); drain.position.set(cx, 0.062, cz); st.add(drain);
  const rail = (len: number, alongX: boolean, px: number, py: number, pz: number) => { const b = Prim.box(alongX ? len : 0.03, 0.03, alongX ? 0.03 : len, chrome); b.position.set(px, py, pz); st.add(b); };
  rail(w, true, cx, 0.075, z1); rail(w, true, cx, H, z1); // north panel: bottom + top rails
  rail(d, false, x1, H, cz);                               // header over the door side
  for (const [px, pz] of [[x1, z1], [x0 + 0.015, z1], [x1, z0 + 0.015]]) { const p = Prim.box(0.03, H - 0.06, 0.03, chrome); p.position.set(px, H / 2 + 0.03, pz); st.add(p); }
  // rain head on an arm from the west wall; mixer plate; corner shelf with bottles
  const arm = Prim.cylinder(0.012, 0.012, 0.44, chrome, { segments: 10 }); arm.rotation.z = Math.PI / 2; arm.position.set(x0 + 0.22, 2.14, cz); st.add(arm);
  const escutcheon = Prim.cylinder(0.035, 0.035, 0.01, chrome, { segments: 14 }); escutcheon.rotation.z = Math.PI / 2; escutcheon.position.set(x0 + 0.005, 2.14, cz); st.add(escutcheon);
  const head = Prim.cylinder(0.12, 0.12, 0.014, chrome, { segments: 24 }); head.position.set(x0 + 0.44, 2.125, cz); st.add(head);
  const face = Prim.cylinder(0.105, 0.105, 0.004, mats.solid(0xe8e8e6, { roughness: 0.6 }), { segments: 24, cast: false }); face.position.set(x0 + 0.44, 2.117, cz); st.add(face);
  const plate = Prim.rbox(0.012, 0.14, 0.14, 0.004, chrome); plate.position.set(x0 + 0.006, 1.15, cz + 0.12); st.add(plate);
  const diverter = Prim.cylinder(0.018, 0.018, 0.03, chrome, { segments: 12 }); diverter.rotation.z = Math.PI / 2; diverter.position.set(x0 + 0.02, 1.1, cz + 0.12); st.add(diverter);
  const shelf = Prim.box(0.24, 0.012, 0.24, mats.glassFrosted, { cast: false }); shelf.position.set(x0 + 0.12, 1.25, z0 + 0.12); shelf.userData.keepSeparate = true; st.add(shelf);
  const shelfBar = Prim.box(0.24, 0.012, 0.012, chrome); shelfBar.position.set(x0 + 0.12, 1.25, z0 + 0.24); st.add(shelfBar);
  const bottles: [BottleKind, number, number, number][] = [['pump', 0x2f4858, 0.06, 0.08], ['squeeze', 0xd8e2e8, 0.16, 0.07], ['tube', 0xe4c37a, 0.1, 0.16]];
  for (const [kind, c, bx, bz] of bottles) { const { g: b } = toiletryBottle(ctx, kind, c); b.position.set(x0 + bx, 1.256, z0 + bz); b.rotation.y = ctx.rng() * Math.PI; st.add(b); }
  place(st, 0, y, 0, 0);
  addStatic(ctx, st, [{ size: [w, 0.06, d], center: [cx, 0.03, cz] }], { surface: 'tile' });
  // entry ramp: the rounded player collider climbs a 0.06 step unreliably, so (like the stairs) an
  // invisible shallow ramp leads up onto the tray across the whole door side
  {
    const rampL = 0.22, rise = 0.06, ang = Math.atan2(rise, rampL);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -ang);
    ctx.physics.addBoxQuat({ x: x1 + rampL / 2 - 0.02 * Math.sin(ang), y: y + rise / 2 - 0.02 * Math.cos(ang), z: cz }, { x: Math.hypot(rampL, rise), y: 0.04, z: d }, q, { meta: { surface: 'tile' } });
  }
  // fixed north glass panel (+ collider)
  const glassM = mats.glassClear;
  const north = Prim.box(w - 0.04, H - 0.1, 0.008, glassM, { cast: false, receive: false }); north.position.set(cx, y + H / 2 + 0.03, z1); north.renderOrder = 10; ctx.dynamic.add(north);
  ctx.physics.addBox({ x: cx, y: y + H / 2, z: z1 }, { x: w, y: H, z: 0.03 }, 0, { meta: { surface: 'glass' } });
  // frameless door spanning the east side, hinged at the north corner post, opening outward (+x);
  // a kinematic collider follows the leaf
  const zh = z1 - 0.03;
  const leafL = zh - (z0 + 0.03);
  const root = new THREE.Group(); root.position.set(x1, y, zh); ctx.dynamic.add(root); root.updateMatrixWorld(true);
  const leafCenter = new THREE.Vector3(0, H / 2 + 0.03, -leafL / 2 - 0.005);
  const hp = hinged(ctx, root, new THREE.Vector3(0, 0, 0), (pivot) => {
    const leaf = new THREE.Group();
    const glass = Prim.box(0.008, H - 0.1, leafL - 0.02, glassM, { cast: false, receive: false }); glass.position.copy(leafCenter); glass.renderOrder = 10; glass.userData.keepSeparate = true; leaf.add(glass);
    const top = Prim.box(0.03, 0.03, leafL, chrome); top.position.set(0, 1.96, -leafL / 2 - 0.005); leaf.add(top);
    const bot = Prim.box(0.03, 0.03, leafL, chrome); bot.position.set(0, 0.09, -leafL / 2 - 0.005); leaf.add(bot);
    const hingeBar = Prim.box(0.03, H - 0.08, 0.03, chrome); hingeBar.position.set(0, H / 2 + 0.02, -0.01); leaf.add(hingeBar);
    for (const s of [-1, 1]) {
      const hb = Prim.cylinder(0.009, 0.009, 0.26, chrome, { segments: 10 }); hb.position.set(s * 0.045, 1.05, -leafL + 0.09); leaf.add(hb);
      for (const dy of [-0.1, 0.1]) { const stub = Prim.cylinder(0.007, 0.007, 0.045, chrome, { segments: 8 }); stub.rotation.z = Math.PI / 2; stub.position.set(s * 0.0225, 1.05 + dy, -leafL + 0.09); leaf.add(stub); }
    }
    pivot.add(mergeByMaterial(leaf));
  }, 'shower door', { maxAngle: -Math.PI * 0.5, sfx: 'doorOpen' });
  const kb = ctx.physics.addKinematicBox(root.localToWorld(leafCenter.clone()), new THREE.Vector3(0.03, H, leafL), new THREE.Quaternion(), { meta: { surface: 'glass' } });
  const _c = new THREE.Vector3(), _q = new THREE.Quaternion();
  ctx.onUpdate(() => {
    _c.copy(leafCenter); hp.pivot.localToWorld(_c); hp.pivot.getWorldQuaternion(_q);
    kb.body.setNextKinematicTranslation({ x: _c.x, y: _c.y, z: _c.z });
    kb.body.setNextKinematicRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w });
  });
  // mixer knob (dynamic toggle target) on the plate; it turns when the shower runs
  const kg = new THREE.Group();
  const knob = Prim.cylinder(0.03, 0.03, 0.05, chrome, { segments: 16 }); knob.rotation.z = Math.PI / 2; knob.position.set(0.025, 0, 0); kg.add(knob);
  const stalk = Prim.rbox(0.03, 0.012, 0.085, 0.004, chrome); stalk.position.set(0.05, 0, -0.035); kg.add(stalk);
  const mixer = mergeByMaterial(kg);
  mixer.position.set(x0 + 0.012, y + 1.17, cz + 0.12);
  ctx.dynamic.add(mixer);
  // drop spray from the rain head (Points), a wet puddle on the tray
  const N = 170;
  const headP = new THREE.Vector3(x0 + 0.44, y + 2.11, cz);
  const fall = headP.y - (y + 0.062);
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N * 4); // ox, oz, phase, speed
  for (let i = 0; i < N; i++) {
    const a = ctx.rng() * Math.PI * 2, r = Math.sqrt(ctx.rng()) * 0.105;
    seed[i * 4] = Math.cos(a) * r; seed[i * 4 + 1] = Math.sin(a) * r; seed[i * 4 + 2] = ctx.rng(); seed[i * 4 + 3] = 0.75 + ctx.rng() * 0.35;
    pos[i * 3] = headP.x + seed[i * 4]; pos[i * 3 + 1] = headP.y; pos[i * 3 + 2] = headP.z + seed[i * 4 + 1];
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.boundingSphere = new THREE.Sphere(new THREE.Vector3(headP.x, headP.y - fall / 2, headP.z), fall / 2 + 0.3);
  const spray = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xd6ecfa, size: 0.028, transparent: true, opacity: 0.7, depthWrite: false, sizeAttenuation: true }));
  spray.frustumCulled = false; spray.visible = false; spray.renderOrder = 12;
  ctx.dynamic.add(spray);
  const puddle = Prim.cylinder(0.3, 0.34, 0.004, mats.water, { segments: 24, cast: false, receive: false }); puddle.position.set(cx, y + 0.064, cz); puddle.visible = false; puddle.renderOrder = 12; ctx.dynamic.add(puddle);
  const focus = mixer.position.clone();
  const toggle = new Toggle(mixer, { on: 'Turn off shower', off: 'Turn on shower' }, (on) => {
    spray.visible = on; puddle.visible = on;
    mixer.rotation.x = on ? -1.2 : 0;
    if (on) { ctx.audio.play('water', focus); ctx.audio.startLoop('mbShower', 'water', headP, 0.3); } else ctx.audio.stopLoop('mbShower');
  }, focus);
  ctx.interact.add(toggle);
  ctx.onUpdate((_dt, t) => {
    if (!toggle.on) return;
    const p = sg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const f = (t * seed[i * 4 + 3] + seed[i * 4 + 2]) % 1;
      const ff = f * f * 0.6 + f * 0.4; // accelerate a little
      p.setXYZ(i, headP.x + seed[i * 4] * (1 + ff * 0.35), headP.y - ff * fall, headP.z + seed[i * 4 + 1] * (1 + ff * 0.35));
    }
    p.needsUpdate = true;
    const s = 1 + 0.06 * Math.sin(t * 9);
    puddle.scale.set(s, 1, 1 + 0.06 * Math.cos(t * 7));
  });
}

/** Chrome towel bar with draped towels (front +z out of the wall). */
function towelBar(ctx: Ctx, x: number, y: number, z: number, rotY: number, len: number, towels: [number, number, number][]) {
  const chrome = ctx.mats.chrome;
  const g = new THREE.Group();
  for (const s of [-1, 1]) { const br = Prim.box(0.02, 0.02, 0.075, chrome); br.position.set(s * (len / 2 - 0.02), 0, 0.0375); g.add(br); const pl = Prim.cylinder(0.02, 0.02, 0.006, chrome, { segments: 12 }); pl.rotation.x = Math.PI / 2; pl.position.set(s * (len / 2 - 0.02), 0, 0.003); g.add(pl); }
  const bar = Prim.cylinder(0.01, 0.01, len, chrome, { segments: 10 }); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0, 0.078); g.add(bar);
  for (const [tx, tw, tc] of towels) { const t = drapedTowel(ctx, tw, 0.62, tc); t.position.set(tx, 0, 0.078); t.rotation.y = (ctx.rng() - 0.5) * 0.06; g.add(t); }
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
}

/** Robe hook with a hanging bath towel (front +z out of the wall). */
function towelHook(ctx: Ctx, x: number, y: number, z: number, rotY: number, color: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const plate = Prim.cylinder(0.025, 0.025, 0.008, mats.chrome, { segments: 12 }); plate.rotation.x = Math.PI / 2; plate.position.z = 0.004; g.add(plate);
  const hook = Prim.torus(0.02, 0.006, mats.chrome, { arc: Math.PI }); hook.rotation.set(0, 0, Math.PI / 2); hook.position.set(0, 0, 0.02); g.add(hook);
  const towel = Prim.rbox(0.3, 0.6, 0.05, 0.02, mats.fabric(color)); towel.position.set(0.01, -0.32, 0.055); towel.rotation.z = 0.05; g.add(towel);
  const stripe = Prim.box(0.31, 0.03, 0.006, mats.fabric(new THREE.Color(color).multiplyScalar(0.75).getHex()), { cast: false }); stripe.position.set(0.01, -0.5, 0.083); stripe.rotation.z = 0.05; g.add(stripe);
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
}

/** Round wooden stool with a stack of folded towels. */
function towelStool(ctx: Ctx, x: number, z: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const wood = mats.oak;
  const top = Prim.cylinder(0.16, 0.16, 0.03, wood, { segments: 20 }); top.position.y = 0.435; g.add(top);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const leg = Prim.cylinder(0.014, 0.02, 0.43, wood, { segments: 8 });
    leg.position.set(Math.sin(a) * 0.11, 0.215, Math.cos(a) * 0.11);
    leg.rotation.set(Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12);
    g.add(leg);
  }
  const stack = foldedStack(ctx, [0xdfd8ca, 0x9fb7c9, 0xf2f2ec], 0.26, 0.2, 0.05); stack.position.set(0, 0.45, 0); g.add(stack);
  placeStatic(ctx, g, x, z, ctx.rng() * Math.PI, [{ size: [0.34, 0.6, 0.34], center: [0, 0.3, 0] }]);
}

/** Free-standing toilet-paper stand. */
function paperStand(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const base = Prim.cylinder(0.08, 0.09, 0.015, mats.chrome, { segments: 18 }); base.position.y = 0.0075; g.add(base);
  const pole = Prim.cylinder(0.008, 0.008, 0.6, mats.chrome, { segments: 8 }); pole.position.y = 0.315; g.add(pole);
  const arm = Prim.cylinder(0.006, 0.006, 0.14, mats.chrome, { segments: 6 }); arm.rotation.z = Math.PI / 2; arm.position.set(0.06, 0.6, 0); g.add(arm);
  const paper = mats.solid(0xf7f6f2, { roughness: 0.9 });
  const roll = Prim.cylinder(0.055, 0.055, 0.1, paper, { segments: 16 }); roll.rotation.z = Math.PI / 2; roll.position.set(0.07, 0.6, 0); g.add(roll);
  const core = Prim.cylinder(0.02, 0.02, 0.102, mats.solid(0xc9b79a, { roughness: 0.9 }), { segments: 10 }); core.rotation.z = Math.PI / 2; core.position.set(0.07, 0.6, 0); g.add(core);
  const spare = Prim.cylinder(0.055, 0.055, 0.1, paper, { segments: 16 }); spare.position.set(0, 0.065, 0); g.add(spare);
  placeStatic(ctx, g, x, z, rotY, [{ size: [0.18, 0.7, 0.18], center: [0, 0.35, 0] }]);
}

function toiletryPickup(ctx: Ctx, kind: BottleKind, color: number, x: number, y: number, z: number, name: string, capColor?: number) {
  const { g, r, h } = toiletryBottle(ctx, kind, color, capColor);
  g.position.set(x, y, z);
  g.rotation.y = ctx.rng() * Math.PI * 2;
  pickup(ctx, g, { name, mass: 0.3, shape: { type: 'cylinder', radius: r, height: h }, offset: new THREE.Vector3(0, h / 2, 0) });
}

export function buildMasterBath(ctx: Ctx) {
  const mats = ctx.mats;
  const y = FLOOR;

  tileWainscot(ctx);

  // ---- lighting ------------------------------------------------------------------------------
  recessedLight(ctx, -7.4, CEIL, (SOUTH + SH_Z1) / 2, 'masterbath');
  recessedLight(ctx, -6.45, CEIL, 0.55, 'masterbath');
  lightSwitch(ctx, -5.87, y + 1.22, NORTH, FACE.negZ, 'masterbath', 'bathroom lights'); // latch side of the door (hinge at x=-6.88)

  // ---- east wall: double vanity, mirror, three sconces ---------------------------------------------
  const vanityZ = 0.12; // local x (along the wall) maps to world +z; local z maps to world -x
  doubleVanity(ctx, EAST - TILE_T - 0.275, vanityZ, FACE.negX);
  vanityMirror(ctx, EAST - 0.001, y + 1.65, vanityZ, 1.62, 0.78);
  for (const dz of [-0.62, 0, 0.62]) sconce(ctx, EAST - 0.001, y + 2.2, vanityZ + dz, FACE.negX, 'masterbath');
  toiletryPickup(ctx, 'pump', 0xf1ede4, -5.275, y + 0.86, vanityZ - 0.14, 'hand soap', 0xc9c9c4);
  toiletryPickup(ctx, 'pump', 0xb9c6d1, -5.405, y + 0.86, vanityZ + 0.84, 'lotion', 0xf2f2ef);
  toiletryPickup(ctx, 'jar', 0xe8dcc8, -5.505, y + 0.86, vanityZ + 0.76, 'face cream', 0xd9c7a3);
  staticPlant(ctx, -5.235, y + 0.86, vanityZ + 0.12, 0.34, { potColor: 0xe8e0d0, collider: false });

  // ---- west wall: tub under the frosted window, floor-mounted filler, bath mat -------------------
  freestandingTub(ctx, -7.42, 0.55, 0);
  tubFiller(ctx, -6.93, 0.3, FACE.negX);
  {
    const mat = Prim.rbox(0.55, 0.018, 0.85, 0.008, mats.fabric(0xdfd8ca), { cast: false });
    place(mat, -6.72, y + 0.009, 0.85, 0);
    addStatic(ctx, mat);
  }
  staticPlant(ctx, -7.8, y + 1.35, 0, 0.38, { potColor: 0xf1ede4, collider: false });

  // ---- south-west: shower; south wall: toilet + paper stand ------------------------------------------
  showerEnclosure(ctx);
  toilet(ctx, -5.9, SOUTH + TILE_T + 0.39, FACE.posZ);
  paperStand(ctx, -5.35, -1.25, 0.3);

  // ---- towels, stool ----------------------------------------------------------------------------------
  towelBar(ctx, -7.42, y + 1.3, NORTH, FACE.negZ, 0.64, [[-0.15, 0.26, 0xdfd8ca], [0.16, 0.26, 0x9fb7c9]]);
  towelHook(ctx, -5.55, y + 1.78, NORTH, FACE.negZ, 0xdfd8ca);
  towelStool(ctx, -5.38, 1.24);
}
