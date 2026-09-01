/**
 * Workshop (room id 'workshop'): workbench with vise and pegboard of tools, toolbox with a hinged lid,
 * table saw, drill press, shelving with jars/paint/spray cans, two bicycles, lawn mower, shop vac,
 * fire extinguisher, fluorescent strip lights, cord reel, radio, sawdust and scraps.
 */
import * as THREE from 'three';
import { Prim, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import { addStatic, pickup, lightSwitch, pictureFrame, hinged, Toggle, Lamp, wallClock, bulbMaterials } from '../Props';
import { FLOOR_Y, CEIL_H, CEIL_Y, bmats, labelQuad, imageMat, placeStatic, tube, cardboardBox, paintCan, type BasementPower } from './Basement.helpers';

const GROUP = 'workshop';

function pegboardTexture(): THREE.CanvasTexture {
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#d9c9a4'; c.fillRect(0, 0, S, S);
  c.fillStyle = 'rgba(0,0,0,0.05)';
  for (let i = 0; i < 300; i++) c.fillRect(Math.random() * S, Math.random() * S, 2, 1);
  c.fillStyle = '#5a4a30';
  for (let y = 16; y < S; y += 32) for (let x = 16; x < S; x += 32) { c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill(); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(22, 8.5);
  t.anisotropy = 8;
  return t;
}

// ---- tool builders (all centred/hanging from y=0 at the top, facing +z) --------------------------
function hammer(ctx: Ctx): THREE.Group {
  const m = ctx.mats, bm = bmats(ctx);
  const g = new THREE.Group();
  const handle = Prim.rbox(0.026, 0.3, 0.018, 0.006, bm.wood);
  handle.position.y = -0.19;
  g.add(handle);
  const head = Prim.rbox(0.1, 0.03, 0.03, 0.004, m.darkMetal);
  head.position.y = -0.03;
  g.add(head);
  const claw = Prim.box(0.035, 0.022, 0.024, m.darkMetal);
  claw.position.set(-0.06, -0.045, 0);
  claw.rotation.z = 0.5;
  g.add(claw);
  return g;
}
function wrench(ctx: Ctx, L: number): THREE.Group {
  const m = ctx.mats;
  const g = new THREE.Group();
  const shaft = Prim.box(0.016, L, 0.005, m.chrome);
  shaft.position.y = -L / 2 - 0.02;
  g.add(shaft);
  const ring = Prim.torus(0.016, 0.005, m.chrome);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.016;
  g.add(ring);
  const open = Prim.box(0.036, 0.03, 0.005, m.chrome);
  open.position.y = -L - 0.03;
  g.add(open);
  const notch = Prim.box(0.014, 0.018, 0.006, ctx.mats.solid(0xd9c9a4, { roughness: 0.9 }));
  notch.position.y = -L - 0.028;
  g.add(notch);
  return g;
}
function screwdriver(ctx: Ctx, color: number): THREE.Group {
  const m = ctx.mats;
  const g = new THREE.Group();
  const handle = Prim.cylinder(0.012, 0.011, 0.1, m.solid(color, { roughness: 0.4 }), { segments: 10 });
  handle.position.y = -0.06;
  g.add(handle);
  const shaft = Prim.cylinder(0.003, 0.003, 0.13, m.chrome, { segments: 6 });
  shaft.position.y = -0.175;
  g.add(shaft);
  return g;
}
function handSaw(ctx: Ctx): THREE.Group {
  const m = ctx.mats, bm = bmats(ctx);
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.09); shape.lineTo(0.42, 0.04); shape.lineTo(0.42, 0); shape.lineTo(0, 0); shape.closePath();
  const blade = Prim.extrude(shape, 0.002, m.chrome);
  blade.position.set(0.02, -0.1, 0);
  g.add(blade);
  const handle = Prim.rbox(0.07, 0.13, 0.02, 0.012, bm.wood);
  handle.position.set(-0.01, -0.06, 0);
  handle.rotation.z = 0.15;
  g.add(handle);
  const hole = Prim.box(0.03, 0.06, 0.024, m.solid(0xd9c9a4, { roughness: 0.9 }));
  hole.position.set(-0.012, -0.06, 0);
  hole.rotation.z = 0.15;
  g.add(hole);
  return g;
}
function pliers(ctx: Ctx): THREE.Group {
  const m = ctx.mats;
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const arm = Prim.box(0.012, 0.18, 0.007, m.chrome);
    arm.position.set(s * 0.012, -0.1, s * 0.004);
    arm.rotation.z = s * 0.14;
    g.add(arm);
    const sleeve = Prim.rbox(0.015, 0.08, 0.012, 0.004, m.solid(0xc0272d, { roughness: 0.5 }));
    sleeve.position.set(s * 0.025, -0.15, s * 0.004);
    sleeve.rotation.z = s * 0.14;
    g.add(sleeve);
  }
  const pivot = Prim.cylinder(0.006, 0.006, 0.014, m.darkMetal, { segments: 8 });
  pivot.rotation.x = Math.PI / 2;
  pivot.position.y = -0.085;
  g.add(pivot);
  return g;
}
function level(ctx: Ctx): THREE.Group {
  const m = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.rbox(0.6, 0.045, 0.022, 0.004, m.solid(0xf2c230, { roughness: 0.5 }));
  body.position.y = -0.03;
  g.add(body);
  for (const x of [-0.22, 0, 0.22]) {
    const vial = Prim.box(0.03, 0.02, 0.024, m.solid(0x9ee37d, { roughness: 0.2, envMapIntensity: 0.9 }));
    vial.position.set(x, -0.03, 0);
    g.add(vial);
  }
  return g;
}
function tapeMeasure(ctx: Ctx): THREE.Group {
  const m = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.rbox(0.07, 0.07, 0.035, 0.015, m.solid(0xf2c230, { roughness: 0.45 }));
  body.position.y = -0.045;
  g.add(body);
  const band = Prim.rbox(0.072, 0.03, 0.037, 0.008, m.plasticBlack);
  band.position.y = -0.045;
  g.add(band);
  const tab = Prim.box(0.012, 0.02, 0.006, m.chrome);
  tab.position.set(0.04, -0.07, 0.005);
  g.add(tab);
  const clip = Prim.box(0.015, 0.05, 0.004, m.chrome);
  clip.position.set(0, -0.04, -0.02);
  g.add(clip);
  return g;
}
function utilityKnife(ctx: Ctx): THREE.Group {
  const m = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.rbox(0.14, 0.03, 0.012, 0.004, m.solid(0x7a7d82, { roughness: 0.4, metalness: 0.5 }));
  body.position.y = -0.035;
  g.add(body);
  const blade = Prim.box(0.03, 0.014, 0.002, m.chrome);
  blade.position.set(0.08, -0.04, 0);
  g.add(blade);
  const slider = Prim.box(0.02, 0.008, 0.006, m.solid(0xc0272d, { roughness: 0.5 }));
  slider.position.set(0, -0.022, 0.008);
  g.add(slider);
  return g;
}
function cClamp(ctx: Ctx): THREE.Group {
  const m = ctx.mats;
  const g = new THREE.Group();
  const frame = Prim.torus(0.045, 0.008, m.darkMetal, { arc: Math.PI * 1.5 });
  frame.rotation.x = Math.PI / 2;
  frame.rotation.z = Math.PI * 0.75;
  frame.position.y = -0.06;
  g.add(frame);
  const screw = Prim.cylinder(0.005, 0.005, 0.08, m.chrome, { segments: 8 });
  screw.position.set(0.03, -0.075, 0);
  screw.rotation.z = 0.2;
  g.add(screw);
  const tee = Prim.cylinder(0.004, 0.004, 0.04, m.chrome, { segments: 6 });
  tee.rotation.z = Math.PI / 2;
  tee.position.set(0.04, -0.115, 0);
  g.add(tee);
  return g;
}
function paintbrush(ctx: Ctx): THREE.Group {
  const m = ctx.mats, bm = bmats(ctx);
  const g = new THREE.Group();
  const handle = Prim.rbox(0.022, 0.11, 0.01, 0.004, bm.wood);
  handle.position.y = -0.065;
  g.add(handle);
  const ferrule = Prim.box(0.034, 0.03, 0.01, m.chrome);
  ferrule.position.y = -0.135;
  g.add(ferrule);
  const bristles = Prim.box(0.036, 0.05, 0.012, m.solid(0xd8c9a0, { roughness: 0.95 }));
  bristles.position.y = -0.175;
  g.add(bristles);
  return g;
}

