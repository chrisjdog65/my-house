/**
 * Walk-in closet: a white closet system on both long walls — hanging rods with 24 garments,
 * shelves with folded stacks and storage boxes, a shoe tower with ten pairs — plus a full-length
 * mirror, an upholstered bench, a wicker hamper, a belt rail, a ceiling dome and its switch.
 */
import * as THREE from 'three';
import { Prim, place } from '../Builder';
import type { Ctx } from '../Context';
import { addStatic, ceilingDome, lightSwitch } from '../Props';
import { FLOOR, CEIL, FACE, foldedStack, hangingGarment, placeStatic, shoePair, storageBox, upholsteredBench, wickerBasket, type GarmentKind, type ShoeKind } from './MasterSuite.shared';

// wall faces (interior)
const WEST = -4.94, EAST = -1.56, SOUTH = -1.44, NORTH = 1.44;
const UNIT_D = 0.4, UNIT_H = 2.4, ROD_Y = 1.85;

/** Closet-system carcass along one long wall: end panels, top shelves, an optional divider. Returns the group (unrotated, world-aligned). */
function carcass(ctx: Ctx, xWall: number, dir: 1 | -1, divider?: number): THREE.Group {
  const mats = ctx.mats;
  const mel = mats.solid(0xf1efe8, { roughness: 0.5, envMapIntensity: 0.4 });
  const g = new THREE.Group();
  const xc = xWall + dir * UNIT_D / 2;
  const panel = (z: number, h: number, y0: number) => { const p = Prim.box(UNIT_D, h, 0.025, mel); p.position.set(xc, y0 + h / 2, z); g.add(p); };
  panel(-1.375, UNIT_H, 0); panel(1.375, UNIT_H, 0);
  if (divider !== undefined) panel(divider, ROD_Y + 0.12, 0);
  // two shelves above the rod, a back strip (cleat) for the rod
  for (const sy of [ROD_Y + 0.15, ROD_Y + 0.45]) { const s = Prim.box(UNIT_D, 0.025, 2.75, mel); s.position.set(xc, sy, 0); g.add(s); }
  const cleat = Prim.box(0.02, 0.08, 2.75, mel); cleat.position.set(xWall + dir * 0.01, ROD_Y + 0.02, 0); g.add(cleat);
  return g;
}

/** Chrome rod between z0..z1 with garments hung at even spacing. */
function rodWithGarments(ctx: Ctx, g: THREE.Group, x: number, z0: number, z1: number, garments: [number, GarmentKind][]) {
  const mats = ctx.mats;
  const len = z1 - z0;
  const rod = Prim.cylinder(0.012, 0.012, len, mats.chrome, { segments: 10 }); rod.rotation.x = Math.PI / 2; rod.position.set(x, ROD_Y, (z0 + z1) / 2); g.add(rod);
  for (const zz of [z0 + 0.02, (z0 + z1) / 2, z1 - 0.02]) { const br = Prim.box(0.03, 0.05, 0.03, mats.chrome); br.position.set(x, ROD_Y + 0.02 + 0.06, zz); g.add(br); const arm = Prim.box(0.02, 0.08, 0.02, mats.chrome); arm.position.set(x, ROD_Y + 0.12, zz); g.add(arm); }
  const step = (len - 0.2) / Math.max(1, garments.length - 1);
  garments.forEach(([c, kind], i) => {
    const gm = hangingGarment(ctx, c, kind);
    gm.position.set(x, ROD_Y + 0.012, z0 + 0.1 + i * step);
    gm.rotation.y = (ctx.rng() - 0.5) * 0.22;
    g.add(gm);
  });
}

