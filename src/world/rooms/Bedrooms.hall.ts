/**
 * Upstairs hall: runner, console under the front window, gallery wall, bench, bookcase, plant,
 * smoke detector, two ceiling domes and switches (top of stairs + master door).
 */
import * as THREE from 'three';
import { Prim, place } from '../Builder';
import type { Ctx } from '../Context';
import { addStatic, bookRow, ceilingDome, lightSwitch, pictureFrame, plant, rug, tableLamp } from '../Props';
import { FLOOR, CEIL, FACE, cushion, shelfUnit } from './Bedrooms.shared';

export function buildUpperHall(ctx: Ctx) {
  const mats = ctx.mats;
  const y = FLOOR;
  const W = -1.44, E = 1.44, FRONT = 5.85; // wall faces

  // ---- lighting ------------------------------------------------------------------------------
  ceilingDome(ctx, 0, CEIL, 2.6, 'upperhall');
  ceilingDome(ctx, -0.7, CEIL, -3.6, 'upperhall');
  lightSwitch(ctx, W, y + 1.2, -5.0, FACE.posX, 'upperhall', 'hall lights');
  lightSwitch(ctx, W, y + 1.2, 4.62, FACE.posX, 'upperhall', 'hall lights');

  // ---- runner rug (long axis along z) ------------------------------------------------------------
  rug(ctx, 0, y, 1.6, 5.6, 0.85, 'red', Math.PI / 2);

  // ---- console table under the front window ------------------------------------------------------
  {
    const g = new THREE.Group();
    const wood = mats.walnut;
    const top = Prim.rbox(1.3, 0.03, 0.34, 0.008, wood); top.position.y = 0.765; g.add(top);
    const apron = Prim.box(1.18, 0.09, 0.26, wood); apron.position.set(0, 0.705, 0); g.add(apron);
    const drawer = Prim.rbox(0.5, 0.06, 0.012, 0.004, wood); drawer.position.set(0, 0.705, 0.135); g.add(drawer);
    const knob = Prim.sphere(0.012, mats.brass, { segments: 8 }); knob.position.set(0, 0.705, 0.148); g.add(knob);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = Prim.cylinder(0.016, 0.026, 0.68, wood, { segments: 10 });
      leg.position.set(sx * 0.58, 0.34, sz * 0.12);
      g.add(leg);
    }
    const stretcher = Prim.box(1.12, 0.025, 0.025, wood); stretcher.position.set(0, 0.16, 0); g.add(stretcher);
    // vase with dried stems
    const vase = Prim.lathe([[0, 0], [0.05, 0], [0.065, 0.06], [0.05, 0.16], [0.03, 0.2], [0.035, 0.24], [0.028, 0.24], [0.022, 0.2], [0.02, 0.05]], mats.ceramic, { segments: 20 });
    vase.position.set(0.42, 0.78, 0.02);
    g.add(vase);
    const stemMat = mats.solid(0x7a5a3a, { roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, tilt = 0.12 + ctx.rng() * 0.18, len = 0.32 + ctx.rng() * 0.16;
      const s = Prim.cylinder(0.002, 0.004, len, stemMat, { segments: 5 });
      s.position.set(0.42 + Math.sin(a) * tilt * len * 0.5, 0.98 + len * 0.45, 0.02 + Math.cos(a) * tilt * len * 0.5);
      s.rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt);
      g.add(s);
      const tip = Prim.sphere(0.014, mats.solid(0xb08a5a, { roughness: 0.95 }), { segments: 7 });
      tip.scale.set(1, 2.2, 1);
      tip.position.set(0.42 + Math.sin(a) * tilt * len, 0.98 + len * 0.92, 0.02 + Math.cos(a) * tilt * len);
      g.add(tip);
    }
    // a small tray with keys
    const tray = Prim.rbox(0.22, 0.015, 0.15, 0.005, mats.leather(0x3a2a20)); tray.position.set(-0.02, 0.787, 0.04); g.add(tray);
    const keyring = Prim.torus(0.014, 0.003, mats.chrome); keyring.position.set(-0.03, 0.797, 0.04); g.add(keyring);
    const key = Prim.box(0.045, 0.004, 0.012, mats.chrome); key.position.set(0.0, 0.797, 0.045); g.add(key);
    place(g, 0, y, FRONT - 0.2, FACE.negZ);
    addStatic(ctx, g, [{ size: [1.3, 0.78, 0.34], center: [0, 0.39, 0] }]);
  }
  // the console group is rotated by PI, so the vase (local x +0.42) ends up at world x -0.42: lamp goes on the other end
  tableLamp(ctx, 0.45, y + 0.78, FRONT - 0.2, { group: 'upperhall-lamp', label: 'console lamp', color: 0x8a5a3c, height: 0.5 });

  // ---- gallery wall: 6 family photos on the east wall between the bathroom and guest doors -------
  {
    const zs = [1.5, 2.0, 2.5];
    const ys = [1.78, 1.38];
    let i = 0;
    for (const yy of ys) for (const zz of zs) {
      const landscape = i % 2 === 0;
      const w = landscape ? 0.34 : 0.26, h = landscape ? 0.26 : 0.32;
      pictureFrame(ctx, E, y + yy, zz, FACE.negX, w, h, ctx.tex.photo(i), { frameColor: i % 3 === 0 ? 0x1c1a18 : 0x5c4630, frameW: 0.03 });
      i++;
    }
  }

  // ---- bench under the gallery ----------------------------------------------------------------
  {
    const g = new THREE.Group();
    const wood = mats.oak;
    const seat = Prim.rbox(0.95, 0.04, 0.36, 0.01, wood); seat.position.y = 0.42; g.add(seat);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = Prim.box(0.04, 0.4, 0.04, wood); leg.position.set(sx * 0.43, 0.2, sz * 0.14); g.add(leg);
    }
    for (const sx of [-1, 1]) { const rail = Prim.box(0.03, 0.03, 0.28, wood); rail.position.set(sx * 0.43, 0.12, 0); g.add(rail); }
    const pad = cushion(0.9, 0.06, 0.32, mats.fabric(0x6d7b8c)); pad.position.y = 0.47; g.add(pad);
    const throwB = Prim.rbox(0.36, 0.05, 0.3, 0.02, mats.fabric(0xb9a58a)); throwB.position.set(0.24, 0.525, 0.0); throwB.rotation.y = 0.15; g.add(throwB);
    place(g, E - 0.2, y, 2.0, FACE.negX);
    addStatic(ctx, g, [{ size: [0.95, 0.5, 0.36], center: [0, 0.25, 0] }]);
  }

  // ---- low bookcase on the west wall ---------------------------------------------------------
  {
    const { g, shelfY } = shelfUnit(ctx, 0.8, 1.05, 0.28, 2, mats.walnut);
    const frame = Prim.box(0.16, 0.13, 0.015, mats.solid(0x1c1a18)); frame.position.set(-0.2, 1.12, 0.02); frame.rotation.y = 0.2; g.add(frame);
    const pic = Prim.quad(0.13, 0.1, mats.image(ctx.tex.photo(7), { roughness: 0.85 }), { keepUV: true }); pic.position.set(-0.2, 1.12, 0.02); pic.rotation.y = 0.2; pic.translateZ(0.009); g.add(pic);
    const candle = Prim.cylinder(0.035, 0.035, 0.09, mats.solid(0xf0e6d0, { roughness: 0.6 }), { segments: 14 }); candle.position.set(0.22, 1.095, 0.0); g.add(candle);
    const wick = Prim.cylinder(0.002, 0.002, 0.012, mats.black, { segments: 4 }); wick.position.set(0.22, 1.146, 0); g.add(wick);
    place(g, W + 0.16, y, -1.8, FACE.posX);
    addStatic(ctx, g, [{ size: [0.8, 1.05, 0.28], center: [0, 0.525, 0] }]);
    // books on both shelves (rotY faces +x)
    for (let i = 0; i < shelfY.length; i++) {
      bookRow(ctx, W + 0.17, y + shelfY[i], -1.8 + (i === 0 ? 0.04 : -0.08), i === 0 ? 0.62 : 0.46, FACE.posX, i === 0 ? 0.26 : 0.22, 41 + i);
    }
  }

  // ---- plant by the window, smoke detector -----------------------------------------------------
  plant(ctx, 1.1, y, 5.35, 1.15, { potColor: 0x4a4a48 });
  {
    const g = new THREE.Group();
    const disc = Prim.cylinder(0.065, 0.07, 0.028, mats.plasticWhite, { segments: 20 }); disc.position.y = -0.014; g.add(disc);
    const led = Prim.sphere(0.005, mats.emissive(0x40ff60, 1.5, 0x205020), { segments: 6 }); led.position.set(0.04, -0.03, 0); g.add(led);
    place(g, 0.3, CEIL, 0.6, 0);
    addStatic(ctx, g);
  }

  // ---- a small framed mirror opposite the master door (east wall, north of the guest door) -------
  {
    const g = new THREE.Group();
    const frame = Prim.rbox(0.5, 0.7, 0.03, 0.01, mats.solid(0xc9a44a, { roughness: 0.35, metalness: 0.8 })); frame.position.z = 0.015; g.add(frame);
    const glass = Prim.quad(0.42, 0.62, mats.mirror); glass.position.z = 0.032; g.add(glass);
    place(g, E, y + 1.6, 5.15, FACE.negX);
    addStatic(ctx, g);
  }
}
