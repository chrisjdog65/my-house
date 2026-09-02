/**
 * Living Room — stacked-stone fireplace with an animated shader fire, wall-mounted TV with a
 * live "nature channel", sofa + two armchairs around a walnut coffee table, side tables with
 * lamps, bookshelf, console, art, rug, curtains, plants and small clutter.
 *
 * Layout (metres): room x -8..-1.5, z 0..6. Fireplace centred on the west wall (z=3), seating
 * faces it. Arches: foyer (east wall, z 3.15..5.35), hall (east wall, z 0.25..2.25), dining
 * (back wall z=0, x -6.35..-3.15). Windows on the front wall at x=-6 and x=-3.5.
 */
import * as THREE from 'three';
import type { Ctx } from '../Context';
import type { Structure } from '../Structure';
import type { Interactable } from '../Interactables';
import type { VirtualLight } from '../../graphics/Lighting';
import { roomById, LEVELS } from '../Plan';
import { Prim, mergeByMaterial } from '../Builder';
import {
  addStatic, recessedLight, lightSwitch, tableLamp, floorLamp, pictureFrame, rug, plant, bookRow,
  looseBook, mug, curtains, wallClock, Toggle, pickup,
} from '../Props';
import { Fire } from './LivingRoom.fire';
import { TvChannel } from './LivingRoom.tv';

export function buildLivingRoom(ctx: Ctx, structure: Structure) {
  void structure;
  const room = roomById('living');
  const lvl = LEVELS[room.floor];
  const y0 = lvl.y;
  const ceil = y0 + lvl.ceiling;
  const mats = ctx.mats;
  const rnd = ctx.rng;
  const westFace = room.x0 + 0.15; // -7.85 (exterior wall)
  const eastFace = room.x1 - 0.06; // -1.56 (interior wall)
  const backFace = room.z0 + 0.06; // 0.06
  const frontFace = room.z1 - 0.15; // 5.85

  // ------------------------------------------------------------------ lighting
  for (const [x, z] of [[-6.3, 1.5], [-3.0, 1.5], [-6.3, 4.5], [-3.0, 4.5]]) recessedLight(ctx, x, ceil, z, room.id);
  // switch on the pier between the two arches, ~0.15 m from the foyer arch casing (casing edge z ~3.06)
  lightSwitch(ctx, eastFace - 0.002, y0 + 1.2, 2.9, -Math.PI / 2, room.id, 'living room lights');

  // ------------------------------------------------------------------ fireplace + TV
  const FZ = 3;
  buildFireplace(ctx, westFace, y0, FZ, lvl.ceiling);

  // ------------------------------------------------------------------ seating
  // sofa faces west toward the fireplace; the armchairs flank the coffee table, turned ~35 deg toward the hearth
  const sofaX = -4.45;
  const pillowPal = [0xc9a24a, 0x7a4b6b, 0x4b6f5a, 0xb8563f, 0x3f5f8a, 0xe0d5c1];
  const pick = () => pillowPal[Math.floor(rnd() * pillowPal.length)];
  const sofaPillows = [pick(), pick(), 0xe0d5c1];
  if (sofaPillows[1] === sofaPillows[0]) sofaPillows[1] = pillowPal[(pillowPal.indexOf(sofaPillows[0]) + 2) % pillowPal.length];
  buildSofa(ctx, sofaX, y0, FZ, -Math.PI / 2, 0x8a9aa8, sofaPillows);
  buildArmchair(ctx, -6.4, y0, 1.55, -0.6, 0x6e4a30, pick());
  buildArmchair(ctx, -6.4, y0, 4.45, Math.PI + 0.6, 0x6e4a30, pick());
  rug(ctx, -5.65, y0, FZ, 3.0, 3.4, 'red');
  buildCoffeeTable(ctx, -6.05, y0, FZ);
  for (const [z, accent] of [[1.67, 'candle'], [4.33, 'dish']] as [number, 'candle' | 'dish'][]) {
    buildSideTable(ctx, -4.225, y0, z, accent);
    tableLamp(ctx, -4.225, y0 + 0.57, z, { label: 'lamp', color: 0x3a4a52, shadeColor: 0xf1e6cf });
  }
  floorLamp(ctx, -7.45, y0, 5.4, { on: false, label: 'floor lamp' });

  // ------------------------------------------------------------------ storage & decor furniture
  buildBookshelf(ctx, westFace + 0.02 + 0.16, y0, 1.0, Math.PI / 2);
  buildConsole(ctx, -2.6, y0, backFace + 0.02 + 0.17);

  // ------------------------------------------------------------------ walls: art, clock, curtains
  pictureFrame(ctx, eastFace - 0.001, y0 + 1.62, 2.58, -Math.PI / 2, 0.36, 0.56, ctx.tex.art(3, 0.36 / 0.56));
  pictureFrame(ctx, -2.6, y0 + 1.5, backFace + 0.001, 0, 0.7, 0.45, ctx.tex.art(2, 0.7 / 0.45));
  pictureFrame(ctx, -7.0, y0 + 1.6, backFace + 0.001, 0, 0.9, 0.65, ctx.tex.art(5, 0.9 / 0.65), { frameColor: 0x4a3423 });
  wallClock(ctx, -2.6, y0 + 2.1, backFace + 0.02, 0, 0.16);
  curtains(ctx, -6, y0, frontFace - 0.04, Math.PI, 1.5, 2.3, 0xb9a58a);
  curtains(ctx, -3.5, y0, frontFace - 0.04, Math.PI, 1.5, 2.3, 0xb9a58a);

  // ------------------------------------------------------------------ plants
  plant(ctx, -2.35, y0, 5.40, 0.9, { potColor: 0x5f6b63 });
  plant(ctx, -7.55, y0, 4.78, 0.9, { kind: 'bush', potColor: 0xb5573e });
  plant(ctx, -2.92, y0 + 0.8, backFace + 0.2, 0.42, { potColor: 0xe6dccb });
}

