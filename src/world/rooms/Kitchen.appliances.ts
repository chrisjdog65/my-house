/**
 * Kitchen.appliances — range + hood, fridge with opening French doors, dishwasher front,
 * microwave, toaster (makes toast), undermount sink with an animated faucet, trash can.
 *
 * Builders take a world position (floor level for floor-standing things) and a yaw; each
 * appliance is authored in a local frame with its back on z=0 and its front facing +z.
 */
import * as THREE from 'three';
import { Prim, place, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import type { Interactable } from '../Interactables';
import { addStatic, hinged, Toggle } from '../Props';
import { BASE_H, TOE_H, TOE_IN, FRONT_T } from './Kitchen.cabinets';

const box = (g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, opts: { cast?: boolean } = {}) => {
  const b = Prim.box(w, h, d, mat, opts);
  b.position.set(x, y, z);
  g.add(b);
  return b;
};

// -------------------------------------------------------------------------------------------
// Range (gas cooktop + oven with a drop-down door) and hood
// -------------------------------------------------------------------------------------------

export function buildRange(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const W = 0.76, D = 0.65, H = 0.9;
  const steel = m.steel, dark = m.plasticBlack;
  const cav = m.solid(0x1a1a1c, { roughness: 0.7 });
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const dyn = new THREE.Group();
  place(dyn, x, y, z, rotY);
  ctx.dynamic.add(dyn);

  // shell
  box(g, 0.025, H - 0.06, D, -W / 2 + 0.0125, 0.06 + (H - 0.06) / 2, D / 2, steel);
  box(g, 0.025, H - 0.06, D, W / 2 - 0.0125, 0.06 + (H - 0.06) / 2, D / 2, steel);
  box(g, W, H - 0.06, 0.02, 0, 0.06 + (H - 0.06) / 2, 0.01, steel);
  box(g, W, 0.06, D - 0.04, 0, 0.03, (D - 0.04) / 2, dark);
  const top = Prim.rbox(W, 0.05, D, 0.006, steel, { segments: 2 });
  top.position.set(0, H - 0.025, D / 2);
  g.add(top);
  // storage drawer under the oven
  const drawer = Prim.rbox(W - 0.05, 0.12, 0.02, 0.004, steel, { segments: 2 });
  drawer.position.set(0, 0.135, D - 0.01);
  g.add(drawer);
  const dh = Prim.cylinder(0.007, 0.007, W - 0.24, steel, { segments: 10 });
  dh.rotation.z = Math.PI / 2;
  dh.position.set(0, 0.16, D + 0.02);
  g.add(dh);
  // oven cavity
  const cy0 = 0.21, cy1 = 0.8, cz0 = 0.04, cz1 = D - 0.05, cw = W - 0.05;
  const cz = (cz0 + cz1) / 2, cd = cz1 - cz0, ch = cy1 - cy0;
  box(g, cw, 0.012, cd, 0, cy0 + 0.006, cz, cav);
  box(g, cw, 0.012, cd, 0, cy1 - 0.006, cz, cav);
  box(g, 0.012, ch, cd, -cw / 2 + 0.006, (cy0 + cy1) / 2, cz, cav);
  box(g, 0.012, ch, cd, cw / 2 - 0.006, (cy0 + cy1) / 2, cz, cav);
  box(g, cw, ch, 0.012, 0, (cy0 + cy1) / 2, cz0 + 0.006, cav);
  const rackMat = m.solid(0x9a9a9c, { roughness: 0.35, metalness: 0.8 });
  for (const ry of [0.4, 0.6]) {
    for (let i = 0; i < 7; i++) box(g, 0.006, 0.006, cd - 0.08, -cw / 2 + 0.06 + i * ((cw - 0.12) / 6), ry, cz, rackMat, { cast: false });
    box(g, cw - 0.06, 0.006, 0.006, 0, ry, cz0 + 0.05, rackMat, { cast: false });
    box(g, cw - 0.06, 0.006, 0.006, 0, ry, cz1 - 0.05, rackMat, { cast: false });
  }
  // control strip + knobs
  box(g, W, 0.06, 0.04, 0, 0.83, D - 0.02, steel);
  const knobMat = m.solid(0x202124, { roughness: 0.35, metalness: 0.3, envMapIntensity: 0.9 });
  for (let i = 0; i < 5; i++) {
    const kx = -0.27 + i * 0.135;
    if (i === 2) {
      box(g, 0.1, 0.022, 0.004, 0, 0.83, D + 0.002, m.emissive(0x58c8ff, 0.9, 0x081018), { cast: false });
      continue;
    }
    const knob = Prim.cylinder(0.017, 0.019, 0.02, knobMat, { segments: 18 });
    knob.rotation.x = Math.PI / 2;
    knob.position.set(kx, 0.83, D + 0.01);
    g.add(knob);
    box(g, 0.003, 0.011, 0.003, kx, 0.836, D + 0.021, m.plasticWhite, { cast: false });
  }
  // back trim
  const guard = Prim.rbox(W, 0.1, 0.05, 0.006, steel, { segments: 2 });
  guard.position.set(0, H + 0.05, 0.025);
  g.add(guard);
  // burners with grates
  const grate = m.solid(0x1c1c1e, { roughness: 0.6, metalness: 0.4 });
  for (const [bx, bz] of [[-0.19, 0.21], [0.19, 0.21], [-0.19, 0.47], [0.19, 0.47]]) {
    const base = Prim.cylinder(0.05, 0.05, 0.008, m.darkMetal, { segments: 18 });
    base.position.set(bx, H + 0.004, bz);
    g.add(base);
    const cap = Prim.cylinder(0.028, 0.031, 0.012, dark, { segments: 18 });
    cap.position.set(bx, H + 0.014, bz);
    g.add(cap);
    const ring = Prim.torus(0.1, 0.006, grate);
    ring.position.set(bx, H + 0.024, bz);
    g.add(ring);
    for (const a of [0, Math.PI / 2]) {
      const bar = Prim.box(0.21, 0.007, 0.01, grate);
      bar.rotation.y = a;
      bar.position.set(bx, H + 0.024, bz);
      g.add(bar);
    }
  }

  // oven door: hinged on its bottom edge, swings down/out
  const towel = m.fabric(0xa8443a);
  hinged(ctx, dyn, new THREE.Vector3(0, cy0 - 0.005, D - 0.03), (pivot) => {
    const tmp = new THREE.Group();
    const dhgt = cy1 - cy0;
    const slab = Prim.rbox(W - 0.03, dhgt, 0.03, 0.005, steel, { segments: 2 });
    slab.position.set(0, dhgt / 2, 0.015);
    tmp.add(slab);
    box(tmp, W - 0.2, 0.3, 0.006, 0, dhgt / 2 + 0.02, 0.031, m.screenOff, { cast: false });
    const handle = Prim.cylinder(0.011, 0.011, W - 0.1, steel, { segments: 12 });
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, dhgt - 0.06, 0.08);
    tmp.add(handle);
    for (const s of [-1, 1]) {
      const so = Prim.cylinder(0.008, 0.008, 0.05, steel, { segments: 8 });
      so.rotation.x = Math.PI / 2;
      so.position.set(s * (W / 2 - 0.1), dhgt - 0.06, 0.055);
      tmp.add(so);
    }
    // tea towel over the handle
    box(tmp, 0.2, 0.3, 0.012, 0.14, dhgt - 0.06 - 0.16, 0.098, towel);
    box(tmp, 0.2, 0.012, 0.075, 0.14, dhgt - 0.06 + 0.014, 0.07, towel);
    box(tmp, 0.2, 0.09, 0.012, 0.14, dhgt - 0.06 - 0.04, 0.043, towel);
    pivot.add(mergeByMaterial(tmp));
  }, 'oven door', { axis: 'x', maxAngle: 1.45, sfx: 'doorOpen' });

  addStatic(ctx, g, [{ size: [W, H, D + 0.05], center: [0, H / 2, D / 2 + 0.025] }], { surface: 'metal' });
}

