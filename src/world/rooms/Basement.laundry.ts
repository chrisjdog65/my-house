/**
 * Laundry room (room id 'laundry'): washer & dryer with hinged porthole doors, utility sink with a
 * running faucet, wire shelving with detergent, basket of clothes, ironing board, drying rack,
 * folding table, wall cabinet, floor drain, broom & mop.
 */
import * as THREE from 'three';
import { Prim, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import { pickup, lightSwitch, pictureFrame, hinged, Toggle } from '../Props';
import { FLOOR_Y, CEIL_H, bmats, labelQuad, imageMat, pipeRun, placeStatic, pullChainLight, tube, type BasementPower } from './Basement.helpers';

const GROUP = 'laundry';
const CLOTH = [0x9c3b3b, 0x3b5f9c, 0xe3dcc9, 0x556b2f, 0xd0a45c, 0x6b4f8a, 0xf0eee6, 0x9db4c0];

function frontLoader(ctx: Ctx, x: number, z: number, kind: 'washer' | 'dryer', power: BasementPower) {
  const m = ctx.mats;
  const bm = bmats(ctx);
  const W = bm.whiteAppliance;
  const g = new THREE.Group();
  const add = (mesh: THREE.Mesh, px: number, py: number, pz: number) => { mesh.position.set(px, py, pz); g.add(mesh); return mesh; };
  // shell (hollow so the drum shows through the porthole)
  add(Prim.box(0.68, 0.92, 0.02, W), 0, 0.46, -0.35);
  add(Prim.box(0.02, 0.92, 0.72, W), -0.33, 0.46, 0);
  add(Prim.box(0.02, 0.92, 0.72, W), 0.33, 0.46, 0);
  add(Prim.rbox(0.7, 0.03, 0.74, 0.008, m.solid(0xe4e4e0, { roughness: 0.35 })), 0, 0.925, 0);
  add(Prim.box(0.68, 0.06, 0.72, W), 0, 0.03, 0);
  add(Prim.box(0.68, 0.24, 0.02, W), 0, 0.8, 0.35);
  add(Prim.box(0.68, 0.28, 0.02, W), 0, 0.14, 0.35);
  add(Prim.box(0.14, 0.4, 0.02, W), -0.27, 0.48, 0.35);
  add(Prim.box(0.14, 0.4, 0.02, W), 0.27, 0.48, 0.35);
  for (const [fx, fz] of [[-0.28, -0.3], [0.28, -0.3], [-0.28, 0.3], [0.28, 0.3]]) add(Prim.cylinder(0.025, 0.025, 0.02, bm.rubber, { segments: 8 }), fx, 0.01, fz);
  // drum
  const drumMat = m.solid(0x9aa0a6, { roughness: 0.4, metalness: 0.7, side: THREE.DoubleSide, envMapIntensity: 0.8 });
  const drum = Prim.cylinder(0.235, 0.235, 0.42, drumMat, { segments: 24, open: true });
  drum.rotation.x = Math.PI / 2;
  add(drum, 0, 0.48, 0.15);
  const drumBack = Prim.cylinder(0.235, 0.235, 0.01, m.solid(0x5a6066, { roughness: 0.5, metalness: 0.6 }), { segments: 24 });
  drumBack.rotation.x = Math.PI / 2;
  add(drumBack, 0, 0.48, -0.06);
  // a few clothes inside the drum
  for (let i = 0; i < 3; i++) {
    const c = Prim.rbox(0.16, 0.06, 0.14, 0.02, m.fabric(CLOTH[(i * 3 + (kind === 'dryer' ? 1 : 0)) % CLOTH.length]));
    add(c, (ctx.rng() - 0.5) * 0.2, 0.28 + i * 0.03, 0.05 + (ctx.rng() - 0.5) * 0.2);
    c.rotation.set(ctx.rng() * 0.5, ctx.rng() * 3, ctx.rng() * 0.5);
  }
  // porthole rim
  const rim = Prim.torus(0.27, 0.03, kind === 'washer' ? bm.plasticGrey : m.solid(0xd8d8d4, { roughness: 0.4 }));
  rim.rotation.x = Math.PI / 2;
  add(rim, 0, 0.48, 0.36);
  // control strip
  add(Prim.box(0.66, 0.1, 0.02, m.solid(0x2a2c30, { roughness: 0.45 })), 0, 0.85, 0.36);
  const knobXs = kind === 'washer' ? [-0.22, -0.12] : [-0.2];
  for (const kx of knobXs) {
    const k = Prim.cylinder(0.022, 0.022, 0.02, m.chrome, { segments: 14 });
    k.rotation.x = Math.PI / 2;
    add(k, kx, 0.85, 0.375);
    const mark = Prim.box(0.004, 0.012, 0.004, m.plasticBlack);
    add(mark, kx, 0.862, 0.386);
  }
  for (let i = 0; i < 3; i++) add(Prim.rbox(0.022, 0.012, 0.006, 0.002, bm.plasticGrey), -0.02 + i * 0.035, 0.85, 0.372);
  if (kind === 'dryer') add(Prim.rbox(0.05, 0.02, 0.008, 0.003, m.solid(0x27ae60, { roughness: 0.4 })), 0.08, 0.85, 0.372);
  const brand = labelQuad(ctx, kind === 'washer' ? 'WASHMATIC' : 'DRYMATIC', 0.11, 0.022, { bg: '#2a2c30', fg: '#c9c9c9', font: 'bold 60px Arial, sans-serif' });
  add(brand, -0.24, 0.885, 0.371);
  if (kind === 'washer') {
    add(Prim.box(0.18, 0.05, 0.008, bm.plasticGrey), -0.22, 0.72, 0.36);
    add(Prim.box(0.06, 0.008, 0.01, m.solid(0x9a9c9e, { roughness: 0.4 })), -0.22, 0.735, 0.366);
  } else {
    add(Prim.box(0.22, 0.02, 0.03, bm.plasticGrey), 0.15, 0.93, 0.3);
  }
  placeStatic(ctx, g, x, z, 0, [{ size: [0.7, 0.95, 0.74], center: [0, 0.475, 0] }], 'metal');

  // dynamic: door + display
  const dg = new THREE.Group();
  dg.position.set(x, FLOOR_Y, z);
  ctx.dynamic.add(dg);
  const dispOn = imageMat(ctx, ctx.tex.label(kind === 'washer' ? '0:45' : '0:38', { bg: '#0a1a20', fg: '#5cf2ff', font: 'bold 80px monospace', w: 256, h: 96 }), { emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.3 });
  const disp = Prim.quad(0.11, 0.042, dispOn, { keepUV: true, cast: false });
  disp.position.set(0.2, 0.85, 0.371);
  dg.add(disp);
  power.listeners.push((on) => { disp.material = on ? dispOn : m.screenOff; });
  hinged(ctx, dg, new THREE.Vector3(-0.27, 0.48, 0.375), (pivot) => {
    const ring = Prim.torus(0.25, 0.028, kind === 'washer' ? m.chrome : m.solid(0xd8d8d4, { roughness: 0.4 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0.27, 0, 0);
    pivot.add(ring);
    const dome = Prim.lathe([[0, 0.06], [0.1, 0.055], [0.18, 0.035], [0.23, 0.005], [0.235, 0]], m.glassClear, { segments: 24 });
    dome.rotation.x = Math.PI / 2;
    dome.position.set(0.27, 0, 0.005);
    pivot.add(dome);
    const handle = Prim.rbox(0.03, 0.11, 0.035, 0.008, bm.plasticGrey);
    handle.position.set(0.27 + 0.235, 0, 0.03);
    pivot.add(handle);
  }, kind + ' door', { maxAngle: -Math.PI * 0.55, sfx: 'drawer' });
}

function detergentBottle(ctx: Ctx, x: number, y: number, z: number, color: number, cap: number, name: string) {
  const m = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.rbox(0.13, 0.26, 0.09, 0.02, m.solid(color, { roughness: 0.4, envMapIntensity: 0.6 }));
  body.position.y = 0.13;
  g.add(body);
  const capM = Prim.cylinder(0.03, 0.03, 0.035, m.solid(cap, { roughness: 0.45 }), { segments: 12 });
  capM.position.set(0.03, 0.277, 0);
  g.add(capM);
  const lbl = labelQuad(ctx, name, 0.09, 0.1, { bg: '#' + new THREE.Color(cap).getHexString(), fg: '#ffffff', font: 'bold 100px Impact, "Arial Black", sans-serif', sub: 'ULTRA CLEAN · 64 LOADS' });
  lbl.position.set(0, 0.14, 0.047);
  g.add(lbl);
  g.position.set(x, y, z);
  g.rotation.y = -Math.PI / 2;
  return pickup(ctx, mergeByMaterial(g), { name: 'detergent', mass: 0.9, shape: { type: 'box', size: new THREE.Vector3(0.13, 0.3, 0.09) }, offset: new THREE.Vector3(0, 0.15, 0) });
}

export function buildLaundry(ctx: Ctx, power: BasementPower) {
  const m = ctx.mats;
  const bm = bmats(ctx);
  const y0 = FLOOR_Y;
  const rng = ctx.rng;

  frontLoader(ctx, 2.95, -5.47, 'washer', power);
  frontLoader(ctx, 3.7, -5.47, 'dryer', power);

  // ------------------------------------------------------------------ plumbing, supply box, dryer vent, wall cabinet
  {
    const g = new THREE.Group();
    const yp = CEIL_H - 0.04;
    // hot & cold mains hug the back wall above the cabinet, then drop behind the sink (clear of the faucet)
    pipeRun([[1.56, yp, -4.55], [2.4, yp, -4.55], [2.4, yp, -5.8], [4.45, yp, -5.8], [4.45, 1.12, -5.8], [4.45, 1.12, -5.838], [5.1, 1.12, -5.838], [5.1, 0.88, -5.838]], 0.012, bm.copper, g);
    pipeRun([[1.56, yp, -4.65], [2.3, yp, -4.65], [2.3, yp, -5.75], [4.35, yp, -5.75], [4.35, 1.05, -5.75], [4.35, 1.05, -5.838], [4.9, 1.05, -5.838], [4.9, 0.88, -5.838]], 0.012, bm.copper, g);
    // washer supplies: drop beside the cabinet, run along the wall into the supply box
    pipeRun([[2.4, yp, -5.8], [2.4, 1.5, -5.8], [2.4, 1.5, -5.838], [2.89, 1.5, -5.838], [2.89, 1.46, -5.838]], 0.012, bm.copper, g);
    pipeRun([[2.3, yp, -5.75], [2.3, 1.56, -5.75], [2.3, 1.56, -5.838], [3.01, 1.56, -5.838], [3.01, 1.46, -5.838]], 0.012, bm.copper, g);
    // supply box with valves and hoses to the washer
    const box = Prim.box(0.3, 0.24, 0.06, bm.plasticGrey);
    box.position.set(2.95, 1.35, -5.82);
    g.add(box);
    for (const [dx, col] of [[-0.06, 0x2f6fd0], [0.06, 0xc0392b]] as [number, number][]) {
      const v = Prim.cylinder(0.025, 0.025, 0.02, m.solid(col, { roughness: 0.5 }), { segments: 10 });
      v.rotation.x = Math.PI / 2;
      v.position.set(2.95 + dx, 1.4, -5.78);
      g.add(v);
      g.add(tube([2.95 + dx, 1.3, -5.78], [2.95 + dx * 1.5, 0.95, -5.76], 0.012, bm.rubber));
    }
    // dryer vent
    pipeRun([[3.95, 0.9, -5.7], [4.25, 0.9, -5.7], [4.25, 2.3, -5.7], [4.25, 2.3, -5.86]], 0.05, bm.galvDark, g);
    for (const yy of [1.2, 1.6, 2.0]) {
      const ring = Prim.torus(0.052, 0.008, bm.galv);
      ring.position.set(4.25, yy, -5.7);
      g.add(ring);
    }
    const collar = Prim.cylinder(0.075, 0.075, 0.03, bm.galv, { segments: 16 });
    collar.rotation.x = Math.PI / 2;
    collar.position.set(4.25, 2.3, -5.84);
    g.add(collar);
    // wall cabinet above the machines
    const cab = Prim.rbox(1.45, 0.6, 0.32, 0.006, m.solid(0xe6e6e2, { roughness: 0.45 }));
    cab.position.set(3.325, 1.9, -5.69);
    g.add(cab);
    for (const x of [2.97, 3.68]) {
      const door = Prim.rbox(0.68, 0.56, 0.012, 0.004, m.solid(0xf0f0ec, { roughness: 0.4 }));
      door.position.set(x, 1.9, -5.524);
      g.add(door);
      const h = Prim.rbox(0.02, 0.1, 0.02, 0.006, m.chrome);
      h.position.set(x + (x < 3.3 ? 0.28 : -0.28), 1.9, -5.51);
      g.add(h);
    }
    // hanging rod under the cabinet with shirts on hangers
    const rod = Prim.cylinder(0.01, 0.01, 1.35, m.chrome, { segments: 8 });
    rod.rotation.z = Math.PI / 2;
    rod.position.set(3.325, 1.57, -5.62);
    g.add(rod);
    for (let i = 0; i < 3; i++) {
      const x = 2.85 + i * 0.32;
      const hook = Prim.torus(0.02, 0.003, m.chrome, { arc: Math.PI * 1.4 });
      hook.rotation.x = Math.PI / 2;
      hook.position.set(x, 1.575, -5.62);
      g.add(hook);
      const hanger = Prim.box(0.38, 0.008, 0.006, m.solid(0xd8d8d4, { roughness: 0.6 }));
      hanger.position.set(x, 1.47, -5.62);
      g.add(hanger);
      const shirt = Prim.rbox(0.38, 0.5, 0.025, 0.02, m.fabric(CLOTH[(i * 2 + 1) % CLOTH.length]));
      shirt.position.set(x, 1.24, -5.6 + i * 0.01);
      shirt.rotation.y = (rng() - 0.5) * 0.2;
      g.add(shirt);
    }
    placeStatic(ctx, g, 0, 0, 0, [], 'metal');
  }

  // ------------------------------------------------------------------ utility sink + faucet (toggle)
  {
    const g = new THREE.Group();
    const tub = bm.plasticGrey;
    const legMat = m.solid(0x8a8f94, { roughness: 0.4, metalness: 0.7 });
    for (const [lx, lz] of [[-0.27, -0.22], [0.27, -0.22], [-0.27, 0.22], [0.27, 0.22]]) {
      const leg = Prim.cylinder(0.015, 0.015, 0.56, legMat, { segments: 8 });
      leg.position.set(lx, 0.28, lz);
      g.add(leg);
    }
    const walls: [number, number, number, number, number, number][] = [
      [0.6, 0.32, 0.025, 0, 0.7, -0.2375], [0.6, 0.32, 0.025, 0, 0.7, 0.2375], [0.025, 0.32, 0.5, -0.2875, 0.7, 0], [0.025, 0.32, 0.5, 0.2875, 0.7, 0],
    ];
    for (const [w, h, d, px, py, pz] of walls) {
      const b = Prim.box(w, h, d, tub);
      b.position.set(px, py, pz);
      g.add(b);
    }
    const floor = Prim.box(0.58, 0.02, 0.48, tub);
    floor.position.set(0, 0.55, 0);
    g.add(floor);
    const rim = Prim.rbox(0.64, 0.02, 0.54, 0.006, tub);
    rim.position.set(0, 0.86, 0);
    g.add(rim);
    const rimHole = Prim.box(0.54, 0.024, 0.44, m.solid(0x9aa0a0, { roughness: 0.6 }));
    rimHole.position.set(0, 0.86, 0);
    g.add(rimHole);
    const drain = Prim.cylinder(0.025, 0.025, 0.006, m.chrome, { segments: 12 });
    drain.position.set(0, 0.563, 0);
    g.add(drain);
    // P-trap + supplies
    pipeRun([[0, 0.55, 0], [0, 0.3, 0], [0, 0.3, -0.2], [0, 0.02, -0.2]], 0.02, bm.pvc, g);
    // soap bottle + brush on the rim
    const soap = Prim.rbox(0.05, 0.16, 0.05, 0.012, m.solid(0x27ae60, { roughness: 0.4 }));
    soap.position.set(0.24, 0.95, -0.18);
    g.add(soap);
    const pump = Prim.cylinder(0.008, 0.008, 0.05, m.plasticBlack, { segments: 8 });
    pump.position.set(0.24, 1.05, -0.18);
    g.add(pump);
    placeStatic(ctx, g, 5.0, -5.58, 0, [{ size: [0.64, 0.88, 0.54], center: [0, 0.44, 0] }], 'metal');

    const fg = new THREE.Group();
    const fBody = new THREE.Group();
    const base = Prim.cylinder(0.022, 0.026, 0.3, m.chrome, { segments: 14 });
    base.position.set(0, 1.0, -0.21);
    fBody.add(base);
    const elbow = Prim.sphere(0.024, m.chrome, { segments: 10 });
    elbow.position.set(0, 1.15, -0.21);
    fBody.add(elbow);
    fBody.add(tube([0, 1.15, -0.21], [0, 1.15, 0.03], 0.014, m.chrome));
    const spout = Prim.cylinder(0.016, 0.016, 0.05, m.chrome, { segments: 10 });
    spout.position.set(0, 1.125, 0.03);
    fBody.add(spout);
    for (const s of [-1, 1]) {
      const lever = Prim.rbox(0.05, 0.012, 0.012, 0.004, m.chrome);
      lever.position.set(s * 0.06, 0.94, -0.21);
      lever.rotation.z = s * 0.4;
      fBody.add(lever);
      const stem = Prim.cylinder(0.01, 0.01, 0.03, m.chrome, { segments: 8 });
      stem.rotation.z = Math.PI / 2;
      stem.position.set(s * 0.035, 0.94, -0.21);
      fBody.add(stem);
    }
    fg.add(mergeByMaterial(fBody));
    const stream = Prim.cylinder(0.007, 0.009, 0.52, m.water, { segments: 8, cast: false });
    stream.position.set(0, 0.84, 0.03);
    stream.visible = false;
    fg.add(stream);
    const splash = Prim.cylinder(0.06, 0.06, 0.004, m.water, { segments: 12, cast: false });
    splash.position.set(0, 0.575, 0.03);
    splash.visible = false;
    fg.add(splash);
    fg.position.set(5.0, y0, -5.58);
    ctx.dynamic.add(fg);
    const fpos = new THREE.Vector3(5.0, y0 + 1.0, -5.58);
    const faucet = new Toggle(fg, { on: 'Turn off faucet', off: 'Turn on faucet' }, (on) => {
      stream.visible = on; splash.visible = on;
      if (on) { ctx.audio.play('water', fpos); ctx.audio.startLoop('laundrySink', 'water', fpos, 0.22); } else ctx.audio.stopLoop('laundrySink');
    }, fpos);
    ctx.interact.add(faucet);
  }

  // ------------------------------------------------------------------ wire shelving (east wall) with supplies
  {
    const g = new THREE.Group();
    const L = 1.2, D = 0.45;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const post = Prim.cylinder(0.012, 0.012, 1.8, m.chrome, { segments: 8 });
      post.position.set(sx * (L / 2 - 0.02), 0.9, sz * (D / 2 - 0.02));
      g.add(post);
    }
    const wireMat = m.solid(0xc8ccd0, { roughness: 0.3, metalness: 0.9, envMapIntensity: 1.0 });
    for (const yy of [0.15, 0.65, 1.15, 1.65]) {
      const s = Prim.box(L, 0.02, D, wireMat);
      s.position.y = yy;
      g.add(s);
      for (let i = 0; i < 4; i++) {
        const w = Prim.cylinder(0.004, 0.004, L, wireMat, { segments: 5 });
        w.rotation.z = Math.PI / 2;
        w.position.set(0, yy + 0.012, -D / 2 + 0.08 + i * 0.1);
        g.add(w);
      }
      const lip = Prim.box(L, 0.03, 0.006, wireMat);
      lip.position.set(0, yy + 0.02, D / 2 - 0.003);
      g.add(lip);
    }
    // bottom: bucket + jug
    const bucket = Prim.lathe([[0, 0], [0.13, 0], [0.15, 0.3], [0.13, 0.3], [0.115, 0.02], [0, 0.02]], m.solid(0x3a5f9e, { roughness: 0.5 }), { segments: 16 });
    bucket.position.set(-0.35, 0.16, 0);
    g.add(bucket);
    const bail = Prim.torus(0.14, 0.006, m.chrome, { arc: Math.PI });
    bail.rotation.x = Math.PI / 2;
    bail.rotation.z = Math.PI;
    bail.position.set(-0.35, 0.46, 0);
    g.add(bail);
    const bleach = Prim.rbox(0.14, 0.3, 0.1, 0.02, m.solid(0xf4f4f0, { roughness: 0.4 }));
    bleach.position.set(0.1, 0.31, 0);
    g.add(bleach);
    const bleachLbl = labelQuad(ctx, 'BLEACH', 0.1, 0.09, { bg: '#f4f4f0', fg: '#2f6fd0', font: 'bold 90px Impact, "Arial Black", sans-serif', sub: 'REGULAR · 1.9 L' });
    bleachLbl.position.set(0.1, 0.32, 0.052);
    g.add(bleachLbl);
    const bleachCap = Prim.cylinder(0.028, 0.028, 0.03, m.solid(0x2f6fd0, { roughness: 0.4 }), { segments: 10 });
    bleachCap.position.set(0.1, 0.475, 0);
    g.add(bleachCap);
    // shelf 2: towels
    for (let i = 0; i < 4; i++) {
      const t = Prim.rbox(0.34, 0.05, 0.24, 0.02, m.fabric(CLOTH[(i + 4) % CLOTH.length]));
      t.position.set(-0.3 + (rng() - 0.5) * 0.02, 0.685 + i * 0.05, 0);
      g.add(t);
    }
    const sheets = Prim.rbox(0.2, 0.12, 0.09, 0.008, m.solid(0x2e86de, { roughness: 0.6 }));
    sheets.position.set(0.25, 0.72, 0);
    g.add(sheets);
    const sheetsLbl = labelQuad(ctx, 'SOFT', 0.16, 0.08, { bg: '#2e86de', fg: '#fff', font: 'bold 100px Impact, "Arial Black", sans-serif', sub: 'DRYER SHEETS' });
    sheetsLbl.position.set(0.25, 0.72, 0.047);
    g.add(sheetsLbl);
    // shelf 4: baskets & clothespins jar
    const bin = Prim.rbox(0.36, 0.22, 0.34, 0.02, m.solid(0xe9e9e4, { roughness: 0.6 }));
    bin.position.set(-0.3, 1.78, 0);
    g.add(bin);
    const jar = Prim.cylinder(0.05, 0.05, 0.12, m.glassFrosted, { segments: 12 });
    jar.position.set(0.15, 1.73, 0);
    g.add(jar);
    for (let i = 0; i < 6; i++) {
      const pin = Prim.box(0.012, 0.06, 0.012, bm.wood);
      pin.position.set(0.15 + (rng() - 0.5) * 0.05, 1.71 + rng() * 0.03, (rng() - 0.5) * 0.05);
      pin.rotation.set(rng() * 0.6, rng() * 3, rng() * 0.6);
      g.add(pin);
    }
    // solid up to the third shelf, thin shelves above it (the detergent pickups sit on shelf 3)
    placeStatic(ctx, g, 7.625, -4.9, -Math.PI / 2, [
      { size: [L, 1.14, D], center: [0, 0.57, 0] },
      { size: [L, 0.03, D], center: [0, 1.15, 0] },
      { size: [L, 0.03, D], center: [0, 1.65, 0] },
    ], 'metal');
    // detergent bottles (pickups) on the third shelf
    detergentBottle(ctx, 7.6, y0 + 1.16, -5.3, 0xf07d1a, 0xd1471a, 'SUDZ');
    detergentBottle(ctx, 7.6, y0 + 1.16, -5.0, 0x2f6fd0, 0x1f3f8f, 'GLOW');
    detergentBottle(ctx, 7.6, y0 + 1.16, -4.7, 0x3aa655, 0x1f6b35, 'FRESH');
  }

  // ------------------------------------------------------------------ laundry basket full of clothes
  {
    const g = new THREE.Group();
    const basket = Prim.lathe([[0, 0], [0.24, 0], [0.27, 0.32], [0.245, 0.32], [0.22, 0.03], [0, 0.03]], m.solid(0xe9e9e4, { roughness: 0.55 }), { segments: 20 });
    g.add(basket);
    for (let i = 0; i < 7; i++) {
      const a = rng() * Math.PI * 2, r = rng() * 0.13;
      const c = Prim.rbox(0.2, 0.08, 0.16, 0.03, m.fabric(CLOTH[i % CLOTH.length]));
      c.position.set(Math.cos(a) * r, 0.16 + i * 0.035, Math.sin(a) * r);
      c.rotation.set(rng() * 0.6, rng() * 3, rng() * 0.6);
      g.add(c);
    }
    const sock = Prim.rbox(0.07, 0.03, 0.16, 0.012, m.fabric(0xf0eee6));
    sock.position.set(0.24, 0.32, 0.1);
    sock.rotation.set(0.6, 0.4, 0);
    g.add(sock);
    placeStatic(ctx, g, 1.95, -5.35, 0, [], 'fabric');
    ctx.physics.addCylinder({ x: 1.95, y: y0 + 0.17, z: -5.35 }, 0.27, 0.34, { meta: { surface: 'fabric' } });
  }

  // ------------------------------------------------------------------ ironing board + iron (pickup)
  {
    const g = new THREE.Group();
    const cover = m.quilt(0xd9d2c0);
    const top = Prim.rbox(0.34, 0.03, 1.1, 0.01, cover);
    top.position.set(0, 0.9, 0);
    g.add(top);
    const nose = Prim.cylinder(0.17, 0.17, 0.03, cover, { segments: 16 });
    nose.position.set(0, 0.9, 0.55);
    g.add(nose);
    const legMat = m.solid(0x8a8f94, { roughness: 0.4, metalness: 0.7 });
    for (const s of [-1, 1]) {
      const leg = Prim.box(0.02, 1.02, 0.02, legMat);
      leg.position.set(s * 0.12, 0.44, -0.15 * s);
      leg.rotation.x = s * 0.55;
      g.add(leg);
      const leg2 = Prim.box(0.02, 1.02, 0.02, legMat);
      leg2.position.set(s * 0.12, 0.44, 0.15 * s);
      leg2.rotation.x = -s * 0.55;
      g.add(leg2);
    }
    for (const z of [-0.42, 0.42]) {
      const foot = Prim.cylinder(0.012, 0.012, 0.3, legMat, { segments: 8 });
      foot.rotation.z = Math.PI / 2;
      foot.position.set(0, 0.012, z);
      g.add(foot);
    }
    const yaw = 0.35;
    placeStatic(ctx, g, 6.35, -2.4, yaw, [{ size: [0.36, 0.915, 1.3], center: [0, 0.4575, 0.05] }], 'fabric');
    const ig = new THREE.Group();
    const ironBody = Prim.rbox(0.12, 0.07, 0.24, 0.02, m.solid(0xe9e9e6, { roughness: 0.4 }));
    ironBody.position.y = 0.045;
    ig.add(ironBody);
    const sole = Prim.rbox(0.11, 0.012, 0.23, 0.004, m.chrome);
    sole.position.y = 0.006;
    ig.add(sole);
    const handle = Prim.rbox(0.03, 0.04, 0.15, 0.012, m.solid(0x2a5fb8, { roughness: 0.45 }));
    handle.position.set(0, 0.1, 0);
    ig.add(handle);
    const dial = Prim.cylinder(0.015, 0.015, 0.01, m.plasticBlack, { segments: 10 });
    dial.position.set(0, 0.08, -0.09);
    ig.add(dial);
    const off = new THREE.Vector3(0, 0.915, -0.35).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    ig.position.set(6.35 + off.x, y0 + off.y, -2.4 + off.z);
    ig.rotation.y = yaw + 0.3;
    pickup(ctx, mergeByMaterial(ig), { name: 'iron', mass: 1.2, shape: { type: 'box', size: new THREE.Vector3(0.12, 0.12, 0.24) }, offset: new THREE.Vector3(0, 0.06, 0) });
  }

  // ------------------------------------------------------------------ drying rack with hanging clothes
  {
    const g = new THREE.Group();
    const rodMat = m.solid(0xe8e8e4, { roughness: 0.4 });
    for (const s of [-1, 1]) {
      const panel = new THREE.Group();
      for (const z of [-0.55, 0.55]) {
        const v = Prim.cylinder(0.008, 0.008, 1.25, rodMat, { segments: 8 });
        v.position.set(0, 0.625, z);
        panel.add(v);
      }
      for (const yy of [0.3, 0.6, 0.9, 1.2]) {
        const h = Prim.cylinder(0.006, 0.006, 1.12, rodMat, { segments: 6 });
        h.rotation.x = Math.PI / 2;
        h.position.set(0, yy, 0);
        panel.add(h);
      }
      // clothes draped over the rods
      const zs = s < 0 ? [-0.35, 0.1] : [-0.1, 0.32];
      const ys = s < 0 ? [1.2, 0.9] : [1.2, 0.6];
      zs.forEach((zz, i) => {
        const c = Prim.rbox(0.014, 0.3, 0.3, 0.005, m.fabric(CLOTH[(i + (s < 0 ? 0 : 3)) % CLOTH.length]));
        c.position.set(-s * 0.012, ys[i] - 0.15, zz);
        panel.add(c);
      });
      // A-frame: feet apart at the floor, the two panels meet under the top bar
      panel.position.set(s * 0.38, 0, 0);
      panel.rotation.z = s * 0.3;
      g.add(panel);
    }
    const bar = Prim.cylinder(0.006, 0.006, 1.12, rodMat, { segments: 6 });
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0, 1.19, 0);
    g.add(bar);
    for (let i = 0; i < 2; i++) {
      const sock = Prim.rbox(0.012, 0.16, 0.07, 0.005, m.fabric(0xf0eee6));
      sock.position.set(0, 1.12, -0.45 + i * 0.1);
      g.add(sock);
    }
    placeStatic(ctx, g, 7.45, -3.4, 0, [{ size: [0.66, 1.25, 1.2], center: [0, 0.625, 0] }], 'metal');
  }

  // ------------------------------------------------------------------ folding table with folded laundry
  {
    const g = new THREE.Group();
    const top = Prim.rbox(1.8, 0.04, 0.75, 0.01, m.solid(0xe8e8e2, { roughness: 0.5 }));
    top.position.y = 0.74;
    g.add(top);
    const legMat = m.solid(0x5a5f66, { roughness: 0.4, metalness: 0.6 });
    for (const sx of [-0.8, 0.8]) {
      for (const sz of [-0.3, 0.3]) {
        const leg = Prim.cylinder(0.012, 0.012, 0.72, legMat, { segments: 8 });
        leg.position.set(sx, 0.36, sz);
        g.add(leg);
      }
      const bar = Prim.cylinder(0.012, 0.012, 0.6, legMat, { segments: 8 });
      bar.rotation.x = Math.PI / 2;
      bar.position.set(sx, 0.05, 0);
      g.add(bar);
    }
    for (let s = 0; s < 3; s++) {
      const n = 4 + (s % 2);
      for (let i = 0; i < n; i++) {
        const c = Prim.rbox(0.3, 0.035, 0.22, 0.012, m.fabric(CLOTH[(s * 3 + i) % CLOTH.length]));
        c.position.set(-0.6 + s * 0.6 + (rng() - 0.5) * 0.03, 0.76 + 0.0175 + i * 0.035, (rng() - 0.5) * 0.03);
        c.rotation.y = (rng() - 0.5) * 0.15;
        g.add(c);
      }
    }
    const lint = Prim.cylinder(0.05, 0.05, 0.09, m.solid(0xc0392b, { roughness: 0.5 }), { segments: 12 });
    lint.position.set(0.85, 0.805, 0.25);
    g.add(lint);
    placeStatic(ctx, g, 4.5, -1.46, 0, [{ size: [1.8, 0.78, 0.75], center: [0, 0.39, 0] }], 'wood');
  }

  // ------------------------------------------------------------------ broom, mop, bucket (NW corner), floor drain
  {
    const g = new THREE.Group();
    const broom = new THREE.Group();
    const bh = Prim.cylinder(0.012, 0.012, 1.3, bm.wood, { segments: 8 });
    bh.position.y = 0.72;
    broom.add(bh);
    const head = Prim.box(0.26, 0.05, 0.04, m.solid(0x8a6a3a, { roughness: 0.7 }));
    head.position.y = 0.1;
    broom.add(head);
    const bristles = Prim.box(0.26, 0.1, 0.03, m.solid(0xe0c890, { roughness: 0.95 }));
    bristles.position.y = 0.03;
    broom.add(bristles);
    broom.position.set(-0.1, 0, 0);
    broom.rotation.x = 0.16;
    g.add(broom);
    const mop = new THREE.Group();
    const mh = Prim.cylinder(0.012, 0.012, 1.35, m.solid(0x2f6fd0, { roughness: 0.5 }), { segments: 8 });
    mh.position.y = 0.72;
    mop.add(mh);
    const mhead = Prim.sphere(0.09, m.solid(0xdcdcd8, { roughness: 0.95 }), { segments: 10 });
    mhead.scale.set(1, 0.6, 1);
    mhead.position.y = 0.06;
    mop.add(mhead);
    mop.position.set(0.12, 0, 0);
    mop.rotation.x = 0.16;
    g.add(mop);
    const bucket = Prim.lathe([[0, 0], [0.14, 0], [0.16, 0.28], [0.14, 0.28], [0.125, 0.02], [0, 0.02]], m.solid(0xf2c230, { roughness: 0.5 }), { segments: 16 });
    bucket.position.set(0.45, 0, -0.05);
    g.add(bucket);
    placeStatic(ctx, g, 1.85, -1.3, 0, [{ size: [0.4, 1.3, 0.2], center: [0, 0.65, 0.05] }, { size: [0.32, 0.3, 0.32], center: [0.45, 0.15, -0.05] }], 'metal');
    const dg = new THREE.Group();
    const drain = Prim.cylinder(0.075, 0.075, 0.004, m.solid(0x3a3d42, { roughness: 0.5, metalness: 0.6 }), { segments: 20, cast: false });
    drain.position.y = 0.003;
    dg.add(drain);
    for (let i = -2; i <= 2; i++) {
      const slot = Prim.box(0.11, 0.003, 0.012, m.solid(0x101214, { roughness: 0.8 }), { cast: false });
      slot.position.set(0, 0.006, i * 0.025);
      dg.add(slot);
    }
    const stain = Prim.cylinder(0.2, 0.2, 0.001, m.solid(0xb8b8b2, { roughness: 1 }), { segments: 16, cast: false });
    stain.position.y = 0.0015;
    dg.add(stain);
    placeStatic(ctx, dg, 4.3, -3.6, 0, [], 'concrete');
  }

  // ------------------------------------------------------------------ 3-bag laundry sorter (NE corner) + hook rail with hangers
  {
    const g = new THREE.Group();
    const frameMat = m.solid(0x8a8f94, { roughness: 0.4, metalness: 0.7 });
    const W = 0.9, D = 0.42, H = 0.78;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = Prim.cylinder(0.01, 0.01, H, frameMat, { segments: 8 });
      leg.position.set(sx * (W / 2 - 0.01), H / 2, sz * (D / 2 - 0.01));
      g.add(leg);
    }
    for (const sz of [-1, 1]) {
      const rail = Prim.cylinder(0.01, 0.01, W, frameMat, { segments: 8 });
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, H, sz * (D / 2 - 0.01));
      g.add(rail);
      const low = Prim.cylinder(0.008, 0.008, W, frameMat, { segments: 6 });
      low.rotation.z = Math.PI / 2;
      low.position.set(0, 0.08, sz * (D / 2 - 0.01));
      g.add(low);
    }
    const bagCols = [0xf0eee6, 0x8a8f94, 0x2c3e50];
    const names = ['WHITES', 'COLORS', 'DARKS'];
    for (let i = 0; i < 3; i++) {
      const bx = -W / 3 + i * (W / 3);
      const bag = Prim.rbox(W / 3 - 0.03, H - 0.16, D - 0.04, 0.03, m.fabric(bagCols[i]));
      bag.position.set(bx, (H - 0.16) / 2 + 0.1, 0);
      g.add(bag);
      const lbl = labelQuad(ctx, names[i], 0.16, 0.05, { bg: '#f4efe4', fg: '#333', font: 'bold 80px Arial, sans-serif' });
      lbl.position.set(bx, H - 0.24, D / 2 - 0.018);
      g.add(lbl);
      // a bit of laundry peeking out of the open top
      const c = Prim.rbox(0.16, 0.05, 0.14, 0.02, m.fabric(CLOTH[(i * 2 + 5) % CLOTH.length]));
      c.position.set(bx + (rng() - 0.5) * 0.06, H - 0.06, (rng() - 0.5) * 0.08);
      c.rotation.set(rng() * 0.4, rng() * 3, rng() * 0.3);
      g.add(c);
    }
    placeStatic(ctx, g, 7.35, -1.55, Math.PI, [{ size: [W, H, D], center: [0, H / 2, 0] }], 'fabric');
    // hook rail on the east wall above the drying rack
    const hg = new THREE.Group();
    const board = Prim.rbox(0.02, 0.07, 0.7, 0.005, m.solid(0xf0ede4, { roughness: 0.5 }));
    board.position.set(-0.01, 1.85, 0);
    hg.add(board);
    for (let i = 0; i < 4; i++) {
      const z = -0.26 + i * 0.173;
      const hook = Prim.torus(0.02, 0.005, m.chrome, { arc: Math.PI });
      hook.rotation.set(0, Math.PI / 2, Math.PI);
      hook.position.set(-0.04, 1.82, z);
      hg.add(hook);
      if (i % 2 === 0) {
        const hanger = Prim.box(0.008, 0.008, 0.38, m.solid(0xd8d8d4, { roughness: 0.6 }));
        hanger.position.set(-0.05, 1.72, z);
        hg.add(hanger);
        const shirt = Prim.rbox(0.025, 0.5, 0.36, 0.02, m.fabric(CLOTH[(i + 6) % CLOTH.length]));
        shirt.position.set(-0.05, 1.47, z);
        hg.add(shirt);
      }
    }
    placeStatic(ctx, hg, 7.85, -3.4, 0, [], 'wood');
  }

  // ------------------------------------------------------------------ sign, lights & switch
  pictureFrame(ctx, 7.84, y0 + 2.2, -3.4, -Math.PI / 2, 0.62, 0.26,
    ctx.tex.label('LAUNDRY', { bg: '#2f4a5c', fg: '#f4efe4', sub: 'DROP IT · WASH IT · FOLD IT', font: 'bold 80px Impact, "Arial Black", sans-serif', w: 768, h: 320 }), { frameColor: 0xf0ede4 });
  pictureFrame(ctx, 4.5, y0 + 1.6, -1.07, Math.PI, 0.8, 0.3,
    ctx.tex.label('WASH  ·  DRY  ·  FOLD', { bg: '#f4efe4', fg: '#2f4a5c', sub: 'REPEAT', font: 'bold 64px Georgia, serif', w: 768, h: 288 }), { frameColor: 0x3a2a20 });
  pullChainLight(ctx, 3.5, -4.5, GROUP, { shadow: true, intensity: 10 });
  pullChainLight(ctx, 5.9, -2.6, GROUP, { intensity: 10 });
  lightSwitch(ctx, 1.57, y0 + 1.2, -2.85, Math.PI / 2, GROUP);
}
