/**
 * Hall-bathroom fixtures: the vanity (shaker doors, marble top with an undermount basin, running
 * faucet, framed mirror, sconces), the flushing toilet and the tub/shower combo (chrome fixtures,
 * bowed curtain rod with a pleated curtain, running spray). The room's layout constants live here
 * so the decor builder in Bathroom.ts shares them.
 */
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { Prim, place, mergeByMaterial, metricUV } from '../Builder';
import type { Ctx } from '../Context';
import type { Interactable } from '../Interactables';
import { LEVELS, roomById } from '../Plan';
import { addStatic, bulbMaterials, hinged, Toggle } from '../Props';

const room = roomById('bath');
export const F = LEVELS[room.floor].y;
export const C = F + LEVELS[room.floor].ceiling;
/** inner wall faces (interior walls are 0.12 thick) */
export const WX = room.x0 + 0.06, EX = room.x1 - 0.06, NZ = room.z0 + 0.06, SZ = room.z1 - 0.06;
/** wainscot / surround tile thickness (proud of the wall face) */
export const TILE_T = 0.012;
/** tub footprint: against the east wall, head end at the north wall */
export const TUB = { w: 0.76, l: 1.7, h: 0.55, x0: EX - 0.76, z1: NZ + 1.7 };
/** shower rod: L-shaped; the long leg runs along the tub's open side and bows outward */
export const ROD = { y: F + 1.98, x: 4.1, z1: TUB.z1 + 0.1 };
export const LIGHT_GROUP = 'bath';
/** vanity centre x (north wall) and the shower fixtures' x (north wall, over the tub) */
export const VANITY_X = 3.0;
export const SHOWER_X = TUB.x0 + TUB.w / 2;

export function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Lathe whose faces point INWARD (bowls, basins): mirror the profile and recompute normals. */
function innerLathe(points: [number, number][], mat: THREE.Material, segments = 32): THREE.Mesh {
  const m = Prim.lathe(points, mat, { segments });
  m.geometry.scale(-1, 1, 1);
  m.geometry.computeVertexNormals();
  return m;
}

// -------------------------------------------------------------------------------------------
// Vanity: shaker cabinet with two hinged doors, marble top, undermount basin, faucet, mirror, sconces
// -------------------------------------------------------------------------------------------

