/**
 * FoyerHallStudy — the entry sequence of the ground floor: foyer (checker tile), hallway,
 * stairwell and the walnut-floored study. Furniture is built in FoyerHallStudy.props.ts and
 * placed here; everything static is batched through addStatic() with approximate box colliders.
 *
 * Plan reminders (metres, +z = street): foyer x -1.5..1.5 z 2.5..6 (front door at x 0 on z 6,
 * arch to the living room on the west, study door on the east); hall z -1.4..2.5 (arches to
 * living/kitchen, dining + powder doors, basement door on the north wall); stairwell z -6..-1.4
 * (up-stair on the east half, basement stair behind the door on the west half); study x 1.5..8.
 */
import * as THREE from 'three';
import type { Ctx } from '../Context';
import type { Structure } from '../Structure';
import { roomById, LEVELS } from '../Plan';
import { place, Prim } from '../Builder';
import { addStatic, ceilingDome, recessedLight, pendant, tableLamp, floorLamp, lightSwitch, rug, plant, mug, looseBook, curtains, wallClock } from '../Props';
import * as P from './FoyerHallStudy.props';

const INT = 0.06; // half of an interior wall (inside face offset from the room rectangle)
const EXT = 0.15; // half of an exterior wall

export function buildFoyerHallStudy(ctx: Ctx, structure: Structure) {
  void structure;
  buildFoyer(ctx);
  buildHall(ctx);
  buildStairwell(ctx);
  buildStudy(ctx);
}

// -------------------------------------------------------------------------------------------
// Foyer
// -------------------------------------------------------------------------------------------

