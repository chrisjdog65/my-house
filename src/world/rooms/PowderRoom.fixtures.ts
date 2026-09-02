/**
 * Powder-room fixtures: the pedestal sink (console top with a basin cut-out, oval column, cross
 * handles, gooseneck faucet that runs), the oval framed mirror with a chrome sconce on either side
 * (group 'powder'), and the flushing toilet (lever animation + swirling bowl).
 */
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { Prim, place, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import type { Interactable } from '../Interactables';
import { addStatic, bulbMaterials, pickup, Toggle } from '../Props';
import { BB, EX, F, LIGHT_GROUP, SINK_X, SZ, TOILET_Z, innerLathe, roundedRectShape } from './PowderRoom.layout';

// -------------------------------------------------------------------------------------------
// Pedestal sink
// -------------------------------------------------------------------------------------------

/** sink geometry shared with the decor builder (soap dish position etc.) */
export const SINK = { w: 0.6, d: 0.48, h: 0.85, backZ: SZ - BB - 0.002 };
export const SINK_CZ = SINK.backZ - SINK.d / 2;

export function buildPedestalSink(ctx: Ctx) {
  const m = ctx.mats;
  const cer = m.ceramic, ch = m.chrome;
  const { w: TW, d: TD, h: H } = SINK;
  const TT = 0.03;
  const BOWL_Z = -0.03, BOWL_RX = 0.21, BOWL_RZ = 0.155, BOWL_D = 0.14;
  const cx = SINK_X, cz = SINK_CZ;
  const g = new THREE.Group();
  place(g, cx, F, cz, 0);

  // oval column flaring at the foot and up under the basin
  const ped = Prim.lathe([[0, 0], [0.135, 0], [0.145, 0.025], [0.12, 0.07], [0.085, 0.22], [0.072, 0.42], [0.08, 0.56], [0.125, 0.68], [0.175, 0.77], [0.185, 0.81], [0.185, 0.825], [0, 0.825]], cer, { segments: 32 });
  ped.scale.set(1.2, 1, 1);
  ped.position.z = 0.03;
  g.add(ped);

  // console top: rounded slab with an elliptical basin cut-out (the bowl sits a little forward)
  const shape = roundedRectShape(TW, TD, 0.1);
  const hole = new THREE.Path();
  hole.absellipse(0, -BOWL_Z, BOWL_RX, BOWL_RZ, 0, Math.PI * 2, false, 0);
  shape.holes.push(hole);
  const top = Prim.extrude(shape, TT, cer, { curveSegments: 20 });
  top.geometry.rotateX(-Math.PI / 2);
  top.position.y = H - TT / 2;
  g.add(top);
  // basin: inward-facing lathe plus a slightly larger outer shell for the underside
  const prof: [number, number][] = [[0, 0], [0.09, 0], [0.16, 0.04], [0.2, 0.09], [BOWL_RX + 0.006, BOWL_D]];
  const bowl = innerLathe(prof, cer, 36);
  bowl.scale.set(1, 1, BOWL_RZ / BOWL_RX);
  bowl.position.set(0, H - BOWL_D, BOWL_Z);
  g.add(bowl);
  const shell = Prim.lathe(prof, cer, { segments: 36 });
  shell.scale.set(1.02, 1.02, (BOWL_RZ / BOWL_RX) * 1.02);
  shell.position.set(0, H - BOWL_D - 0.004, BOWL_Z);
  g.add(shell);
  const drain = Prim.cylinder(0.018, 0.018, 0.003, m.darkMetal, { segments: 14, cast: false });
  drain.position.set(0, H - BOWL_D + 0.002, BOWL_Z);
  g.add(drain);

  // hot / cold cross handles on the rear deck
  const cross = (x: number, dotColor: number) => {
    const base = Prim.cylinder(0.017, 0.021, 0.02, ch, { segments: 14 }); base.position.set(x, H + 0.01, 0.18); g.add(base);
    const stem = Prim.cylinder(0.007, 0.007, 0.03, ch, { segments: 8 }); stem.position.set(x, H + 0.03, 0.18); g.add(stem);
    for (const r of [0, Math.PI / 2]) {
      const arm = Prim.rbox(0.05, 0.008, 0.008, 0.003, ch, { segments: 1 }); arm.position.set(x, H + 0.046, 0.18); arm.rotation.y = r + 0.4; g.add(arm);
    }
    const dot = Prim.cylinder(0.006, 0.006, 0.002, m.solid(dotColor, { roughness: 0.4 }), { segments: 8, cast: false }); dot.position.set(x, H + 0.051, 0.18); g.add(dot);
  };
  cross(-0.1, 0xc0392b);
  cross(0.1, 0x2c6fbb);

  // supply valves + risers to the wall behind the column
  for (const sx of [-0.09, 0.09]) {
    const esc = Prim.cylinder(0.022, 0.022, 0.008, ch, { segments: 12 }); esc.rotation.x = Math.PI / 2; esc.position.set(sx, 0.5, TD / 2 - 0.004); g.add(esc);
    const valve = Prim.cylinder(0.012, 0.012, 0.05, ch, { segments: 10 }); valve.rotation.x = Math.PI / 2; valve.position.set(sx, 0.5, TD / 2 - 0.03); g.add(valve);
    const knob = Prim.cylinder(0.02, 0.02, 0.008, ch, { segments: 12 }); knob.rotation.x = Math.PI / 2; knob.position.set(sx, 0.5, TD / 2 - 0.058); g.add(knob);
    const line = Prim.cylinder(0.005, 0.005, 0.26, ch, { segments: 8 }); line.position.set(sx, 0.63, TD / 2 - 0.05); g.add(line);
  }
  // small marble dish on the rear-left corner of the deck (the soap dispenser pickup stands in it)
  const dish = Prim.lathe([[0, 0], [0.046, 0], [0.05, 0.006], [0.05, 0.014], [0.045, 0.014], [0.042, 0.004], [0, 0.004]], m.marble, { segments: 20 });
  dish.position.set(-0.235, H, 0.15);
  g.add(dish);
  // reed diffuser on the rear-right corner
  const diff = Prim.lathe([[0, 0], [0.024, 0], [0.027, 0.01], [0.027, 0.06], [0.016, 0.075], [0.008, 0.08], [0.008, 0.095], [0, 0.095]], m.solid(0x5a4a3c, { roughness: 0.2, envMapIntensity: 1.0, physical: true, clearcoat: 0.8 }), { segments: 16 });
  diff.position.set(0.235, H, 0.15);
  g.add(diff);
  const reedMat = m.solid(0xb99a6b, { roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const reed = Prim.cylinder(0.0015, 0.0015, 0.22, reedMat, { segments: 6, cast: false });
    reed.position.set(0.235 + Math.sin(a) * 0.03, H + 0.19, 0.15 + Math.cos(a) * 0.02);
    reed.rotation.set(Math.cos(a) * 0.22, 0, -Math.sin(a) * 0.22);
    g.add(reed);
  }
  addStatic(ctx, g, [{ size: [TW + 0.02, H, TD], center: [0, H / 2, 0] }], { surface: 'tile' });

  // gooseneck faucet (dynamic: the toggle target)
  const FZ = 0.18;
  const fg = new THREE.Group();
  const flange = Prim.cylinder(0.026, 0.03, 0.01, ch, { segments: 18 }); flange.position.y = 0.005; fg.add(flange);
  const body = Prim.cylinder(0.014, 0.017, 0.125, ch, { segments: 14 }); body.position.y = 0.0675; fg.add(body);
  const R = 0.045;
  const neck = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 8, 14, Math.PI / 2), ch);
  neck.rotation.y = -Math.PI / 2;
  neck.position.set(0, 0.13, -R);
  neck.castShadow = true; neck.receiveShadow = true;
  fg.add(neck);
  const spout = Prim.cylinder(0.012, 0.012, 0.09, ch, { segments: 12 }); spout.rotation.x = Math.PI / 2; spout.position.set(0, 0.13 + R, -R - 0.045); fg.add(spout);
  const tip = Prim.sphere(0.012, ch, { segments: 10 }); tip.position.set(0, 0.13 + R, -R - 0.09); fg.add(tip);
  const nozzle = Prim.cylinder(0.009, 0.009, 0.02, m.darkMetal, { segments: 10 }); nozzle.position.set(0, 0.13 + R - 0.014, -R - 0.09); fg.add(nozzle);
  const faucet = mergeByMaterial(fg);
  faucet.position.set(cx, F + H, cz + FZ);
  ctx.dynamic.add(faucet);

  // water stream from the aerator down into the bowl (+ a splash ring where it lands)
  const tipY = F + H + 0.13 + R - 0.024;
  const landZ = cz + FZ - R - 0.09;
  const landY = F + H - BOWL_D + 0.01;
  const len = tipY - landY;
  const wg = new THREE.Group();
  const stream = Prim.cylinder(0.0035, 0.006, len, m.water, { segments: 10, cast: false, receive: false });
  stream.position.y = -len / 2; wg.add(stream);
  const splash = Prim.cylinder(0.03, 0.045, 0.004, m.water, { segments: 16, cast: false, receive: false });
  splash.position.y = -len + 0.002; wg.add(splash);
  const water = mergeByMaterial(wg);
  water.position.set(cx, tipY, landZ);
  water.visible = false;
  water.traverse((o) => { o.renderOrder = 12; });
  ctx.dynamic.add(water);
  const focus = new THREE.Vector3(cx, F + H + 0.12, cz + 0.05);
  const toggle = new Toggle(faucet, { on: 'Turn off faucet', off: 'Turn on faucet' }, (on) => {
    water.visible = on;
    if (on) {
      ctx.audio.play('water', focus);
      ctx.audio.startLoop('water-powder', 'water', focus, 0.2);
    } else {
      ctx.audio.stopLoop('water-powder');
    }
  }, focus);
  ctx.interact.add(toggle);
  ctx.onUpdate((_dt, t) => {
    if (!toggle.on) return;
    water.scale.x = 1 + 0.2 * Math.sin(t * 41);
    water.scale.z = 1 + 0.2 * Math.cos(t * 35);
  });

  soapDispenser(ctx, cx - 0.235, F + H + 0.005, cz + 0.15);
}

