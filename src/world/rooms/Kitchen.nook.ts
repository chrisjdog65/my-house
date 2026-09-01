/**
 * Kitchen.nook — the breakfast nook: round pedestal table, chairs, window seat with cushions,
 * pendant, print, plant, rug and a bowl of fruit.
 */
import * as THREE from 'three';
import { Prim, place } from '../Builder';
import type { Ctx } from '../Context';
import { addStatic, pendant, lightSwitch, pictureFrame, plant, rug } from '../Props';
import { LEVELS, roomById } from '../Plan';
import { shakerFront, cabinetStyle } from './Kitchen.cabinets';
import { fruitBowl, romanShade } from './Kitchen.props';

function chair(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const m = ctx.mats;
  const g = new THREE.Group();
  place(g, x, y, z, rotY);
  const paint = m.solid(0xf0ede6, { roughness: 0.5, envMapIntensity: 0.5 });
  const seat = Prim.rbox(0.42, 0.035, 0.42, 0.012, m.oak, { segments: 2 });
  seat.position.y = 0.45;
  g.add(seat);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = Prim.cylinder(0.014, 0.018, 0.435, paint, { segments: 10 });
    leg.position.set(sx * 0.17, 0.2175, sz * 0.17);
    leg.rotation.z = -sx * 0.04;
    leg.rotation.x = sz * 0.04;
    g.add(leg);
  }
  for (const s of [-1, 1]) {
    const post = Prim.cylinder(0.014, 0.016, 0.46, paint, { segments: 10 });
    post.position.set(s * 0.17, 0.69, -0.19);
    post.rotation.x = -0.08;
    g.add(post);
  }
  const rail = Prim.rbox(0.38, 0.055, 0.03, 0.01, paint, { segments: 2 });
  rail.position.set(0, 0.9, -0.21);
  rail.rotation.x = -0.08;
  g.add(rail);
  for (const sx of [-0.085, 0, 0.085]) {
    const sp = Prim.cylinder(0.008, 0.008, 0.4, paint, { segments: 8 });
    sp.position.set(sx, 0.67, -0.19);
    sp.rotation.x = -0.08;
    g.add(sp);
  }
  const cushion = Prim.rbox(0.36, 0.03, 0.34, 0.012, m.fabric(0x8c9c7e), { segments: 2 });
  cushion.position.set(0, 0.48, 0.02);
  g.add(cushion);
  addStatic(ctx, g, [{ size: [0.44, 0.92, 0.44], center: [0, 0.46, 0] }]);
}