function buildFoyer(ctx: Ctx) {
  const room = roomById('foyer');
  const lvl = LEVELS[room.floor];
  const y0 = lvl.y, ceil = y0 + lvl.ceiling;
  const mats = ctx.mats;
  const frontZ = room.z1 - EXT; // 5.85 — inside face of the front wall
  const eastX = room.x1 - INT;  // 1.44
  const westX = room.x0 + INT;  // -1.44

  // lighting: small brass chandelier + switch on the latch side of the front door
  P.chandelier(ctx, 0, ceil, 4.2, 'foyer');
  lightSwitch(ctx, 0.69, y0 + 1.2, frontZ - 0.01, Math.PI, 'foyer', 'foyer light');

  // console table east of the front door, mirror above, key bowl with keys, photo, vase
  const cW = 0.76, cD = 0.32, cH = 0.82;
  const cx = 1.03, cz = frontZ - cD / 2 - 0.01;
  const console = P.consoleTable(ctx, cW, cD, cH, mats.walnut, { drawer: true });
  place(console, cx, y0, cz, Math.PI);
  addStatic(ctx, console, [{ size: [cW, cH, cD], center: [0, cH / 2, 0] }]);
  const mirror = P.framed(ctx, ctx.tex.photo(0), 0.44, 0.64, { frameColor: 0x9a7b3c, frameW: 0.045, mat: mats.mirror });
  place(mirror, cx + 0.03, y0 + 1.55, frontZ - 0.002, Math.PI);
  P.stat(ctx, mirror);
  const bowl = P.keyBowl(ctx, 0x2c4a6e);
  place(bowl, cx - 0.2, y0 + cH, cz + 0.01);
  P.stat(ctx, bowl);
  ctx.physics.addBox({ x: cx - 0.2, y: y0 + cH + 0.006, z: cz + 0.01 }, { x: 0.12, y: 0.012, z: 0.12 }); // bowl floor so the keys rest inside it
  P.keysPickup(ctx, cx - 0.2, y0 + cH + 0.012, cz + 0.01, 0.6);
  const photo = P.standingFrame(ctx, ctx.tex.photo(1), 0.14, 0.105, 0x3b2a1e);
  place(photo, cx + 0.24, y0 + cH, cz - 0.03, Math.PI + 0.3);
  P.stat(ctx, photo);
  const v = P.vase(ctx, 0xd9d2c4, 0.2);
  place(v, cx + 0.05, y0 + cH, cz + 0.07);
  P.stat(ctx, v);
  // a couple of letters on the console
  const mail = new THREE.Group();
  const envMat = mats.solid(0xf1ece0, { roughness: 0.9 });
  for (let i = 0; i < 3; i++) { const l = Prim.box(0.11, 0.003, 0.22, envMat); l.position.set(i * 0.01 - 0.01, 0.0015 + i * 0.003, i * 0.008); l.rotation.y = (i - 1) * 0.12; mail.add(l); }
  place(mail, cx - 0.02, y0 + cH, cz - 0.06, Math.PI * 0.4);
  P.stat(ctx, mail);

  // umbrella stand against the east wall between the study door casing and the console
  const stand = P.umbrellaStand(ctx);
  place(stand, eastX - 0.15, y0, 5.12, 0.4);
  P.stat(ctx, stand);
  ctx.physics.addCylinder({ x: eastX - 0.15, y: y0 + 0.28, z: 5.12 }, 0.13, 0.56, { meta: { surface: 'metal' } });

  // coat hooks west of the front door (clear of the open leaf, which lies along x ≈ -0.55): a hat on the
  // hook nearest the door, two coats, a tote bag, with a shoe bench beneath
  const railX = -0.98, railLen = 0.66;
  const rail = P.hookRail(ctx, railLen, 4);
  place(rail, railX, y0 + 1.72, frontZ - 0.002, Math.PI);
  P.stat(ctx, rail);
  const hookX = (i: number) => railX - (-railLen / 2 + 0.08 + (i / 3) * (railLen - 0.16)); // rotY = PI flips local x: -0.73, -0.90, -1.06, -1.23
  const hookZ = frontZ - 0.002 - 0.08; // hook tips
  const hat = P.fedora(ctx, 0x4a3f36);
  place(hat, hookX(0), y0 + 1.66, frontZ - 0.03);
  hat.rotation.set(-Math.PI / 2, 0, 0.12);
  P.stat(ctx, hat);
  const coatA = P.coat(ctx, 0x2b3a55, { scarf: 0x9b2f2f });
  place(coatA, hookX(1), y0 + 1.725, hookZ + 0.005, Math.PI + 0.1);
  coatA.rotation.z = 0.04;
  P.stat(ctx, coatA);
  const coatB = P.coat(ctx, 0xb08a5a, { buttons: 0x4a3626 });
  place(coatB, hookX(3), y0 + 1.725, hookZ + 0.005, Math.PI - 0.22);
  coatB.rotation.z = 0.03; // hem swings away from the west wall
  P.stat(ctx, coatB);
  const tote = P.toteBag(ctx, 0xd8cdb4, 0x2b3a55);
  place(tote, hookX(2), y0 + 1.725, hookZ, Math.PI + 0.05); // straps on the hook, bag hanging out in front of the coats
  P.stat(ctx, tote);
  const bW = 0.72, bD = 0.34;
  const bench = P.shoeBench(ctx, bW, bD, 0.45, 0x6f5a48);
  place(bench, -1.03, y0, frontZ - bD / 2 - 0.02, Math.PI);
  addStatic(ctx, bench, [{ size: [bW, 0.45, bD], center: [0, 0.225, 0] }]);
  const shoes1 = P.shoePair(ctx, 0x2a2624, 'shoe');
  place(shoes1, -1.16, y0 + 0.15, frontZ - bD / 2 - 0.02, Math.PI + 0.1);
  P.stat(ctx, shoes1);
  const shoes2 = P.shoePair(ctx, 0xffffff, 'boot', 0x3a2a1c);
  place(shoes2, -0.82, y0, frontZ - 0.47, Math.PI + 0.25);
  P.stat(ctx, shoes2);
  const shoes3 = P.shoePair(ctx, 0xe8e6e0, 'sneaker', 0xcfcac0);
  place(shoes3, -1.2, y0, frontZ - 0.5, Math.PI - 0.2);
  P.stat(ctx, shoes3);

  // rug, plant in the corner between the two living-room arches
  rug(ctx, 0, y0, 3.8, 1.1, 1.7, 'blue');
  plant(ctx, westX + 0.36, y0, 2.72, 1.15, { potColor: 0x4a4a48 });

  // gallery wall on the east wall (shared with the hall) with a slim console beneath
  const gallery: [number, number, number, number, number][] = [
    [2.85, 2.05, 0.44, 0.32, 1], [2.38, 1.7, 0.3, 0.4, 2], [3.32, 1.7, 0.3, 0.4, 3], [2.62, 1.28, 0.36, 0.27, 4], [3.08, 1.28, 0.36, 0.27, 5],
  ];
  const frameColors = [0x1e1a16, 0x3b2a1e, 0x1e1a16, 0x8a7a66, 0x3b2a1e];
  gallery.forEach(([z, y, w, h, idx], i) => {
    const f = P.framed(ctx, ctx.tex.photo(idx), w, h, { frameColor: frameColors[i], frameW: 0.03, matte: 0.02 });
    place(f, eastX - 0.002, y0 + y, z, -Math.PI / 2);
    P.stat(ctx, f);
  });
  const sW = 1.0, sD = 0.3, sH = 0.8;
  const slim = P.consoleTable(ctx, sW, sD, sH, mats.walnut, { shelf: true });
  place(slim, eastX - sD / 2 - 0.01, y0, 2.85, -Math.PI / 2);
  addStatic(ctx, slim, [{ size: [sW, sH, sD], center: [0, sH / 2, 0] }]);
  plant(ctx, eastX - sD / 2 - 0.01, y0 + sH, 3.22, 0.42, { potColor: 0x8a8a86 });
  const tray = P.woodenBox(ctx, 0.2, 0.06, 0.13);
  place(tray, eastX - sD / 2 - 0.01, y0 + sH, 2.5, -Math.PI / 2 + 0.1);
  P.stat(ctx, tray);
  const stack = P.bookStack(ctx, [0x5a3a2a, 0x2f4f6a]);
  place(stack, eastX - sD / 2 + 0.01, y0 + sH, 2.84, -Math.PI / 2 - 0.2);
  P.stat(ctx, stack);
  const shelfBooks = P.bookRowMesh(ctx, 0.5, 0.2, 61, 0.18);
  shelfBooks.position.set(eastX - sD / 2 - 0.01, y0 + 0.17, 2.85);
  shelfBooks.rotation.y = -Math.PI / 2;
  P.stat(ctx, shelfBooks);
}