export function buildVanity(ctx: Ctx) {
  const m = ctx.mats;
  const W = 1.2, D = 0.52, H = 0.86;
  const cx = VANITY_X;
  const backZ = NZ + 0.04;
  const cz = backZ + D / 2;
  const paint = m.solid(0xf5f5f0, { roughness: 0.35, envMapIntensity: 0.5 });
  const inner = m.solid(0xe6e6e0, { roughness: 0.65 });
  const ch = m.chrome;
  const g = new THREE.Group();
  place(g, cx, F, cz, 0);
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material = paint) => {
    const b = Prim.box(w, h, d, mat); b.position.set(x, y, z); g.add(b); return b;
  };
  // toe kick + carcass
  box(W - 0.08, 0.1, D - 0.08, 0, 0.05, -0.04, inner);
  box(0.02, H - 0.1, D, -W / 2 + 0.01, 0.1 + (H - 0.1) / 2, 0);
  box(0.02, H - 0.1, D, W / 2 - 0.01, 0.1 + (H - 0.1) / 2, 0);
  box(W - 0.04, 0.02, D, 0, 0.11, 0, inner);
  box(W - 0.04, H - 0.12, 0.012, 0, 0.12 + (H - 0.12) / 2, -D / 2 + 0.006, inner);
  box(W - 0.04, 0.02, D - 0.06, 0, 0.45, -0.01, inner);
  // face frame: stiles, top rail (with two false drawer fronts) and bottom rail
  box(0.03, H - 0.1, 0.02, -W / 2 + 0.015, 0.1 + (H - 0.1) / 2, D / 2 - 0.01);
  box(0.03, H - 0.1, 0.02, W / 2 - 0.015, 0.1 + (H - 0.1) / 2, D / 2 - 0.01);
  box(W, 0.14, 0.02, 0, H - 0.07, D / 2 - 0.01);
  box(W, 0.024, 0.02, 0, 0.112, D / 2 - 0.01);
  for (const sx of [-1, 1]) {
    const front = Prim.rbox(0.54, 0.1, 0.018, 0.004, paint, { segments: 2 });
    front.position.set(sx * 0.29, H - 0.07, D / 2 + 0.009);
    g.add(front);
    const pull = Prim.rbox(0.1, 0.01, 0.012, 0.004, ch, { segments: 1 });
    pull.position.set(sx * 0.29, H - 0.07, D / 2 + 0.026);
    g.add(pull);
  }
  // inside the cabinet: spare rolls, a spray bottle, a stack of towels and a box on the shelf
  const paper = m.solid(0xf6f6f2, { roughness: 0.92 });
  for (let i = 0; i < 2; i++) {
    const roll = Prim.cylinder(0.055, 0.055, 0.1, paper, { segments: 16 });
    roll.position.set(-0.36, 0.17 + i * 0.1, -0.06);
    g.add(roll);
  }
  const bottle = Prim.cylinder(0.034, 0.036, 0.2, m.solid(0x3a7dd1, { roughness: 0.4 }), { segments: 14 });
  bottle.position.set(0.32, 0.22, -0.05); g.add(bottle);
  const trigger = Prim.rbox(0.03, 0.06, 0.055, 0.006, m.plasticWhite, { segments: 1 });
  trigger.position.set(0.32, 0.345, -0.03); g.add(trigger);
  const towelCols = [0xe9e4da, 0x9cb7c3, 0xf3f0ea];
  towelCols.forEach((c, i) => {
    const t = Prim.rbox(0.3, 0.04, 0.24, 0.012, m.fabric(c), { segments: 2 });
    t.position.set(-0.2, 0.48 + i * 0.04, -0.02);
    t.rotation.y = (ctx.rng() - 0.5) * 0.12;
    g.add(t);
  });
  const carton = Prim.rbox(0.2, 0.1, 0.12, 0.004, m.solid(0xd9c8a8, { roughness: 0.9 }), { segments: 1 });
  carton.position.set(0.25, 0.51, -0.04); g.add(carton);

  // marble top with an elliptical cutout for the undermount basin; backsplash against the tile
  const topFront = D / 2 + 0.03;
  const topBack = (NZ + TILE_T + 0.001) - cz;
  const topD = topFront - topBack, topZ = (topFront + topBack) / 2;
  const basinZ = 0.02;
  const shape = roundedRectShape(W + 0.04, topD, 0.02);
  const hole = new THREE.Path();
  hole.absellipse(0, -(basinZ - topZ), 0.25, 0.18, 0, Math.PI * 2, false);
  shape.holes.push(hole);
  const top = Prim.extrude(shape, 0.03, m.marble, { curveSegments: 24 });
  top.geometry.rotateX(-Math.PI / 2);
  top.position.set(0, H + 0.015, topZ);
  g.add(top);
  const splash = Prim.box(W + 0.04, 0.1, 0.02, m.marble);
  splash.position.set(0, H + 0.03 + 0.05, topBack + 0.01);
  g.add(splash);

  // basin: inward-facing lathe (what you see) + a slightly larger outward shell (seen from inside the cabinet)
  const prof: [number, number][] = [[0, 0], [0.09, 0], [0.15, 0.04], [0.185, 0.1], [0.2, 0.15]];
  const basin = innerLathe(prof, m.ceramic, 40);
  basin.scale.set(1.35, 1, 1);
  basin.position.set(0, H - 0.15, basinZ);
  g.add(basin);
  const shell = Prim.lathe(prof, m.ceramic, { segments: 40 });
  shell.scale.set(1.37, 1.02, 1.02);
  shell.position.set(0, H - 0.153, basinZ);
  g.add(shell);
  const drain = Prim.cylinder(0.02, 0.02, 0.004, m.darkMetal, { segments: 14, cast: false });
  drain.position.set(0, H - 0.148, basinZ);
  g.add(drain);
  // p-trap under the basin (visible when the doors are open)
  const trap = Prim.cylinder(0.02, 0.02, 0.12, ch, { segments: 10 });
  trap.position.set(0, H - 0.25, basinZ); g.add(trap);
  const trapBend = Prim.torus(0.05, 0.02, ch, { arc: Math.PI });
  trapBend.rotation.set(Math.PI / 2, 0, Math.PI); trapBend.position.set(0.05, H - 0.31, basinZ); g.add(trapBend);

  // top clutter: soap dispenser, toothbrush cup, folded hand towel
  const glassy = m.solid(0xd8e5ea, { roughness: 0.15, envMapIntensity: 1.0, physical: true, clearcoat: 0.8 });
  const disp = Prim.lathe([[0, 0], [0.03, 0], [0.032, 0.09], [0.022, 0.12], [0.022, 0.13], [0, 0.13]], glassy, { segments: 18 });
  disp.position.set(-0.45, H + 0.03, -0.14); g.add(disp);
  const pump = Prim.cylinder(0.008, 0.008, 0.04, ch, { segments: 8 }); pump.position.set(-0.45, H + 0.03 + 0.15, -0.14); g.add(pump);
  const pumpHead = Prim.rbox(0.02, 0.014, 0.045, 0.004, ch, { segments: 1 }); pumpHead.position.set(-0.45, H + 0.03 + 0.175, -0.125); g.add(pumpHead);
  const cup = Prim.lathe([[0, 0], [0.032, 0], [0.036, 0.1], [0.03, 0.1], [0.03, 0.01], [0, 0.01]], m.ceramic, { segments: 18 });
  cup.position.set(0.4, H + 0.03, -0.15); g.add(cup);
  for (const [dx, col, tilt] of [[-0.01, 0x3c8cd0, 0.12], [0.012, 0xd04e4e, -0.1]] as [number, number, number][]) {
    const tb = Prim.cylinder(0.006, 0.006, 0.19, m.solid(col, { roughness: 0.4 }), { segments: 8 });
    tb.position.set(0.4 + dx, H + 0.03 + 0.11, -0.15); tb.rotation.z = tilt; tb.rotation.x = -0.08;
    g.add(tb);
  }
  const hand = Prim.rbox(0.2, 0.03, 0.14, 0.012, m.fabric(0xf1efe8), { segments: 2 });
  hand.position.set(-0.42, H + 0.045, 0.14); hand.rotation.y = 0.15; g.add(hand);

  addStatic(ctx, g, [{ size: [W + 0.04, H + 0.03, topD + 0.02], center: [0, (H + 0.03) / 2, topZ] }], { surface: 'wood' });

  // shaker doors (dynamic, hinged on their outer edges)
  const doors = new THREE.Group();
  place(doors, cx, F, cz, 0);
  ctx.dynamic.add(doors);
  const dw = (W - 0.06) / 2 - 0.004, dh = H - 0.14 - 0.124 - 0.006, dy = 0.124 + dh / 2;
  for (const sign of [-1, 1] as const) {
    hinged(ctx, doors, new THREE.Vector3(sign * (W / 2 - 0.03), 0, D / 2 + 0.002), (pivot) => {
      const leaf = new THREE.Group();
      const rail = 0.075;
      const part = (w: number, h: number, x: number, y: number, z = 0.01, d = 0.02, mat: THREE.Material = paint) => {
        const b = Prim.box(w, h, d, mat); b.position.set(x, y, z); leaf.add(b); return b;
      };
      part(rail, dh, -sign * rail / 2, dy);
      part(rail, dh, -sign * (dw - rail / 2), dy);
      part(dw - 2 * rail, rail, -sign * dw / 2, dy + dh / 2 - rail / 2);
      part(dw - 2 * rail, rail, -sign * dw / 2, dy - dh / 2 + rail / 2);
      part(dw - 2 * rail + 0.02, dh - 2 * rail + 0.02, -sign * dw / 2, dy, 0.006, 0.012, inner);
      const knob = Prim.sphere(0.013, ch, { segments: 10 }); knob.position.set(-sign * (dw - 0.05), dy + 0.1, 0.034); leaf.add(knob);
      const stem = Prim.cylinder(0.005, 0.005, 0.016, ch, { segments: 6 }); stem.rotation.x = Math.PI / 2; stem.position.set(-sign * (dw - 0.05), dy + 0.1, 0.026); leaf.add(stem);
      pivot.add(mergeByMaterial(leaf));
    }, sign < 0 ? 'left vanity door' : 'right vanity door', { maxAngle: sign * Math.PI * 0.55, sfx: 'drawer' });
  }

  // faucet (dynamic: it is the toggle target) + water stream
  const fz = -0.21;
  const fg = new THREE.Group();
  const flange = Prim.cylinder(0.028, 0.03, 0.012, ch, { segments: 20 }); flange.position.y = 0.006; fg.add(flange);
  const body = Prim.cylinder(0.016, 0.018, 0.13, ch, { segments: 16 }); body.position.y = 0.071; fg.add(body);
  const cap = Prim.sphere(0.016, ch, { segments: 12 }); cap.position.y = 0.136; fg.add(cap);
  const spout = Prim.cylinder(0.011, 0.011, 0.16, ch, { segments: 12 }); spout.rotation.x = Math.PI / 2; spout.position.set(0, 0.125, 0.08); fg.add(spout);
  const tip = Prim.sphere(0.011, ch, { segments: 10 }); tip.position.set(0, 0.125, 0.16); fg.add(tip);
  const nozzle = Prim.cylinder(0.009, 0.009, 0.02, m.darkMetal, { segments: 10 }); nozzle.position.set(0, 0.112, 0.15); fg.add(nozzle);
  const lever = Prim.rbox(0.018, 0.012, 0.085, 0.004, ch, { segments: 2 }); lever.position.set(0, 0.15, -0.035); lever.rotation.x = 0.35; fg.add(lever);
  const faucet = mergeByMaterial(fg);
  faucet.position.set(cx, F + H + 0.03, cz + fz);
  ctx.dynamic.add(faucet);

  const tipY = F + H + 0.03 + 0.102, floorY = F + H - 0.15 + 0.004;
  const len = tipY - floorY;
  const wg = new THREE.Group();
  const stream = Prim.cylinder(0.004, 0.0065, len, m.water, { segments: 10, cast: false, receive: false });
  stream.position.y = -len / 2; wg.add(stream);
  const splashDisc = Prim.cylinder(0.035, 0.05, 0.005, m.water, { segments: 18, cast: false, receive: false });
  splashDisc.position.y = -len + 0.0025; wg.add(splashDisc);
  const water = mergeByMaterial(wg);
  water.position.set(cx, tipY, cz + fz + 0.15);
  water.visible = false;
  water.traverse((o) => { o.renderOrder = 12; });
  ctx.dynamic.add(water);
  const focus = new THREE.Vector3(cx, F + H + 0.15, cz + fz + 0.05);
  const toggle = new Toggle(faucet, { on: 'Turn off faucet', off: 'Turn on faucet' }, (on) => {
    water.visible = on;
    if (on) {
      ctx.audio.play('water', focus);
      ctx.audio.startLoop('water-bath', 'water', focus, 0.22);
    } else {
      ctx.audio.stopLoop('water-bath');
    }
  }, focus);
  ctx.interact.add(toggle);
  ctx.onUpdate((_dt, t) => {
    if (!toggle.on) return;
    water.scale.x = 1 + 0.22 * Math.sin(t * 43);
    water.scale.z = 1 + 0.22 * Math.cos(t * 37);
  });

  buildMirrorAndSconces(ctx, cx);
}