function bicycle(ctx: Ctx, color: number): THREE.Group {
  const m = ctx.mats, bm = bmats(ctx);
  const g = new THREE.Group();
  const frame = m.solid(color, { roughness: 0.3, envMapIntensity: 0.8, physical: true, clearcoat: 0.7 });
  const R = 0.33;
  const rear: [number, number, number] = [0, R, -0.5], front: [number, number, number] = [0, R, 0.5];
  const bb: [number, number, number] = [0, 0.28, -0.08];
  const seatTop: [number, number, number] = [0, 0.84, -0.22];
  const headTop: [number, number, number] = [0, 0.8, 0.36], headBot: [number, number, number] = [0, 0.6, 0.43];
  const t = (a: [number, number, number], b: [number, number, number], r = 0.014, mat: THREE.Material = frame) => g.add(tube(a, b, r, mat, 8));
  t(bb, seatTop); t(seatTop, headTop); t(bb, headBot); t(headTop, headBot, 0.018);
  for (const s of [-0.035, 0.035]) {
    t([s, 0.28, -0.08], [s, R, -0.5], 0.008); t([s, 0.82, -0.22], [s, R, -0.5], 0.008); t([s, 0.6, 0.43], [s, R, 0.5], 0.009);
  }
  // wheels
  for (const c of [rear, front]) {
    const tyre = Prim.torus(R, 0.022, bm.rubber);
    tyre.rotation.z = Math.PI / 2;
    tyre.position.set(...c);
    g.add(tyre);
    const rimM = Prim.torus(R - 0.028, 0.008, m.chrome);
    rimM.rotation.z = Math.PI / 2;
    rimM.position.set(...c);
    g.add(rimM);
    const hub = Prim.cylinder(0.02, 0.02, 0.08, m.chrome, { segments: 10 });
    hub.rotation.z = Math.PI / 2;
    hub.position.set(...c);
    g.add(hub);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const sp = Prim.cylinder(0.0015, 0.0015, (R - 0.03) * 2, m.chrome, { segments: 4 });
      sp.position.set(c[0], c[1], c[2]);
      sp.rotation.x = a;
      g.add(sp);
    }
  }
  // saddle, post, bars, stem, cranks, pedals, chainring
  const post = Prim.cylinder(0.012, 0.012, 0.12, m.chrome, { segments: 8 });
  post.position.set(0, 0.89, -0.23);
  g.add(post);
  const saddle = Prim.rbox(0.12, 0.04, 0.26, 0.015, m.leatherBlack);
  saddle.position.set(0, 0.96, -0.25);
  g.add(saddle);
  const stem = Prim.cylinder(0.012, 0.012, 0.1, m.chrome, { segments: 8 });
  stem.position.set(0, 0.85, 0.36);
  g.add(stem);
  const bars = Prim.cylinder(0.012, 0.012, 0.56, m.chrome, { segments: 8 });
  bars.rotation.z = Math.PI / 2;
  bars.position.set(0, 0.9, 0.38);
  g.add(bars);
  for (const s of [-1, 1]) {
    const grip = Prim.cylinder(0.016, 0.016, 0.12, bm.rubber, { segments: 8 });
    grip.rotation.z = Math.PI / 2;
    grip.position.set(s * 0.22, 0.9, 0.38);
    g.add(grip);
    const crank = Prim.box(0.012, 0.17, 0.02, m.darkMetal);
    crank.position.set(s * 0.07, 0.28, -0.08 + (s > 0 ? 0.06 : -0.06));
    crank.rotation.x = s * 0.9;
    g.add(crank);
    const pedal = Prim.box(0.06, 0.015, 0.05, bm.rubber);
    pedal.position.set(s * 0.1, 0.28 + (s > 0 ? -0.06 : 0.06), -0.08 + (s > 0 ? 0.13 : -0.13));
    g.add(pedal);
  }
  const ring = Prim.torus(0.09, 0.006, m.darkMetal);
  ring.rotation.z = Math.PI / 2;
  ring.position.set(0.045, 0.28, -0.08);
  g.add(ring);
  const chain = Prim.box(0.004, 0.006, 0.45, m.darkMetal);
  chain.position.set(0.045, 0.32, -0.3);
  chain.rotation.x = 0.06;
  g.add(chain);
  return g;
}