export function buildHood(ctx: Ctx, x: number, yBottom: number, z: number, rotY: number, ceilY: number) {
  const m = ctx.mats;
  const steel = m.steel;
  const g = new THREE.Group();
  place(g, x, 0, z, rotY);
  const canopy = Prim.rbox(0.76, 0.05, 0.5, 0.008, steel, { segments: 2 });
  canopy.position.set(0, yBottom + 0.025, 0.25);
  g.add(canopy);
  box(g, 0.6, 0.006, 0.34, 0, yBottom - 0.003, 0.29, m.solid(0x3a3b3e, { roughness: 0.5, metalness: 0.6 }), { cast: false });
  box(g, 0.12, 0.004, 0.05, 0, yBottom - 0.002, 0.09, m.emissive(0xfff0d0, 0.5, 0x555555), { cast: false });
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(0.5, 0); shape.lineTo(0.2, 0.14); shape.lineTo(0, 0.14); shape.closePath();
  const slope = Prim.extrude(shape, 0.76, steel, { curveSegments: 1 });
  slope.rotation.y = -Math.PI / 2;
  slope.position.set(0, yBottom + 0.05, 0);
  g.add(slope);
  const chH = ceilY - (yBottom + 0.19);
  box(g, 0.3, chH, 0.2, 0, yBottom + 0.19 + chH / 2, 0.1, steel);
  addStatic(ctx, g, []);
}