// -------------------------------------------------------------------------------------------
// Hall
// -------------------------------------------------------------------------------------------

function buildHall(ctx: Ctx) {
  const room = roomById('hall');
  const lvl = LEVELS[room.floor];
  const y0 = lvl.y, ceil = y0 + lvl.ceiling;
  const eastX = room.x1 - INT;  // 1.44
  const westX = room.x0 + INT;  // -1.44
  const northZ = room.z0 + INT; // -1.34 (basement-door wall face)

  ceilingDome(ctx, 0, ceil, 0.55, 'hall');
  lightSwitch(ctx, eastX - 0.01, y0 + 1.2, 0.6, -Math.PI / 2, 'hall', 'hall light');
  // 3-way switch for the stairwell beside the basement door (latch side)
  lightSwitch(ctx, -0.15, y0 + 1.2, northZ + 0.01, 0, 'stairwell', 'stair lights');

  rug(ctx, 0, y0, 1.0, 0.75, 2.4, 'red');

  const thermo = P.thermostat(ctx);
  place(thermo, eastX - 0.001, y0 + 1.5, 0.85, -Math.PI / 2);
  P.stat(ctx, thermo);

  const sd = P.smokeDetector(ctx);
  place(sd, 0.35, ceil - 0.001, 1.35);
  P.stat(ctx, sd);

  // small print on the sliver of wall between the dining door and the living-room arch
  const f = P.framed(ctx, ctx.tex.art(2, 0.8), 0.2, 0.25, { frameColor: 0x1e1a16, frameW: 0.025 });
  place(f, westX + 0.002, y0 + 1.55, 0.0, Math.PI / 2);
  P.stat(ctx, f);
}

// -------------------------------------------------------------------------------------------
// Stairwell
// -------------------------------------------------------------------------------------------