/** Shoe tower: shelves between two z bounds against the east wall, two pairs per shelf. */
function shoeShelves(ctx: Ctx, g: THREE.Group, xWall: number, dir: 1 | -1, z0: number, z1: number, levels: number[], pairs: [number, ShoeKind][]) {
  const mats = ctx.mats;
  const mel = mats.solid(0xf1efe8, { roughness: 0.5, envMapIntensity: 0.4 });
  const xc = xWall + dir * UNIT_D / 2;
  const w = z1 - z0;
  let k = 0;
  for (const ly of levels) {
    const s = Prim.box(UNIT_D - 0.02, 0.02, w, mel); s.position.set(xc, ly, (z0 + z1) / 2); g.add(s);
    for (const slot of [-1, 1]) {
      if (k >= pairs.length) break;
      const [c, kind] = pairs[k++];
      const p = shoePair(ctx, c, kind);
      p.position.set(xWall + dir * 0.22, ly + 0.01, (z0 + z1) / 2 + slot * (w / 4) + (ctx.rng() - 0.5) * 0.04);
      p.rotation.y = -dir * Math.PI / 2 + (ctx.rng() - 0.5) * 0.15; // toes toward the room
      g.add(p);
    }
  }
}

/** Full-length mirror in a walnut frame (front +z). */
function fullLengthMirror(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const frame = Prim.rbox(0.58, 1.78, 0.035, 0.01, mats.walnut); frame.position.set(0, 1.09, 0.0175); g.add(frame);
  const glass = Prim.quad(0.5, 1.7, mats.mirror, { cast: false }); glass.position.set(0, 1.09, 0.036); g.add(glass);
  placeStatic(ctx, g, x, z, rotY, [{ size: [0.6, 2.0, 0.05], center: [0, 1.0, 0.02] }]);
}

/** Rail with hooks holding belts and a scarf (front +z, mounted on the wall behind). */
function beltRail(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const rail = Prim.rbox(0.44, 0.05, 0.02, 0.006, mats.walnut); rail.position.z = 0.01; g.add(rail);
  const items: [number, number, number][] = [[-0.15, 0x2a1e18, 0.9], [-0.05, 0x6b4a32, 0.85], [0.05, 0x1f2a3e, 0.8], [0.15, 0x9c6644, 0.95]];
  for (const [hx, c, drop] of items) {
    const hook = Prim.sphere(0.012, mats.brass, { segments: 8 }); hook.position.set(hx, -0.01, 0.035); g.add(hook);
    const belt = Prim.rbox(0.03, drop, 0.008, 0.003, mats.leather(c)); belt.position.set(hx, -drop / 2 - 0.01, 0.045); belt.rotation.z = (ctx.rng() - 0.5) * 0.05; g.add(belt);
    const buckle = Prim.rbox(0.036, 0.04, 0.012, 0.003, mats.chrome); buckle.position.set(hx, -drop + 0.01, 0.047); g.add(buckle);
  }
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
}