// -------------------------------------------------------------------------------------------
// Fridge
// -------------------------------------------------------------------------------------------

export function buildFridge(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const W = 0.9, D = 0.69, H = 1.78;
  const steel = m.steel, white = m.plasticWhite;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const dyn = new THREE.Group();
  place(dyn, x, y, z, rotY);
  ctx.dynamic.add(dyn);

  // shell
  box(g, 0.03, H - 0.08, D, -W / 2 + 0.015, 0.08 + (H - 0.08) / 2, D / 2, steel);
  box(g, 0.03, H - 0.08, D, W / 2 - 0.015, 0.08 + (H - 0.08) / 2, D / 2, steel);
  box(g, W, 0.03, D, 0, H - 0.015, D / 2, steel);
  box(g, W, H, 0.03, 0, H / 2, 0.015, steel);
  box(g, W, 0.08, D - 0.03, 0, 0.04, (D - 0.03) / 2, m.plasticBlack);
  box(g, W - 0.06, 0.04, D - 0.03, 0, 0.76, (D - 0.03) / 2, steel);
  // freezer drawer front (fixed)
  const fz = Prim.rbox(W - 0.02, 0.64, 0.03, 0.008, steel, { segments: 2 });
  fz.position.set(0, 0.41, D + 0.015);
  g.add(fz);
  const fh = Prim.cylinder(0.012, 0.012, W - 0.34, steel, { segments: 12 });
  fh.rotation.z = Math.PI / 2;
  fh.position.set(0, 0.66, D + 0.07);
  g.add(fh);
  for (const s of [-1, 1]) {
    const so = Prim.cylinder(0.008, 0.008, 0.04, steel, { segments: 8 });
    so.rotation.x = Math.PI / 2;
    so.position.set(s * (W / 2 - 0.2), 0.66, D + 0.05);
    g.add(so);
  }
  // fridge cavity liner
  const lx = W / 2 - 0.03, ly0 = 0.78, ly1 = H - 0.03, lz0 = 0.03;
  box(g, 2 * lx, ly1 - ly0, 0.01, 0, (ly0 + ly1) / 2, lz0 + 0.005, white, { cast: false });
  box(g, 0.01, ly1 - ly0, D - lz0, -lx + 0.005, (ly0 + ly1) / 2, (lz0 + D) / 2, white, { cast: false });
  box(g, 0.01, ly1 - ly0, D - lz0, lx - 0.005, (ly0 + ly1) / 2, (lz0 + D) / 2, white, { cast: false });
  box(g, 2 * lx, 0.01, D - lz0, 0, ly1 - 0.005, (lz0 + D) / 2, white, { cast: false });
  box(g, 2 * lx, 0.01, D - lz0, 0, ly0 + 0.005, (lz0 + D) / 2, white, { cast: false });
  box(g, 0.24, 0.012, 0.06, 0, ly1 - 0.016, lz0 + 0.08, m.emissive(0xfff4e0, 0.8, 0x777777), { cast: false });
  const shelfZ = lz0 + 0.27;
  for (const sy of [1.06, 1.3, 1.52]) {
    const s = Prim.box(2 * lx - 0.04, 0.008, 0.52, m.glassFrosted, { cast: false });
    s.position.set(0, sy, shelfZ);
    g.add(s);
    box(g, 2 * lx - 0.04, 0.02, 0.012, 0, sy, shelfZ + 0.26, white, { cast: false });
  }
  const crisper = Prim.box(2 * lx - 0.06, 0.2, 0.5, m.glassFrosted, { cast: false });
  crisper.position.set(0, ly0 + 0.11, shelfZ);
  g.add(crisper);
  box(g, 2 * lx - 0.06, 0.03, 0.015, 0, ly0 + 0.2, shelfZ + 0.25, white, { cast: false });
  // food
  const food = (w: number, h: number, d: number, px: number, py: number, pz: number, color: number, rough = 0.5, r = 0.004) => {
    const b = Prim.rbox(w, h, d, r, m.solid(color, { roughness: rough }), { segments: 2 });
    b.position.set(px, py + h / 2, pz);
    g.add(b);
    return b;
  };
  const jar = (r: number, h: number, px: number, py: number, pz: number, content: number, lid: number) => {
    const c = Prim.cylinder(r - 0.004, r - 0.004, h * 0.8, m.solid(content, { roughness: 0.5 }), { segments: 14 });
    c.position.set(px, py + h * 0.42, pz);
    g.add(c);
    const gl = Prim.cylinder(r, r, h * 0.85, m.glassClear, { segments: 14, cast: false });
    gl.position.set(px, py + h * 0.43, pz);
    g.add(gl);
    const l = Prim.cylinder(r * 0.95, r * 0.95, h * 0.15, m.solid(lid, { roughness: 0.4, metalness: 0.3 }), { segments: 14 });
    l.position.set(px, py + h * 0.92, pz);
    g.add(l);
  };
  // shelf 1 (y 1.064)
  const s1 = 1.064, s2 = 1.304, s3 = 1.524;
  const milk = food(0.09, 0.24, 0.09, -0.3, s1, shelfZ + 0.1, 0xf4f4f0, 0.6);
  const milkLabel = Prim.quad(0.075, 0.09, m.image(ctx.tex.label('MILK', { bg: '#f4f4f0', fg: '#1a5fb4', w: 256, h: 256, sub: 'whole' }), { roughness: 0.7 }), { keepUV: true, cast: false });
  milkLabel.position.set(-0.3, s1 + 0.12, shelfZ + 0.1 + 0.046);
  g.add(milkLabel);
  const oj = food(0.08, 0.22, 0.08, -0.18, s1, shelfZ + 0.12, 0xf08a1e, 0.6);
  void milk; void oj;
  jar(0.04, 0.13, -0.02, s1, shelfZ + 0.08, 0xb8262a, 0xdedede);
  jar(0.035, 0.11, 0.08, s1, shelfZ + 0.15, 0x7a4b1e, 0xc9a44a);
  food(0.16, 0.06, 0.1, 0.25, s1, shelfZ + 0.1, 0xe6c85a, 0.7);
  const ketchup = Prim.cylinder(0.028, 0.03, 0.17, m.solid(0xb3261e, { roughness: 0.45 }), { segments: 12 });
  ketchup.position.set(0.32, s1 + 0.085, shelfZ - 0.1);
  g.add(ketchup);
  const kcap = Prim.cylinder(0.02, 0.02, 0.03, white, { segments: 12 });
  kcap.position.set(0.32, s1 + 0.185, shelfZ - 0.1);
  g.add(kcap);
  // shelf 2 (y 1.304)
  food(0.24, 0.07, 0.11, -0.22, s2, shelfZ + 0.06, 0xb9b3a6, 0.9);
  food(0.12, 0.05, 0.12, 0.05, s2, shelfZ + 0.08, 0xf5e4a8, 0.6);
  const yog = Prim.cylinder(0.035, 0.03, 0.09, m.solid(0x4d7ec4, { roughness: 0.5 }), { segments: 12 });
  yog.position.set(0.24, s2 + 0.045, shelfZ + 0.1);
  g.add(yog);
  const yog2 = yog.clone(); yog2.position.x = 0.32; g.add(yog2);
  const lettuce = Prim.sphere(0.075, m.solid(0x76b04a, { roughness: 0.85 }), { segments: 14 });
  lettuce.position.set(0.2, s2 + 0.075, shelfZ - 0.1);
  g.add(lettuce);
  // shelf 3 (y 1.524)
  food(0.14, 0.09, 0.09, -0.28, s3, shelfZ + 0.05, 0xd94f4f, 0.6);
  food(0.14, 0.09, 0.09, -0.12, s3, shelfZ + 0.05, 0x3e8a5a, 0.6);
  const wine = Prim.cylinder(0.034, 0.034, 0.19, m.solid(0x2c4a2e, { roughness: 0.2, envMapIntensity: 0.9 }), { segments: 12 });
  wine.position.set(0.2, s3 + 0.095, shelfZ + 0.05);
  g.add(wine);
  const wneck = Prim.cylinder(0.014, 0.03, 0.06, m.solid(0x2c4a2e, { roughness: 0.2 }), { segments: 12 });
  wneck.position.set(0.2, s3 + 0.22, shelfZ + 0.05);
  g.add(wneck);
  // crisper contents (through the frosted front)
  food(0.12, 0.08, 0.12, -0.2, ly0 + 0.02, shelfZ, 0xe4732a, 0.7, 0.03);
  food(0.14, 0.09, 0.14, 0.15, ly0 + 0.02, shelfZ, 0x6fa84a, 0.8, 0.04);

  // French doors
  const dw = W / 2 - 0.01;
  const photoMat = m.image(ctx.tex.photo(2), { roughness: 0.85 });
  for (const side of [-1, 1]) {
    hinged(ctx, dyn, new THREE.Vector3(side * (W / 2 - 0.005), ly0, D), (pivot) => {
      const tmp = new THREE.Group();
      const cx = -side * dw / 2;
      const dhgt = H - ly0 - 0.02;
      const slab = Prim.rbox(dw, dhgt, 0.03, 0.008, steel, { segments: 2 });
      slab.position.set(cx, dhgt / 2, 0.015);
      tmp.add(slab);
      box(tmp, dw - 0.07, dhgt - 0.08, 0.04, cx, dhgt / 2, -0.02, white, { cast: false });
      for (const by of [0.14, 0.52]) {
        box(tmp, dw - 0.1, 0.02, 0.07, cx, by, -0.055, white, { cast: false });
        box(tmp, dw - 0.1, 0.08, 0.012, cx, by + 0.04, -0.085, white, { cast: false });
      }
      // things in the door bins
      const b1 = Prim.cylinder(0.03, 0.03, 0.2, m.solid(side < 0 ? 0xf2f2f0 : 0xd8a02a, { roughness: 0.5 }), { segments: 10 });
      b1.position.set(cx - 0.08, 0.25, -0.055);
      tmp.add(b1);
      const b2 = Prim.cylinder(0.025, 0.025, 0.16, m.solid(side < 0 ? 0x4b8ad6 : 0xf2f2f0, { roughness: 0.5 }), { segments: 10 });
      b2.position.set(cx + 0.06, 0.23, -0.055);
      tmp.add(b2);
      const b3 = Prim.rbox(0.07, 0.13, 0.05, 0.004, m.solid(0xe9d9a8, { roughness: 0.7 }), { segments: 2 });
      b3.position.set(cx + 0.02, 0.6, -0.055);
      tmp.add(b3);
      // handle near the centre split
      const hx = -side * (dw - 0.06);
      const handle = Prim.cylinder(0.012, 0.012, 0.5, steel, { segments: 12 });
      handle.position.set(hx, 0.62, 0.075);
      tmp.add(handle);
      for (const hy of [0.42, 0.82]) {
        const so = Prim.cylinder(0.008, 0.008, 0.045, steel, { segments: 8 });
        so.rotation.x = Math.PI / 2;
        so.position.set(hx, hy, 0.052);
        tmp.add(so);
      }
      if (side < 0) {
        // water / ice dispenser recess
        box(tmp, 0.14, 0.28, 0.006, cx - 0.06, 0.66, 0.031, m.solid(0x2a2c30, { roughness: 0.5 }), { cast: false });
        box(tmp, 0.1, 0.03, 0.004, cx - 0.06, 0.77, 0.035, m.emissive(0x9ad8ff, 0.5, 0x101418), { cast: false });
      } else {
        // a family photo held by two magnets
        const pic = Prim.quad(0.11, 0.085, photoMat, { keepUV: true, cast: false });
        pic.position.set(cx + 0.06, 0.62, 0.031);
        tmp.add(pic);
        for (const [mx, col] of [[cx + 0.02, 0xd93b2f], [cx + 0.1, 0x2f6fd9]] as [number, number][]) {
          const mag = Prim.cylinder(0.012, 0.012, 0.006, m.solid(col, { roughness: 0.4 }), { segments: 12 });
          mag.rotation.x = Math.PI / 2;
          mag.position.set(mx, 0.655, 0.034);
          tmp.add(mag);
        }
      }
      pivot.add(mergeByMaterial(tmp));
    }, side < 0 ? 'left fridge door' : 'right fridge door', { maxAngle: side < 0 ? -1.9 : 1.9, sfx: 'fridge' });
  }

  addStatic(ctx, g, [{ size: [W, H, D + 0.03], center: [0, H / 2, (D + 0.03) / 2] }], { surface: 'metal' });
}