// =====================================================================================
// Fireplace, fire, TV
// =====================================================================================

function buildFireplace(ctx: Ctx, wallX: number, y0: number, zc: number, ceilH: number) {
  const mats = ctx.mats;
  const BW = 1.8, BD = 0.35; // chimney breast width / projection
  const HH = 0.12, HD = 0.65, HW = 2.1; // raised hearth
  const OW = 0.85, OH = 0.62, OD = 0.3; // firebox opening
  const MY = 1.3; // mantel height
  const fp = new THREE.Group();
  fp.position.set(wallX, y0, zc);
  const stone = mats.stone;

  const hearth = Prim.box(HD, HH, HW, mats.granite);
  hearth.position.set(HD / 2, HH / 2, 0);
  fp.add(hearth);
  for (const s of [-1, 1]) {
    const pier = Prim.box(BD, OH, (BW - OW) / 2, stone);
    pier.position.set(BD / 2, HH + OH / 2, s * (OW / 2 + (BW - OW) / 4));
    fp.add(pier);
  }
  const upper = Prim.box(BD, ceilH - HH - OH, BW, stone);
  upper.position.set(BD / 2, (HH + OH + ceilH) / 2, 0);
  fp.add(upper);
  // firebox lining (sooty dark concrete), slightly inset from the stone face
  const soot = mats.tex('concreteDark', { color: 0x3b3735, normalScale: 0.7, envMapIntensity: 0.12 });
  const liningD = OD - 0.01;
  const back = Prim.box(0.02, OH, OW, soot, { cast: false });
  back.position.set(BD - OD + 0.01, HH + OH / 2, 0);
  fp.add(back);
  for (const s of [-1, 1]) {
    const side = Prim.box(liningD, OH, 0.02, soot, { cast: false });
    side.position.set(BD - OD + liningD / 2, HH + OH / 2, s * (OW / 2 - 0.012));
    fp.add(side);
  }
  const lintel = Prim.box(liningD, 0.02, OW, soot, { cast: false });
  lintel.position.set(BD - OD + liningD / 2, HH + OH - 0.012, 0);
  fp.add(lintel);
  const fbFloor = Prim.box(liningD, 0.02, OW, soot, { cast: false });
  fbFloor.position.set(BD - OD + liningD / 2, HH + 0.01, 0);
  fp.add(fbFloor);
  // mantel shelf (walnut) with moulding and corbels
  const mantel = Prim.rbox(0.5, 0.06, 2.1, 0.008, mats.walnut);
  mantel.position.set(0.25, MY + 0.03, 0);
  fp.add(mantel);
  const mould = Prim.box(0.44, 0.05, 2.0, mats.walnut);
  mould.position.set(0.22, MY - 0.025, 0);
  fp.add(mould);
  for (const s of [-1, 1]) {
    const corbel = Prim.rbox(0.08, 0.16, 0.1, 0.01, mats.walnut);
    corbel.position.set(BD + 0.04, MY - 0.13, s * 0.8);
    fp.add(corbel);
  }
  // ---- mantel decor (static)
  const top = MY + 0.06;
  const cream = mats.solid(0xf1e8d2, { roughness: 0.7 });
  for (const [z, h] of [[-0.78, 0.15], [-0.66, 0.11]]) {
    const holder = Prim.cylinder(0.035, 0.04, 0.012, mats.brass);
    holder.position.set(0.38, top + 0.006, z);
    fp.add(holder);
    const candle = Prim.cylinder(0.024, 0.024, h, cream, { segments: 16 });
    candle.position.set(0.38, top + 0.012 + h / 2, z);
    fp.add(candle);
    const wick = Prim.cylinder(0.002, 0.002, 0.012, mats.black, { segments: 6 });
    wick.position.set(0.38, top + 0.012 + h + 0.006, z);
    fp.add(wick);
  }
  fp.add(standingFrame(ctx, ctx.tex.photo(2), 0.16, 0.12, 0.4, top, 0.5));
  // vase with dried stems at the far end of the shelf, clear of the TV (which spans z +-0.56 above the mantel)
  const VZ = 0.86;
  const vase = Prim.lathe([[0, 0], [0.035, 0], [0.045, 0.06], [0.03, 0.14], [0.02, 0.18], [0.024, 0.2], [0.0, 0.2]], mats.solid(0x6f8a7b, { roughness: 0.25, envMapIntensity: 0.9, physical: true, clearcoat: 0.6 }), { segments: 20 });
  vase.position.set(0.43, top, VZ);
  fp.add(vase);
  const stemMat = mats.solid(0x8a6f3c, { roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6, tilt = 0.12 + i * 0.05;
    const stem = Prim.cylinder(0.002, 0.003, 0.3, stemMat, { segments: 6 });
    stem.position.set(0.43 + Math.sin(a) * 0.03, top + 0.2 + 0.14, VZ + Math.cos(a) * 0.03);
    stem.rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt);
    fp.add(stem);
    const head = Prim.sphere(0.012, mats.solid(0xd8c39a, { roughness: 0.9 }), { segments: 8 });
    head.position.set(0.43 + Math.sin(a) * 0.045, top + 0.2 + 0.29, VZ + Math.cos(a) * 0.045);
    fp.add(head);
  }
  // two stacked books on the mantel
  const b1 = Prim.rbox(0.13, 0.03, 0.19, 0.004, mats.solid(0x4b3a6b, { roughness: 0.6 }));
  b1.position.set(0.425, top + 0.015, -0.3);
  fp.add(b1);
  const b2 = Prim.rbox(0.12, 0.028, 0.17, 0.004, mats.solid(0x9c4a3b, { roughness: 0.6 }));
  b2.position.set(0.428, top + 0.03 + 0.014, -0.29);
  b2.rotation.y = 0.12;
  fp.add(b2);
  // mantel clock plinth (the clock itself is a small wallClock, dynamic, added below)
  const plinth = Prim.rbox(0.08, 0.02, 0.16, 0.004, mats.walnut);
  plinth.position.set(0.42, top + 0.01, 0);
  fp.add(plinth);

  // fireplace tools stand (right of the hearth) and log basket (left)
  fp.add(buildToolStand(ctx, 0.5, 0, 1.22));
  fp.add(buildLogBasket(ctx, 0.42, 0, -1.28));

  addStatic(ctx, fp, [
    { size: [BD, ceilH, BW], center: [BD / 2, ceilH / 2, 0] },
    { size: [HD, HH, HW], center: [HD / 2, HH / 2, 0] },
    { size: [0.5, 0.06, 2.1], center: [0.25, MY + 0.03, 0] },
    { size: [0.22, 0.75, 0.22], center: [0.5, 0.375, 1.22] },
    { size: [0.5, 0.35, 0.5], center: [0.42, 0.175, -1.28] },
  ], { surface: 'stone' });

  // mantel clock (moving hands)
  wallClock(ctx, wallX + 0.42, y0 + top + 0.02 + 0.065, zc, Math.PI / 2, 0.065);

  // ---- grate, logs, coals (dynamic: it's the fire's interactable) + the fire itself
  const firePos = new THREE.Vector3(wallX + BD - OD / 2 + 0.01, y0 + HH + 0.02, zc);
  const grate = buildGrate(ctx);
  grate.position.copy(firePos);
  const coals = grate.getObjectByName('coals') as THREE.Mesh;
  const grateMerged = mergeByMaterial(grate);
  ctx.dynamic.add(grateMerged);
  // the merged group holds the coals as a separate mesh (keepSeparate) so its material can swap
  const coalsMesh = grateMerged.children.find((c) => c.name === 'coals') as THREE.Mesh;

  // flames sized to the firebox: 0.5 across the opening (z), 0.26 into it (x) so no sheet pokes out
  const fire = new Fire(ctx, new THREE.Vector3(firePos.x + 0.01, firePos.y + 0.2, firePos.z), { width: 0.5, depth: 0.26, height: 0.44 });
  const FIRE_I = 7;
  const fireLight = ctx.lights.point(wallX + BD - 0.1, y0 + 0.55, zc, {
    color: 0xff8c3a, intensity: FIRE_I, distance: 6, flicker: 0.5, shadow: true, on: false,
    emissives: coalsMesh ? [{ mesh: coalsMesh, on: mats.emissive(0xff4a08, 2.2, 0x2a1008), off: coals.material as THREE.Material }] : [],
  });
  const loopPos = new THREE.Vector3(firePos.x, y0 + 0.5, zc);
  const fireToggle = new Toggle(grateMerged, { on: 'Extinguish fireplace', off: 'Light fireplace' }, (on) => {
    fire.setOn(on);
    if (on) {
      ctx.lights.setOn(fireLight, true);
      ctx.audio.play('fireIgnite', loopPos);
      ctx.audio.startLoop('fire', 'fire', loopPos, 0.35);
    } else {
      ctx.audio.play('fireOut', loopPos);
      ctx.audio.stopLoop('fire');
    }
  }, new THREE.Vector3(wallX + BD + 0.15, y0 + 0.5, zc));
  fireToggle.radius = 2.6;
  ctx.interact.add(fireToggle);
  ctx.onUpdate((dt) => {
    fire.update(dt);
    fireLight.intensity = FIRE_I * fire.intensity;
    if (!fire.on && fire.intensity <= 0 && fireLight.on) ctx.lights.setOn(fireLight, false);
  });

  // ---- TV above the mantel
  const tv = new TvSet(ctx, new THREE.Vector3(wallX + BD + 0.03, y0 + 1.9, zc), new THREE.Vector3(wallX + BD + 0.6, y0 + 1.9, zc));
  ctx.interact.add(tv);
}