/** Framed mirror over the vanity with a chrome sconce on either side (group 'bath'). */
function buildMirrorAndSconces(ctx: Ctx, cx: number) {
  const m = ctx.mats;
  const ch = m.chrome;
  const g = new THREE.Group();
  const mw = 1.0, mh = 0.8, fw = 0.04, my = F + 1.72;
  const fm = m.solid(0x2a2623, { roughness: 0.55 });
  const bar = (w: number, h: number, x: number, y: number) => { const b = Prim.box(w, h, 0.03, fm); b.position.set(x, y, 0.015); g.add(b); };
  bar(mw + 2 * fw, fw, 0, mh / 2 + fw / 2);
  bar(mw + 2 * fw, fw, 0, -mh / 2 - fw / 2);
  bar(fw, mh, -mw / 2 - fw / 2, 0);
  bar(fw, mh, mw / 2 + fw / 2, 0);
  const glass = Prim.box(mw, mh, 0.006, m.mirror, { cast: false });
  glass.position.z = 0.022;
  g.add(glass);
  place(g, cx, my, NZ + TILE_T + 0.001, 0);
  addStatic(ctx, g);

  // sconces: wall plate, short arm, chrome cup, frosted globe
  const sg = new THREE.Group();
  const globeGeos: THREE.BufferGeometry[] = [];
  const bulbs = bulbMaterials(ctx, 0xfff0dc, 1.1);
  const positions: THREE.Vector3[] = [];
  for (const sx of [cx - 0.7, cx + 0.7]) {
    const plate = Prim.cylinder(0.045, 0.045, 0.012, ch, { segments: 20 });
    plate.rotation.x = Math.PI / 2; plate.position.set(sx, my, NZ + TILE_T + 0.006); sg.add(plate);
    const arm = Prim.cylinder(0.009, 0.009, 0.1, ch, { segments: 10 });
    arm.rotation.x = Math.PI / 2; arm.position.set(sx, my - 0.02, NZ + TILE_T + 0.062); sg.add(arm);
    const cup = Prim.lathe([[0, 0], [0.022, 0], [0.03, 0.03], [0.026, 0.032], [0, 0.032]], ch, { segments: 16 });
    cup.position.set(sx, my - 0.035, NZ + TILE_T + 0.11); sg.add(cup);
    const sphere = new THREE.SphereGeometry(0.06, 20, 14);
    sphere.translate(sx, my + 0.04, NZ + TILE_T + 0.11);
    globeGeos.push(sphere);
    positions.push(new THREE.Vector3(sx, my + 0.04, NZ + TILE_T + 0.14));
  }
  addStatic(ctx, sg);
  const merged = BufferGeometryUtils.mergeGeometries(globeGeos, false)!;
  for (const s of globeGeos) s.dispose();
  const globes = new THREE.Mesh(merged, bulbs.on);
  globes.castShadow = false;
  ctx.dynamic.add(globes);
  for (const p of positions) {
    ctx.lights.point(p.x, p.y, p.z, { group: LIGHT_GROUP, intensity: 4.5, distance: 4.5, color: 0xffe9d0, emissives: [{ mesh: globes, on: bulbs.on, off: bulbs.off }] });
  }
}

