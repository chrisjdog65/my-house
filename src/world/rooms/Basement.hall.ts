/**
 * Basement hall (room id 'basementhall'): mechanicals — furnace, water heater, ducts & pipes,
 * electrical panel with the main breaker, storage shelving, ladder, dehumidifier, sump pit.
 * The stair from upstairs occupies x -1.44..-0.15, z -6..-1.4 and is kept clear.
 */
import * as THREE from 'three';
import { Prim, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import type { Interactable } from '../Interactables';
import { addStatic, hinged, lightSwitch, type HingedPanel } from '../Props';
import {
  FLOOR_Y, CEIL_H, bmats, labelQuad, pipeRun, placeStatic, cardboardBox, paintCan, pullChainLight, type BasementPower,
} from './Basement.helpers';

const GROUP = 'basementhall';

/** The main breaker inside the panel: toggles every basement light group. */
class MainBreaker implements Interactable {
  proximity = true;
  radius = 2.0;
  constructor(private ctx: Ctx, public object: THREE.Object3D, private toggle: THREE.Mesh, private door: HingedPanel, private power: BasementPower, public focus: THREE.Vector3) {
    this.sync();
  }
  private sync() { this.toggle.rotation.x = this.power.isOn() ? -0.45 : 0.45; }
  getPrompt() { return this.door.open ? 'Flip main breaker' : null; }
  interact() {
    const on = !this.power.isOn();
    this.power.set(on);
    this.sync();
    this.ctx.audio.play('switch', this.focus, 1.8);
    this.ctx.audio.play('thud', this.focus, 0.7);
    this.ctx.toast(on ? 'Main breaker ON — basement power restored' : 'Main breaker OFF — basement power cut');
  }
  update() { this.sync(); }
}

function metalShelf(ctx: Ctx, len: number, depth: number, h: number, levels: number[]): THREE.Group {
  const bm = bmats(ctx);
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const post = Prim.box(0.035, h, 0.035, bm.shelfMetal);
    post.position.set(sx * (len / 2 - 0.02), h / 2, sz * (depth / 2 - 0.02));
    g.add(post);
  }
  for (const y of levels) {
    const s = Prim.box(len, 0.03, depth, bm.shelfMetal);
    s.position.y = y;
    g.add(s);
    const lip = Prim.box(len, 0.035, 0.012, bm.shelfMetal);
    lip.position.set(0, y - 0.015, depth / 2 - 0.006);
    g.add(lip);
  }
  // cross brace on the back
  const brace = Prim.box(Math.hypot(len - 0.1, h - 0.2), 0.02, 0.008, bm.shelfMetal);
  brace.position.set(0, h / 2, -depth / 2 + 0.02);
  brace.rotation.z = Math.atan2(h - 0.2, len - 0.1);
  g.add(brace);
  return g;
}

function plasticTub(ctx: Ctx, w: number, h: number, d: number, color: number): THREE.Group {
  const m = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.rbox(w, h, d, 0.02, m.solid(color, { roughness: 0.45, envMapIntensity: 0.5 }));
  body.position.y = h / 2;
  g.add(body);
  const lid = Prim.rbox(w + 0.03, 0.035, d + 0.03, 0.01, m.solid(0x2b3140, { roughness: 0.5 }));
  lid.position.y = h + 0.0175;
  g.add(lid);
  return g;
}