// -------------------------------------------------------------------------------------------
// Dishwasher front (in a base run's local frame) and microwave
// -------------------------------------------------------------------------------------------

export function buildDishwasherFront(ctx: Ctx, run: THREE.Group, x0: number, w: number, zFace: number) {
  const m = ctx.mats;
  const steel = m.steel;
  const h = BASE_H - TOE_H - 0.012;
  const panel = Prim.rbox(w - 0.01, h, 0.02, 0.004, steel, { segments: 2 });
  panel.position.set(x0 + w / 2, TOE_H + 0.006 + h / 2, zFace + 0.01);
  run.add(panel);
  box(run, w - 0.03, 0.045, 0.005, x0 + w / 2, BASE_H - 0.035, zFace + 0.022, m.plasticBlack);
  box(run, 0.012, 0.012, 0.003, x0 + 0.06, BASE_H - 0.035, zFace + 0.026, m.emissive(0x50e070, 1.2, 0x113311), { cast: false });
  const handle = Prim.cylinder(0.009, 0.009, w - 0.16, steel, { segments: 12 });
  handle.rotation.z = Math.PI / 2;
  handle.position.set(x0 + w / 2, BASE_H - 0.11, zFace + 0.06);
  run.add(handle);
  for (const s of [-1, 1]) {
    const so = Prim.cylinder(0.007, 0.007, 0.04, steel, { segments: 8 });
    so.rotation.x = Math.PI / 2;
    so.position.set(x0 + w / 2 + s * (w / 2 - 0.1), BASE_H - 0.11, zFace + 0.04);
    run.add(so);
  }
  box(run, w, TOE_H, 0.02, x0 + w / 2, TOE_H / 2, zFace - TOE_IN + 0.01, m.solid(0x26272a, { roughness: 0.75 }));
  box(run, w - 0.02, BASE_H - TOE_H, zFace, x0 + w / 2, TOE_H + (BASE_H - TOE_H) / 2, zFace / 2, m.solid(0x3a3a3c, { roughness: 0.8 }));
  void FRONT_T;
}

