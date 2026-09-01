/**
 * Small closet (closet2) off the office: wire shelving with labelled bins, hanging rod with garments,
 * vacuum cleaner, folded ironing board, step stool, ceiling dome + switch.
 */
import * as THREE from 'three';
import { Prim, place } from '../Builder';
import type { Ctx } from '../Context';
import { addStatic, ceilingDome, lightSwitch } from '../Props';
import { FLOOR, CEIL, FACE, hangingGarment, labelQuad } from './Bedrooms.shared';

/** Chrome wire shelving unit (front +z). */
function wireShelving(ctx: Ctx, x: number, z: number, rotY: number, W: number, D: number, levels: number[]) {
  const mats = ctx.mats;
  const chrome = mats.chrome;
  const g = new THREE.Group();
  const H = levels[levels.length - 1] + 0.1;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const post = Prim.cylinder(0.012, 0.012, H, chrome, { segments: 8 }); post.position.set(sx * (W / 2 - 0.012), H / 2, sz * (D / 2 - 0.012)); g.add(post);
    const foot = Prim.cylinder(0.02, 0.025, 0.02, mats.plasticBlack, { segments: 8 }); foot.position.set(sx * (W / 2 - 0.012), 0.01, sz * (D / 2 - 0.012)); g.add(foot);
  }
  for (const ly of levels) {
    for (const sz of [-1, 1]) { const rail = Prim.box(W - 0.02, 0.02, 0.012, chrome); rail.position.set(0, ly - 0.01, sz * (D / 2 - 0.006)); g.add(rail); }
    for (const sx of [-1, 1]) { const rail = Prim.box(0.012, 0.02, D - 0.02, chrome); rail.position.set(sx * (W / 2 - 0.006), ly - 0.01, 0); g.add(rail); }
    const nRods = Math.round(D / 0.05);
    for (let i = 0; i <= nRods; i++) { const rod = Prim.box(W - 0.03, 0.005, 0.005, chrome); rod.position.set(0, ly - 0.004, -D / 2 + 0.02 + (i / nRods) * (D - 0.04)); g.add(rod); }
    const deck = Prim.box(W - 0.03, 0.003, D - 0.03, mats.solid(0xcfd3d6, { roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0.35 }), { cast: false }); deck.position.set(0, ly - 0.0055, 0); deck.userData.keepSeparate = true; g.add(deck);
  }
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [W, H, D], center: [0, H / 2, 0] }], { surface: 'metal' });
  return { g, H };
}

/** Storage bin with a label (front +z). */
function bin(ctx: Ctx, w: number, h: number, d: number, color: number, label: string): THREE.Group {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.rbox(w, h - 0.03, d, 0.015, mats.solid(color, { roughness: 0.45 })); body.position.y = (h - 0.03) / 2; g.add(body);
  const lid = Prim.rbox(w + 0.02, 0.03, d + 0.02, 0.008, mats.solid(0x30343a, { roughness: 0.5 })); lid.position.y = h - 0.015; g.add(lid);
  for (const s of [-1, 1]) { const handle = Prim.rbox(0.03, 0.02, 0.1, 0.006, mats.solid(0x30343a, { roughness: 0.5 })); handle.position.set(s * (w / 2 + 0.005), h - 0.06, 0); g.add(handle); }
  const tex = ctx.tex.label(label, { bg: '#f6f3ea', fg: '#222', w: 256, h: 96, font: 'bold 54px sans-serif' });
  const lq = labelQuad(ctx, tex, Math.min(0.2, w * 0.6), Math.min(0.075, h * 0.3)); lq.position.set(0, h * 0.55, d / 2 + 0.002); g.add(lq);
  return g;
}

function vacuumCleaner(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const purple = mats.solid(0x5a2d82, { roughness: 0.35, physical: true, clearcoat: 0.5 });
  const g = new THREE.Group();
  const head = Prim.rbox(0.32, 0.09, 0.22, 0.03, purple); head.position.set(0, 0.045, 0.06); g.add(head);
  const bumper = Prim.rbox(0.33, 0.03, 0.23, 0.01, mats.plasticBlack); bumper.position.set(0, 0.02, 0.06); g.add(bumper);
  const body = Prim.cylinder(0.075, 0.09, 0.5, purple, { segments: 16 }); body.position.set(0, 0.34, -0.03); g.add(body);
  const canister = Prim.cylinder(0.06, 0.06, 0.26, mats.solid(0xd8d8e0, { roughness: 0.2, transparent: true, opacity: 0.6 }), { segments: 14 }); canister.position.set(0, 0.32, 0.075); canister.userData.keepSeparate = true; g.add(canister);
  const dust = Prim.cylinder(0.05, 0.05, 0.07, mats.solid(0x6b6b66, { roughness: 1 }), { segments: 12 }); dust.position.set(0, 0.225, 0.075); g.add(dust);
  const pole = Prim.cylinder(0.014, 0.014, 0.62, mats.chrome, { segments: 8 }); pole.position.set(0, 0.9, -0.05); g.add(pole);
  const grip = Prim.rbox(0.05, 0.16, 0.06, 0.02, mats.plasticBlack); grip.position.set(0, 1.25, -0.05); g.add(grip);
  const hose = Prim.torus(0.11, 0.014, mats.solid(0x2a2a2e, { roughness: 0.7 }), { arc: Math.PI }); hose.rotation.set(Math.PI / 2, 0, Math.PI / 2); hose.position.set(0.0, 0.62, 0.04); g.add(hose);
  const cord = Prim.torus(0.05, 0.006, mats.black); cord.position.set(0.0, 0.75, -0.05); cord.rotation.x = Math.PI / 2; g.add(cord);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [0.34, 1.35, 0.3], center: [0, 0.675, 0.02] }], { surface: 'metal' });
}