// -------------------------------------------------------------------------------------------
// Toilet with a flush lever and a swirling bowl
// -------------------------------------------------------------------------------------------

class FlushToilet implements Interactable {
  object: THREE.Object3D;
  proximity = true;
  radius = 2.2;
  private t = -1;
  private baseY: number;
  constructor(private ctx: Ctx, private lever: THREE.Group, private swirl: THREE.Group, public focus: THREE.Vector3) {
    this.object = lever;
    this.baseY = swirl.position.y;
  }
  getPrompt() { return this.t < 0 ? 'Flush' : null; }
  interact() {
    if (this.t >= 0) return;
    this.t = 0;
    this.ctx.audio.play('flush', this.focus);
  }
  update(dt: number) {
    if (this.t < 0) return;
    this.t += dt;
    const t = this.t;
    const lv = t < 0.15 ? t / 0.15 : t < 0.8 ? 1 - (t - 0.15) / 0.65 : 0;
    this.lever.rotation.z = -0.6 * lv;
    const s = t < 1.5 ? 1 - 0.72 * (t / 1.5) : t < 3.4 ? 0.28 + 0.72 * ((t - 1.5) / 1.9) : 1;
    this.swirl.scale.set(s, 1, s);
    this.swirl.position.y = this.baseY - 0.035 * ((1 - s) / 0.72);
    this.swirl.rotation.y += dt * (t < 2 ? 10 : 2.5);
    if (t > 3.5) {
      this.t = -1;
      this.lever.rotation.z = 0;
      this.swirl.scale.set(1, 1, 1);
      this.swirl.position.y = this.baseY;
    }
  }
}