export function buildMicrowave(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const W = 0.48, H = 0.28, D = 0.36;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const body = Prim.rbox(W, H, D, 0.008, m.plasticBlack, { segments: 2 });
  body.position.set(0, H / 2 + 0.01, D / 2);
  g.add(body);
  for (const [fx, fz] of [[-0.2, 0.05], [0.2, 0.05], [-0.2, 0.31], [0.2, 0.31]]) {
    const foot = Prim.cylinder(0.012, 0.012, 0.01, m.plasticBlack, { segments: 8 });
    foot.position.set(fx, 0.005, fz);
    g.add(foot);
  }
  // door with a dark window
  box(g, 0.34, H - 0.04, 0.008, -0.06, H / 2 + 0.01, D + 0.004, m.steel);
  box(g, 0.27, H - 0.1, 0.004, -0.06, H / 2 + 0.01, D + 0.01, m.screenOff, { cast: false });
  const handle = Prim.rbox(0.014, 0.16, 0.014, 0.005, m.steel, { segments: 2 });
  handle.position.set(0.095, H / 2 + 0.01, D + 0.03);
  g.add(handle);
  // control panel
  box(g, 0.09, H - 0.04, 0.004, 0.185, H / 2 + 0.01, D + 0.002, m.solid(0x1b1c1f, { roughness: 0.45 }));
  box(g, 0.06, 0.02, 0.003, 0.185, H - 0.04, D + 0.005, m.emissive(0x50e070, 1.0, 0x0d2a14), { cast: false });
  for (let i = 0; i < 6; i++) box(g, 0.05, 0.012, 0.003, 0.185, H - 0.08 - i * 0.026, D + 0.005, m.solid(0x2c2e33, { roughness: 0.5 }), { cast: false });
  addStatic(ctx, g, []);
}