/** Ceramic soap dispenser with a chrome pump (pickup). */
function soapDispenser(ctx: Ctx, x: number, y: number, z: number) {
  const m = ctx.mats;
  const ch = m.chrome;
  const g = new THREE.Group();
  const body = Prim.lathe([[0, 0], [0.026, 0], [0.029, 0.01], [0.029, 0.08], [0.024, 0.098], [0.013, 0.104], [0, 0.104]], m.solid(0xf0ede6, { roughness: 0.3, envMapIntensity: 0.8, physical: true, clearcoat: 0.5 }), { segments: 18 });
  g.add(body);
  const collar = Prim.cylinder(0.013, 0.013, 0.02, ch, { segments: 10 }); collar.position.y = 0.112; g.add(collar);
  const stem = Prim.cylinder(0.005, 0.005, 0.03, ch, { segments: 8 }); stem.position.y = 0.135; g.add(stem);
  const head = Prim.rbox(0.016, 0.012, 0.038, 0.004, ch, { segments: 1 }); head.position.set(0, 0.152, 0.011); g.add(head);
  const merged = mergeByMaterial(g);
  merged.position.set(x, y, z);
  merged.rotation.y = 0.5;
  return pickup(ctx, merged, { name: 'soap dispenser', mass: 0.35, shape: { type: 'cylinder', radius: 0.03, height: 0.16 }, offset: new THREE.Vector3(0, 0.08, 0) });
}