/** Toilet facing local +z (bowl at +z, tank at -z); `x,z` is the group origin under the tank front. */
export function buildToilet(ctx: Ctx, x: number, z: number, rotY: number) {
  const m = ctx.mats;
  const cer = m.ceramic;
  const EL = 1.28; // bowl elongation along z
  const BZ = 0.2;  // bowl centre
  const g = new THREE.Group();
  place(g, x, F, z, rotY);
  const ped = Prim.lathe([[0, 0], [0.17, 0], [0.185, 0.03], [0.155, 0.12], [0.15, 0.25], [0.19, 0.33], [0.205, 0.38], [0.205, 0.405], [0.135, 0.405]], cer, { segments: 32 });
  ped.scale.set(1, 1, EL); ped.position.z = BZ; g.add(ped);
  const bowl = innerLathe([[0, 0.25], [0.06, 0.25], [0.11, 0.3], [0.13, 0.36], [0.136, 0.405]], cer, 32);
  bowl.scale.set(1, 1, EL); bowl.position.z = BZ; g.add(bowl);
  const hump = Prim.rbox(0.36, 0.36, 0.24, 0.03, cer, { segments: 2 }); hump.position.set(0, 0.22, -0.12); g.add(hump);
  const neck = Prim.box(0.3, 0.06, 0.16, cer); neck.position.set(0, 0.42, -0.13); g.add(neck);
  const tank = Prim.rbox(0.48, 0.36, 0.2, 0.015, cer, { segments: 2 }); tank.position.set(0, 0.62, -0.13); g.add(tank);
  const tankLid = Prim.rbox(0.5, 0.03, 0.22, 0.008, cer, { segments: 2 }); tankLid.position.set(0, 0.815, -0.13); g.add(tankLid);
  // seat (down) + lid (up, resting against the tank)
  const seatMat = m.solid(0xf7f7f3, { roughness: 0.3, envMapIntensity: 0.7 });
  const seat = Prim.lathe([[0.135, 0.41], [0.215, 0.41], [0.215, 0.432], [0.135, 0.432], [0.135, 0.41]], seatMat, { segments: 32 });
  seat.scale.set(1, 1, EL); seat.position.z = BZ; g.add(seat);
  const lid = Prim.rbox(0.4, 0.02, 0.5, 0.01, seatMat, { segments: 2 });
  lid.geometry.translate(0, 0, 0.25);
  lid.position.set(0, 0.45, 0.0); lid.rotation.x = -1.6; g.add(lid);
  for (const sx of [-1, 1]) {
    const h = Prim.rbox(0.03, 0.02, 0.04, 0.005, m.chrome, { segments: 1 }); h.position.set(sx * 0.09, 0.445, -0.01); g.add(h);
  }
  // supply valve + line to the wall
  const valve = Prim.cylinder(0.014, 0.014, 0.03, m.chrome, { segments: 10 }); valve.rotation.x = Math.PI / 2; valve.position.set(0.16, 0.2, -0.225); g.add(valve);
  const line = Prim.cylinder(0.005, 0.005, 0.26, m.chrome, { segments: 8 }); line.position.set(0.16, 0.33, -0.215); g.add(line);
  // tank-top clutter: tissues + a candle jar
  const tissues = Prim.rbox(0.12, 0.08, 0.12, 0.006, m.solid(0xd8c8b0, { roughness: 0.9 }), { segments: 1 }); tissues.position.set(0.1, 0.87, -0.13); tissues.rotation.y = 0.2; g.add(tissues);
  const tissue = Prim.box(0.05, 0.03, 0.002, m.solid(0xfafaf8, { roughness: 0.95 })); tissue.position.set(0.1, 0.92, -0.13); tissue.rotation.set(0.3, 0.2, 0.2); g.add(tissue);
  const jar = Prim.cylinder(0.035, 0.035, 0.07, m.solid(0xc9d6d9, { roughness: 0.2, envMapIntensity: 1.0, physical: true, clearcoat: 0.7 }), { segments: 16 }); jar.position.set(-0.13, 0.865, -0.13); g.add(jar);
  const wax = Prim.cylinder(0.03, 0.03, 0.01, m.solid(0xf1e6cf, { roughness: 0.9 }), { segments: 14 }); wax.position.set(-0.13, 0.895, -0.13); g.add(wax);
  addStatic(ctx, g, [{ size: [0.5, 0.86, 0.72], center: [0, 0.43, 0.1] }], { surface: 'tile' });

  // dynamic parts: flush lever + swirling water
  const dyn = new THREE.Group();
  place(dyn, x, F, z, rotY);
  ctx.dynamic.add(dyn);
  const lever = new THREE.Group();
  lever.position.set(-0.19, 0.74, -0.03);
  const lbase = Prim.cylinder(0.013, 0.013, 0.012, m.chrome, { segments: 12 }); lbase.rotation.x = Math.PI / 2; lbase.position.z = -0.006; lever.add(lbase);
  const larm = Prim.rbox(0.075, 0.012, 0.01, 0.004, m.chrome, { segments: 1 }); larm.position.set(0.04, 0, -0.017); lever.add(larm);
  dyn.add(lever);
  const swirl = new THREE.Group();
  swirl.position.set(0, 0.29, BZ);
  const disc = Prim.cylinder(0.085, 0.085, 0.004, m.water, { segments: 20, cast: false, receive: false });
  disc.scale.z = EL; disc.renderOrder = 11; swirl.add(disc);
  const foam = Prim.cylinder(0.022, 0.022, 0.003, m.solid(0xf2f9fc, { roughness: 0.7 }), { segments: 10, cast: false });
  foam.position.set(0.04, 0.003, 0.01); swirl.add(foam);
  dyn.add(swirl);
  dyn.updateWorldMatrix(true, true);
  const focus = lever.getWorldPosition(new THREE.Vector3());
  ctx.interact.add(new FlushToilet(ctx, lever, swirl, focus));
}