// -------------------------------------------------------------------------------------------
// Toaster: 'Make toast' pops two slices after 3 s
// -------------------------------------------------------------------------------------------

class Toaster implements Interactable {
  object: THREE.Group;
  proximity = true;
  radius = 2.2;
  focus: THREE.Vector3;
  private busy = false;
  private timer = 0;
  private popT = -1;
  constructor(private ctx: Ctx, obj: THREE.Group, private lever: THREE.Object3D, private slices: THREE.Object3D[], private restY: number, private upY: number) {
    this.object = obj;
    this.focus = obj.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0));
  }
  getPrompt() { return this.busy ? null : 'Make toast'; }
  interact() {
    this.busy = true;
    this.timer = 3;
    this.popT = -1;
    this.lever.position.y = 0.06;
    for (const s of this.slices) s.position.y = this.restY;
    this.ctx.audio.play('click', this.focus);
  }
  update(dt: number) {
    if (this.busy) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.busy = false;
        this.lever.position.y = 0.12;
        this.popT = 0;
        this.ctx.audio.play('toast', this.focus);
      }
    }
    if (this.popT >= 0) {
      this.popT += dt;
      const k = Math.min(1, this.popT / 0.35);
      const s = k < 0.45 ? (k / 0.45) * 1.18 : 1.18 - 0.18 * ((k - 0.45) / 0.55);
      for (const sl of this.slices) sl.position.y = this.restY + (this.upY - this.restY) * s;
      if (k >= 1) this.popT = -1;
    }
  }
}