/** Small photo in a standing frame (faces +x), leaning back slightly. */
function standingFrame(ctx: Ctx, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const fh = h + 0.03, fw = w + 0.03;
  const frame = Prim.box(0.012, fh, fw, mats.solid(0x2a2018, { roughness: 0.5 }));
  frame.position.set(0, fh / 2, 0);
  g.add(frame);
  const pic = Prim.quad(w, h, mats.image(tex, { roughness: 0.8, envMapIntensity: 0.3 }), { keepUV: true, cast: false });
  pic.rotation.y = Math.PI / 2;
  pic.position.set(0.0065, fh / 2, 0);
  g.add(pic);
  const strut = Prim.box(0.06, 0.004, 0.02, mats.solid(0x2a2018, { roughness: 0.5 }));
  strut.position.set(-0.03, 0.003, 0);
  g.add(strut);
  g.position.set(x, y, z);
  g.rotation.z = 0.1;
  return g;
}

function buildGrate(ctx: Ctx) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const iron = mats.darkMetal;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = Prim.cylinder(0.008, 0.008, 0.1, iron, { segments: 8 });
    leg.position.set(sx * 0.09, 0.05, sz * 0.28);
    g.add(leg);
  }
  for (const sx of [-1, 1]) {
    const rail = Prim.box(0.016, 0.016, 0.6, iron);
    rail.position.set(sx * 0.09, 0.1, 0);
    g.add(rail);
  }
  for (let i = 0; i < 6; i++) {
    const bar = Prim.box(0.2, 0.012, 0.012, iron);
    bar.position.set(0, 0.1, -0.25 + i * 0.1);
    g.add(bar);
    const post = Prim.cylinder(0.005, 0.005, 0.1, iron, { segments: 6 });
    post.position.set(0.1, 0.15, -0.25 + i * 0.1);
    g.add(post);
  }
  const topRail = Prim.box(0.012, 0.012, 0.6, iron);
  topRail.position.set(0.1, 0.2, 0);
  g.add(topRail);
  const coals = Prim.rbox(0.2, 0.035, 0.5, 0.012, mats.solid(0x241a14, { roughness: 0.95 }), { cast: false });
  coals.position.set(0, 0.12, 0);
  coals.name = 'coals';
  coals.userData.keepSeparate = true;
  g.add(coals);
  // logs on the grate
  const l1 = buildLog(ctx, 0.05, 0.5); l1.position.set(-0.05, 0.16, 0); g.add(l1);
  const l2 = buildLog(ctx, 0.045, 0.46); l2.position.set(0.055, 0.155, 0.02); l2.rotation.y = 0.08; g.add(l2);
  const l3 = buildLog(ctx, 0.045, 0.44); l3.position.set(0.0, 0.245, -0.01); l3.rotation.y = -0.18; g.add(l3);
  return g;
}