export function buildWorkshop(ctx: Ctx, power: BasementPower) {
  const m = ctx.mats;
  const bm = bmats(ctx);
  const y0 = FLOOR_Y;
  const rng = ctx.rng;
  void power;

  // ------------------------------------------------------------------ workbench + pegboard
  {
    const g = new THREE.Group();
    const top = Prim.rbox(2.4, 0.07, 0.7, 0.008, m.pine);
    top.position.set(4.4, 0.895, 5.5);
    g.add(top);
    for (const [x, z] of [[3.3, 5.25], [5.5, 5.25], [3.3, 5.75], [5.5, 5.75]]) {
      const leg = Prim.box(0.09, 0.86, 0.09, m.pine);
      leg.position.set(x, 0.43, z);
      g.add(leg);
    }
    for (const z of [5.2, 5.8]) {
      const apron = Prim.box(2.2, 0.1, 0.04, m.pine);
      apron.position.set(4.4, 0.8, z);
      g.add(apron);
    }
    for (const x of [3.3, 5.5]) {
      const side = Prim.box(0.04, 0.1, 0.5, m.pine);
      side.position.set(x, 0.8, 5.5);
      g.add(side);
      const str = Prim.box(0.05, 0.05, 0.5, m.pine);
      str.position.set(x, 0.18, 5.5);
      g.add(str);
    }
    const shelf = Prim.box(2.2, 0.025, 0.55, m.pine);
    shelf.position.set(4.4, 0.215, 5.5);
    g.add(shelf);
    // things on the lower shelf
    const rope = Prim.torus(0.12, 0.035, m.solid(0xc9b58a, { roughness: 0.95 }));
    rope.position.set(3.7, 0.265, 5.5);
    g.add(rope);
    const parts = cardboardBox(ctx, 0.4, 0.22, 0.3, 'PARTS');
    parts.position.set(4.5, 0.23, 5.5);
    parts.rotation.y = 0.1;
    g.add(parts);
    const tray = Prim.rbox(0.32, 0.05, 0.24, 0.01, m.solid(0x2a2c30, { roughness: 0.5 }));
    tray.position.set(5.2, 0.25, 5.5);
    g.add(tray);
    // pegboard with frame
    const pb = Prim.box(2.2, 0.85, 0.012, imageMat(ctx, pegboardTexture(), { roughness: 0.85 }), { keepUV: true, cast: false });
    pb.position.set(4.4, 1.575, 5.832);
    g.add(pb);
    for (const [w, h, x, y] of [[2.26, 0.035, 4.4, 2.0125], [2.26, 0.035, 4.4, 1.1375], [0.035, 0.85, 3.2825, 1.575], [0.035, 0.85, 5.5175, 1.575]] as [number, number, number, number][]) {
      const f = Prim.box(w, h, 0.035, m.pine);
      f.position.set(x, y, 5.828);
      g.add(f);
    }
    // sawdust & scraps on the bench
    const dust = Prim.cylinder(0.14, 0.16, 0.003, bm.sawdust, { segments: 12, cast: false });
    dust.position.set(4.6, 0.932, 5.55);
    g.add(dust);
    for (let i = 0; i < 2; i++) {
      const sc = Prim.box(0.35, 0.035, 0.08, m.pine);
      sc.position.set(4.75 + i * 0.1, 0.95 + i * 0.035, 5.65 - i * 0.05);
      sc.rotation.y = 0.2 + i * 0.3;
      g.add(sc);
    }
    // pencil + notepad
    const pad = Prim.box(0.14, 0.008, 0.2, bm.paper);
    pad.position.set(4.05, 0.934, 5.6);
    pad.rotation.y = -0.2;
    g.add(pad);
    const pencil = Prim.cylinder(0.004, 0.004, 0.17, m.solid(0xf2c230, { roughness: 0.6 }), { segments: 6 });
    pencil.rotation.set(Math.PI / 2, 0, 0.4);
    pencil.position.set(4.08, 0.942, 5.55);
    g.add(pencil);
    placeStatic(ctx, g, 0, 0, 0, [{ size: [2.4, 0.93, 0.7], center: [4.4, 0.465, 5.5] }], 'wood');
  }
  // tools hanging on the pegboard
  {
    const g = new THREE.Group();
    const hookMat = m.chrome;
    const hang = (tool: THREE.Group, x: number, y: number, rotZ = 0) => {
      tool.position.set(x, y, 5.8);
      tool.rotation.z = rotZ;
      g.add(tool);
      const hook = Prim.cylinder(0.003, 0.003, 0.04, hookMat, { segments: 6 });
      hook.rotation.x = Math.PI / 2;
      hook.position.set(x, y, 5.81);
      g.add(hook);
    };
    hang(hammer(ctx), 3.5, 1.9);
    hang(wrench(ctx, 0.22), 3.78, 1.92); hang(wrench(ctx, 0.18), 3.93, 1.92); hang(wrench(ctx, 0.14), 4.06, 1.92);
    hang(screwdriver(ctx, 0xc0272d), 4.28, 1.92); hang(screwdriver(ctx, 0x2a6bd6), 4.38, 1.92); hang(screwdriver(ctx, 0xf2c230), 4.48, 1.92);
    hang(handSaw(ctx), 4.68, 1.85);
    hang(pliers(ctx), 5.25, 1.92);
    hang(tapeMeasure(ctx), 5.4, 1.75);
    hang(level(ctx), 4.4, 1.28);
    hang(utilityKnife(ctx), 5.2, 1.35);
    hang(cClamp(ctx), 3.6, 1.42);
    hang(paintbrush(ctx), 4.85, 1.42);
    hang(paintbrush(ctx), 4.95, 1.42, 0.1);
    // safety glasses + ear muffs on hooks
    const glasses = new THREE.Group();
    const lens = Prim.rbox(0.14, 0.045, 0.01, 0.01, m.solid(0xd8e8f0, { roughness: 0.1, opacity: 0.6, envMapIntensity: 1.0 }));
    lens.position.y = -0.04;
    glasses.add(lens);
    glasses.userData.transparent = true;
    const arm = Prim.box(0.14, 0.006, 0.006, m.plasticBlack);
    arm.position.set(0, -0.02, 0);
    glasses.add(arm);
    hang(glasses, 3.9, 1.4);
    const muffs = new THREE.Group();
    const band = Prim.torus(0.08, 0.008, m.solid(0xc0272d, { roughness: 0.5 }), { arc: Math.PI });
    band.rotation.x = Math.PI / 2;
    band.position.y = -0.09;
    muffs.add(band);
    for (const s of [-1, 1]) {
      const cup = Prim.cylinder(0.035, 0.035, 0.04, m.solid(0xc0272d, { roughness: 0.5 }), { segments: 12 });
      cup.rotation.z = Math.PI / 2;
      cup.position.set(s * 0.085, -0.1, 0);
      muffs.add(cup);
    }
    hang(muffs, 5.05, 1.35);
    placeStatic(ctx, g, 0, 0, 0, [], 'metal');
  }
  // vise, toolbox (hinged), pickups, radio, work lamp, stool
  {
    const g = new THREE.Group();
    const vm = m.solid(0x3d4046, { roughness: 0.55, metalness: 0.5 });
    const vbase = Prim.rbox(0.13, 0.04, 0.17, 0.006, vm);
    vbase.position.set(3.45, 0.95, 5.3);
    g.add(vbase);
    const fixed = Prim.rbox(0.14, 0.09, 0.05, 0.006, vm);
    fixed.position.set(3.45, 1.015, 5.25);
    g.add(fixed);
    const mov = Prim.rbox(0.14, 0.09, 0.05, 0.006, vm);
    mov.position.set(3.45, 1.015, 5.17);
    g.add(mov);
    for (const z of [5.222, 5.198]) {
      const jaw = Prim.box(0.12, 0.05, 0.006, m.chrome);
      jaw.position.set(3.45, 1.03, z);
      g.add(jaw);
    }
    const screw = Prim.cylinder(0.012, 0.012, 0.24, m.chrome, { segments: 10 });
    screw.rotation.x = Math.PI / 2;
    screw.position.set(3.45, 0.995, 5.08);
    g.add(screw);
    const bar = Prim.cylinder(0.006, 0.006, 0.16, m.chrome, { segments: 8 });
    bar.rotation.z = Math.PI / 2;
    bar.position.set(3.45, 0.995, 4.96);
    g.add(bar);
    for (const s of [-1, 1]) {
      const ball = Prim.sphere(0.01, m.chrome, { segments: 8 });
      ball.position.set(3.45 + s * 0.08, 0.995, 4.96);
      g.add(ball);
    }
    // toolbox body (hollow)
    const red = m.paintedMetal(0xc0262e);
    const tb = new THREE.Group();
    tb.position.set(5.1, 0.93, 5.55);
    const tw = 0.45, th = 0.17, td = 0.22;
    const wall = (w: number, h: number, d: number, x: number, y: number, z: number) => { const b = Prim.box(w, h, d, red); b.position.set(x, y, z); tb.add(b); };
    wall(tw, 0.012, td, 0, 0.006, 0);
    wall(tw, th, 0.012, 0, th / 2, -td / 2 + 0.006);
    wall(tw, th, 0.012, 0, th / 2, td / 2 - 0.006);
    wall(0.012, th, td, -tw / 2 + 0.006, th / 2, 0);
    wall(0.012, th, td, tw / 2 - 0.006, th / 2, 0);
    const trayM = Prim.box(tw - 0.03, 0.02, td - 0.03, m.solid(0x6a6d72, { roughness: 0.5, metalness: 0.5 }));
    trayM.position.set(0, 0.11, 0);
    tb.add(trayM);
    for (let i = 0; i < 5; i++) {
      const sock = Prim.cylinder(0.012, 0.012, 0.03, m.chrome, { segments: 8 });
      sock.position.set(-0.15 + i * 0.05, 0.135, -0.05);
      tb.add(sock);
    }
    const sd = Prim.cylinder(0.01, 0.01, 0.12, m.solid(0x2a6bd6, { roughness: 0.4 }), { segments: 8 });
    sd.rotation.z = Math.PI / 2;
    sd.position.set(0.05, 0.13, 0.04);
    tb.add(sd);
    const latch = Prim.box(0.04, 0.03, 0.01, m.chrome);
    latch.position.set(0, 0.1, td / 2 + 0.005);
    tb.add(latch);
    g.add(tb);
    placeStatic(ctx, g, 0, 0, 0, [], 'metal');
    const lidG = new THREE.Group();
    lidG.position.set(5.1, y0 + 0.93, 5.55);
    ctx.dynamic.add(lidG);
    hinged(ctx, lidG, new THREE.Vector3(0, th, -td / 2), (pivot) => {
      const lid = Prim.rbox(tw, 0.055, td, 0.008, red);
      lid.position.set(0, 0.0275, td / 2);
      pivot.add(lid);
      const handle = Prim.rbox(0.16, 0.02, 0.02, 0.008, m.plasticBlack);
      handle.position.set(0, 0.07, td / 2);
      pivot.add(handle);
      for (const x of [-0.08, 0.08]) {
        const hb = Prim.box(0.01, 0.02, 0.02, m.plasticBlack);
        hb.position.set(x, 0.058, td / 2);
        pivot.add(hb);
      }
      const lbl = labelQuad(ctx, 'TOOLS', 0.12, 0.035, { bg: '#c0262e', fg: '#f4f1e6', font: 'bold 90px Impact, "Arial Black", sans-serif' });
      lbl.position.set(0, 0.03, td + 0.0005);
      pivot.add(lbl);
    }, 'toolbox', { axis: 'x', maxAngle: -Math.PI * 0.6, sfx: 'drawer' });

    // pickups on the bench
    const hm = hammer(ctx);
    hm.rotation.set(Math.PI / 2, 0, 0.5);
    hm.position.set(4.35, y0 + 0.93 + 0.016, 5.45);
    pickup(ctx, mergeByMaterial(hm), { name: 'hammer', mass: 0.7 });
    const wr = wrench(ctx, 0.2);
    wr.rotation.set(Math.PI / 2, 0, -0.9);
    wr.position.set(4.0, y0 + 0.93 + 0.004, 5.42);
    pickup(ctx, mergeByMaterial(wr), { name: 'wrench', mass: 0.4 });
    const tm = tapeMeasure(ctx);
    tm.position.set(4.7, y0 + 0.93 + 0.081, 5.35);
    tm.rotation.y = -0.4;
    pickup(ctx, mergeByMaterial(tm), { name: 'tape measure', mass: 0.3, shape: { type: 'box', size: new THREE.Vector3(0.075, 0.075, 0.04) }, offset: new THREE.Vector3(0, -0.045, 0) });

    // radio (toggle → hum loop)
    const rg = new THREE.Group();
    const rbody = Prim.rbox(0.28, 0.15, 0.11, 0.012, m.solid(0x2d2f33, { roughness: 0.5 }));
    rbody.position.y = 0.075;
    rg.add(rbody);
    const grille = Prim.box(0.12, 0.11, 0.006, bm.steelLight);
    grille.position.set(-0.07, 0.075, -0.056);
    rg.add(grille);
    for (const x of [0.06, 0.1]) {
      const k = Prim.cylinder(0.012, 0.012, 0.012, m.plasticBlack, { segments: 10 });
      k.rotation.x = Math.PI / 2;
      k.position.set(x, 0.04, -0.058);
      rg.add(k);
    }
    const ant = Prim.cylinder(0.003, 0.003, 0.36, m.chrome, { segments: 6 });
    ant.position.set(0.12, 0.3, 0.02);
    ant.rotation.z = -0.5;
    rg.add(ant);
    const dialOn = imageMat(ctx, ctx.tex.label('FM 92.5', { bg: '#221a10', fg: '#ffb347', font: 'bold 80px monospace', w: 256, h: 96 }), { emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.3 });
    const dialOff = m.solid(0x3a2f20, { roughness: 0.5 });
    const dial = Prim.quad(0.09, 0.034, dialOff, { keepUV: true, cast: false });
    dial.position.set(0.08, 0.1, -0.0561);
    dial.rotation.y = Math.PI;
    dial.userData.keepSeparate = true;
    rg.add(dial);
    rg.position.set(5.35, y0 + 0.93, 5.65);
    const radio = mergeByMaterial(rg);
    let dialMesh: THREE.Mesh | null = null;
    radio.traverse((o) => { if (o instanceof THREE.Mesh && o.userData.keepSeparate) dialMesh = o; });
    ctx.dynamic.add(radio);
    const rpos = new THREE.Vector3(5.35, y0 + 1.0, 5.65);
    const radioToggle = new Toggle(radio, { on: 'Turn off radio', off: 'Turn on radio' }, (on) => {
      if (dialMesh) dialMesh.material = on ? dialOn : dialOff;
      ctx.audio.play('click', rpos);
      if (on) ctx.audio.startLoop('workshopRadio', 'hum', rpos, 0.28); else ctx.audio.stopLoop('workshopRadio');
    }, rpos);
    ctx.interact.add(radioToggle);
    power.listeners.push((on) => { if (!on) radioToggle.set(false); });

    // clamp-on work lamp at the bench's left end
    const lg = new THREE.Group();
    const clamp = Prim.box(0.06, 0.09, 0.05, m.darkMetal);
    clamp.position.set(0, 0.02, 0);
    clamp.userData.base = true;
    lg.add(clamp);
    lg.add(tube([0, 0.06, 0], [0, 0.5, 0], 0.008, m.darkMetal));
    lg.add(tube([0, 0.5, 0], [0.12, 0.62, -0.25], 0.008, m.darkMetal));
    const shade = Prim.lathe([[0.03, 0.15], [0.095, 0], [0.1, 0], [0.04, 0.155], [0, 0.155]], m.solid(0xb5b9bd, { roughness: 0.3, metalness: 0.8, envMapIntensity: 0.9, side: THREE.DoubleSide }), { segments: 18 });
    shade.position.set(0.12, 0.55, -0.25);
    shade.rotation.x = -0.6;
    lg.add(shade);
    const bulbs = bulbMaterials(ctx, 0xffdcae, 1.3);
    const bulb = Prim.sphere(0.022, bulbs.on, { segments: 10, cast: false });
    bulb.position.set(0.12, 0.53, -0.21);
    lg.add(bulb);
    lg.position.set(3.35, y0 + 0.93, 5.78);
    ctx.dynamic.add(lg);
    const wl = ctx.lights.point(3.47, y0 + 1.4, 5.5, { group: GROUP, intensity: 4.5, distance: 3.5, color: 0xffd6a5, emissives: [{ mesh: bulb, on: bulbs.on, off: bulbs.off }] });
    ctx.interact.add(new Lamp(ctx, lg, wl, 'work lamp'));
  }
  // stool
  {
    const g = new THREE.Group();
    const seat = Prim.cylinder(0.17, 0.16, 0.04, m.pine, { segments: 18 });
    seat.position.y = 0.66;
    g.add(seat);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = Prim.cylinder(0.016, 0.02, 0.66, m.pine, { segments: 8 });
      leg.position.set(sx * 0.12, 0.33, sz * 0.12);
      leg.rotation.set(-sz * 0.08, 0, sx * 0.08);
      g.add(leg);
    }
    for (const r of [0, Math.PI / 2]) {
      const rung = Prim.cylinder(0.01, 0.01, 0.28, m.pine, { segments: 6 });
      rung.rotation.set(0, r, Math.PI / 2);
      rung.position.y = 0.25;
      g.add(rung);
    }
    placeStatic(ctx, g, 4.35, 4.55, 0.4, [], 'wood');
    ctx.physics.addCylinder({ x: 4.35, y: y0 + 0.34, z: 4.55 }, 0.18, 0.68, { meta: { surface: 'wood' } });
  }

  // ------------------------------------------------------------------ drill press (NE corner)
  {
    const g = new THREE.Group();
    const dark = m.solid(0x3a3d42, { roughness: 0.55, metalness: 0.5 });
    const blue = m.paintedMetal(0x4f6d8c);
    const base = Prim.rbox(0.36, 0.06, 0.5, 0.008, dark);
    base.position.set(0, 0.03, 0.02);
    g.add(base);
    const col = Prim.cylinder(0.035, 0.035, 1.55, m.solid(0x9a9ea3, { roughness: 0.3, metalness: 0.9 }), { segments: 14 });
    col.position.set(0, 0.8, 0.15);
    g.add(col);
    const table = Prim.rbox(0.32, 0.03, 0.3, 0.006, dark);
    table.position.set(0, 0.9, -0.05);
    g.add(table);
    const bracket = Prim.cylinder(0.06, 0.06, 0.08, dark, { segments: 12 });
    bracket.position.set(0, 0.9, 0.15);
    g.add(bracket);
    const head = Prim.rbox(0.26, 0.28, 0.5, 0.02, blue);
    head.position.set(0, 1.5, -0.05);
    g.add(head);
    const pulley = Prim.cylinder(0.11, 0.11, 0.1, dark, { segments: 16 });
    pulley.position.set(0, 1.69, 0.12);
    g.add(pulley);
    const quill = Prim.cylinder(0.035, 0.035, 0.1, m.chrome, { segments: 12 });
    quill.position.set(0, 1.32, -0.25);
    g.add(quill);
    const chuck = Prim.cylinder(0.022, 0.026, 0.08, m.chrome, { segments: 12 });
    chuck.position.set(0, 1.23, -0.25);
    g.add(chuck);
    const bit = Prim.cylinder(0.004, 0.004, 0.08, m.chrome, { segments: 6 });
    bit.position.set(0, 1.15, -0.25);
    g.add(bit);
    const hub = Prim.cylinder(0.02, 0.02, 0.04, dark, { segments: 10 });
    hub.rotation.z = Math.PI / 2;
    hub.position.set(0.16, 1.45, -0.2);
    g.add(hub);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const rod = Prim.cylinder(0.006, 0.006, 0.18, m.chrome, { segments: 6 });
      rod.position.set(0.17, 1.45 + Math.cos(a) * 0.09, -0.2 + Math.sin(a) * 0.09);
      rod.rotation.x = -a;
      g.add(rod);
      const knob = Prim.sphere(0.013, m.plasticBlack, { segments: 8 });
      knob.position.set(0.17, 1.45 + Math.cos(a) * 0.18, -0.2 + Math.sin(a) * 0.18);
      g.add(knob);
    }
    const sw = Prim.box(0.06, 0.05, 0.02, m.solid(0x27ae60, { roughness: 0.5 }));
    sw.position.set(-0.1, 1.42, -0.31);
    g.add(sw);
    const dustPile = Prim.cylinder(0.08, 0.1, 0.004, bm.sawdust, { segments: 10, cast: false });
    dustPile.position.set(0.05, 0.917, -0.08);
    g.add(dustPile);
    placeStatic(ctx, g, 7.35, 5.4, 0, [{ size: [0.5, 1.75, 0.65], center: [0, 0.875, 0] }], 'metal');
  }

  // ------------------------------------------------------------------ table saw (mid room)
  {
    const g = new THREE.Group();
    const cab = Prim.rbox(0.62, 0.78, 0.58, 0.01, bm.steelGrey);
    cab.position.y = 0.4;
    g.add(cab);
    const top = Prim.rbox(0.9, 0.04, 0.68, 0.006, m.solid(0xb8bcc0, { roughness: 0.35, metalness: 0.8, envMapIntensity: 0.9 }));
    top.position.y = 0.89;
    g.add(top);
    const blade = Prim.cylinder(0.125, 0.125, 0.003, m.chrome, { segments: 32 });
    blade.rotation.z = Math.PI / 2;
    blade.position.set(0, 0.85, 0);
    g.add(blade);
    const guard = Prim.rbox(0.05, 0.06, 0.24, 0.015, m.solid(0xf07020, { roughness: 0.5 }));
    guard.position.set(0, 0.99, 0.02);
    g.add(guard);
    const fence = Prim.rbox(0.05, 0.07, 0.68, 0.008, m.solid(0xb8bcc0, { roughness: 0.35, metalness: 0.8 }));
    fence.position.set(0.24, 0.945, 0);
    g.add(fence);
    const rail = Prim.box(0.95, 0.03, 0.04, bm.steelDark);
    rail.position.set(0, 0.9, -0.36);
    g.add(rail);
    for (const x of [-0.15, 0.15]) {
      const slot = Prim.box(0.02, 0.004, 0.68, bm.steelDark);
      slot.position.set(x, 0.911, 0);
      g.add(slot);
    }
    const sw = Prim.rbox(0.07, 0.09, 0.02, 0.008, m.solid(0xc0272d, { roughness: 0.5 }));
    sw.position.set(-0.18, 0.7, -0.3);
    g.add(sw);
    const port = Prim.cylinder(0.04, 0.04, 0.06, bm.steelDark, { segments: 12 });
    port.rotation.x = Math.PI / 2;
    port.position.set(0.1, 0.3, 0.31);
    g.add(port);
    for (const [x, z] of [[-0.26, -0.24], [0.26, -0.24], [-0.26, 0.24], [0.26, 0.24]]) {
      const caster = Prim.cylinder(0.03, 0.03, 0.03, bm.rubber, { segments: 10 });
      caster.rotation.z = Math.PI / 2;
      caster.position.set(x, 0.03, z);
      g.add(caster);
    }
    const dust = Prim.cylinder(0.3, 0.34, 0.004, bm.sawdust, { segments: 14, cast: false });
    dust.position.set(0.1, 0.002, -0.35);
    g.add(dust);
    placeStatic(ctx, g, 5.2, 2.4, 0, [{ size: [0.9, 0.92, 0.7], center: [0, 0.46, 0] }], 'metal');
  }

  // ------------------------------------------------------------------ shelving unit (south wall) with jars, cans, sprays
  {
    const g = new THREE.Group();
    const L = 1.8, D = 0.45, H = 1.9;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const post = Prim.box(0.035, H, 0.035, bm.shelfMetal);
      post.position.set(sx * (L / 2 - 0.02), H / 2, sz * (D / 2 - 0.02));
      g.add(post);
    }
    const levels = [0.09, 0.51, 0.93, 1.35, 1.77];
    for (const yy of levels) {
      const s = Prim.box(L, 0.03, D, bm.shelfMetal);
      s.position.y = yy;
      g.add(s);
    }
    const put = (o: THREE.Object3D, x: number, y: number, z = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; g.add(o); };
    // level 0: paint cans, bucket
    put(paintCan(ctx, 0xd85a1e), -0.7, 0.105, -0.05);
    put(paintCan(ctx, 0xe8e8e2), -0.5, 0.105, 0.08);
    put(paintCan(ctx, 0x2f6fd0), -0.32, 0.105, -0.06);
    put(paintCan(ctx, 0x3aa655, 0.06, 0.13), -0.12, 0.105, 0.05);
    put(paintCan(ctx, 0xf2c230, 0.06, 0.13), 0.02, 0.105, -0.08);
    const bucket = Prim.lathe([[0, 0], [0.13, 0], [0.15, 0.3], [0.13, 0.3], [0.115, 0.02], [0, 0.02]], m.solid(0xe9e9e4, { roughness: 0.5 }), { segments: 16 });
    put(bucket, 0.5, 0.105);
    // level 1: boxes + coffee can + glue
    put(cardboardBox(ctx, 0.4, 0.26, 0.3, 'HARDWARE'), -0.55, 0.525, 0, 0.03);
    put(cardboardBox(ctx, 0.28, 0.18, 0.24, 'NAILS'), -0.1, 0.525, 0.02, -0.06);
    const coffee = Prim.cylinder(0.065, 0.065, 0.16, m.solid(0xc0392b, { roughness: 0.5 }), { segments: 14 });
    put(coffee, 0.25, 0.605);
    const coffeeLbl = labelQuad(ctx, 'BITS', 0.09, 0.06, { bg: '#c0392b', fg: '#fff', font: 'bold 100px Impact, "Arial Black", sans-serif' });
    put(coffeeLbl, 0.25, 0.605, 0.066);
    const glue = Prim.rbox(0.07, 0.16, 0.05, 0.015, m.solid(0xf4f4f0, { roughness: 0.45 }));
    put(glue, 0.5, 0.605);
    const glueCap = Prim.cylinder(0.012, 0.012, 0.04, m.solid(0xf07020, { roughness: 0.45 }), { segments: 8 });
    put(glueCap, 0.5, 0.705);
    const filler = Prim.cylinder(0.05, 0.05, 0.1, m.solid(0xe8d5a0, { roughness: 0.5 }), { segments: 12 });
    put(filler, 0.68, 0.575);
    // level 2: jars of screws (glass → dynamic group), tape rolls
    const jarG = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const x = -0.78 + i * 0.13 + (rng() - 0.5) * 0.02;
      const jar = Prim.cylinder(0.035, 0.035, 0.09, m.glassClear, { segments: 12 });
      jar.position.set(x, 0.99, (rng() - 0.5) * 0.06);
      jarG.add(jar);
      const fill = Prim.cylinder(0.031, 0.031, 0.05 + rng() * 0.03, m.solid(i % 2 ? 0x6b6f75 : 0x8a7a55, { roughness: 0.6, metalness: 0.6 }), { segments: 10 });
      fill.position.set(x, 0.975, jar.position.z);
      put(fill, fill.position.x, fill.position.y, fill.position.z);
      const lid = Prim.cylinder(0.037, 0.037, 0.015, i % 3 === 0 ? m.brass : m.solid(0xc0392b, { roughness: 0.5 }), { segments: 12 });
      put(lid, x, 1.0425, jar.position.z);
    }
    jarG.position.set(5.4, y0, -0.715);
    ctx.dynamic.add(mergeByMaterial(jarG));
    for (let i = 0; i < 3; i++) {
      const tape = Prim.torus(0.04, 0.02, m.solid([0x8a8f94, 0x2a2a2a, 0x2a6bd6][i], { roughness: 0.7 }));
      put(tape, 0.45 + i * 0.05, 0.965 + i * 0.04, 0.05);
    }
    // level 3: spray cans, oil can, rag
    const sprayCols = [0xd8d8d2, 0x2a2a2a, 0xf2c230, 0x2f6fd0, 0xc0392b, 0x3aa655];
    sprayCols.forEach((col, i) => {
      const can = Prim.cylinder(0.033, 0.033, 0.19, m.solid(col, { roughness: 0.35, metalness: 0.5, envMapIntensity: 0.8 }), { segments: 12 });
      put(can, -0.75 + i * 0.09, 1.46, (rng() - 0.5) * 0.06);
      const cap = Prim.cylinder(0.02, 0.02, 0.03, m.solid(sprayCols[(i + 2) % 6], { roughness: 0.5 }), { segments: 10 });
      put(cap, can.position.x, 1.57, can.position.z);
    });
    const oil = Prim.lathe([[0, 0], [0.04, 0], [0.045, 0.1], [0.02, 0.12], [0.008, 0.2], [0, 0.2]], m.solid(0xc0392b, { roughness: 0.4, metalness: 0.5 }), { segments: 12 });
    put(oil, 0.1, 1.365);
    const rag = Prim.rbox(0.22, 0.05, 0.16, 0.02, m.fabric(0xc9a15a));
    put(rag, 0.45, 1.39, 0, 0.3);
    // level 4: bins
    put(cardboardBox(ctx, 0.45, 0.28, 0.34, 'FITTINGS'), -0.5, 1.785, 0, 0.02);
    const bin = Prim.rbox(0.42, 0.26, 0.34, 0.02, m.solid(0x2f6fd0, { roughness: 0.5 }));
    put(bin, 0.35, 1.915);
    placeStatic(ctx, g, 5.4, -0.715, 0, [{ size: [L, H, D], center: [0, H / 2, 0] }], 'metal');
  }

  // ------------------------------------------------------------------ bicycles leaning on the west wall
  {
    const bikeA = bicycle(ctx, 0x2a6bd6);
    bikeA.position.set(1.95, y0, 4.35);
    bikeA.rotation.z = 0.12;
    addStatic(ctx, bikeA, [{ size: [0.5, 1.0, 1.7], center: [0, 0.5, 0] }], { surface: 'metal' });
    const bikeB = bicycle(ctx, 0xc0392b);
    bikeB.position.set(2.45, y0, 4.5);
    bikeB.rotation.z = 0.12;
    addStatic(ctx, bikeB, [{ size: [0.5, 1.0, 1.7], center: [0, 0.5, 0] }], { surface: 'metal' });
    // helmet on the floor + pump
    const helmet = Prim.sphere(0.13, m.solid(0x2a2a2a, { roughness: 0.3, envMapIntensity: 0.8 }), { segments: 12 });
    helmet.scale.set(1, 0.7, 1.15);
    helmet.position.set(2.2, y0 + 0.09, 3.3);
    ctx.batch.add(helmet);
    const pump = Prim.cylinder(0.02, 0.02, 0.6, m.solid(0x2a2a2a, { roughness: 0.4, metalness: 0.5 }), { segments: 8 });
    pump.position.set(1.65, y0 + 0.31, 3.3);
    pump.rotation.z = 0.12;
    ctx.batch.add(pump);
  }

  // ------------------------------------------------------------------ lawn mower (SW corner)
  {
    const g = new THREE.Group();
    const red = m.paintedMetal(0xb02a2a);
    const deck = Prim.rbox(0.55, 0.14, 0.52, 0.03, red);
    deck.position.y = 0.17;
    g.add(deck);
    for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.22], [0.3, 0.22]]) {
      const wheel = Prim.cylinder(0.1, 0.1, 0.05, bm.rubber, { segments: 14 });
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.1, z);
      g.add(wheel);
      const hub = Prim.cylinder(0.045, 0.045, 0.054, m.solid(0xd8d8d2, { roughness: 0.4 }), { segments: 10 });
      hub.rotation.z = Math.PI / 2;
      hub.position.set(x, 0.1, z);
      g.add(hub);
    }
    const engine = Prim.rbox(0.3, 0.22, 0.28, 0.02, m.solid(0x2b2d30, { roughness: 0.5, metalness: 0.4 }));
    engine.position.set(0, 0.35, -0.02);
    g.add(engine);
    const cover = Prim.rbox(0.2, 0.06, 0.2, 0.02, red);
    cover.position.set(0, 0.49, -0.02);
    g.add(cover);
    const gas = Prim.cylinder(0.03, 0.03, 0.025, m.solid(0xc0272d, { roughness: 0.5 }), { segments: 10 });
    gas.position.set(0.09, 0.5, 0.08);
    g.add(gas);
    const pull = Prim.box(0.06, 0.02, 0.02, m.plasticBlack);
    pull.position.set(-0.1, 0.48, -0.16);
    g.add(pull);
    const muffler = Prim.cylinder(0.03, 0.03, 0.08, bm.galvDark, { segments: 10 });
    muffler.rotation.z = Math.PI / 2;
    muffler.position.set(-0.18, 0.32, -0.1);
    g.add(muffler);
    for (const s of [-0.22, 0.22]) g.add(tube([s, 0.22, 0.24], [s, 0.98, 0.98], 0.012, m.darkMetal));
    const cross = Prim.cylinder(0.012, 0.012, 0.48, m.darkMetal, { segments: 8 });
    cross.rotation.z = Math.PI / 2;
    cross.position.set(0, 0.98, 0.98);
    g.add(cross);
    for (const s of [-0.16, 0.16]) {
      const grip = Prim.cylinder(0.018, 0.018, 0.12, bm.rubber, { segments: 8 });
      grip.rotation.z = Math.PI / 2;
      grip.position.set(s, 0.98, 0.98);
      g.add(grip);
    }
    const bail = Prim.cylinder(0.008, 0.008, 0.44, m.darkMetal, { segments: 6 });
    bail.rotation.z = Math.PI / 2;
    bail.position.set(0, 1.02, 0.9);
    g.add(bail);
    const bag = Prim.rbox(0.42, 0.28, 0.24, 0.03, m.fabric(0x33363a));
    bag.position.set(0, 0.42, 0.52);
    bag.rotation.x = -0.4;
    g.add(bag);
    placeStatic(ctx, g, 2.25, -0.3, 0, [{ size: [0.62, 0.55, 0.75], center: [0, 0.28, 0.05] }, { size: [0.5, 0.15, 0.2], center: [0, 0.98, 0.95] }], 'metal');
  }

  // ------------------------------------------------------------------ shop vac
  {
    const g = new THREE.Group();
    const drum = Prim.cylinder(0.2, 0.2, 0.5, m.solid(0x3b3f45, { roughness: 0.55 }), { segments: 20 });
    drum.position.y = 0.3;
    g.add(drum);
    const lid = Prim.cylinder(0.22, 0.22, 0.09, m.solid(0xd85a1e, { roughness: 0.5 }), { segments: 20 });
    lid.position.y = 0.6;
    g.add(lid);
    const motor = Prim.cylinder(0.13, 0.13, 0.14, m.plasticBlack, { segments: 16 });
    motor.position.y = 0.72;
    g.add(motor);
    const handle = Prim.torus(0.1, 0.012, m.plasticBlack, { arc: Math.PI });
    handle.rotation.x = Math.PI / 2;
    handle.position.y = 0.79;
    g.add(handle);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const c = Prim.cylinder(0.025, 0.025, 0.03, bm.rubber, { segments: 8 });
      c.position.set(Math.cos(a) * 0.17, 0.03, Math.sin(a) * 0.17);
      g.add(c);
    }
    const hose = Prim.torus(0.3, 0.022, bm.rubber, { arc: Math.PI * 1.6 });
    hose.position.set(0.05, 0.03, 0.05);
    g.add(hose);
    const port = Prim.cylinder(0.03, 0.03, 0.1, m.plasticBlack, { segments: 10 });
    port.rotation.x = Math.PI / 2;
    port.position.set(0, 0.45, 0.22);
    g.add(port);
    placeStatic(ctx, g, 3.4, -0.5, 0.5, [], 'metal');
    ctx.physics.addCylinder({ x: 3.4, y: y0 + 0.4, z: -0.5 }, 0.23, 0.8, { meta: { surface: 'metal' } });
  }

  // ------------------------------------------------------------------ fire extinguisher, cord reel, lumber, scraps, sign, clock
  {
    const g = new THREE.Group();
    // extinguisher on the west wall
    const red = m.paintedMetal(0xc0262e);
    const bracket = Prim.box(0.02, 0.08, 0.1, m.darkMetal);
    bracket.position.set(1.575, 1.25, 1.25);
    g.add(bracket);
    const body = Prim.cylinder(0.055, 0.055, 0.42, red, { segments: 16 });
    body.position.set(1.64, 1.25, 1.25);
    g.add(body);
    const topDome = Prim.sphere(0.055, red, { segments: 12 });
    topDome.scale.set(1, 0.5, 1);
    topDome.position.set(1.64, 1.46, 1.25);
    g.add(topDome);
    const valve = Prim.cylinder(0.018, 0.02, 0.06, m.chrome, { segments: 10 });
    valve.position.set(1.64, 1.51, 1.25);
    g.add(valve);
    const lever = Prim.rbox(0.09, 0.012, 0.02, 0.004, m.chrome);
    lever.position.set(1.66, 1.55, 1.25);
    lever.rotation.z = -0.2;
    g.add(lever);
    g.add(tube([1.66, 1.5, 1.27], [1.7, 1.15, 1.29], 0.008, bm.rubber));
    const nozzle = Prim.cylinder(0.014, 0.02, 0.05, m.plasticBlack, { segments: 8 });
    nozzle.position.set(1.7, 1.12, 1.29);
    g.add(nozzle);
    const exLbl = labelQuad(ctx, 'FIRE', 0.07, 0.12, { bg: '#c0262e', fg: '#fff', sub: 'ABC · 5 lb', font: 'bold 110px Impact, "Arial Black", sans-serif' });
    exLbl.rotation.y = Math.PI / 2;
    exLbl.position.set(1.696, 1.25, 1.25);
    g.add(exLbl);
    // extension cord reel on the east wall
    const rb = Prim.box(0.03, 0.14, 0.14, m.darkMetal);
    rb.position.set(7.835, 1.45, 4.2);
    g.add(rb);
    const orange = m.solid(0xf07020, { roughness: 0.5 });
    const reel = Prim.cylinder(0.11, 0.11, 0.1, orange, { segments: 16 });
    reel.rotation.z = Math.PI / 2;
    reel.position.set(7.76, 1.45, 4.2);
    g.add(reel);
    for (const x of [7.705, 7.815]) {
      const disc = Prim.cylinder(0.13, 0.13, 0.012, m.solid(0x2a2c30, { roughness: 0.5 }), { segments: 16 });
      disc.rotation.z = Math.PI / 2;
      disc.position.set(x, 1.45, 4.2);
      g.add(disc);
    }
    const coil = Prim.torus(0.095, 0.03, orange);
    coil.rotation.z = Math.PI / 2;
    coil.position.set(7.76, 1.45, 4.2);
    g.add(coil);
    g.add(tube([7.72, 1.35, 4.2], [7.7, 0.55, 4.28], 0.006, orange));
    const plug = Prim.box(0.03, 0.05, 0.03, m.plasticBlack);
    plug.position.set(7.7, 0.53, 4.28);
    g.add(plug);
    // spare lumber leaning on the east wall
    const lg = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const b = Prim.box(0.04, 2.4 - i * 0.1, 0.09, m.pine);
      b.position.set(i * 0.045, (2.4 - i * 0.1) / 2, (i - 1.5) * 0.11);
      b.rotation.x = (rng() - 0.5) * 0.03;
      lg.add(b);
    }
    for (let i = 0; i < 2; i++) {
      const ply = Prim.box(0.018, 2.4, 1.2, m.pine);
      ply.position.set(0.2 + i * 0.025, 1.2, 0.05);
      lg.add(ply);
    }
    lg.position.set(7.3, 0, 1.8);
    lg.rotation.z = -0.2;
    g.add(lg);
    // scrap bin beside the bench + scraps and sawdust on the floor
    const bin = Prim.cylinder(0.18, 0.16, 0.42, m.solid(0x6d7278, { roughness: 0.45, metalness: 0.6 }), { segments: 16 });
    bin.position.set(6.2, 0.21, 5.4);
    g.add(bin);
    for (let i = 0; i < 5; i++) {
      const b = Prim.box(0.03, 0.55 + rng() * 0.2, 0.07, m.pine);
      const a = rng() * Math.PI * 2;
      b.position.set(6.2 + Math.cos(a) * 0.08, 0.45, 5.4 + Math.sin(a) * 0.08);
      b.rotation.set((rng() - 0.5) * 0.3, rng() * 3, (rng() - 0.5) * 0.3);
      g.add(b);
    }
    for (let i = 0; i < 6; i++) {
      const s = Prim.box(0.25 + rng() * 0.3, 0.035, 0.07, m.pine);
      s.position.set(4.6 + rng() * 1.2, 0.0175 + (i % 2) * 0.035, 1.3 + rng() * 0.7);
      s.rotation.y = rng() * 3;
      g.add(s);
    }
    for (const [x, z, r] of [[5.6, 2.9, 0.28], [4.7, 4.85, 0.22], [6.4, 4.9, 0.18]]) {
      const d = Prim.cylinder(r, r * 1.1, 0.003, bm.sawdust, { segments: 12, cast: false });
      d.position.set(x, 0.002, z);
      g.add(d);
    }
    addStatic(ctx, g, [
      { size: [0.16, 0.5, 0.16], center: [1.64, 1.25, 1.25] },
      { size: [0.35, 2.4, 1.3], center: [7.45, 1.2, 1.8] },
      { size: [0.4, 0.45, 0.4], center: [6.2, 0.22, 5.4] },
    ], { surface: 'wood' });
    g.position.y = y0;
    g.updateWorldMatrix(true, true);
  }

  pictureFrame(ctx, 3.4, y0 + 1.6, -0.93, 0, 0.7, 0.5,
    ctx.tex.label('SHOP RULES', { bg: '#f4efe4', fg: '#1f2a44', sub: 'EYES · EARS · MEASURE TWICE · CLEAN UP', font: 'bold 72px Impact, "Arial Black", sans-serif', w: 640, h: 448 }), { frameColor: 0x1a1a1a });
  wallClock(ctx, 6.6, y0 + 2.1, -0.93, 0, 0.16);

  // ------------------------------------------------------------------ fluorescent strip lights, switch
  for (const [x, z] of [[4.4, 4.4], [5.8, 1.3]]) {
    const g = new THREE.Group();
    const housing = Prim.box(1.22, 0.06, 0.26, m.solid(0xf0f0ec, { roughness: 0.45 }));
    housing.position.set(x, CEIL_H - 0.33, z);
    g.add(housing);
    for (const dx of [-0.55, 0.55]) {
      const chain = Prim.cylinder(0.003, 0.003, 0.3, m.chrome, { segments: 6 });
      chain.position.set(x + dx, CEIL_H - 0.15, z);
      g.add(chain);
      const cap = Prim.box(0.03, 0.05, 0.2, m.solid(0xd8d8d4, { roughness: 0.5 }));
      cap.position.set(x + dx * 1.07, CEIL_H - 0.38, z);
      g.add(cap);
    }
    placeStatic(ctx, g, 0, 0, 0, [], 'metal');
    const tubeOn = m.emissive(0xf3f7ff, 1.8, 0xf6f8ff);
    const tubeOff = m.solid(0xe8ecee, { roughness: 0.4 });
    const emissives: { mesh: THREE.Mesh; on: THREE.Material; off: THREE.Material }[] = [];
    for (const dz of [-0.06, 0.06]) {
      const t = Prim.cylinder(0.018, 0.018, 1.15, tubeOn, { segments: 10, cast: false });
      t.rotation.z = Math.PI / 2;
      t.position.set(x, CEIL_Y - 0.38, z + dz);
      ctx.dynamic.add(t);
      emissives.push({ mesh: t, on: tubeOn, off: tubeOff });
    }
    ctx.lights.point(x, CEIL_Y - 0.45, z, { group: GROUP, intensity: 11, distance: 8.5, color: 0xe8f0ff, emissives, shadow: x < 5 });
  }
  lightSwitch(ctx, 1.57, y0 + 1.2, 1.84, Math.PI / 2, GROUP);
}