export function buildToaster(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const W = 0.28, H = 0.17, D = 0.19;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const bodyMat = m.paintedMetal(0xf1e6cf);
  const body = Prim.rbox(W, H, D, 0.022, bodyMat, { segments: 3 });
  body.position.set(0, H / 2 + 0.008, 0);
  const base = Prim.rbox(W - 0.02, 0.016, D - 0.02, 0.005, m.plasticBlack, { segments: 2 });
  base.position.set(0, 0.008, 0);
  const slotMat = m.solid(0x141414, { roughness: 0.8 });
  const slots = new THREE.Group();
  for (const sz of [-0.03, 0.03]) {
    const slot = Prim.box(0.15, 0.004, 0.02, slotMat, { cast: false });
    slot.position.set(0, H + 0.008, sz);
    slots.add(slot);
  }
  const dial = Prim.cylinder(0.016, 0.016, 0.012, m.plasticBlack, { segments: 14 });
  dial.rotation.z = Math.PI / 2;
  dial.position.set(W / 2 + 0.004, 0.06, 0.05);
  const lever = Prim.rbox(0.02, 0.014, 0.03, 0.004, m.plasticBlack, { segments: 2 });
  lever.position.set(W / 2 + 0.008, 0.12, -0.04);
  const merged = mergeByMaterial(new THREE.Group().add(body, base, slots, dial));
  g.add(merged);
  g.add(lever); // stays a separate mesh so it can move
  const toastMat = m.solid(0xd39a55, { roughness: 0.9 });
  const restY = 0.06, upY = 0.15;
  const slices: THREE.Object3D[] = [];
  for (const sz of [-0.03, 0.03]) {
    const t = Prim.rbox(0.11, 0.11, 0.012, 0.012, toastMat, { segments: 2 });
    t.position.set(0, restY, sz);
    g.add(t);
    slices.push(t);
  }
  ctx.dynamic.add(g);
  ctx.interact.add(new Toaster(ctx, g, lever, slices, restY, upY));
}

// -------------------------------------------------------------------------------------------
// Sink (undermount double basin) + gooseneck faucet with running water
// -------------------------------------------------------------------------------------------

/** Build in a base run's local frame. `cut` is the counter cutout; the faucet sits behind it. */
export function buildSink(ctx: Ctx, run: THREE.Group, dyn: THREE.Group, cut: { x0: number; x1: number; z0: number; z1: number }) {
  const m = ctx.mats;
  const steel = m.steel;
  const cx = (cut.x0 + cut.x1) / 2;
  const depth = 0.2;
  const yTop = BASE_H + 0.006, yBot = BASE_H - depth;
  const bw = cut.x1 - cut.x0 + 0.02, bd = cut.z1 - cut.z0 + 0.02;
  const bz = (cut.z0 + cut.z1) / 2;
  const t = 0.008;
  box(run, bw, t, bd, cx, yBot + t / 2, bz, steel, { cast: false });
  box(run, bw, yTop - yBot, t, cx, (yTop + yBot) / 2, bz - bd / 2 + t / 2, steel, { cast: false });
  box(run, bw, yTop - yBot, t, cx, (yTop + yBot) / 2, bz + bd / 2 - t / 2, steel, { cast: false });
  box(run, t, yTop - yBot, bd, cx - bw / 2 + t / 2, (yTop + yBot) / 2, bz, steel, { cast: false });
  box(run, t, yTop - yBot, bd, cx + bw / 2 - t / 2, (yTop + yBot) / 2, bz, steel, { cast: false });
  box(run, 0.03, yTop - yBot - 0.03, bd - 0.02, cx, (yTop + yBot) / 2 - 0.015, bz, steel, { cast: false });
  for (const s of [-1, 1]) {
    const drain = Prim.cylinder(0.022, 0.022, 0.004, m.darkMetal, { segments: 16, cast: false });
    drain.position.set(cx + s * bw / 4, yBot + t + 0.002, bz + 0.02);
    run.add(drain);
  }
  // a sponge on the divider
  const sponge = Prim.rbox(0.06, 0.03, 0.095, 0.006, m.solid(0xe9c84a, { roughness: 0.95 }), { segments: 2 });
  sponge.position.set(cx + 0.015, yBot + t + 0.015, bz + 0.1);
  run.add(sponge);
  const scrub = Prim.box(0.06, 0.006, 0.095, m.solid(0x3f8a4a, { roughness: 0.95 }), { cast: false });
  scrub.position.set(cx + 0.015, yBot + t + 0.033, bz + 0.1);
  run.add(scrub);

  // faucet (dynamic: it is the toggle target)
  const chrome = m.chrome;
  const fz = cut.z0 - 0.055;
  const colH = 0.24, R = 0.12;
  const fg = new THREE.Group();
  const flange = Prim.cylinder(0.026, 0.03, 0.02, chrome, { segments: 20 });
  flange.position.set(0, 0.01, 0);
  fg.add(flange);
  const column = Prim.cylinder(0.013, 0.013, colH, chrome, { segments: 16 });
  column.position.set(0, colH / 2, 0);
  fg.add(column);
  const neck = new THREE.Mesh(new THREE.TorusGeometry(R, 0.011, 10, 28, Math.PI), chrome);
  neck.rotation.y = Math.PI / 2;
  neck.position.set(0, colH, R);
  neck.castShadow = true;
  fg.add(neck);
  const spout = Prim.cylinder(0.011, 0.011, 0.06, chrome, { segments: 12 });
  spout.position.set(0, colH - 0.03, 2 * R);
  fg.add(spout);
  const aerator = Prim.cylinder(0.012, 0.012, 0.012, m.darkMetal, { segments: 12 });
  aerator.position.set(0, colH - 0.066, 2 * R);
  fg.add(aerator);
  // lever handle on the right
  const hbase = Prim.cylinder(0.014, 0.014, 0.05, chrome, { segments: 12 });
  hbase.rotation.z = Math.PI / 2;
  hbase.position.set(0.035, 0.2, 0);
  fg.add(hbase);
  const lever = Prim.rbox(0.09, 0.012, 0.016, 0.004, chrome, { segments: 2 });
  lever.rotation.z = 0.35;
  lever.position.set(0.09, 0.215, 0);
  fg.add(lever);
  const faucet = mergeByMaterial(fg);
  faucet.position.set(cx, BASE_H + 0.04, fz);
  dyn.add(faucet);

  // water stream + splash (world space)
  run.updateMatrixWorld(true);
  const tip = run.localToWorld(new THREE.Vector3(cx, BASE_H + 0.04 + colH - 0.072, fz + 2 * R));
  const floor = run.localToWorld(new THREE.Vector3(cx, yBot + t, fz + 2 * R));
  const len = tip.y - floor.y;
  const stream = Prim.cylinder(0.005, 0.0075, len, m.water, { segments: 10, cast: false, receive: false });
  stream.position.set(tip.x, (tip.y + floor.y) / 2, tip.z);
  stream.visible = false;
  stream.renderOrder = 12;
  ctx.dynamic.add(stream);
  const splash = Prim.cylinder(0.045, 0.06, 0.006, m.water, { segments: 18, cast: false, receive: false });
  splash.position.set(floor.x, floor.y + 0.004, floor.z);
  splash.visible = false;
  splash.renderOrder = 12;
  ctx.dynamic.add(splash);
  const focus = faucet.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.2, 0));
  const toggle = new Toggle(faucet, { on: 'Turn off faucet', off: 'Turn on faucet' }, (on) => {
    stream.visible = on;
    splash.visible = on;
    if (on) {
      ctx.audio.play('water', focus);
      ctx.audio.startLoop('kitchenFaucet', 'water', focus, 0.22);
    } else {
      ctx.audio.stopLoop('kitchenFaucet');
    }
  }, focus);
  ctx.interact.add(toggle);
  ctx.onUpdate((_dt, t) => {
    if (!toggle.on) return;
    stream.scale.x = 1 + 0.25 * Math.sin(t * 43);
    stream.scale.z = 1 + 0.25 * Math.cos(t * 37);
    const s = 1 + 0.18 * Math.sin(t * 21);
    splash.scale.set(s, 1, 1 + 0.18 * Math.cos(t * 17));
  });
}