/** A split log lying along local z: bark sides with pine end grain. */
function buildLog(ctx: Ctx, r: number, L: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.cylinder(r, r * 0.95, L, mats.bark, { segments: 12, open: true });
  body.rotation.x = Math.PI / 2;
  g.add(body);
  for (const s of [-1, 1]) {
    const cap = Prim.cylinder(r * 0.97, r * 0.97, 0.01, mats.pine, { segments: 12 });
    cap.rotation.x = Math.PI / 2;
    cap.position.z = s * (L / 2 - 0.004);
    g.add(cap);
  }
  return g;
}

function buildToolStand(ctx: Ctx, x: number, y: number, z: number) {
  const mats = ctx.mats;
  const iron = mats.darkMetal;
  const g = new THREE.Group();
  const base = Prim.cylinder(0.09, 0.1, 0.012, iron, { segments: 20 });
  base.position.y = 0.006;
  g.add(base);
  const post = Prim.cylinder(0.008, 0.008, 0.72, iron, { segments: 10 });
  post.position.y = 0.37;
  g.add(post);
  const knob = Prim.sphere(0.02, mats.brass, { segments: 12 });
  knob.position.y = 0.74;
  g.add(knob);
  const ring = Prim.torus(0.075, 0.005, iron);
  ring.position.y = 0.64;
  g.add(ring);
  const tools: ('poker' | 'brush' | 'shovel')[] = ['poker', 'brush', 'shovel'];
  tools.forEach((kind, i) => {
    const a = (i / 3) * Math.PI * 2 + 0.6;
    const tx = Math.cos(a) * 0.075, tz = Math.sin(a) * 0.075;
    const shaft = Prim.cylinder(0.0045, 0.0045, 0.6, iron, { segments: 8 });
    shaft.position.set(tx, 0.34, tz);
    g.add(shaft);
    const handle = Prim.cylinder(0.009, 0.009, 0.05, mats.brass, { segments: 10 });
    handle.position.set(tx, 0.665, tz);
    g.add(handle);
    if (kind === 'poker') {
      const tip = Prim.cone(0.006, 0.05, iron, { segments: 8 });
      tip.position.set(tx, 0.02, tz);
      tip.rotation.x = Math.PI;
      g.add(tip);
    } else if (kind === 'brush') {
      const bristles = Prim.box(0.035, 0.07, 0.035, mats.solid(0x3a2a1a, { roughness: 0.95 }));
      bristles.position.set(tx, 0.06, tz);
      g.add(bristles);
    } else {
      const blade = Prim.box(0.07, 0.09, 0.006, iron);
      blade.position.set(tx, 0.06, tz);
      blade.rotation.y = -a;
      g.add(blade);
    }
  });
  g.position.set(x, y, z);
  return g;
}

function buildLogBasket(ctx: Ctx, x: number, y: number, z: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const wicker = mats.solid(0xa88650, { roughness: 0.9, side: THREE.DoubleSide });
  const basket = Prim.lathe([[0.16, 0], [0.19, 0.01], [0.22, 0.2], [0.24, 0.32], [0.25, 0.34], [0.23, 0.34], [0.22, 0.32], [0.2, 0.2], [0.17, 0.03], [0, 0.03]], wicker, { segments: 24 });
  g.add(basket);
  // rope bands
  for (const h of [0.1, 0.22]) {
    const band = Prim.torus(0.2 + (h - 0.1) * 0.2, 0.008, mats.solid(0x7a5a33, { roughness: 0.9 }));
    band.position.y = h;
    g.add(band);
  }
  // arched rope handles standing up on the ±x sides (arch spans z, top at +y)
  const archBasis = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
  for (const s of [-1, 1]) {
    const handle = Prim.torus(0.06, 0.008, mats.solid(0x7a5a33, { roughness: 0.9 }), { arc: Math.PI });
    handle.quaternion.setFromRotationMatrix(archBasis);
    handle.position.set(s * 0.235, 0.31, 0);
    g.add(handle);
  }
  // logs standing in the basket, tilted
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const log = buildLog(ctx, 0.04 + (i % 2) * 0.008, 0.42);
    log.rotation.x = Math.PI / 2 + (i % 2 ? 0.1 : -0.1);
    log.rotation.z = Math.sin(a) * 0.25;
    log.rotation.y = a;
    log.position.set(Math.cos(a) * 0.09, 0.24, Math.sin(a) * 0.09);
    g.add(log);
  }
  g.position.set(x, y, z);
  return g;
}