function buildStairwell(ctx: Ctx) {
  const room = roomById('stairwell');
  const lvl = LEVELS[room.floor];
  const y0 = lvl.y, ceil = y0 + lvl.ceiling;
  const upperCeil = LEVELS.upper.y + LEVELS.upper.ceiling; // 5.65 — open above the up-stair

  // pendant hanging through the stair opening from the upper ceiling + a can light over the bottom steps
  pendant(ctx, 0.75, upperCeil, -4.0, 1.5, 'stairwell', { shadeColor: 0x3a3f47, shadeR: 0.17, intensity: 14, distance: 9 });
  recessedLight(ctx, 0.75, ceil, -2.0, 'stairwell');
  // bare bulb for the basement stair, switch at the top of the stairs inside the enclosure
  P.bareBulb(ctx, -0.75, ceil, -3.4, 0.55, 'stairwell');
  lightSwitch(ctx, -0.11, y0 + 1.2, -1.7, -Math.PI / 2, 'stairwell', 'stair lights');

  // prints climbing the wall beside the up-stair (the +x face of the wall between the runs)
  const p1 = P.framed(ctx, ctx.tex.art(4, 0.78), 0.28, 0.36, { frameColor: 0x1e1a16, frameW: 0.03, matte: 0.02 });
  place(p1, 0.012, y0 + 2.0, -2.1, Math.PI / 2);
  P.stat(ctx, p1);
  const p2 = P.framed(ctx, ctx.tex.art(6, 0.87), 0.26, 0.3, { frameColor: 0x3b2a1e, frameW: 0.03, matte: 0.02 });
  place(p2, 0.012, y0 + 2.33, -2.85, Math.PI / 2);
  P.stat(ctx, p2);
}

// -------------------------------------------------------------------------------------------
// Study
// -------------------------------------------------------------------------------------------

