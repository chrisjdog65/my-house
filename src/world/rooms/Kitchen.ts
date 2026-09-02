/**
 * Kitchen — room builder. L-shaped run of shaker cabinets with a marble counter and subway
 * backsplash, gas range + hood, French-door fridge, dishwasher, island with bar stools and
 * pendants, an undermount sink with a working faucet under the back window, a corner pantry,
 * plenty of counter clutter and pickups. The breakfast nook is built in Kitchen.nook.ts.
 *
 * Layout (metres): kitchen x 1.5..8, z -6..0.5. Back wall z=-6 (window at x 4.5, back door at
 * x 7.0 swinging into the room), east wall x=8 (window at z -3.5), arch from the hall at x=1.5.
 */
import * as THREE from 'three';
import { Prim, place, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import type { Structure } from '../Structure';
import { roomById, LEVELS } from '../Plan';
import { addStatic, recessedLight, pendant, lightSwitch, rug, plant, mug, wallClock, pictureFrame, bookRow, bulbMaterials } from '../Props';
import { cabinetStyle, buildRun, countertop, BASE_H, BASE_D, COUNTER_H, UPPER_H, UPPER_D, FRONT_T, shakerFront, type Unit } from './Kitchen.cabinets';
import { buildRange, buildHood, buildFridge, buildDishwasherFront, buildMicrowave, buildToaster, buildSink, buildTrashCan } from './Kitchen.appliances';
import {
  kettle, saucepan, coffeeMaker, knifeBlock, dishRack, paperTowels, canisters, utensilCrock, oilBottles, openCookbook,
  cuttingBoard, mixingBowl, fruitBowl, soapBottle, barStool, romanShade, chalkboard, openShelves,
  interiorPlates, interiorPots, interiorPlumbing, interiorPantry,
} from './Kitchen.props';
import { buildNook } from './Kitchen.nook';

export function buildKitchen(ctx: Ctx, structure: Structure) {
  void structure;
  const m = ctx.mats;
  const room = roomById('kitchen');
  const lvl = LEVELS[room.floor];
  const fy = lvl.y, ceil = fy + lvl.ceiling;
  const rnd = ctx.rng;

  const cab = cabinetStyle(ctx, 0xeae6dd, 0xdfdbd1);
  const isl = cabinetStyle(ctx, 0x3d4d5c, 0x354452);
  const counterMat = m.marble;
  const islandMat = m.granite;

  const dynGroup = (x: number, y: number, z: number, rotY: number) => {
    const g = new THREE.Group();
    place(g, x, y, z, rotY);
    ctx.dynamic.add(g);
    return g;
  };

  // =========================================================================================
  // Back wall run (z=-6): drawers | range | cabinet | sink base | dishwasher | cabinet
  // =========================================================================================
  const BX = 1.65, BZ = -5.85;
  const back = new THREE.Group();
  place(back, BX, fy, BZ, 0);
  const backDyn = dynGroup(BX, fy, BZ, 0);
  const sinkCut = { x0: 2.45, x1: 3.25, z0: 0.12, z1: 0.55 };
  const basinCut = { x0: sinkCut.x0 - 0.012, x1: sinkCut.x1 + 0.012, z0: sinkCut.z0 - 0.012, z1: sinkCut.z1 + 0.012 };
  const backUnits: Unit[] = [
    { w: 0.8, front: { kind: 'drawers', n: 3 } },
    { w: 0.8, front: { kind: 'blank' } }, // range
    { w: 0.7, front: { kind: 'door', hinge: 'right', drawer: true } },
    { w: 1.1, front: { kind: 'doors', falseFront: true, open: { side: 'left', label: 'sink cabinet', interior: interiorPlumbing(ctx), topCut: basinCut } } },
    { w: 0.6, front: { kind: 'blank' } }, // dishwasher
    { w: 0.6, front: { kind: 'door', hinge: 'left', drawer: true } },
  ];
  const backRun = buildRun(ctx, back, backDyn, cab, backUnits, { ends: [false, true] });
  // filler strip to the west wall
  const filler = Prim.box(0.1, BASE_H - 0.1, BASE_D - 0.05, cab.frame);
  filler.position.set(-0.04, 0.1 + (BASE_H - 0.1) / 2, (BASE_D - 0.05) / 2);
  back.add(filler);
  buildDishwasherFront(ctx, back, 3.4, 0.6, BASE_D - FRONT_T);
  buildSink(ctx, back, backDyn, sinkCut);
  addStatic(ctx, back, [{ size: [backRun.length + 0.12, COUNTER_H, BASE_D + 0.03], center: [backRun.length / 2 - 0.03, COUNTER_H / 2, (BASE_D + 0.03) / 2] }]);
  const backCounter = new THREE.Group();
  place(backCounter, BX, fy, BZ, 0);
  backCounter.add(countertop(counterMat, -0.09, 0.795, 0, BASE_D + 0.03));
  backCounter.add(countertop(counterMat, 1.605, backRun.length + 0.03, 0, BASE_D + 0.03, sinkCut));
  addStatic(ctx, backCounter, [], { worldUV: true });

  // range + hood (slot x 2.45..3.25)
  buildRange(ctx, 2.85, fy, BZ + 0.01, 0);
  buildHood(ctx, 2.85, fy + 1.62, BZ, 0, ceil);

  // =========================================================================================
  // East wall run (x=8) from z=-4.95 (clear of the back-door swing) to the fridge at z=-2.3
  // =========================================================================================
  const EX = 7.85, EZ = -4.95;
  const east = new THREE.Group();
  place(east, EX, fy, EZ, -Math.PI / 2);
  const eastDyn = dynGroup(EX, fy, EZ, -Math.PI / 2);
  const eastUnits: Unit[] = [
    { w: 0.8, front: { kind: 'door', hinge: 'left', drawer: true, open: { label: 'pot cabinet', interior: interiorPots(ctx) } } },
    { w: 0.8, front: { kind: 'drawers', n: 3 } },
    { w: 1.05, front: { kind: 'doors', drawer: true } },
  ];
  const eastRun = buildRun(ctx, east, eastDyn, cab, eastUnits, { ends: [true, false] });
  addStatic(ctx, east, [{ size: [eastRun.length + 0.06, COUNTER_H, BASE_D + 0.03], center: [eastRun.length / 2, COUNTER_H / 2, (BASE_D + 0.03) / 2] }]);
  const eastCounter = new THREE.Group();
  place(eastCounter, EX, fy, EZ, -Math.PI / 2);
  eastCounter.add(countertop(counterMat, -0.03, eastRun.length, 0, BASE_D + 0.03));
  addStatic(ctx, eastCounter, [], { worldUV: true });

  // fridge (east wall, z -2.3..-1.4) with a cabinet above
  buildFridge(ctx, EX, fy, -1.85, -Math.PI / 2);
  {
    const over = new THREE.Group();
    place(over, EX, fy + 1.92, -2.3, -Math.PI / 2);
    const overDyn = dynGroup(EX, fy + 1.92, -2.3, -Math.PI / 2);
    buildRun(ctx, over, overDyn, cab, [{ w: 0.9, front: { kind: 'doors' } }], { depth: 0.62, height: 0.43, toe: false, pullAt: 'bottom', ends: [true, true] });
    const top = Prim.box(0.94, 0.02, 0.62, cab.frame);
    top.position.set(0.45, 0.44, 0.31);
    over.add(top);
    addStatic(ctx, over, []);
  }

  // =========================================================================================
  // Backsplash (subway tile) from the counters up to the uppers, split around the windows
  // =========================================================================================
  {
    const bs = new THREE.Group();
    const tile = (x0: number, x1: number, y0: number, y1: number, z: number, rotY: number) => {
      const w = x1 - x0, h = y1 - y0;
      const t = Prim.box(w, h, 0.012, m.subway, { cast: false });
      if (rotY === 0) t.position.set((x0 + x1) / 2, (y0 + y1) / 2, z + 0.006);
      else { t.position.set(z - 0.006, (y0 + y1) / 2, (x0 + x1) / 2); t.rotation.y = rotY; }
      bs.add(t);
    };
    // back wall
    tile(1.56, 3.735, fy + COUNTER_H, fy + 1.45, -5.85, 0);
    tile(2.45, 3.25, fy + 1.45, fy + 1.62, -5.85, 0);
    tile(3.735, 5.265, fy + COUNTER_H, fy + 1.12, -5.85, 0);
    tile(5.265, 6.3, fy + COUNTER_H, fy + 1.45, -5.85, 0);
    // east wall (z ranges passed as x0..x1)
    tile(-4.98, -4.17, fy + COUNTER_H, fy + 1.45, 7.85, -Math.PI / 2);
    tile(-4.17, -2.83, fy + COUNTER_H, fy + 1.12, 7.85, -Math.PI / 2);
    tile(-2.83, -2.3, fy + COUNTER_H, fy + 1.45, 7.85, -Math.PI / 2);
    addStatic(ctx, bs, [], { worldUV: true });
    // outlet plates on the tile (0.012 tile + 0.008 plate)
    const outlets = new THREE.Group();
    const socketMat = m.solid(0xe4e2dc, { roughness: 0.6 });
    const outlet = (x: number, z: number, rotY: number) => {
      const o = new THREE.Group();
      const plate = Prim.rbox(0.072, 0.116, 0.008, 0.002, m.plasticWhite, { segments: 1 });
      plate.position.z = 0.004;
      o.add(plate);
      for (const dy of [-0.02, 0.02]) {
        const s = Prim.cylinder(0.014, 0.014, 0.003, socketMat, { segments: 12, cast: false });
        s.rotation.x = Math.PI / 2;
        s.position.set(0, dy, 0.0095);
        o.add(s);
      }
      place(o, x, fy + 1.12, z, rotY);
      if (rotY === 0) o.position.z += 0.012; else o.position.x -= 0.012;
      outlets.add(o);
    };
    outlet(2.12, -5.85, 0);
    outlet(3.5, -5.85, 0);
    outlet(5.6, -5.85, 0);
    outlet(7.85, -4.24, -Math.PI / 2);
    outlet(7.85, -2.42, -Math.PI / 2);
    addStatic(ctx, outlets, []);
  }

  // =========================================================================================
  // Upper cabinets + under-cabinet light strip
  // =========================================================================================
  const UY = fy + 1.45;
  {
    const up = new THREE.Group();
    place(up, BX, UY, BZ, 0);
    const upDyn = dynGroup(BX, UY, BZ, 0);
    const units: Unit[] = [
      { w: 0.8, front: { kind: 'doors' } },
      { w: 0.8, front: { kind: 'blank' } }, // hood
      { w: 0.45, front: { kind: 'door', hinge: 'right', open: { label: 'cupboard', interior: interiorPlates(ctx) } } },
      { w: 1.6, front: { kind: 'blank' } }, // window
      { w: 0.95, front: { kind: 'doors' } },
    ];
    buildRun(ctx, up, upDyn, cab, units, { depth: UPPER_D, height: UPPER_H, toe: false, pullAt: 'bottom', lip: false, ends: [false, true] });
    // light rail lips per section + top caps
    for (const [a, b] of [[0, 0.8], [1.6, 2.05], [3.65, 4.6]]) {
      const lip = Prim.box(b - a, 0.035, FRONT_T, cab.frame);
      lip.position.set((a + b) / 2, -0.0175, UPPER_D - FRONT_T / 2);
      up.add(lip);
      const cap = Prim.box(b - a + 0.02, 0.025, UPPER_D + 0.02, cab.frame);
      cap.position.set((a + b) / 2, UPPER_H + 0.0125, UPPER_D / 2);
      up.add(cap);
    }
    // filler to the west wall
    const f = Prim.box(0.09, UPPER_H, UPPER_D - 0.02, cab.frame);
    f.position.set(-0.045, UPPER_H / 2, (UPPER_D - 0.02) / 2);
    up.add(f);
    addStatic(ctx, up, []);

    const upE = new THREE.Group();
    place(upE, EX, UY, EZ, -Math.PI / 2);
    const upEDyn = dynGroup(EX, UY, EZ, -Math.PI / 2);
    buildRun(ctx, upE, upEDyn, cab, [{ w: 0.78, front: { kind: 'doors' } }], { depth: UPPER_D, height: UPPER_H, toe: false, pullAt: 'bottom', lip: true, ends: [true, true] });
    const capE = Prim.box(0.8, 0.025, UPPER_D + 0.02, cab.frame);
    capE.position.set(0.39, UPPER_H + 0.0125, UPPER_D / 2);
    upE.add(capE);
    addStatic(ctx, upE, []);

    // under-cabinet LED strips (emissive, toggled with the kitchen lights)
    const bulbs = bulbMaterials(ctx, 0xffe9c8, 1.3);
    const strips = new THREE.Group();
    for (const [a, b] of [[0, 0.78], [1.62, 2.03], [3.67, 4.58]]) {
      const s = Prim.box(b - a, 0.01, 0.012, bulbs.on, { cast: false, receive: false });
      s.position.set(BX + (a + b) / 2, UY - 0.028, BZ + UPPER_D - 0.04);
      strips.add(s);
    }
    const sE = Prim.box(0.012, 0.01, 0.76, bulbs.on, { cast: false, receive: false });
    sE.position.set(EX - UPPER_D + 0.04, UY - 0.028, EZ + 0.39);
    strips.add(sE);
    const stripMesh = mergeByMaterial(strips);
    ctx.dynamic.add(stripMesh);
    const stripEm = stripMesh.children[0] as THREE.Mesh;
    ctx.lights.point(BX + 1.6, UY - 0.12, BZ + 0.3, { group: room.id, intensity: 2.2, distance: 3.6, color: 0xffe2b8, emissives: [{ mesh: stripEm, on: bulbs.on, off: bulbs.off }] });
  }

  // open shelves on the east wall between the window and the fridge
  openShelves(ctx, EX, fy + 1.55, -2.58, -Math.PI / 2, 0.5);

  // =========================================================================================
  // Corner pantry against the west wall (north of the back run)
  // =========================================================================================
  {
    const PX = 1.62, PZ = -4.62;
    const pantry = new THREE.Group();
    place(pantry, PX, fy, PZ, Math.PI / 2); // local +z faces +x
    const pantryDyn = dynGroup(PX, fy, PZ, Math.PI / 2);
    buildRun(ctx, pantry, pantryDyn, cab, [{ w: 0.6, front: { kind: 'doors', open: { side: 'right', label: 'pantry', interior: interiorPantry(ctx) } } }], { depth: 0.6, height: 2.15, ends: [true, false] });
    const cap = Prim.box(0.64, 0.03, 0.62, cab.frame);
    cap.position.set(0.3, 2.165, 0.31);
    pantry.add(cap);
    addStatic(ctx, pantry, [{ size: [0.62, 2.2, 0.62], center: [0.3, 1.1, 0.31] }]);
  }

  // =========================================================================================
  // Island (x 4.6..5.5, z -3.6..-1.6) with an overhang on the hall side for three stools
  // =========================================================================================
  {
    const IX = 4.6, IZ = -1.6;
    const island = new THREE.Group();
    place(island, IX, fy, IZ, Math.PI / 2); // local +x -> world -z, local +z -> world +x
    const islandDyn = dynGroup(IX, fy, IZ, Math.PI / 2);
    const units: Unit[] = [
      { w: 0.85, front: { kind: 'doors', drawer: true, open: { side: 'right', label: 'island cabinet', interior: (g, b) => {
        const cz = (b.z0 + b.z1) / 2;
        const bowlMat = m.solid(0xe9e4d8, { roughness: 0.4, physical: true, clearcoat: 0.5 });
        for (let i = 0; i < 3; i++) {
          const bw = Prim.lathe([[0, 0], [0.08, 0], [0.13, 0.06], [0.135, 0.07], [0.125, 0.07], [0.075, 0.012], [0, 0.012]], bowlMat, { segments: 20 });
          bw.position.set((b.x0 + b.x1) / 2, b.y0 + i * 0.035, cz);
          g.add(bw);
        }
        const tin = Prim.rbox(0.22, 0.12, 0.16, 0.01, m.solid(0xc94b3b, { roughness: 0.5, metalness: 0.3 }), { segments: 2 });
        tin.position.set(b.x1 - 0.15, b.y0 + 0.06, cz + 0.06);
        g.add(tin);
      } } } },
      { w: 0.85, front: { kind: 'doors', drawer: true } },
    ];
    // finished end panel on the nook side (the first unit is hollow, so its maple side would show)
    const run = buildRun(ctx, island, islandDyn, isl, units, { depth: 0.9, ends: [true, false] });
    const L = 2.0;
    // open shelf unit at the south end (x_l 1.7..2.0), opening toward -z (world)
    const shelfMat = isl.frame;
    const sb = (w: number, h: number, d: number, px: number, py: number, pz: number) => {
      const b = Prim.box(w, h, d, shelfMat);
      b.position.set(px, py, pz);
      island.add(b);
    };
    sb(0.02, BASE_H - 0.1, 0.9, run.length + 0.01, 0.1 + (BASE_H - 0.1) / 2, 0.45);
    sb(L - run.length, BASE_H - 0.1, 0.02, run.length + (L - run.length) / 2, 0.1 + (BASE_H - 0.1) / 2, 0.01);
    sb(L - run.length, BASE_H - 0.1, 0.02, run.length + (L - run.length) / 2, 0.1 + (BASE_H - 0.1) / 2, 0.89);
    sb(L - run.length, 0.02, 0.9, run.length + (L - run.length) / 2, BASE_H - 0.01, 0.45);
    sb(L - run.length, 0.02, 0.9, run.length + (L - run.length) / 2, 0.11, 0.45);
    sb(L - run.length, 0.02, 0.9, run.length + (L - run.length) / 2, 0.48, 0.45);
    const toe = Prim.box(L - run.length, 0.1, 0.9 - 0.05, isl.toe);
    toe.position.set(run.length + (L - run.length) / 2, 0.05, 0.45);
    island.add(toe);
    // decorative panels + footrest on the stool side (back face, z_l = 0)
    for (const px of [0.5, 1.5]) {
      const p = shakerFront(0.9, 0.66, isl);
      p.rotation.y = Math.PI;
      p.position.set(px, 0.1 + 0.33 + 0.05, 0);
      island.add(p);
    }
    const rest = Prim.cylinder(0.012, 0.012, L - 0.2, m.steel, { segments: 12 });
    rest.rotation.z = Math.PI / 2;
    rest.position.set(L / 2, 0.24, -0.17);
    island.add(rest);
    for (const px of [0.15, L / 2, L - 0.15]) {
      const br = Prim.box(0.03, 0.02, 0.17, m.steel);
      br.position.set(px, 0.24, -0.085);
      island.add(br);
    }
    addStatic(ctx, island, [{ size: [L + 0.06, COUNTER_H, 1.26], center: [L / 2, COUNTER_H / 2, 0.3] }]);
    const islandTop = new THREE.Group();
    place(islandTop, IX, fy, IZ, Math.PI / 2);
    islandTop.add(countertop(islandMat, -0.03, L + 0.03, -0.33, 0.93));
    addStatic(ctx, islandTop, [], { worldUV: true });
    // cookbooks + a basket on the open shelves
    island.updateMatrixWorld(true);
    const bp = island.localToWorld(new THREE.Vector3(L - 0.13, 0.49, 0.45));
    bookRow(ctx, bp.x, bp.y, bp.z, 0.55, Math.PI, 0.22, 3);
    const basket = new THREE.Group();
    const bpos = island.localToWorld(new THREE.Vector3(L - 0.13, 0.12, 0.45));
    place(basket, bpos.x, bpos.y, bpos.z, 0);
    basket.add(Prim.lathe([[0, 0], [0.16, 0], [0.19, 0.22], [0.17, 0.22], [0.15, 0.012], [0, 0.012]], m.solid(0xb08a5a, { roughness: 0.95 }), { segments: 18 }));
    const towelR = Prim.rbox(0.22, 0.09, 0.22, 0.03, m.fabric(0x6d8ba3), { segments: 2 });
    towelR.position.y = 0.2;
    basket.add(towelR);
    addStatic(ctx, basket, []);
  }

  // bar stools on the hall side
  for (const sz of [-3.15, -2.6, -2.05]) barStool(ctx, 4.02, fy, sz + (rnd() - 0.5) * 0.04, Math.PI / 2 + (rnd() - 0.5) * 0.3, 0x7a5636);

  // =========================================================================================
  // Counter clutter
  // =========================================================================================
  const CY = fy + COUNTER_H;
  // back run, west end
  canisters(ctx, 1.78, CY, -5.7, 0.05);
  knifeBlock(ctx, 2.3, CY, -5.6, 0.35);
  // range top
  saucepan(ctx, 2.66, CY + 0.024, -5.64, 0.4);
  kettle(ctx, 3.04, CY + 0.024, -5.38, -0.5);
  // between range and sink
  utensilCrock(ctx, 3.42, CY, -5.68, 0);
  paperTowels(ctx, 3.72, CY, -5.42, 0);
  // sink area
  soapBottle(ctx, 5.0, CY, -5.7);
  dishRack(ctx, 5.38, CY, -5.5, 0.03);
  // east end of the back run
  coffeeMaker(ctx, 6.02, CY, -5.72, 0);
  mug(ctx, 5.7, CY, -5.42, 0x2f4f6f);
  mug(ctx, 5.86, CY, -5.34, 0xc94b3b);
  // east run
  buildMicrowave(ctx, 7.8, CY, -4.55, -Math.PI / 2);
  buildToaster(ctx, 7.55, CY, -3.85, -Math.PI / 2 + 0.1);
  openCookbook(ctx, 7.6, CY, -3.3, -Math.PI / 2);
  oilBottles(ctx, 7.62, CY, -2.65, -Math.PI / 2);
  // island top
  fruitBowl(ctx, 4.9, CY, -2.05, m.solid(0x3d6b7a, { roughness: 0.3, physical: true, clearcoat: 0.6 }), ['apple', 'orange', 'greenApple', 'orange', 'apple']);
  cuttingBoard(ctx, 4.95, CY, -3.05, 0.08);
  mixingBowl(ctx, 5.2, CY, -2.55, 0);
  const newspaper = new THREE.Group();
  place(newspaper, 4.65, CY, -2.45, 0.35);
  const paper = Prim.rbox(0.3, 0.012, 0.42, 0.003, m.image(ctx.tex.label('THE DAILY', { bg: '#efeadf', fg: '#222', w: 512, h: 512, sub: 'Sunny spells, showers later' }), { roughness: 0.9 }), { keepUV: true });
  paper.position.y = 0.006;
  newspaper.add(paper);
  addStatic(ctx, newspaper, []);

  // =========================================================================================
  // Walls & windows: shades, sill plant, chalkboard, clock, print, trash
  // =========================================================================================
  romanShade(ctx, 4.5, fy, -5.85, 0, 1.4, fy + 2.25, 0x8fa3b1);
  romanShade(ctx, 7.85, fy, -3.5, -Math.PI / 2, 1.2, fy + 2.25, 0x8fa3b1);
  plant(ctx, 4.5, fy + 1.15, -5.805, 0.3, { potColor: 0xd9d2c4 });
  chalkboard(ctx, 1.561, fy + 1.5, -3.4, Math.PI / 2, 0.8, 0.55);
  wallClock(ctx, 2.5, fy + 2.05, 0.44 - 0.018, Math.PI, 0.17);
  pictureFrame(ctx, 7.85 - 0.001, fy + 1.55, -0.45, -Math.PI / 2, 0.55, 0.42, ctx.tex.art(2, 1.3), { frameColor: 0x2a2018 });
  buildTrashCan(ctx, 7.67, fy, -1.05, -Math.PI / 2);
  rug(ctx, 4.5, fy, -4.7, 1.3, 0.75, 'neutral');
  // small herb pots on the east window sill
  {
    const g = new THREE.Group();
    place(g, 7.8, fy + 1.15, -3.5, 0);
    for (const [pz, col] of [[-0.25, 0x6f9a5a], [0.25, 0x7fa86a]] as [number, number][]) {
      const pot = Prim.cylinder(0.035, 0.028, 0.06, m.solid(0xc27a55, { roughness: 0.8 }), { segments: 14 });
      pot.position.set(0, 0.03, pz);
      g.add(pot);
      for (let i = 0; i < 5; i++) {
        const leaf = Prim.box(0.02, 0.05, 0.004, m.solid(col, { roughness: 0.85, side: THREE.DoubleSide }), { cast: false });
        const a = (i / 5) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.02, 0.085, pz + Math.sin(a) * 0.02);
        leaf.rotation.y = a;
        leaf.rotation.x = 0.3;
        g.add(leaf);
      }
    }
    addStatic(ctx, g, []);
  }

  // =========================================================================================
  // Lighting: 4 recessed cans + 2 pendants over the island (group 'kitchen'), switches by
  // the arch (kitchen side) and by the back door
  // =========================================================================================
  for (const [lx, lz] of [[3.1, -4.4], [6.6, -4.4], [3.1, -1.0], [6.6, -1.0]]) recessedLight(ctx, lx, ceil, lz, room.id, { intensity: 11, distance: 6.5 });
  pendant(ctx, 4.9, ceil, -3.1, 0.95, room.id, { shadeColor: 0x2b2f36, intensity: 10, distance: 6 });
  pendant(ctx, 4.9, ceil, -2.1, 0.95, room.id, { shadeColor: 0x2b2f36, intensity: 10, distance: 6 });
  lightSwitch(ctx, 1.561, fy + 1.2, -1.49, Math.PI / 2, room.id, 'kitchen lights');
  lightSwitch(ctx, 6.34, fy + 1.2, -5.848, 0, room.id, 'kitchen lights');

  buildNook(ctx);
}