/** Wall-mounted TV: black body on a bracket, screen swaps between off and the live channel. */
class TvSet implements Interactable {
  object: THREE.Group;
  on = false;
  radius = 3.4;
  proximity = false;
  focus: THREE.Vector3;
  private screen: THREE.Mesh;
  private body: THREE.Mesh;
  private channel: TvChannel;
  private onMat: THREE.Material;
  private light: VirtualLight;
  private pos: THREE.Vector3;

  constructor(private ctx: Ctx, backPos: THREE.Vector3, lightPos: THREE.Vector3) {
    const mats = ctx.mats;
    this.object = new THREE.Group();
    const bracket = Prim.box(0.03, 0.3, 0.4, mats.darkMetal);
    bracket.position.set(-0.015, 0, 0);
    const body = Prim.rbox(0.045, 0.66, 1.12, 0.006, mats.plasticBlack);
    body.position.set(0.0225, 0, 0);
    this.body = body;
    const chin = Prim.box(0.004, 0.012, 0.08, mats.chrome);
    chin.position.set(0.047, -0.318, 0);
    this.object.add(bracket, body, chin);
    this.screen = Prim.quad(1.08, 0.61, mats.screenOff, { keepUV: true, cast: false });
    this.screen.rotation.y = Math.PI / 2;
    this.screen.position.set(0.0465, 0, 0);
    this.object.add(this.screen);
    this.object.position.copy(backPos);
    ctx.dynamic.add(this.object);
    this.channel = new TvChannel();
    this.onMat = mats.image(this.channel.texture, { emissive: 0xffffff, emissiveIntensity: 1.0, color: 0x141414, roughness: 0.3, envMapIntensity: 0.4 });
    this.pos = backPos.clone();
    this.focus = new THREE.Vector3(backPos.x + 0.05, backPos.y, backPos.z);
    this.light = ctx.lights.point(lightPos.x, lightPos.y, lightPos.z, { color: 0xa9bfff, intensity: 2.5, distance: 4.5, flicker: 0.15, on: false });
  }

  getPrompt() { return this.on ? 'Turn off TV' : 'Turn on TV'; }

  interact() { this.set(!this.on); }

  set(on: boolean) {
    this.on = on;
    this.screen.material = on ? this.onMat : this.ctx.mats.screenOff;
    this.ctx.lights.setOn(this.light, on);
    this.ctx.audio.play(on ? 'tvOn' : 'tvOff', this.pos);
    if (on) this.ctx.audio.startLoop('tv', 'tv', this.pos, 0.12); else this.ctx.audio.stopLoop('tv');
  }

  onHover(h: boolean) {
    const m = this.body.material as THREE.MeshStandardMaterial;
    if (h) {
      this.body.userData.origMat = m;
      const c = m.clone();
      c.emissive = new THREE.Color(0xf0b35b);
      c.emissiveIntensity = 0.2;
      this.body.material = c;
    } else if (this.body.userData.origMat) {
      (this.body.material as THREE.Material).dispose();
      this.body.material = this.body.userData.origMat;
      delete this.body.userData.origMat;
    }
  }

  update(_dt: number, t: number) {
    if (this.on) this.channel.draw(t);
  }
}

// =====================================================================================
// Seating
// =====================================================================================

function pillow(ctx: Ctx, color: number, size = 0.42) {
  const p = Prim.rbox(size, size, 0.13, 0.06, ctx.mats.fabric(color), { segments: 4 });
  return p;
}

/** Three-seat sofa. Local: length along x, faces +z. `pillows` = colours for the three throw pillows. */
function buildSofa(ctx: Ctx, x: number, y: number, z: number, rotY: number, color: number, pillows: number[] = [0xc9a24a, 0x7a4b6b, 0xe0d5c1]) {
  const mats = ctx.mats;
  const fab = mats.fabric(color);
  const fabDark = mats.fabric(new THREE.Color(color).multiplyScalar(0.82).getHex());
  const g = new THREE.Group();
  const L = 2.1, D = 0.92;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = Prim.cylinder(0.022, 0.03, 0.1, mats.walnut, { segments: 12 });
    leg.position.set(sx * (L / 2 - 0.12), 0.05, sz * (D / 2 - 0.1));
    g.add(leg);
  }
  const base = Prim.rbox(L, 0.22, D - 0.02, 0.04, fabDark);
  base.position.set(0, 0.21, 0);
  g.add(base);
  const back = Prim.rbox(L - 0.4, 0.75, 0.2, 0.05, fabDark);
  back.position.set(0, 0.475, -D / 2 + 0.1);
  g.add(back);
  for (const s of [-1, 1]) {
    const arm = Prim.rbox(0.2, 0.55, D, 0.06, fabDark);
    arm.position.set(s * (L / 2 - 0.1), 0.375, 0);
    g.add(arm);
  }
  const inner = L - 0.4, cw = (inner - 0.04) / 3;
  for (let i = 0; i < 3; i++) {
    const cx = -inner / 2 + 0.02 + cw / 2 + i * (cw + 0.01);
    const seat = Prim.rbox(cw, 0.16, D - 0.24, 0.05, fab);
    seat.position.set(cx, 0.4, 0.12);
    g.add(seat);
    const bc = Prim.rbox(cw - 0.02, 0.44, 0.16, 0.06, fab);
    bc.position.set(cx, 0.69, -D / 2 + 0.27);
    bc.rotation.x = -0.1;
    g.add(bc);
  }
  // throw pillows at both ends
  const p1 = pillow(ctx, pillows[0]);
  p1.position.set(-inner / 2 + 0.25, 0.69, -0.1);
  p1.rotation.set(-0.25, 0.35, 0.05);
  g.add(p1);
  const p2 = pillow(ctx, pillows[1]);
  p2.position.set(inner / 2 - 0.24, 0.69, -0.09);
  p2.rotation.set(-0.22, -0.3, -0.04);
  g.add(p2);
  const p3 = pillow(ctx, pillows[2], 0.36);
  p3.position.set(-inner / 2 + 0.55, 0.66, -0.06);
  p3.rotation.set(-0.3, 0.15, 0.02);
  g.add(p3);
  // folded throw blanket over the +x arm, one flap hanging outside
  const knit = mats.quilt(0xe8d9bd); // cream knit so it reads against the grey-blue fabric
  const fold = Prim.rbox(0.26, 0.05, 0.46, 0.02, knit);
  fold.position.set(L / 2 - 0.1, 0.675, 0.05);
  g.add(fold);
  const fold2 = Prim.rbox(0.22, 0.035, 0.4, 0.015, knit);
  fold2.position.set(L / 2 - 0.1, 0.715, 0.04);
  fold2.rotation.y = 0.06;
  g.add(fold2);
  const flap = Prim.rbox(0.03, 0.36, 0.44, 0.012, knit);
  flap.position.set(L / 2 + 0.012, 0.5, 0.05);
  g.add(flap);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  addStatic(ctx, g, [{ size: [L, 0.85, D], center: [0, 0.425, 0] }], { surface: 'fabric' });
}