function ironingBoard(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const inner = new THREE.Group();
  const board = Prim.rbox(0.36, 1.3, 0.035, 0.015, mats.fabric(0x9fb7c9)); board.position.y = 0.65; inner.add(board);
  const nose = Prim.cylinder(0.17, 0.17, 0.035, mats.fabric(0x9fb7c9), { segments: 16 }); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.3, 0); inner.add(nose);
  for (const s of [-1, 1]) { const leg = Prim.cylinder(0.01, 0.01, 1.1, mats.paintedMetal(0xcfcfcf), { segments: 6 }); leg.position.set(s * 0.1, 0.62, 0.03); leg.rotation.z = s * 0.06; inner.add(leg); }
  inner.rotation.x = -0.1; // top leans toward local -z (= the wall behind it, see FACE)
  g.add(inner);
  place(g, x, FLOOR + 0.02, z, rotY);
  addStatic(ctx, g, [{ size: [0.4, 1.45, 0.16], center: [0, 0.72, -0.05] }]);
}

function stepStool(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const wood = mats.pine;
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const side = new THREE.Shape();
    side.moveTo(-0.22, 0); side.lineTo(0.22, 0); side.lineTo(0.22, 0.22); side.lineTo(0.0, 0.22); side.lineTo(0.0, 0.44); side.lineTo(-0.22, 0.44); side.closePath();
    const m = Prim.extrude(side, 0.025, wood);
    m.rotation.y = -Math.PI / 2; m.position.set(s * 0.18, 0, 0); g.add(m);
  }
  const low = Prim.rbox(0.36, 0.03, 0.2, 0.006, wood); low.position.set(0, 0.215, 0.12); g.add(low);
  const high = Prim.rbox(0.36, 0.03, 0.2, 0.006, wood); high.position.set(0, 0.435, -0.11); g.add(high);
  const brace = Prim.box(0.33, 0.06, 0.02, wood); brace.position.set(0, 0.38, -0.2); g.add(brace);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [0.4, 0.45, 0.45], center: [0, 0.225, 0] }]);
}