// -------------------------------------------------------------------------------------------
// Oval framed mirror + two chrome sconces
// -------------------------------------------------------------------------------------------

export const MIRROR_Y = F + 1.62;

export function buildMirrorAndSconces(ctx: Ctx) {
  const m = ctx.mats;
  const ch = m.chrome;
  const cx = SINK_X, my = MIRROR_Y, wallZ = SZ - BB - 0.001;
  const frameMat = m.solid(0x3a3129, { roughness: 0.45, metalness: 0.4, envMapIntensity: 0.8 });
  const g = new THREE.Group();
  const ring = new THREE.Shape();
  ring.absellipse(0, 0, 0.28, 0.37, 0, Math.PI * 2, false, 0);
  const inner = new THREE.Path();
  inner.absellipse(0, 0, 0.245, 0.335, 0, Math.PI * 2, true, 0);
  ring.holes.push(inner);
  const frame = Prim.extrude(ring, 0.024, frameMat, { bevel: 0.006, curveSegments: 28 });
  frame.position.z = 0.018;
  g.add(frame);
  const glassShape = new THREE.Shape();
  glassShape.absellipse(0, 0, 0.255, 0.345, 0, Math.PI * 2, false, 0);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(glassShape, 28), m.mirror);
  glass.position.z = 0.008;
  glass.castShadow = false; glass.receiveShadow = true;
  g.add(glass);
  place(g, cx, my, wallZ, Math.PI);
  addStatic(ctx, g);

  // sconces: wall plate, arm, chrome cup, frosted globe
  const sg = new THREE.Group();
  const globeGeos: THREE.BufferGeometry[] = [];
  const bulbs = bulbMaterials(ctx, 0xfff0dc, 1.1);
  const lightPos: THREE.Vector3[] = [];
  for (const sx of [cx - 0.42, cx + 0.42]) {
    const plate = Prim.cylinder(0.04, 0.04, 0.012, ch, { segments: 18 });
    plate.rotation.x = Math.PI / 2; plate.position.set(sx, my, wallZ - 0.006); sg.add(plate);
    const arm = Prim.cylinder(0.008, 0.008, 0.09, ch, { segments: 10 });
    arm.rotation.x = Math.PI / 2; arm.position.set(sx, my - 0.018, wallZ - 0.05); sg.add(arm);
    const cup = Prim.lathe([[0, 0], [0.02, 0], [0.028, 0.03], [0.024, 0.032], [0, 0.032]], ch, { segments: 16 });
    cup.position.set(sx, my - 0.035, wallZ - 0.1); sg.add(cup);
    const sphere = new THREE.SphereGeometry(0.055, 20, 14);
    sphere.translate(sx, my + 0.035, wallZ - 0.1);
    globeGeos.push(sphere);
    lightPos.push(new THREE.Vector3(sx, my + 0.05, wallZ - 0.28));
  }
  addStatic(ctx, sg);
  const merged = BufferGeometryUtils.mergeGeometries(globeGeos, false)!;
  for (const s of globeGeos) s.dispose();
  const globes = new THREE.Mesh(merged, bulbs.on);
  globes.castShadow = false;
  globes.name = 'powderSconces';
  ctx.dynamic.add(globes);
  for (const p of lightPos) {
    // small room: keep these gentle or the walls blow out
    ctx.lights.point(p.x, p.y, p.z, { group: LIGHT_GROUP, intensity: 1.3, distance: 3.5, color: 0xffe9d0, emissives: [{ mesh: globes, on: bulbs.on, off: bulbs.off }] });
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
    // lever: quick press, slow return
    const lv = t < 0.15 ? t / 0.15 : t < 0.8 ? 1 - (t - 0.15) / 0.65 : 0;
    this.lever.rotation.z = 0.6 * lv;
    // water level drops and spins, then refills
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

/** Toilet against the east wall facing west: tank at the wall, bowl toward the room. */
export function buildToilet(ctx: Ctx) {
  const m = ctx.mats;
  const cer = m.ceramic;
  const EL = 1.28; // bowl elongation along local z
  const BZ = 0.2;  // bowl centre (local z)
  const x = EX - BB - 0.24, z = TOILET_Z, rotY = -Math.PI / 2; // local +z -> world -x
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
  // seat (down) + lid (up, leaning on the tank lid)
  const seatMat = m.solid(0xf7f7f3, { roughness: 0.3, envMapIntensity: 0.7 });
  const seat = Prim.lathe([[0.135, 0.41], [0.215, 0.41], [0.215, 0.432], [0.135, 0.432], [0.135, 0.41]], seatMat, { segments: 32 });
  seat.scale.set(1, 1, EL); seat.position.z = BZ; g.add(seat);
  const lid = Prim.rbox(0.4, 0.02, 0.5, 0.01, seatMat, { segments: 2 });
  lid.geometry.translate(0, 0, 0.25);
  lid.position.set(0, 0.45, 0); lid.rotation.x = -1.6; g.add(lid);
  for (const sx of [-1, 1]) {
    const h = Prim.rbox(0.03, 0.02, 0.04, 0.005, m.chrome, { segments: 1 }); h.position.set(sx * 0.09, 0.445, -0.01); g.add(h);
  }
  // supply valve + line to the wall
  const valve = Prim.cylinder(0.014, 0.014, 0.03, m.chrome, { segments: 10 }); valve.rotation.x = Math.PI / 2; valve.position.set(0.16, 0.2, -0.225); g.add(valve);
  const line = Prim.cylinder(0.005, 0.005, 0.26, m.chrome, { segments: 8 }); line.position.set(0.16, 0.33, -0.215); g.add(line);
  // tank-top: a box of tissues and a spare roll
  const tissues = Prim.rbox(0.12, 0.075, 0.115, 0.006, m.solid(0x9fb3bd, { roughness: 0.85 }), { segments: 1 }); tissues.position.set(0.11, 0.868, -0.13); tissues.rotation.y = -0.15; g.add(tissues);
  const tissue = Prim.box(0.05, 0.03, 0.002, m.solid(0xfafaf8, { roughness: 0.95 })); tissue.position.set(0.11, 0.915, -0.13); tissue.rotation.set(0.3, -0.15, 0.2); g.add(tissue);
  const spare = Prim.cylinder(0.055, 0.055, 0.1, m.solid(0xf7f7f4, { roughness: 0.92 }), { segments: 18 }); spare.position.set(-0.13, 0.88, -0.13); g.add(spare);
  const spareHole = Prim.cylinder(0.02, 0.02, 0.101, m.solid(0xb8a68c, { roughness: 0.9 }), { segments: 10, cast: false }); spareHole.position.set(-0.13, 0.88, -0.13); g.add(spareHole);
  // collider hugs the bowl width (the tank is against the wall anyway) to keep the room walkable
  addStatic(ctx, g, [{ size: [0.44, 0.86, 0.72], center: [0, 0.43, 0.1] }], { surface: 'tile' });

  // dynamic parts: flush lever (front-right corner of the tank) + swirling water
  const dyn = new THREE.Group();
  place(dyn, x, F, z, rotY);
  ctx.dynamic.add(dyn);
  const leverParts = new THREE.Group();
  const lbase = Prim.cylinder(0.013, 0.013, 0.012, m.chrome, { segments: 12 }); lbase.rotation.x = Math.PI / 2; lbase.position.z = -0.006; leverParts.add(lbase);
  const larm = Prim.rbox(0.075, 0.012, 0.01, 0.004, m.chrome, { segments: 1 }); larm.position.set(-0.04, 0, -0.017); leverParts.add(larm);
  const lever = mergeByMaterial(leverParts);
  lever.position.set(0.2, 0.74, -0.03);
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