/** Leather armchair. Local: faces +z. */
function buildArmchair(ctx: Ctx, x: number, y: number, z: number, rotY: number, color: number, pillowColor: number) {
  const mats = ctx.mats;
  const lea = mats.leather(color);
  const g = new THREE.Group();
  const W = 0.86, D = 0.86;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = Prim.cylinder(0.02, 0.028, 0.1, mats.walnut, { segments: 12 });
    leg.position.set(sx * (W / 2 - 0.1), 0.05, sz * (D / 2 - 0.1));
    g.add(leg);
  }
  const base = Prim.rbox(W, 0.25, D - 0.04, 0.05, lea);
  base.position.set(0, 0.225, 0);
  g.add(base);
  const seat = Prim.rbox(W - 0.36, 0.14, D - 0.26, 0.05, lea);
  seat.position.set(0, 0.42, 0.1);
  g.add(seat);
  for (const s of [-1, 1]) {
    const arm = Prim.rbox(0.18, 0.5, D, 0.06, lea);
    arm.position.set(s * (W / 2 - 0.09), 0.35, 0);
    g.add(arm);
  }
  const back = Prim.rbox(W - 0.34, 0.7, 0.2, 0.06, lea);
  back.position.set(0, 0.6, -D / 2 + 0.1);
  back.rotation.x = -0.1;
  g.add(back);
  const cushion = Prim.rbox(W - 0.4, 0.42, 0.12, 0.05, lea);
  cushion.position.set(0, 0.7, -D / 2 + 0.27);
  cushion.rotation.x = -0.12;
  g.add(cushion);
  const p = pillow(ctx, pillowColor, 0.36);
  p.position.set(0.06, 0.66, -0.06);
  p.rotation.set(-0.28, 0.25, 0.03);
  g.add(p);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  addStatic(ctx, g, [{ size: [W, 0.95, D], center: [0, 0.475, 0] }], { surface: 'fabric' });
}

// =====================================================================================
// Tables
// =====================================================================================

/** Walnut coffee table (long along z) with pickups and a fruit bowl. */
function buildCoffeeTable(ctx: Ctx, x: number, y: number, z: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const L = 0.85, D = 0.55, H = 0.42;
  const top = Prim.rbox(D, 0.035, L, 0.008, mats.walnut);
  top.position.set(0, H + 0.0175, 0);
  g.add(top);
  const apron = Prim.box(D - 0.1, 0.06, L - 0.1, mats.walnut);
  apron.position.set(0, H - 0.03, 0);
  g.add(apron);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = Prim.cylinder(0.018, 0.028, H - 0.005, mats.walnut, { segments: 12 });
    leg.position.set(sx * (D / 2 - 0.07), (H - 0.005) / 2, sz * (L / 2 - 0.08));
    g.add(leg);
  }
  const shelf = Prim.box(D - 0.14, 0.014, L - 0.18, mats.walnut);
  shelf.position.set(0, 0.14, 0);
  g.add(shelf);
  // magazines on the lower shelf
  const magA = Prim.box(0.21, 0.006, 0.28, mats.image(ctx.tex.art(6, 0.75), { roughness: 0.6 }), { keepUV: true });
  magA.position.set(0.02, 0.15, 0.1);
  magA.rotation.y = 0.2;
  g.add(magA);
  const magB = Prim.box(0.21, 0.006, 0.28, mats.image(ctx.tex.art(1, 0.75), { roughness: 0.6 }), { keepUV: true });
  magB.position.set(-0.03, 0.157, 0.06);
  magB.rotation.y = -0.15;
  g.add(magB);
  // fruit bowl
  const bowlMat = mats.solid(0x3b4b5c, { roughness: 0.2, envMapIntensity: 1.0, physical: true, clearcoat: 0.8, side: THREE.DoubleSide });
  const bowl = Prim.lathe([[0.04, 0], [0.09, 0.005], [0.14, 0.05], [0.145, 0.06], [0.135, 0.06], [0.125, 0.045], [0.08, 0.012], [0, 0.012]], bowlMat, { segments: 24 });
  bowl.position.set(0, H + 0.035, 0.12);
  g.add(bowl);
  const fruit: [number, number, number, number][] = [[0xe08a2e, -0.045, 0.01, 0.036], [0x9ac04a, 0.04, 0.02, 0.034], [0xc0392b, 0.0, -0.045, 0.033], [0xe6b93c, 0.005, 0.085, 0.03]];
  for (const [c, fx, fz, r] of fruit) {
    const f = Prim.sphere(r, mats.solid(c, { roughness: 0.45 }), { segments: 12 });
    f.position.set(fx, H + 0.035 + 0.012 + r * 0.9, 0.12 + fz);
    g.add(f);
  }
  // coaster
  const coaster = Prim.cylinder(0.05, 0.05, 0.005, mats.solid(0x6b4a2f, { roughness: 0.8 }), { segments: 16 });
  coaster.position.set(0.14, H + 0.035 + 0.0025, -0.3);
  g.add(coaster);
  g.position.set(x, y, z);
  addStatic(ctx, g, [{ size: [D, H + 0.035, L], center: [0, (H + 0.035) / 2, 0] }]);

  // pickups on the table top
  const topY = y + H + 0.035;
  mug(ctx, x + 0.14, topY, z - 0.3, 0xd9534f, 'coffee mug');
  mug(ctx, x - 0.1, topY, z + 0.33, 0xf5f2e8, 'tea mug');
  looseBook(ctx, x - 0.07, topY, z - 0.29, 0.25, 0x2f5f8b, 'novel');
  looseBook(ctx, x - 0.06, topY + 0.036, z - 0.28, 0.05, 0x8b2f2f, 'travel guide');
  buildRemote(ctx, x + 0.15, topY, z + 0.28, 1.25);
}