// -------------------------------------------------------------------------------------------
// Tub + shower: rim with an elliptical bowl, chrome fixtures (toggle), spray, rod and curtain
// -------------------------------------------------------------------------------------------

export function buildTub(ctx: Ctx) {
  const m = ctx.mats;
  const cer = m.ceramic;
  const { w: W, l: L, h: H } = TUB;
  const cx = TUB.x0 + W / 2, cz = NZ + L / 2;
  const g = new THREE.Group();
  place(g, cx, F, cz, 0);
  const shape = roundedRectShape(W, L, 0.03);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, 0.31, 0.77, 0, Math.PI * 2, false);
  shape.holes.push(hole);
  const rim = Prim.extrude(shape, 0.035, cer, { curveSegments: 24 });
  rim.geometry.rotateX(-Math.PI / 2);
  rim.position.y = H - 0.0175;
  g.add(rim);
  const bowl = innerLathe([[0, 0.1], [0.2, 0.1], [0.29, 0.17], [0.34, 0.32], [0.355, 0.45], [0.36, H - 0.03]], cer, 40);
  bowl.scale.set(0.31 / 0.36, 1, 0.77 / 0.36);
  g.add(bowl);
  const apronW = Prim.box(0.03, H - 0.035, L, cer); apronW.position.set(-W / 2 + 0.015, (H - 0.035) / 2, 0); g.add(apronW);
  const apronS = Prim.box(W, H - 0.035, 0.03, cer); apronS.position.set(0, (H - 0.035) / 2, L / 2 - 0.015); g.add(apronS);
  const fill = Prim.box(W - 0.08, 0.08, L - 0.08, cer, { cast: false }); fill.position.set(0, 0.04, 0); g.add(fill);
  const drain = Prim.cylinder(0.03, 0.03, 0.004, m.chrome, { segments: 16, cast: false }); drain.position.set(0, 0.102, -0.55); g.add(drain);
  const overflow = Prim.cylinder(0.035, 0.035, 0.008, m.chrome, { segments: 16 }); overflow.rotation.x = Math.PI / 2; overflow.position.set(0, 0.36, -L / 2 + 0.06); g.add(overflow);
  // a folded washcloth and a rubber duck on the rim
  const cloth = Prim.rbox(0.14, 0.02, 0.1, 0.008, m.fabric(0x9cb7c3), { segments: 2 }); cloth.position.set(-W / 2 + 0.05, H + 0.01, L / 2 - 0.12); cloth.rotation.y = 0.2; g.add(cloth);
  const duckMat = m.solid(0xf4c430, { roughness: 0.4 });
  const duckBody = Prim.sphere(0.035, duckMat, { segments: 12 }); duckBody.scale.set(1.3, 0.8, 1); duckBody.position.set(W / 2 - 0.05, H + 0.028, 0.45); g.add(duckBody);
  const duckHead = Prim.sphere(0.024, duckMat, { segments: 10 }); duckHead.position.set(W / 2 - 0.05, H + 0.065, 0.42); g.add(duckHead);
  const beak = Prim.cone(0.01, 0.02, m.solid(0xe8702a, { roughness: 0.5 }), { segments: 8 }); beak.rotation.x = -Math.PI / 2; beak.position.set(W / 2 - 0.05, H + 0.06, 0.39); g.add(beak);
  addStatic(ctx, g, [
    { size: [0.06, H, L], center: [-W / 2 + 0.03, H / 2, 0] },
    { size: [W, H, 0.06], center: [0, H / 2, L / 2 - 0.03] },
    { size: [W, 0.1, L], center: [0, 0.05, 0] },
  ], { surface: 'tile' });

  buildShowerFixtures(ctx, cx, cz);
  buildShowerRodAndCurtain(ctx);
}