function buildStudy(ctx: Ctx) {
  const room = roomById('study');
  const lvl = LEVELS[room.floor];
  const y0 = lvl.y, ceil = y0 + lvl.ceiling;
  const mats = ctx.mats;
  const rnd = ctx.rng;
  const westX = room.x0 + INT;  // 1.56
  const southZ = room.z0 + INT; // 2.56
  const northZ = room.z1 - EXT; // 5.85
  const eastX = room.x1 - EXT;  // 7.85

  // lighting
  recessedLight(ctx, 3.4, ceil, 4.2, 'study');
  recessedLight(ctx, 6.1, ceil, 4.2, 'study');
  lightSwitch(ctx, westX + 0.01, y0 + 1.2, 4.93, Math.PI / 2, 'study', 'study lights');

  // curtains (deep green) on all three windows
  const curtainColor = 0x3d5a4a;
  curtains(ctx, 4.75, y0, northZ, Math.PI, 1.5, 2.3, curtainColor);
  curtains(ctx, 6.75, y0, northZ, Math.PI, 1.0, 2.3, curtainColor);
  curtains(ctx, eastX, y0, 4.25, -Math.PI / 2, 1.6, 2.3, curtainColor);

  // ---- wall-to-wall bookcase on the south wall (stops 0.6 m short of the east wall so the window curtain
  // and the archive corner have room)
  const bcW = 5.6, bcH = 2.3, bcD = 0.32;
  const bcX = westX + 0.04 + bcW / 2, bcZ = southZ + bcD / 2;
  const shelfTops = [0.08, 0.5, 0.92, 1.34, 1.76];
  const bc = P.bookcase(ctx, bcW, bcH, bcD, 5, shelfTops.slice(1), mats.mahogany);
  const G = bc.group;
  const seeds = [3, 11, 27, 41, 58];
  const books = (cx: number, top: number, width: number, height?: number) => {
    const m = P.bookRowMesh(ctx, width, height ?? 0.2 + rnd() * 0.1, seeds[Math.floor(rnd() * seeds.length)]);
    m.position.set(cx, top, -0.02);
    G.add(m);
  };
  const addObj = (obj: THREE.Object3D, x: number, y: number, rotY = 0) => { place(obj, x, y, 0.0, rotY); G.add(obj); };
  const worldOf = (lx: number, ly: number) => ({ x: bcX + lx, y: y0 + ly, z: bcZ });
  const specials: Record<string, (cx: number, top: number) => void> = {
    '0-4': (cx, top) => { books(cx - 0.22, top, 0.6, 0.27); addObj(P.bust(ctx), cx + 0.36, top, -0.2); },
    '1-3': (cx, top) => { addObj(P.standingFrame(ctx, ctx.tex.photo(6), 0.16, 0.12, 0x9a7b3c), cx - 0.4, top, 0.25); books(cx + 0.12, top, 0.72); },
    '2-2': (cx, top) => { const w = worldOf(cx - 0.36, top); plant(ctx, w.x, w.y, w.z, 0.38, { potColor: 0x8a8a86 }); books(cx + 0.14, top, 0.68); },
    '3-1': (cx, top) => { addObj(P.bookStack(ctx, [0x8b2f2f, 0x2f4f6a, 0x6b6b3a]), cx - 0.38, top, 0.1); books(cx + 0.04, top, 0.42, 0.24); addObj(P.trophy(ctx), cx + 0.42, top); },
    '4-3': (cx, top) => { addObj(P.woodenBox(ctx), cx - 0.36, top, 0.15); books(cx + 0.14, top, 0.62); },
    '3-4': (cx, top) => { books(cx - 0.16, top, 0.72, 0.3); addObj(P.vase(ctx, 0x2c4a6e, 0.24), cx + 0.4, top); },
    '1-4': (cx, top) => { books(cx - 0.18, top, 0.7, 0.28); addObj(P.standingFrame(ctx, ctx.tex.photo(7), 0.15, 0.11, 0x1e1a16), cx + 0.38, top, -0.2); },
    '0-1': (cx, top) => { books(cx - 0.14, top, 0.76); addObj(P.bookStack(ctx, [0x3b3b3b, 0x8a6a2a]), cx + 0.4, top, -0.1); },
    '2-4': (cx, top) => { books(cx, top, 1.04, 0.32); },
    '4-0': (cx, top) => { addObj(P.woodenBox(ctx, 0.3, 0.14, 0.2), cx - 0.36, top, 0.05); addObj(P.bookStack(ctx, [0x2a3a5a, 0x7a2a2a, 0x2a5a3a, 0xa08a4a]), cx + 0.2, top, 0.2); },
    '2-0': (cx, top) => { books(cx, top, 1.04, 0.3); },
    '1-2': (cx, top) => { books(cx - 0.2, top, 0.64, 0.26); addObj(P.bookStack(ctx, [0x5a2a2a, 0x2a4a2a]), cx + 0.36, top, 0.3); },
  };
  for (let bay = 0; bay < 5; bay++) {
    for (let slot = 0; slot < 5; slot++) {
      const cx = bc.bayCentres[bay], top = shelfTops[slot];
      const sp = specials[`${bay}-${slot}`];
      if (sp) { sp(cx, top); continue; }
      const w = 0.66 + rnd() * 0.38;
      const align = rnd() < 0.5 ? -1 : 1;
      books(cx + align * (1.06 - w) / 2, top, w);
    }
  }
  place(G, bcX, y0, bcZ, 0);
  addStatic(ctx, G, [{ size: [bcW + 0.06, bcH + 0.06, bcD + 0.04], center: [0, (bcH + 0.06) / 2, 0.01] }]);

  // ---- executive desk in the east half facing the door, the chair behind it with its back to the east
  // window. The desk sits toward the window wall so a 0.9 m passage runs between it and the bookcase.
  const dW = 1.8, dD = 0.85, dH = 0.75;
  const deskX = 6.0, deskZ = 4.7; // desk spans z 3.8..5.6, x 5.575..6.425
  const desk = P.executiveDesk(ctx, dW, dD, dH);
  place(desk, deskX, y0, deskZ, -Math.PI / 2);
  addStatic(ctx, desk, [{ size: [dW, dH, dD], center: [0, dH / 2, 0] }]);
  const deskTop = y0 + dH;
  P.monitor(ctx, 6.12, deskTop, deskZ + 0.1, Math.PI / 2, 'study');
  const kb = P.keyboard(ctx); place(kb, 6.31, deskTop, deskZ + 0.1, Math.PI / 2); P.stat(ctx, kb);
  const ms = P.mouse(ctx); place(ms, 6.32, deskTop, deskZ - 0.23, Math.PI / 2 + 0.2); P.stat(ctx, ms);
  mug(ctx, 6.3, deskTop, deskZ + 0.47, 0x2f4a3a);
  tableLamp(ctx, 5.78, deskTop, deskZ - 0.63, { shadeColor: 0x2e6b40, color: 0xb08d3c, height: 0.42, label: 'desk lamp' });
  const phone = P.deskPhone(ctx); place(phone, 5.84, deskTop, deskZ - 0.25, Math.PI / 2 - 0.35); P.stat(ctx, phone);
  const papers = P.paperStack(ctx); place(papers, 5.88, deskTop, deskZ + 0.33, 0.2); P.stat(ctx, papers);
  const pens = P.penCup(ctx); place(pens, 6.05, deskTop, deskZ + 0.7); P.stat(ctx, pens);
  const gl = P.globe(ctx, 0.13); place(gl, 5.76, deskTop, deskZ + 0.73, 0.6); P.stat(ctx, gl);

  const chair = P.officeChair(ctx);
  place(chair, 7.0, y0, deskZ - 0.2, -Math.PI / 2 + 0.15);
  addStatic(ctx, chair, [{ size: [0.62, 1.25, 0.62], center: [0, 0.625, 0] }], { surface: 'leather' });

  // wastebasket at the sitter's right hand, between the chair and the south-east corner
  const bin = P.wastebasket(ctx);
  place(bin, 7.55, y0, 3.9);
  P.stat(ctx, bin);
  ctx.physics.addCylinder({ x: 7.55, y: y0 + 0.15, z: 3.9 }, 0.14, 0.3, { meta: { surface: 'metal' } });

  // archive boxes tucked into the pocket between the bookcase end and the east wall
  const boxes = P.archiveBoxes(ctx);
  place(boxes, 7.42, y0, 2.76);
  addStatic(ctx, boxes, [{ size: [0.44, 0.64, 0.36], center: [0, 0.32, 0] }], { surface: 'cardboard' });

  // filing cabinet against the west wall beside the door (out of the swing), decanter tray on top
  const fcX = westX + 0.29, fcZ = 3.15;
  P.filingCabinet(ctx, fcX, y0, fcZ, Math.PI / 2, 0x3b4a3f);
  P.decanterTray(ctx, fcX, y0 + 1.045, fcZ, Math.PI / 2);

  // ---- reading corner: club chair, floor lamp, side table with a novel
  const arm = P.clubArmchair(ctx, 0xffffff, 0x8f2f2f);
  place(arm, 3.05, y0, 4.95, Math.PI * 0.75);
  addStatic(ctx, arm, [{ size: [0.9, 1.0, 0.9], center: [0, 0.5, 0] }], { surface: 'leather' });
  floorLamp(ctx, 2.25, y0, 5.42, { label: 'reading lamp' });
  const st = P.sideTable(ctx, 0.24, 0.55);
  place(st, 3.95, y0, 5.4);
  P.stat(ctx, st);
  ctx.physics.addCylinder({ x: 3.95, y: y0 + 0.275, z: 5.4 }, 0.24, 0.55);
  looseBook(ctx, 3.95, y0 + 0.55, 5.4, 0.4, 0x3b5a8a, 'novel');

  rug(ctx, 4.35, y0, 4.15, 2.4, 1.7, 'red');

  // ---- walls: a landscape above the filing cabinet, a portrait-format painting and the clock above the
  // reading chair (the pier between the two front windows is hidden behind curtains, so nothing goes there)
  const art1 = P.framed(ctx, ctx.tex.art(3, 1.31), 0.55, 0.42, { frameColor: 0x9a7b3c, frameW: 0.045, matte: 0.03 });
  place(art1, westX + 0.002, y0 + 1.78, fcZ, Math.PI / 2);
  P.stat(ctx, art1);
  const art2 = P.framed(ctx, ctx.tex.art(5, 0.75), 0.42, 0.56, { frameColor: 0x9a7b3c, frameW: 0.045, matte: 0.03 });
  place(art2, 2.95, y0 + 1.65, northZ - 0.002, Math.PI);
  P.stat(ctx, art2);
  const diplomaFont = 'italic bold 54px Georgia, serif';
  const d1 = ctx.tex.label('Diploma', { sub: 'Master of Architecture · Summa Cum Laude', bg: '#f6f1e3', fg: '#3a2f22', font: diplomaFont, w: 512, h: 384 });
  const d2 = ctx.tex.label('Certificate', { sub: 'Chartered Surveyor · Royal Institution', bg: '#f3efe6', fg: '#2f2a3a', font: diplomaFont, w: 512, h: 384 });
  for (const [tex, z] of [[d1, 5.12], [d2, 5.55]] as [THREE.Texture, number][]) {
    const f = P.framed(ctx, tex, 0.3, 0.225, { frameColor: 0x1e1a16, frameW: 0.025, matte: 0.025 });
    place(f, westX + 0.002, y0 + 1.62, z, Math.PI / 2);
    P.stat(ctx, f);
  }
  wallClock(ctx, 1.98, y0 + 2.0, northZ - 0.02, Math.PI);
}