function buildRemote(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.rbox(0.045, 0.018, 0.17, 0.005, mats.plasticBlack);
  body.position.y = 0.009;
  g.add(body);
  const btnMat = mats.solid(0x3a3a3e, { roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const b = Prim.rbox(0.01, 0.006, 0.01, 0.002, i === 0 ? mats.solid(0xc0392b, { roughness: 0.4 }) : btnMat);
    b.position.set(i % 2 === 0 ? -0.011 : 0.011, 0.02, -0.06 + Math.floor(i / 2) * 0.03);
    g.add(b);
  }
  const pad = Prim.cylinder(0.012, 0.012, 0.006, btnMat, { segments: 12 });
  pad.position.set(0, 0.02, 0.045);
  g.add(pad);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  const merged = mergeByMaterial(g);
  pickup(ctx, merged, { name: 'TV remote', mass: 0.15, shape: { type: 'box', size: new THREE.Vector3(0.045, 0.024, 0.17) }, offset: new THREE.Vector3(0, 0.012, 0) });
}

function buildSideTable(ctx: Ctx, x: number, y: number, z: number, accent: 'candle' | 'dish' = 'candle') {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const S = 0.45, H = 0.55;
  const top = Prim.rbox(S, 0.03, S, 0.005, mats.walnut);
  top.position.y = H - 0.015;
  g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = Prim.box(0.03, H - 0.03, 0.03, mats.walnut);
    leg.position.set(sx * (S / 2 - 0.03), (H - 0.03) / 2, sz * (S / 2 - 0.03));
    g.add(leg);
  }
  const shelf = Prim.box(S - 0.08, 0.02, S - 0.08, mats.walnut);
  shelf.position.y = 0.16;
  g.add(shelf);
  const stack = Prim.rbox(0.2, 0.05, 0.26, 0.004, mats.solid(0x556b7a, { roughness: 0.6 }));
  stack.position.set(0, 0.195, 0);
  stack.rotation.y = 0.2;
  g.add(stack);
  // small clutter in the front corner of the top (the lamp base takes the centre)
  if (accent === 'candle') {
    const jar = Prim.cylinder(0.03, 0.028, 0.06, mats.solid(0xd8b98a, { roughness: 0.2, envMapIntensity: 0.9, physical: true, clearcoat: 0.7, opacity: 0.85 }), { segments: 16 });
    jar.position.set(0.15, H + 0.03, 0.15);
    g.add(jar);
    const wick = Prim.cylinder(0.002, 0.002, 0.012, mats.black, { segments: 6 });
    wick.position.set(0.15, H + 0.066, 0.15);
    g.add(wick);
  } else {
    const dish = Prim.lathe([[0.02, 0], [0.055, 0.004], [0.065, 0.02], [0.06, 0.022], [0.05, 0.01], [0, 0.008]], mats.solid(0xf1ece2, { roughness: 0.3, envMapIntensity: 0.8, side: THREE.DoubleSide }), { segments: 18 });
    dish.position.set(0.15, H, 0.15);
    g.add(dish);
    const glasses = Prim.torus(0.02, 0.003, mats.darkMetal);
    glasses.position.set(0.135, H + 0.012, 0.15);
    g.add(glasses);
    const glasses2 = Prim.torus(0.02, 0.003, mats.darkMetal);
    glasses2.position.set(0.18, H + 0.012, 0.15);
    g.add(glasses2);
  }
  g.position.set(x, y, z);
  addStatic(ctx, g, [{ size: [S, H, S], center: [0, H / 2, 0] }]);
}

// =====================================================================================
// Bookshelf, console
// =====================================================================================