/** Chrome tub spout, mixer and shower arm/head on the north wall (dynamic: the shower toggle target). */
function buildShowerFixtures(ctx: Ctx, tubCx: number, tubCz: number) {
  const m = ctx.mats;
  const ch = m.chrome;
  const sg = new THREE.Group();
  const esc = (y: number, r: number, t: number) => {
    const e = Prim.cylinder(r, r, t, ch, { segments: 20 }); e.rotation.x = Math.PI / 2; e.position.set(0, y, TILE_T + t / 2); sg.add(e);
  };
  esc(0.72, 0.035, 0.01);
  const spout = Prim.cylinder(0.017, 0.02, 0.15, ch, { segments: 14 }); spout.rotation.x = Math.PI / 2; spout.position.set(0, 0.72, TILE_T + 0.075); sg.add(spout);
  const spoutEnd = Prim.cylinder(0.02, 0.017, 0.035, ch, { segments: 14 }); spoutEnd.position.set(0, 0.705, TILE_T + 0.15); sg.add(spoutEnd);
  esc(1.12, 0.07, 0.014);
  const stem = Prim.cylinder(0.022, 0.024, 0.04, ch, { segments: 14 }); stem.rotation.x = Math.PI / 2; stem.position.set(0, 1.12, TILE_T + 0.034); sg.add(stem);
  const handle = Prim.rbox(0.025, 0.13, 0.02, 0.008, ch, { segments: 2 }); handle.position.set(0, 1.12 + 0.05, TILE_T + 0.06); handle.rotation.x = -0.2; sg.add(handle);
  esc(1.98, 0.035, 0.01);
  const armL = 0.32, tilt = 0.22;
  const arm = Prim.cylinder(0.011, 0.011, armL, ch, { segments: 12 });
  arm.rotation.x = Math.PI / 2 + tilt;
  arm.position.set(0, 1.98 - Math.sin(tilt) * armL / 2, TILE_T + Math.cos(tilt) * armL / 2);
  sg.add(arm);
  const headY = 1.98 - Math.sin(tilt) * armL, headZ = TILE_T + Math.cos(tilt) * armL;
  const ball = Prim.sphere(0.02, ch, { segments: 12 }); ball.position.set(0, headY, headZ); sg.add(ball);
  const head = Prim.lathe([[0, 0], [0.075, 0], [0.085, 0.015], [0.08, 0.035], [0.02, 0.05], [0, 0.05]], ch, { segments: 28 });
  head.position.set(0, headY - 0.03, headZ + 0.01); head.rotation.x = -0.35; sg.add(head);
  const face = Prim.cylinder(0.062, 0.062, 0.003, m.darkMetal, { segments: 24, cast: false });
  face.position.set(0, headY - 0.03, headZ + 0.01); face.rotation.x = -0.35; sg.add(face);
  const fixtures = mergeByMaterial(sg);
  place(fixtures, SHOWER_X, F, NZ, 0);
  ctx.dynamic.add(fixtures);

  // spray: ballistic drops from the head to the tub floor, plus a puddle where they land
  const origin = new THREE.Vector3(SHOWER_X, F + headY - 0.045, NZ + headZ + 0.02);
  const G = 5.5, floorY = F + 0.104;
  const N = 160;
  const pos = new Float32Array(N * 3);
  const vel: THREE.Vector3[] = [], life: number[] = [], phase: number[] = [];
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3((Math.random() - 0.5) * 0.7, -1.9 + (Math.random() - 0.5) * 0.4, 0.62 + (Math.random() - 0.5) * 0.55);
    const h = origin.y - floorY;
    const T = (v.y + Math.sqrt(v.y * v.y + 2 * G * h)) / G;
    vel.push(v); life.push(T); phase.push(Math.random() * T);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(origin.x, (origin.y + floorY) / 2, origin.z + 0.2), 1.4);
  const drops = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd6ecf8, size: 0.02, transparent: true, opacity: 0.75, depthWrite: false, sizeAttenuation: true }));
  drops.renderOrder = 13;
  const spray = new THREE.Group();
  spray.add(drops);
  const landZ = origin.z + 0.62 * 0.53;
  const puddle = Prim.cylinder(0.15, 0.15, 0.004, m.water, { segments: 20, cast: false, receive: false });
  puddle.scale.z = 1.7; puddle.position.set(tubCx, floorY, landZ); puddle.renderOrder = 12;
  spray.add(puddle);
  spray.visible = false;
  ctx.dynamic.add(spray);
  void tubCz;
  const focus = new THREE.Vector3(SHOWER_X, F + 1.12, NZ + 0.1);
  const toggle = new Toggle(fixtures, { on: 'Turn off shower', off: 'Turn on shower' }, (on) => {
    spray.visible = on;
    if (on) {
      ctx.audio.play('water', origin);
      ctx.audio.startLoop('shower-bath', 'water', origin, 0.32);
    } else {
      ctx.audio.stopLoop('shower-bath');
    }
  }, focus);
  ctx.interact.add(toggle);
  ctx.onUpdate((_dt, t) => {
    if (!toggle.on) return;
    const attr = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const T = life[i];
      const tt = (t + phase[i]) % T;
      const v = vel[i];
      attr.setXYZ(i, origin.x + v.x * tt, origin.y + v.y * tt - 0.5 * G * tt * tt, origin.z + v.z * tt);
    }
    attr.needsUpdate = true;
    const s = 1 + 0.06 * Math.sin(t * 9);
    puddle.scale.set(s, 1, 1.7 * (1 + 0.05 * Math.cos(t * 7)));
  });
}