export function buildWalkInCloset(ctx: Ctx) {
  const mats = ctx.mats;
  const y = FLOOR;
  const rng = ctx.rng;

  // ---- lighting ------------------------------------------------------------------------------
  ceilingDome(ctx, -3.25, CEIL, 0.0, 'closet');
  lightSwitch(ctx, -3.88, y + 1.2, NORTH, FACE.negZ, 'closet', 'closet light'); // latch side (door hinges at x=-2.87)

  // ---- west wall: full-length rod + shelves ---------------------------------------------------
  {
    const g = carcass(ctx, WEST, 1);
    const cols: [number, GarmentKind][] = [
      [0xf1f1ec, 'shirt'], [0x2c3e50, 'jacket'], [0xb56576, 'blouse'], [0x6d8b74, 'shirt'], [0x8c6a4a, 'coat'], [0x355070, 'shirt'],
      [0xd8c3a5, 'dress'], [0x333333, 'jacket'], [0xe0b1cb, 'blouse'], [0x4a6fa5, 'shirt'], [0x9a8c98, 'dress'], [0xc9ad8f, 'shirt'], [0x22223b, 'coat'], [0xf4d35e, 'blouse'],
    ];
    rodWithGarments(ctx, g, WEST + 0.24, -1.33, 1.33, cols);
    // folded stacks on the lower shelf, boxes on the upper one
    const stackCols = [[0xe8e2d4, 0x9db4c0, 0xc9ad8f, 0x556270], [0xf5f0e6, 0x8a9a5b, 0xd9c6a5], [0x3b4a5c, 0xe6e6e0, 0xa0522d, 0x708090], [0xf0e0c0, 0x2f5d3a]];
    stackCols.forEach((c, i) => { const s = foldedStack(ctx, c, 0.32, 0.28, 0.045); s.position.set(WEST + 0.21, ROD_Y + 0.1625, -1.05 + i * 0.66); g.add(s); });
    const boxSpec: [number, number, number, string][] = [[-1.05, 0.36, 0xb9c6d1, 'WINTER'], [-0.62, 0.3, 0x9aa5b8, 'HATS'], [-0.05, 0.42, 0xc9b8a4, 'LINEN'], [0.5, 0.36, 0x8a9a8a, 'SUMMER'], [1.0, 0.36, 0xb9c6d1, 'PHOTOS']];
    for (const [bz, bw, bc, label] of boxSpec) { const b = storageBox(ctx, bw, 0.24, 0.34, bc, { label }); b.position.set(WEST + 0.21, ROD_Y + 0.4625, bz); b.rotation.y = Math.PI / 2; g.add(b); }
    // floor: two stacked boxes and a pair of boots under the hanging clothes
    const bx1 = storageBox(ctx, 0.42, 0.28, 0.34, 0xd8cfbf); bx1.position.set(WEST + 0.22, 0, 0.95); bx1.rotation.y = Math.PI / 2; g.add(bx1);
    const bx2 = storageBox(ctx, 0.38, 0.22, 0.3, 0xa9b3a6); bx2.position.set(WEST + 0.22, 0.28, 0.95); bx2.rotation.y = Math.PI / 2 + 0.08; g.add(bx2);
    const boots = shoePair(ctx, 0x4a2e1e, 'boot', 0.12); boots.position.set(WEST + 0.24, 0, 0.35); boots.rotation.y = Math.PI / 2 + 0.2; g.add(boots);
    place(g, 0, y, 0, 0);
    addStatic(ctx, g, [{ size: [0.52, UNIT_H, 2.8], center: [WEST + 0.26, UNIT_H / 2, 0] }], { surface: 'fabric' });
  }

  // ---- east wall: shoe tower (south half) + rod (north half) -----------------------------------
  {
    const g = carcass(ctx, EAST, -1, -0.2);
    const cols: [number, GarmentKind][] = [
      [0x3b4a5c, 'pants'], [0xa63a3a, 'skirt'], [0xe8e2d0, 'shirt'], [0x2f5d3a, 'pants'], [0x5a7ea6, 'shirt'], [0xd0b080, 'skirt'], [0x7a3a6a, 'dress'], [0x8a8a8a, 'pants'], [0xf0e0c0, 'shirt'], [0x1f2a3e, 'jacket'],
    ];
    rodWithGarments(ctx, g, EAST - 0.24, -0.16, 1.33, cols);
    const shoesSpec: [number, ShoeKind][] = [
      [0xf4f2ec, 'sneaker'], [0x2a2a2e, 'sneaker'], [0x8b2f2f, 'heel'], [0x1a1a1c, 'heel'], [0x5a3a25, 'loafer'], [0x2b2b30, 'loafer'],
      [0xc9a24a, 'flat'], [0x6d8b74, 'flat'], [0x4a2e1e, 'boot'], [0x1f2a3e, 'boot'],
    ];
    shoeShelves(ctx, g, EAST, -1, -1.36, -0.22, [0.12, 0.42, 0.72, 1.02, 1.32], shoesSpec);
    // above the shoes: a hatbox and a stack of jeans
    const hat = Prim.cylinder(0.14, 0.14, 0.13, mats.solid(0xb9a58a, { roughness: 0.85 }), { segments: 18 }); hat.position.set(EAST - 0.2, 1.6 + 0.065, -1.05); g.add(hat);
    const hatLid = Prim.cylinder(0.145, 0.145, 0.02, mats.solid(0x9c8a70, { roughness: 0.85 }), { segments: 18 }); hatLid.position.set(EAST - 0.2, 1.6 + 0.14, -1.05); g.add(hatLid);
    const shelf = Prim.box(UNIT_D - 0.02, 0.02, 1.14, mats.solid(0xf1efe8, { roughness: 0.5, envMapIntensity: 0.4 })); shelf.position.set(EAST - UNIT_D / 2, 1.6, -0.79); g.add(shelf);
    const jeans = foldedStack(ctx, [0x2f4a6a, 0x3b5a7a, 0x223a52, 0x5a6f86], 0.3, 0.26, 0.05); jeans.position.set(EAST - 0.21, 1.61, -0.5); g.add(jeans);
    // shelves above the rod: sweaters and boxes
    const sw = foldedStack(ctx, [0xd9c6a5, 0x7e8a6b, 0xb56576, 0xf1f1ec], 0.32, 0.28, 0.05); sw.position.set(EAST - 0.21, ROD_Y + 0.1625, 0.3); g.add(sw);
    const sw2 = foldedStack(ctx, [0x556270, 0xe6e6e0, 0x8c6a4a], 0.32, 0.28, 0.05); sw2.position.set(EAST - 0.21, ROD_Y + 0.1625, 0.95); g.add(sw2);
    const blanket = Prim.rbox(0.5, 0.14, 0.3, 0.03, mats.fabric(0x9aa5b8)); blanket.position.set(EAST - 0.2, ROD_Y + 0.1625 + 0.07, -0.85); g.add(blanket);
    const boxSpec: [number, number, number, string | undefined][] = [[-1.0, 0.4, 0xc9b8a4, 'SHOES'], [-0.45, 0.36, 0xb9c6d1, 'BAGS'], [0.15, 0.42, 0x8a9a8a, undefined], [0.75, 0.36, 0xd8cfbf, 'GIFTS']];
    for (const [bz, bw, bc, label] of boxSpec) { const b = storageBox(ctx, bw, 0.24, 0.34, bc, { label }); b.position.set(EAST - 0.21, ROD_Y + 0.4625, bz); b.rotation.y = -Math.PI / 2; g.add(b); }
    place(g, 0, y, 0, 0);
    addStatic(ctx, g, [{ size: [0.52, UNIT_H, 2.8], center: [EAST - 0.26, UNIT_H / 2, 0] }], { surface: 'fabric' });
  }

  // ---- middle: bench, mirror, hamper, belt rail -----------------------------------------------------
  upholsteredBench(ctx, -3.25, 0.0, FACE.posZ, 1.0, 0xb7a58a, { throwColor: 0x5f6f86 });
  fullLengthMirror(ctx, -3.25, SOUTH, FACE.posZ);
  {
    const hamper = wickerBasket(ctx, 0.2, 0.55, 0xa08a66, { lid: true });
    const shirt = Prim.rbox(0.18, 0.05, 0.14, 0.02, mats.fabric(0xf2f2ec)); shirt.position.set(0.05, 0.53, 0.06); shirt.rotation.set(0.2, 0.6, 0.1); hamper.add(shirt);
    place(hamper, WEST + 0.24, y, -1.08, rng() * Math.PI);
    addStatic(ctx, hamper, [], { surface: 'fabric' });
  }
  beltRail(ctx, -2.3, y + 1.6, NORTH, FACE.negZ);
  // a dropped sweater on the bench side of the floor and a shoehorn leaning on the mirror
  {
    const g = new THREE.Group();
    const horn = Prim.rbox(0.03, 0.5, 0.012, 0.005, mats.walnut); horn.position.set(-2.9, 0.26, SOUTH + 0.05); horn.rotation.x = -0.12; g.add(horn);
    const sweater = Prim.rbox(0.36, 0.06, 0.3, 0.025, mats.fabric(0x9db4c0)); sweater.position.set(-3.7, 0.03, 0.45); sweater.rotation.y = 0.5; g.add(sweater);
    place(g, 0, y, 0, 0);
    addStatic(ctx, g);
  }
}