/** Tall bookshelf. Local: width along x, back at -z, faces +z. */
function buildBookshelf(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const wood = mats.espresso;
  const g = new THREE.Group();
  const W = 1.0, H = 2.05, D = 0.32;
  for (const s of [-1, 1]) {
    const side = Prim.box(0.025, H, D, wood);
    side.position.set(s * (W / 2 - 0.0125), H / 2, 0);
    g.add(side);
  }
  const top = Prim.box(W + 0.03, 0.03, D + 0.015, wood);
  top.position.set(0, H - 0.015, 0.0075);
  g.add(top);
  const kick = Prim.box(W, 0.08, D, wood);
  kick.position.set(0, 0.04, 0);
  g.add(kick);
  const backPanel = Prim.box(W, H, 0.012, mats.solid(0x2b1f16, { roughness: 0.8 }), { cast: false });
  backPanel.position.set(0, H / 2, -D / 2 + 0.006);
  g.add(backPanel);
  const shelfYs = [0.36, 0.76, 1.16, 1.56];
  for (const sy of shelfYs) {
    const shelf = Prim.box(W - 0.05, 0.025, D - 0.02, wood);
    shelf.position.set(0, sy, 0.0);
    g.add(shelf);
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.updateMatrixWorld(true);
  const toW = (lx: number, ly: number, lz: number) => g.localToWorld(new THREE.Vector3(lx, ly, lz));
  const bookZ = -D / 2 + 0.012 + 0.1;
  // rows of books per compartment (shelf top = sy + 0.0125; kick top = 0.08)
  const rows: [number, number, number, number, number][] = [
    // [compartment bottom y, centre x, width, height, seed]
    [0.08, -0.06, 0.8, 0.25, 11],
    [0.3725, -0.2, 0.52, 0.27, 12],
    [0.7725, -0.14, 0.60, 0.26, 13],
    [1.1725, 0.18, 0.56, 0.25, 14],
    [1.5725, -0.15, 0.62, 0.24, 15],
  ];
  for (const [by, cx, w, h, seed] of rows) {
    const p = toW(cx, by, bookZ);
    bookRow(ctx, p.x, p.y, p.z, w, rotY, h, seed);
  }
  // objects between the books
  const vase = Prim.lathe([[0, 0], [0.04, 0], [0.05, 0.08], [0.035, 0.16], [0.03, 0.2], [0, 0.2]], mats.solid(0xc8b69a, { roughness: 0.35, envMapIntensity: 0.8 }), { segments: 18 });
  vase.position.set(0.26, 0.3725, -0.02);
  g.add(vase);
  const box = Prim.rbox(0.2, 0.1, 0.16, 0.008, mats.solid(0x7a4a3a, { roughness: 0.7 }));
  box.position.set(-0.35, 1.1725 + 0.05, -0.02);
  g.add(box);
  const candle = Prim.cylinder(0.03, 0.03, 0.09, mats.solid(0xf1e8d2, { roughness: 0.7 }), { segments: 14 });
  candle.position.set(-0.36, 1.1725 + 0.1 + 0.045, -0.02);
  g.add(candle);
  const globeBase = Prim.cylinder(0.05, 0.06, 0.02, mats.brass, { segments: 16 });
  globeBase.position.set(0.32, 1.5725 + 0.01, -0.02);
  g.add(globeBase);
  const globe = Prim.sphere(0.07, mats.solid(0x4a7aa8, { roughness: 0.4 }), { segments: 16 });
  globe.position.set(0.32, 1.5725 + 0.1, -0.02);
  g.add(globe);
  g.add(standingFrame(ctx, ctx.tex.photo(0), 0.14, 0.105, 0.1, 0.7725, 0.0));
  const frame = g.children[g.children.length - 1];
  frame.rotation.y = -Math.PI / 2; // faces +z (local)
  frame.rotation.z = 0;
  frame.rotation.x = -0.1;
  frame.position.set(0.34, 0.7725, 0.02);
  addStatic(ctx, g, [{ size: [W, H, D], center: [0, H / 2, 0] }]);
}

/** Narrow console table against the back wall, with a photo, bowl and a tray. */
function buildConsole(ctx: Ctx, x: number, y: number, z: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const W = 1.0, D = 0.36, H = 0.8;
  const top = Prim.rbox(W, 0.03, D, 0.006, mats.walnut);
  top.position.y = H - 0.015;
  g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = Prim.cylinder(0.016, 0.026, H - 0.03, mats.walnut, { segments: 12 });
    leg.position.set(sx * (W / 2 - 0.05), (H - 0.03) / 2, sz * (D / 2 - 0.05));
    g.add(leg);
  }
  const apron = Prim.box(W - 0.08, 0.1, D - 0.06, mats.walnut);
  apron.position.set(0, H - 0.08, 0);
  g.add(apron);
  for (const s of [-1, 1]) {
    const drawer = Prim.rbox(0.42, 0.08, 0.014, 0.004, mats.walnut);
    drawer.position.set(s * 0.225, H - 0.08, D / 2 - 0.03 + 0.007);
    g.add(drawer);
    const knob = Prim.sphere(0.011, mats.brass, { segments: 10 });
    knob.position.set(s * 0.225, H - 0.08, D / 2 - 0.03 + 0.02);
    g.add(knob);
  }
  const stretcher = Prim.box(W - 0.14, 0.025, 0.04, mats.walnut);
  stretcher.position.set(0, 0.18, 0);
  g.add(stretcher);
  // decor on top
  g.add(standingFrame(ctx, ctx.tex.photo(1), 0.17, 0.125, 0, H, 0));
  const pf = g.children[g.children.length - 1];
  pf.rotation.set(-0.1, -Math.PI / 2, 0);
  pf.position.set(0.05, H, -0.06);
  const tray = Prim.rbox(0.26, 0.015, 0.16, 0.004, mats.solid(0x2a2c30, { roughness: 0.4, metalness: 0.6 }));
  tray.position.set(0.3, H + 0.0075, 0.03);
  g.add(tray);
  const keys = Prim.torus(0.014, 0.003, mats.chrome);
  keys.position.set(0.28, H + 0.018, 0.04);
  g.add(keys);
  const key = Prim.box(0.008, 0.002, 0.04, mats.chrome);
  key.position.set(0.3, H + 0.017, 0.03);
  key.rotation.y = 0.5;
  g.add(key);
  // (the small potted plant placed by the caller sits on the -x end of the top)
  g.position.set(x, y, z);
  addStatic(ctx, g, [{ size: [W, H, D], center: [0, H / 2, 0] }]);
}