/** L-shaped chrome rod (short return leg to the east wall, bowed long leg), rings and a pleated curtain drawn half open. */
function buildShowerRodAndCurtain(ctx: Ctx) {
  const m = ctx.mats;
  const ch = m.chrome;
  const g = new THREE.Group();
  const y = ROD.y;
  const ret = Prim.cylinder(0.012, 0.012, EX - ROD.x, ch, { segments: 12 });
  ret.rotation.z = Math.PI / 2; ret.position.set((EX + ROD.x) / 2, y, ROD.z1); g.add(ret);
  const fl1 = Prim.cylinder(0.03, 0.03, 0.012, ch, { segments: 16 }); fl1.rotation.z = Math.PI / 2; fl1.position.set(EX - TILE_T - 0.006, y, ROD.z1); g.add(fl1);
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(ROD.x, y, ROD.z1),
    new THREE.Vector3(ROD.x - 0.24, y, (ROD.z1 + NZ) / 2),
    new THREE.Vector3(ROD.x, y, NZ + TILE_T),
  );
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.012, 8, false), ch);
  tube.castShadow = true; tube.receiveShadow = true;
  g.add(tube);
  const fl2 = Prim.cylinder(0.03, 0.03, 0.012, ch, { segments: 16 }); fl2.rotation.x = Math.PI / 2; fl2.position.set(ROD.x, y, NZ + TILE_T + 0.006); g.add(fl2);
  const joint = Prim.sphere(0.017, ch, { segments: 12 }); joint.position.set(ROD.x, y, ROD.z1); g.add(joint);
  const sup = Prim.cylinder(0.008, 0.008, C - y, ch, { segments: 10 }); sup.position.set(ROD.x, (C + y) / 2, ROD.z1); g.add(sup);
  const fl3 = Prim.cylinder(0.03, 0.03, 0.012, ch, { segments: 16 }); fl3.position.set(ROD.x, C - 0.006, ROD.z1); g.add(fl3);

  // curtain: bunched toward the corner (t 0..0.55 of the long leg), pleats displaced across the rod line
  const t0 = 0.015, t1 = 0.55;
  const Lc = curve.getLength() * (t1 - t0);
  const Hc = 1.8;
  const bottomY = F + 0.15;
  const geo = new THREE.BoxGeometry(0.02, Hc, Lc, 1, 8, 60);
  const pa = geo.attributes.position as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let i = 0; i < pa.count; i++) {
    const xl = pa.getX(i), yl = pa.getY(i), zl = pa.getZ(i);
    const u = (zl + Lc / 2) / Lc;
    curve.getPoint(t0 + (t1 - t0) * u, p);
    const hang = 0.5 - yl / Hc; // 0 at the top, 1 at the hem
    const pleat = Math.sin(u * Lc * (Math.PI * 2 / 0.11)) * (0.035 + 0.02 * hang) + Math.sin(yl * 2.5 + u * 9) * 0.008 * hang;
    pa.setXYZ(i, p.x - ROD.x + xl + pleat, yl, p.z);
  }
  geo.computeVertexNormals();
  const curtainMat = m.fabric(0xe3ebee);
  metricUV(geo, curtainMat.userData.texSize ?? 0.5);
  const curtain = new THREE.Mesh(geo, curtainMat);
  curtain.castShadow = true; curtain.receiveShadow = true;
  curtain.position.set(ROD.x, bottomY + Hc / 2, 0);
  g.add(curtain);
  // rings along the curtain's stretch of rod
  const n = 13;
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const t = t0 + (t1 - t0) * (i / (n - 1));
    curve.getPoint(t, p);
    const ring = Prim.torus(0.02, 0.0035, ch);
    ring.quaternion.setFromUnitVectors(up, curve.getTangent(t).normalize());
    ring.position.set(p.x, p.y - 0.01, p.z);
    g.add(ring);
  }
  addStatic(ctx, g);
}