export function buildCloset2(ctx: Ctx) {
  const mats = ctx.mats;
  const y = FLOOR;
  const W = 5.06, E = 7.85, S = -1.44, N = 1.44; // wall faces (S = office wall, N = guest room wall)

  ceilingDome(ctx, 6.5, CEIL, 0.05, 'closet2');
  lightSwitch(ctx, 7.08, y + 1.2, S, FACE.posZ, 'closet2', 'closet light');

  // ---- shelving along the west wall, bins on it ----------------------------------------------------
  const levels = [0.12, 0.6, 1.1, 1.6, 2.05];
  wireShelving(ctx, W + 0.02 + 0.2, 0.0, FACE.posX, 2.7, 0.4, levels);
  const bins: [number, number, number, string, number][] = [
    // [z, level index, width, label, colour]
    [-1.0, 1, 0.38, 'WINTER', 0x5b6f8a], [-0.55, 1, 0.38, 'PHOTOS', 0x8a5b5b], [0.05, 1, 0.5, 'CABLES', 0x6b8a5b],
    [0.7, 1, 0.38, 'XMAS', 0xb04a4a], [1.05, 1, 0.24, 'MISC', 0x8a7a5b],
    [-0.9, 2, 0.5, 'CAMPING', 0x4d7d6b], [-0.3, 2, 0.38, 'BOOKS', 0x6a5b8a], [0.4, 2, 0.5, 'TOOLS', 0x8a6b3b],
    [-0.8, 3, 0.4, 'SHOES', 0x7a7a7a], [0.2, 3, 0.4, 'LINEN', 0x9aa0b0], [0.9, 3, 0.4, 'SUMMER', 0xd2a34a],
    [-0.6, 4, 0.5, 'LUGGAGE', 0x4a4e57], [0.5, 4, 0.5, 'ARCHIVE', 0x7a6d5c],
  ];
  for (const [bz, li, bw, label, col] of bins) {
    const bh = li === 4 ? 0.36 : Math.min(0.4, (levels[li + 1] ?? 2.5) - levels[li] - 0.06);
    const b = bin(ctx, bw, bh, 0.34, col, label);
    place(b, W + 0.02 + 0.2, y + levels[li], bz, FACE.posX);
    addStatic(ctx, b);
  }
  // loose things on the bottom level: a basketball, a toolbox
  {
    const g = new THREE.Group();
    // (group is unrotated: local z runs along the shelf, local x across its depth)
    const bb = Prim.sphere(0.12, mats.solid(0xd2691e, { roughness: 0.7 }), { segments: 14 }); bb.position.set(0, 0.12, 0.9); g.add(bb);
    const tb = Prim.rbox(0.2, 0.18, 0.4, 0.01, mats.paintedMetal(0xc0392b)); tb.position.set(0, 0.09, -0.6); g.add(tb);
    const tbh = Prim.rbox(0.02, 0.02, 0.16, 0.008, mats.plasticBlack); tbh.position.set(0, 0.19, -0.6); g.add(tbh);
    const box = Prim.rbox(0.3, 0.3, 0.36, 0.006, mats.solid(0xc9a97c, { roughness: 0.85 })); box.position.set(0, 0.15, 0.15); g.add(box);
    place(g, W + 0.02 + 0.2, y + levels[0], 0, 0);
    addStatic(ctx, g);
  }

  // ---- hanging rod along the north wall with garments ----------------------------------------------
  {
    const g = new THREE.Group();
    const rodY = 1.85;
    const rod = Prim.cylinder(0.012, 0.012, 2.1, mats.chrome, { segments: 10 }); rod.rotation.z = Math.PI / 2; rod.position.set(6.65, rodY, N - 0.3); g.add(rod);
    for (const rx of [5.65, 7.65]) {
      const bracket = Prim.box(0.03, 0.03, 0.3, mats.chrome); bracket.position.set(rx, rodY + 0.02, N - 0.15); g.add(bracket);
      const plate = Prim.box(0.06, 0.08, 0.01, mats.chrome); plate.position.set(rx, rodY + 0.02, N - 0.005); g.add(plate);
    }
    const shelf = Prim.box(2.1, 0.02, 0.3, mats.trim); shelf.position.set(6.65, rodY + 0.16, N - 0.15); g.add(shelf);
    const cols = [0x3b4a5c, 0xa63a3a, 0xe8e2d0, 0x2f5d3a, 0x8a6a4a, 0x5a7ea6, 0xd0b080, 0x333333, 0x7a3a6a, 0xf0e0c0];
    cols.forEach((c, i) => {
      const kind = i % 4 === 1 ? 'coat' : i % 5 === 3 ? 'dress' : 'shirt';
      const gm = hangingGarment(ctx, c, kind);
      gm.position.set(5.75 + i * 0.2, rodY + 0.012, N - 0.3);
      gm.rotation.y = Math.PI / 2 + (ctx.rng() - 0.5) * 0.2;
      g.add(gm);
    });
    // boxes on the top shelf
    const hat = Prim.cylinder(0.13, 0.13, 0.12, mats.solid(0xb9a58a, { roughness: 0.85 }), { segments: 16 }); hat.position.set(5.85, rodY + 0.23, N - 0.15); g.add(hat);
    const blanket = Prim.rbox(0.5, 0.14, 0.26, 0.03, mats.fabric(0x9aa5b8)); blanket.position.set(6.6, rodY + 0.24, N - 0.15); g.add(blanket);
    const shoebox = Prim.rbox(0.34, 0.12, 0.22, 0.006, mats.solid(0xf1efe8, { roughness: 0.85 })); shoebox.position.set(7.3, rodY + 0.23, N - 0.15); g.add(shoebox);
    place(g, 0, y, 0, 0);
    addStatic(ctx, g, [{ size: [2.1, 1.2, 0.34], center: [6.65, 1.2, N - 0.25] }], { surface: 'fabric' });
  }

  // ---- floor items -----------------------------------------------------------------------------------
  vacuumCleaner(ctx, 7.45, -1.05, FACE.negX + 0.4);
  ironingBoard(ctx, E - 0.1, 0.85, FACE.negX);
  stepStool(ctx, 5.75, -1.05, FACE.posZ + 0.3);
  // laundry basket with towels under the frosted window
  {
    const g = new THREE.Group();
    const basket = Prim.rbox(0.42, 0.28, 0.32, 0.03, mats.solid(0xe9e6df, { roughness: 0.6 })); basket.position.y = 0.14; g.add(basket);
    const towel1 = Prim.rbox(0.36, 0.08, 0.26, 0.03, mats.fabric(0x8fb3c9)); towel1.position.y = 0.3; g.add(towel1);
    const towel2 = Prim.rbox(0.3, 0.07, 0.22, 0.03, mats.fabric(0xf2f2ec)); towel2.position.set(0.02, 0.37, 0.01); towel2.rotation.y = 0.2; g.add(towel2);
    place(g, E - 0.02 - 0.2, y, -0.05, FACE.negX);
    addStatic(ctx, g, [{ size: [0.42, 0.42, 0.32], center: [0, 0.21, 0] }], { surface: 'fabric' });
  }
}