// -------------------------------------------------------------------------------------------
// Trash can with a hinged lid
// -------------------------------------------------------------------------------------------

export function buildTrashCan(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const steel = m.steel;
  const R = 0.16, H = 0.62;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const body = Prim.lathe([[0, 0], [R - 0.01, 0], [R, 0.02], [R, H], [R - 0.008, H], [R - 0.008, 0.05], [0, 0.05]], steel, { segments: 28 });
  g.add(body);
  const bag = Prim.cylinder(R - 0.012, R - 0.012, 0.3, m.solid(0x1e1e20, { roughness: 0.6 }), { segments: 24, cast: false });
  bag.position.y = 0.2;
  g.add(bag);
  const pedal = Prim.rbox(0.09, 0.016, 0.07, 0.005, m.plasticBlack, { segments: 2 });
  pedal.position.set(0, 0.012, R + 0.02);
  g.add(pedal);
  const hingeBlock = Prim.box(0.08, 0.05, 0.04, m.plasticBlack);
  hingeBlock.position.set(0, H + 0.01, -R + 0.01);
  g.add(hingeBlock);
  addStatic(ctx, g, []);
  ctx.physics.addCylinder({ x, y: y + H / 2, z }, R + 0.01, H + 0.04, { meta: { surface: 'metal' } });

  const dyn = new THREE.Group();
  place(dyn, x, y, z, rotY);
  ctx.dynamic.add(dyn);
  hinged(ctx, dyn, new THREE.Vector3(0, H + 0.005, -R), (pivot) => {
    const tmp = new THREE.Group();
    const lid = Prim.cylinder(R + 0.006, R + 0.006, 0.028, steel, { segments: 28 });
    lid.position.set(0, 0.014, R);
    tmp.add(lid);
    const knob = Prim.cylinder(0.02, 0.028, 0.02, m.plasticBlack, { segments: 14 });
    knob.position.set(0, 0.038, R);
    tmp.add(knob);
    pivot.add(mergeByMaterial(tmp));
  }, 'trash can lid', { axis: 'x', maxAngle: -1.6, sfx: 'drawer' });
}