export function buildBasementHall(ctx: Ctx, power: BasementPower) {
  const m = ctx.mats;
  const bm = bmats(ctx);
  const y0 = FLOOR_Y;

  // ------------------------------------------------------------------ furnace
  {
    const g = new THREE.Group();
    const body = Prim.rboxUp(0.7, 1.5, 0.8, 0.012, bm.steelGrey);
    g.add(body);
    for (const [yy, hh] of [[1.1, 0.62], [0.42, 0.62]] as [number, number][]) {
      const p = Prim.rbox(0.012, hh, 0.62, 0.004, bm.steelLight);
      p.position.set(-0.356, yy, 0);
      g.add(p);
    }
    const seam = Prim.box(0.014, 0.01, 0.62, bm.steelDark);
    seam.position.set(-0.356, 0.76, 0);
    g.add(seam);
    const sight = Prim.box(0.01, 0.05, 0.12, m.screenOff);
    sight.position.set(-0.364, 0.3, 0.15);
    g.add(sight);
    const knob = Prim.cylinder(0.02, 0.02, 0.02, m.plasticBlack, { segments: 12 });
    knob.rotation.z = Math.PI / 2;
    knob.position.set(-0.37, 0.3, -0.15);
    g.add(knob);
    const caution = labelQuad(ctx, 'CAUTION', 0.28, 0.14, { bg: '#f2c230', fg: '#1a1a1a', sub: 'HOT SURFACE  ·  KEEP 1 m CLEAR', font: 'bold 120px Arial, sans-serif' });
    caution.rotation.y = -Math.PI / 2;
    caution.position.set(-0.364, 1.05, 0);
    g.add(caution);
    const plate = labelQuad(ctx, 'HEATMASTER 80', 0.22, 0.06, { bg: '#e8e8e4', fg: '#333', font: 'bold 80px Arial, sans-serif' });
    plate.rotation.y = -Math.PI / 2;
    plate.position.set(-0.364, 1.32, 0);
    g.add(plate);
    // plenum up to the joists, trunk feeds from its top
    const plenum = Prim.box(0.5, CEIL_H - 1.5 + 0.03, 0.5, bm.galv);
    plenum.position.set(0, (CEIL_H + 1.5 + 0.03) / 2, 0.05);
    g.add(plenum);
    // return-air duct on the back side
    const ret = Prim.box(0.5, CEIL_H - 0.5, 0.3, bm.galv);
    ret.position.set(0, (CEIL_H + 0.5) / 2, -0.55);
    g.add(ret);
    const grille = Prim.box(0.012, 0.36, 0.22, bm.steelDark);
    grille.position.set(-0.256, 1.3, -0.55);
    g.add(grille);
    for (let i = 0; i < 6; i++) {
      const slat = Prim.box(0.006, 0.012, 0.2, bm.steelLight);
      slat.position.set(-0.264, 1.15 + i * 0.06, -0.55);
      g.add(slat);
    }
    // flue
    const flue = Prim.cylinder(0.06, 0.06, CEIL_H + 0.22 - 1.5, bm.galvDark, { segments: 16 });
    flue.position.set(0, (CEIL_H + 0.22 + 1.5) / 2, -0.32);
    g.add(flue);
    const collar = Prim.cylinder(0.08, 0.08, 0.04, bm.galvDark, { segments: 16 });
    collar.position.set(0, 1.52, -0.32);
    g.add(collar);
    placeStatic(ctx, g, 0.9, -0.6, 0, [{ size: [0.72, CEIL_H, 1.15], center: [0, CEIL_H / 2, -0.15] }], 'metal');
  }

  // ------------------------------------------------------------------ water heater
  {
    const g = new THREE.Group();
    const tankMat = m.solid(0xe6e6e2, { roughness: 0.4, envMapIntensity: 0.5 });
    const tank = Prim.lathe([[0, 0], [0.26, 0], [0.28, 0.04], [0.28, 1.35], [0.24, 1.45], [0.1, 1.5], [0, 1.5]], tankMat, { segments: 28 });
    g.add(tank);
    const base = Prim.cylinder(0.27, 0.27, 0.03, bm.steelDark, { segments: 24 });
    base.position.y = 0.015;
    g.add(base);
    const flue = Prim.cylinder(0.045, 0.045, CEIL_H + 0.22 - 1.5, bm.galvDark, { segments: 14 });
    flue.position.set(0, (CEIL_H + 0.22 + 1.5) / 2, -0.03);
    g.add(flue);
    const hood = Prim.lathe([[0.045, 0], [0.11, 0], [0.06, 0.09], [0.045, 0.09]], bm.galvDark, { segments: 16 });
    hood.position.set(0, 1.5, -0.03);
    g.add(hood);
    const burner = Prim.box(0.02, 0.12, 0.15, bm.steelDark);
    burner.position.set(-0.27, 0.25, 0);
    g.add(burner);
    const valve = Prim.cylinder(0.02, 0.02, 0.05, m.brass, { segments: 10 });
    valve.rotation.z = Math.PI / 2;
    valve.position.set(0.29, 1.2, 0.05);
    g.add(valve);
    const tp = Prim.cylinder(0.01, 0.01, 1.0, bm.copper, { segments: 8 });
    tp.position.set(0.3, 0.72, 0.05);
    g.add(tp);
    const lbl = labelQuad(ctx, 'WATER HEATER', 0.18, 0.1, { bg: '#e2e2de', fg: '#2a3a55', sub: '40 GAL · NATURAL GAS', font: 'bold 64px Arial, sans-serif' });
    lbl.rotation.y = -Math.PI / 2;
    lbl.position.set(-0.283, 0.95, 0);
    g.add(lbl);
    placeStatic(ctx, g, 0.9, 0.55, 0, [], 'metal');
    ctx.physics.addCylinder({ x: 0.9, y: y0 + 0.75, z: 0.55 }, 0.29, 1.5, { meta: { surface: 'metal' } });
  }

  // ------------------------------------------------------------------ ducts & pipes (world coords, y relative to floor)
  {
    const g = new THREE.Group();
    // trunk in the joist gap (x 0.9), from the plenum north to the end of the hall
    const trunk = Prim.box(0.3, 0.2, 6.45, bm.galv);
    trunk.position.set(0.9, CEIL_H + 0.12, 2.375);
    g.add(trunk);
    for (let z = -0.3; z < 5.5; z += 1.2) {
      const band = Prim.box(0.31, 0.21, 0.025, bm.galvDark);
      band.position.set(0.9, CEIL_H + 0.12, z);
      g.add(band);
    }
    const cap = Prim.box(0.32, 0.22, 0.03, bm.galvDark);
    cap.position.set(0.9, CEIL_H + 0.12, 5.6);
    g.add(cap);
    // takeoff box + cross duct under the joists to a ceiling register on the west side
    const takeoff = Prim.box(0.3, 0.4, 0.25, bm.galv);
    takeoff.position.set(0.9, CEIL_H + 0.02, 3.4);
    g.add(takeoff);
    const cross = Prim.box(2.0, 0.16, 0.25, bm.galv);
    cross.position.set(-0.1, CEIL_H - 0.1, 3.4);
    g.add(cross);
    const boot = Prim.box(0.32, 0.14, 0.32, bm.galv);
    boot.position.set(-1.1, CEIL_H - 0.11, 3.4);
    g.add(boot);
    const reg = Prim.box(0.3, 0.012, 0.3, bm.steelLight);
    reg.position.set(-1.1, CEIL_H - 0.185, 3.4);
    g.add(reg);
    for (let i = 0; i < 5; i++) {
      const lv = Prim.box(0.26, 0.012, 0.02, bm.steelDark);
      lv.position.set(-1.1, CEIL_H - 0.195, 3.4 - 0.1 + i * 0.05);
      g.add(lv);
    }
    // supply boots hanging under the trunk
    for (const z of [1.1, 5.0]) {
      const b = Prim.box(0.3, 0.12, 0.3, bm.galv);
      b.position.set(0.9, CEIL_H - 0.04, z);
      g.add(b);
      const r = Prim.box(0.28, 0.01, 0.28, bm.steelLight);
      r.position.set(0.9, CEIL_H - 0.105, z);
      g.add(r);
    }
    // copper water lines (hot & cold) along the joist undersides
    const yp = CEIL_H - 0.04;
    pipeRun([[1.28, yp, 5.85], [1.28, yp, -4.55], [1.56, yp, -4.55]], 0.012, bm.copper, g);
    pipeRun([[1.28, yp, 0.55], [0.8, yp, 0.55], [0.8, 1.5, 0.55]], 0.012, bm.copper, g);
    pipeRun([[1.0, 1.5, 0.55], [1.0, yp, 0.55], [1.34, yp, 0.55], [1.34, yp, -4.65], [1.56, yp, -4.65]], 0.012, bm.copper, g);
    // pipe straps
    for (let z = -4; z < 5.5; z += 1.5) {
      const strap = Prim.box(0.12, 0.02, 0.02, bm.galvDark);
      strap.position.set(1.31, yp + 0.01, z);
      g.add(strap);
    }
    // PVC drain from the laundry to the sump
    pipeRun([[1.36, CEIL_H - 0.15, -5.85], [1.36, CEIL_H - 0.15, 5.2], [1.36, 0.3, 5.2], [1.2, 0.3, 5.4], [1.2, 0.03, 5.4]], 0.045, bm.pvc, g);
    // gas line (black iron) from the wall to the furnace and the water heater
    pipeRun([[1.44, 0.35, -0.4], [1.25, 0.35, -0.4]], 0.012, bm.ironPipe, g);
    pipeRun([[1.44, 0.35, -0.4], [1.44, 0.35, 0.4], [1.2, 0.35, 0.4]], 0.012, bm.ironPipe, g);
    pipeRun([[1.44, 0.35, -0.4], [1.44, CEIL_H - 0.05, -0.4], [1.44, CEIL_H - 0.05, -5.85]], 0.012, bm.ironPipe, g);
    const gasValve = Prim.box(0.03, 0.06, 0.02, m.solid(0xf2c230, { roughness: 0.6 }));
    gasValve.position.set(1.36, 0.38, -0.4);
    g.add(gasValve);
    placeStatic(ctx, g, 0, 0, 0, [], 'metal');
  }

  // ------------------------------------------------------------------ electrical panel (east wall, faces -x)
  {
    const px = 1.44, pz = 1.55;
    const staticG = new THREE.Group();
    const box = Prim.rbox(0.36, 0.66, 0.09, 0.006, bm.steelGrey);
    box.position.set(0, 1.5, 0.045);
    staticG.add(box);
    for (const [x, r] of [[-0.08, 0.012], [0.08, 0.012], [0, 0.02]] as [number, number][]) {
      const c = Prim.cylinder(r, r, CEIL_H - 1.83, bm.galv, { segments: 10 });
      c.position.set(x, (CEIL_H + 1.83) / 2, 0.045);
      staticG.add(c);
    }
    placeStatic(ctx, staticG, px, pz, -Math.PI / 2, [{ size: [0.36, 0.66, 0.1], center: [0, 1.5, 0.05] }], 'metal');

    const dyn = new THREE.Group();
    dyn.position.set(px, y0, pz);
    dyn.rotation.y = -Math.PI / 2;
    ctx.dynamic.add(dyn);
    // interior: dead front + breakers
    const inner = new THREE.Group();
    const plate = Prim.box(0.3, 0.58, 0.006, m.solid(0x3a3c40, { roughness: 0.6 }));
    plate.position.set(0, 1.5, 0.06);
    inner.add(plate);
    const bkMat = m.solid(0x141414, { roughness: 0.45 });
    const tipMat = m.solid(0xf0f0ec, { roughness: 0.5 });
    for (let row = 0; row < 8; row++) for (const col of [-1, 1]) {
      const yy = 1.245 + row * 0.058;
      const b = Prim.rbox(0.05, 0.022, 0.014, 0.003, bkMat);
      b.position.set(col * 0.05, yy, 0.07);
      inner.add(b);
      const tip = Prim.box(0.012, 0.008, 0.005, tipMat);
      tip.position.set(col * 0.085, yy, 0.078);
      inner.add(tip);
    }
    const mainLbl = labelQuad(ctx, 'MAIN 200A', 0.09, 0.024, { bg: '#3a3c40', fg: '#f0f0ec', font: 'bold 60px Arial, sans-serif' });
    mainLbl.position.set(0, 1.71, 0.064);
    inner.add(mainLbl);
    const sched = labelQuad(ctx, 'CIRCUIT SCHEDULE', 0.16, 0.05, { bg: '#e9e4d3', fg: '#333', sub: '1 REC · 2 LAUNDRY · 3 SHOP · 4 HALL', font: 'bold 40px Arial, sans-serif' });
    sched.position.set(0, 1.245 - 0.06, 0.064);
    inner.add(sched);
    const innerM = mergeByMaterial(inner);
    dyn.add(innerM);
    const mainT = Prim.rbox(0.09, 0.04, 0.022, 0.004, bkMat);
    mainT.position.set(0, 1.76, 0.074);
    // hinged cover
    const door = hinged(ctx, dyn, new THREE.Vector3(-0.18, 1.5, 0.09), (pivot) => {
      const leaf = Prim.rbox(0.36, 0.66, 0.012, 0.004, bm.steelGrey);
      leaf.position.set(0.18, 0, 0.006);
      pivot.add(leaf);
      const latch = Prim.box(0.012, 0.05, 0.01, m.chrome);
      latch.position.set(0.34, 0, 0.014);
      pivot.add(latch);
      const danger = labelQuad(ctx, 'DANGER', 0.14, 0.07, { bg: '#c0262e', fg: '#fff', sub: 'HIGH VOLTAGE · 240V', font: 'bold 100px Arial, sans-serif' });
      danger.position.set(0.18, 0.12, 0.0125);
      pivot.add(danger);
      const brand = labelQuad(ctx, 'ELECTRICAL PANEL', 0.2, 0.04, { bg: '#9c9fa3', fg: '#222', font: 'bold 56px Arial, sans-serif' });
      brand.position.set(0.18, -0.2, 0.0125);
      pivot.add(brand);
    }, 'panel cover', { maxAngle: -Math.PI * 0.55, sfx: 'drawer' });
    const focus = new THREE.Vector3(px - 0.15, y0 + 1.5, pz);
    const group = new THREE.Group();
    group.add(innerM);
    // the handle must live inside the interactable's tree, or the freeze pass bakes it into the
    // static batch (it never moves during the probe) and flipping the breaker animates an orphan
    group.add(mainT);
    dyn.add(group);
    ctx.interact.add(new MainBreaker(ctx, group, mainT, door, power, focus));
  }

  // ------------------------------------------------------------------ storage shelving (west wall, z 3.1..4.9)
  {
    const g = metalShelf(ctx, 1.8, 0.45, 1.8, [0.1, 0.5, 0.9, 1.3, 1.7]);
    const put = (obj: THREE.Object3D, x: number, y: number, z = 0, rot = 0) => { obj.position.set(x, y, z); obj.rotation.y = rot; g.add(obj); };
    put(cardboardBox(ctx, 0.5, 0.38, 0.4, 'XMAS'), -0.55, 0.115, 0, 0.04);
    put(cardboardBox(ctx, 0.45, 0.32, 0.38, 'BOOKS'), 0.1, 0.115, 0, -0.03);
    put(cardboardBox(ctx, 0.3, 0.25, 0.3, undefined, { open: true }), 0.6, 0.115, 0.02, 0.1);
    put(cardboardBox(ctx, 0.42, 0.3, 0.36, 'KITCHEN'), -0.55, 0.515, 0, -0.05);
    put(plasticTub(ctx, 0.5, 0.3, 0.38, 0x5a7fb5), 0.15, 0.515, 0);
    put(cardboardBox(ctx, 0.28, 0.2, 0.3, 'TOYS'), 0.62, 0.515, 0.02, 0.08);
    put(cardboardBox(ctx, 0.35, 0.25, 0.3, 'PHOTOS'), -0.6, 0.915, 0, 0.02);
    put(cardboardBox(ctx, 0.4, 0.28, 0.34, 'CAMPING'), -0.1, 0.915, 0, -0.06);
    put(plasticTub(ctx, 0.36, 0.22, 0.3, 0x8a8f94), 0.5, 0.915, 0);
    put(cardboardBox(ctx, 0.3, 0.22, 0.28, 'WINTER'), -0.6, 1.315, 0, 0.05);
    const cooler = Prim.rbox(0.5, 0.32, 0.32, 0.03, m.solid(0xc0262e, { roughness: 0.5 }));
    cooler.position.set(0.1, 1.315 + 0.16, 0);
    g.add(cooler);
    const coolerLid = Prim.rbox(0.5, 0.05, 0.32, 0.02, m.solid(0xf0f0ec, { roughness: 0.5 }));
    coolerLid.position.set(0.1, 1.315 + 0.345, 0);
    g.add(coolerLid);
    put(cardboardBox(ctx, 0.28, 0.2, 0.26, 'CABLES', { open: true }), 0.6, 1.315, 0, -0.1);
    put(cardboardBox(ctx, 0.55, 0.3, 0.38, 'GARAGE'), -0.45, 1.715, 0, 0.03);
    put(cardboardBox(ctx, 0.4, 0.22, 0.34, 'MISC'), 0.3, 1.715, 0, -0.04);
    placeStatic(ctx, g, -1.215, 4.0, Math.PI / 2, [{ size: [1.8, 1.8, 0.45], center: [0, 0.9, 0] }], 'metal');
  }
  // second unit on the east wall (z 3.4..4.6)
  {
    const g = metalShelf(ctx, 1.2, 0.45, 1.8, [0.1, 0.5, 0.9, 1.3, 1.7]);
    const put = (obj: THREE.Object3D, x: number, y: number, z = 0, rot = 0) => { obj.position.set(x, y, z); obj.rotation.y = rot; g.add(obj); };
    put(cardboardBox(ctx, 0.46, 0.36, 0.38, 'TOOLS'), -0.3, 0.115, 0, 0.03);
    put(plasticTub(ctx, 0.4, 0.3, 0.36, 0x3f7a4a), 0.28, 0.115, 0);
    put(cardboardBox(ctx, 0.4, 0.28, 0.32, 'DISHES'), -0.32, 0.515, 0, -0.04);
    put(cardboardBox(ctx, 0.3, 0.22, 0.28, 'LAMPS'), 0.25, 0.515, 0, 0.06);
    put(paintCan(ctx, 0x2f6fd0, 0.06, 0.13), 0.35, 0.915, -0.05);
    put(paintCan(ctx, 0xe8e8e2, 0.06, 0.13), 0.2, 0.915, 0.08);
    put(cardboardBox(ctx, 0.36, 0.24, 0.3, 'RECORDS'), -0.3, 0.915, 0, 0.02);
    const suitcase = Prim.rbox(0.55, 0.2, 0.36, 0.03, m.solid(0x2c2f36, { roughness: 0.6 }));
    suitcase.position.set(-0.25, 1.315 + 0.1, 0);
    g.add(suitcase);
    const handle = Prim.rbox(0.14, 0.02, 0.03, 0.008, m.solid(0x1a1a1a, { roughness: 0.6 }));
    handle.position.set(-0.25, 1.315 + 0.21, 0);
    g.add(handle);
    put(cardboardBox(ctx, 0.28, 0.2, 0.26, 'DECOR'), 0.3, 1.315, 0, 0.05);
    put(cardboardBox(ctx, 0.5, 0.3, 0.36, 'BABY'), -0.2, 1.715, 0, -0.02);
    put(plasticTub(ctx, 0.3, 0.22, 0.3, 0xd6b25a), 0.35, 1.715, 0);
    placeStatic(ctx, g, 1.215, 4.0, -Math.PI / 2, [{ size: [1.2, 1.8, 0.45], center: [0, 0.9, 0] }], 'metal');
  }

  // ------------------------------------------------------------------ paint can stack (NW corner)
  {
    const g = new THREE.Group();
    const cols = [0x2f6fd0, 0xd85a1e, 0xf2c230, 0xe8e8e2, 0x3aa655];
    const spots: [number, number, number, number][] = [[-0.09, 0, -0.06, 0.085], [0.09, 0, -0.06, 0.085], [0, 0, 0.1, 0.085], [0, 0.19, -0.03, 0.085], [0.1, 0.19, 0.12, 0.06]];
    spots.forEach(([x, y, z, r], i) => {
      const c = paintCan(ctx, cols[i], r, r > 0.07 ? 0.19 : 0.13);
      c.position.set(x, y, z);
      c.rotation.y = ctx.rng() * 2;
      g.add(c);
    });
    const dripMat = m.solid(0xd85a1e, { roughness: 0.4 });
    const drip = Prim.cylinder(0.05, 0.05, 0.003, dripMat, { segments: 10, cast: false });
    drip.position.set(0.16, 0.0015, -0.12);
    g.add(drip);
    placeStatic(ctx, g, -1.19, 5.45, 0, [{ size: [0.4, 0.4, 0.4], center: [0, 0.2, 0.02] }], 'metal');
  }

  // ------------------------------------------------------------------ ladder leaning on the north wall
  {
    const g = new THREE.Group();
    const alu = m.solid(0xb8bcc0, { roughness: 0.35, metalness: 0.8, envMapIntensity: 0.9 });
    const L = 2.4;
    for (const sx of [-0.2, 0.2]) {
      const rail = Prim.box(0.03, L, 0.08, alu);
      rail.position.set(sx, L / 2, 0);
      g.add(rail);
      const foot = Prim.box(0.04, 0.04, 0.09, bm.rubber);
      foot.position.set(sx, 0.02, 0);
      g.add(foot);
    }
    for (let k = 0; k < 8; k++) {
      const rung = Prim.cylinder(0.013, 0.013, 0.4, alu, { segments: 8 });
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, 0.2 + k * 0.28, 0);
      g.add(rung);
    }
    const tilt = 0.26;
    g.position.set(-0.6, y0, 5.85 - L * Math.sin(tilt) - 0.03);
    g.rotation.x = tilt;
    addStatic(ctx, g, [{ size: [0.46, L, 0.1], center: [0, L / 2, 0] }], { surface: 'metal' });
  }

  // ------------------------------------------------------------------ dehumidifier beside the furnace
  {
    const g = new THREE.Group();
    const body = Prim.rboxUp(0.38, 0.6, 0.3, 0.02, m.solid(0xe9e9e6, { roughness: 0.4 }));
    g.add(body);
    const grille = Prim.box(0.01, 0.3, 0.26, bm.steelDark);
    grille.position.set(-0.19, 0.4, 0);
    g.add(grille);
    for (let i = 0; i < 7; i++) {
      const s = Prim.box(0.006, 0.008, 0.24, m.solid(0xd0d0cc, { roughness: 0.5 }));
      s.position.set(-0.196, 0.27 + i * 0.04, 0);
      g.add(s);
    }
    const bucket = Prim.box(0.01, 0.18, 0.28, m.solid(0x9fc4dd, { roughness: 0.3, envMapIntensity: 0.8 }));
    bucket.position.set(-0.19, 0.11, 0);
    g.add(bucket);
    const led = Prim.box(0.004, 0.01, 0.01, m.emissive(0x33ff66, 2, 0x114422));
    led.position.set(-0.192, 0.56, 0.1);
    g.add(led);
    const handle = Prim.box(0.14, 0.02, 0.03, m.solid(0xcfcfcb, { roughness: 0.5 }));
    handle.position.set(0, 0.6, -0.1);
    g.add(handle);
    const hose = Prim.cylinder(0.01, 0.01, 0.4, bm.rubber, { segments: 8 });
    hose.rotation.z = Math.PI / 2;
    hose.position.set(0.3, 0.05, 0.1);
    g.add(hose);
    placeStatic(ctx, g, 0.3, -0.6, 0, [{ size: [0.4, 0.62, 0.32], center: [0, 0.31, 0] }], 'metal');
  }

  // ------------------------------------------------------------------ sump pit (NE corner)
  {
    const g = new THREE.Group();
    const lid = Prim.cylinder(0.3, 0.3, 0.03, m.solid(0x1c1c1c, { roughness: 0.7 }), { segments: 24 });
    lid.position.y = 0.015;
    g.add(lid);
    const rim = Prim.torus(0.3, 0.012, m.solid(0x2c2c2c, { roughness: 0.6 }));
    rim.position.y = 0.028;
    g.add(rim);
    const bolts = m.solid(0x8a8f94, { roughness: 0.4, metalness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const b = Prim.cylinder(0.012, 0.012, 0.01, bolts, { segments: 6 });
      b.position.set(Math.cos(a) * 0.25, 0.035, Math.sin(a) * 0.25);
      g.add(b);
    }
    pipeRun([[-0.1, 0.03, 0], [-0.1, CEIL_H - 0.15, 0], [-0.1, CEIL_H - 0.15, 0.4]], 0.03, bm.pvc, g);
    const check = Prim.cylinder(0.045, 0.045, 0.14, bm.pvc, { segments: 12 });
    check.position.set(-0.1, 0.9, 0);
    g.add(check);
    const cord = Prim.cylinder(0.004, 0.004, 1.35, bm.rubber, { segments: 6 });
    cord.position.set(0.15, 0.68, 0.1);
    cord.rotation.z = -0.25;
    g.add(cord);
    const outlet = Prim.rbox(0.02, 0.11, 0.07, 0.004, m.plasticWhite);
    outlet.position.set(0.38, 1.25, 0.16);
    g.add(outlet);
    const sumpLbl = labelQuad(ctx, 'SUMP', 0.14, 0.05, { bg: '#1c1c1c', fg: '#e0e0e0', font: 'bold 70px Arial, sans-serif' });
    sumpLbl.rotation.x = -Math.PI / 2;
    sumpLbl.position.set(0.05, 0.031, 0.05);
    g.add(sumpLbl);
    placeStatic(ctx, g, 1.05, 5.45, 0, [], 'metal');
  }

  // ------------------------------------------------------------------ misc clutter
  {
    const g = new THREE.Group();
    const openBox = cardboardBox(ctx, 0.42, 0.3, 0.36, undefined, { open: true });
    openBox.position.set(-1.15, 0, 2.75);
    openBox.rotation.y = 0.2;
    g.add(openBox);
    // flattened boxes leaning on the wall next to the shelf
    for (let i = 0; i < 3; i++) {
      const flat = Prim.box(0.02, 0.9 - i * 0.1, 0.7 - i * 0.05, i % 2 ? bm.cardboardDark : bm.cardboard);
      flat.position.set(-1.38 + i * 0.025, 0.45 - i * 0.05, 5.3);
      flat.rotation.z = -0.12;
      g.add(flat);
    }
    // an old rolled rug in the corner by the stair bottom
    const roll = Prim.cylinder(0.11, 0.11, 1.6, m.fabric(0x7a4a3a), { segments: 14 });
    roll.position.set(1.3, 0.11, -5.0);
    roll.rotation.x = Math.PI / 2;
    g.add(roll);
    placeStatic(ctx, g, 0, 0, 0, [
      { size: [0.44, 0.3, 0.38], center: [-1.15, 0.15, 2.75] },
      { size: [0.24, 0.22, 1.6], center: [1.3, 0.11, -5.0] },
    ], 'wood');
  }

  // ------------------------------------------------------------------ lights & switch
  pullChainLight(ctx, 0.1, -5.3, GROUP, { shadow: true, intensity: 10 });
  pullChainLight(ctx, 0.1, 1.6, GROUP, { intensity: 9 });
  pullChainLight(ctx, 0.5, 4.6, GROUP, { intensity: 9 });
  lightSwitch(ctx, 0.5, y0 + 1.2, -5.84, 0, GROUP);
}