export function buildNook(ctx: Ctx) {
  const m = ctx.mats;
  const room = roomById('nook');
  const lvl = LEVELS[room.floor];
  const fy = lvl.y, ceil = fy + lvl.ceiling;
  const rnd = ctx.rng;

  // --- window seat under the east window (x=8, z 0.7..2.3) ---
  const bench = new THREE.Group();
  place(bench, 7.85, fy, 1.5, -Math.PI / 2); // local +z faces -x (into the room)
  const style = cabinetStyle(ctx, 0xeae6dd, 0xdfdbd1);
  const BW = 1.76, BD = 0.46, BH = 0.42;
  const body = Prim.box(BW, BH - 0.1, BD - 0.02, style.frame);
  body.position.set(0, 0.1 + (BH - 0.1) / 2, (BD - 0.02) / 2);
  bench.add(body);
  const toe = Prim.box(BW, 0.1, BD - 0.06, style.toe);
  toe.position.set(0, 0.05, (BD - 0.06) / 2);
  bench.add(toe);
  const top = Prim.rbox(BW + 0.02, 0.03, BD + 0.02, 0.006, style.frame, { segments: 2 });
  top.position.set(0, BH - 0.015, BD / 2);
  bench.add(top);
  for (const px of [-0.44, 0.44]) {
    const p = shakerFront(0.8, 0.26, style);
    p.position.set(px, 0.24, BD - 0.02);
    bench.add(p);
  }
  const cushion = Prim.rbox(BW - 0.04, 0.07, BD - 0.06, 0.025, m.fabric(0x8c9c7e), { segments: 3 });
  cushion.position.set(0, BH + 0.035, BD / 2 - 0.01);
  bench.add(cushion);
  const pillowCols = [0xc8a24a, 0x5c6f8a, 0xd9d2c4, 0xa8443a];
  for (let i = 0; i < 3; i++) {
    const col = pillowCols[(i + Math.floor(rnd() * 4)) % pillowCols.length];
    const pw = 0.36 + rnd() * 0.06;
    const pillow = Prim.rbox(pw, pw, 0.11, 0.04, m.fabric(col), { segments: 3 });
    pillow.position.set(-0.55 + i * 0.55 + (rnd() - 0.5) * 0.06, BH + 0.07 + pw / 2 - 0.04, 0.1);
    pillow.rotation.x = -0.28;
    pillow.rotation.y = (rnd() - 0.5) * 0.25;
    bench.add(pillow);
  }
  const throwB = Prim.rbox(0.42, 0.05, 0.3, 0.02, m.fabric(0xb56b4a), { segments: 2 });
  throwB.position.set(0.6, BH + 0.095, 0.28);
  throwB.rotation.y = 0.2;
  bench.add(throwB);
  addStatic(ctx, bench, [{ size: [BW + 0.02, BH + 0.1, BD + 0.02], center: [0, (BH + 0.1) / 2, BD / 2] }]);
  romanShade(ctx, 7.85, fy, 1.5, -Math.PI / 2, 1.6, fy + 2.3, 0xb7a58f);

  // --- pedestal table ---
  const TX = 6.3, TZ = 1.47, TR = 0.55;
  const table = new THREE.Group();
  place(table, TX, fy, TZ, 0);
  const pedMat = m.solid(0x2f3134, { roughness: 0.45, metalness: 0.2, envMapIntensity: 0.7 });
  const ped = Prim.lathe([[0, 0], [0.27, 0], [0.3, 0.015], [0.28, 0.04], [0.1, 0.09], [0.055, 0.14], [0.05, 0.58], [0.07, 0.65], [0.2, 0.69], [0.2, 0.71], [0, 0.71]], pedMat, { segments: 28 });
  table.add(ped);
  const topM = Prim.cylinder(TR, TR - 0.01, 0.035, m.oak, { segments: 44 });
  topM.position.y = 0.7325;
  table.add(topM);
  addStatic(ctx, table, []);
  ctx.physics.addCylinder({ x: TX, y: fy + 0.375, z: TZ }, TR, 0.75);

  // four chairs on the room side of the table (the window seat takes the east side)
  for (const deg of [135, 180, 225, 275]) {
    const a = (deg * Math.PI) / 180;
    const cx = TX + Math.cos(a) * 0.88, cz = TZ + Math.sin(a) * 0.88;
    const dx = TX - cx, dz = TZ - cz;
    chair(ctx, cx, fy, cz, Math.atan2(dx, dz) + (rnd() - 0.5) * 0.12);
  }

  // things on the table
  fruitBowl(ctx, TX + 0.02, fy + 0.75, TZ - 0.02, m.walnut, ['orange', 'lemon', 'greenApple'], 0.14);
  const vase = new THREE.Group();
  place(vase, TX + 0.24, fy + 0.75, TZ + 0.2, 0);
  const vaseMat = m.solid(0x9fb8c8, { roughness: 0.25, physical: true, clearcoat: 0.7 });
  vase.add(Prim.lathe([[0, 0], [0.04, 0], [0.045, 0.04], [0.03, 0.11], [0.025, 0.15], [0.032, 0.17], [0, 0.17]], vaseMat, { segments: 18 }));
  const stemMat = m.solid(0x4c6b3c, { roughness: 0.8 });
  const bloomCols = [0xe8c33c, 0xd66b8a, 0xf4f0e6, 0xe07a3c];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rnd();
    const len = 0.2 + rnd() * 0.08;
    const stem = Prim.cylinder(0.003, 0.004, len, stemMat, { segments: 6 });
    stem.position.set(Math.cos(a) * 0.04, 0.15 + len / 2, Math.sin(a) * 0.04);
    stem.rotation.z = Math.cos(a) * 0.35;
    stem.rotation.x = -Math.sin(a) * 0.35;
    vase.add(stem);
    const bloom = Prim.sphere(0.024, m.solid(bloomCols[i % 4], { roughness: 0.8 }), { segments: 10 });
    bloom.position.set(Math.cos(a) * 0.085, 0.15 + len * 0.94, Math.sin(a) * 0.085);
    vase.add(bloom);
  }
  addStatic(ctx, vase, []);
  const shakers = new THREE.Group();
  place(shakers, TX - 0.2, fy + 0.75, TZ + 0.25, 0);
  for (const [sx, col] of [[0, 0xf4f4f0], [0.05, 0x2a2a2c]] as [number, number][]) {
    const s = Prim.cylinder(0.016, 0.018, 0.08, m.glassClear, { segments: 12, cast: false });
    s.position.set(sx, 0.04, 0);
    shakers.add(s);
    const fill = Prim.cylinder(0.013, 0.015, 0.06, m.solid(col, { roughness: 0.9 }), { segments: 12 });
    fill.position.set(sx, 0.031, 0);
    shakers.add(fill);
    const cap = Prim.cylinder(0.017, 0.017, 0.012, m.chrome, { segments: 12 });
    cap.position.set(sx, 0.086, 0);
    shakers.add(cap);
  }
  addStatic(ctx, shakers, []);

  // --- decor ---
  rug(ctx, 6.05, fy, TZ, 2.0, 1.5, 'green');
  pendant(ctx, TX, ceil, TZ, 0.95, 'nook', { shadeColor: 0xe9e4d8, shadeR: 0.2, intensity: 11, distance: 6.5 });
  lightSwitch(ctx, 3.561, fy + 1.2, 0.74, Math.PI / 2, 'nook', 'nook light');
  pictureFrame(ctx, 5.0, fy + 1.55, 2.44 - 0.001, Math.PI, 0.5, 0.4, ctx.tex.art(5, 1.25), { frameColor: 0x3a2a1c });
  pictureFrame(ctx, 4.2, fy + 1.5, 2.44 - 0.001, Math.PI, 0.32, 0.4, ctx.tex.photo(1), { frameColor: 0xf0ede6 });
  plant(ctx, 3.92, fy, 2.08, 1.15, { potColor: 0x6f7c74 });
  void THREE;
}
