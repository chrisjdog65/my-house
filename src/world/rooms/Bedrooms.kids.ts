/**
 * Kids bedroom (bedroom2): bunk bed, toy chest with a hinged lid and toys spilling out, desk with
 * lamp & crayons, picture-book shelf, wardrobe, posters, fairy lights, glow stars, nightlight,
 * height chart, hamper, clock.
 */
import * as THREE from 'three';
import { Prim, place, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import { addStatic, ball, bookRow, ceilingDome, curtains, hinged, Lamp, lightSwitch, pickup, rug, tableLamp, wallClock } from '../Props';
import { FLOOR, CEIL, FACE, canvasTex, cushion, placeStatic, rng32, poster, shelfUnit, simpleChair, teddy, toyCar } from './Bedrooms.shared';

// -------------------------------------------------------------------------------------------
// Canvas art
// -------------------------------------------------------------------------------------------

function dinoPoster(): THREE.Texture {
  return canvasTex('kids-dino', 512, 704, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffd166'); g.addColorStop(1, '#f4a261');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // ground
    c.fillStyle = '#7bb661'; c.beginPath(); c.moveTo(0, h * 0.78); c.quadraticCurveTo(w * 0.5, h * 0.7, w, h * 0.8); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    // volcano
    c.fillStyle = '#8d5b3f'; c.beginPath(); c.moveTo(w * 0.62, h * 0.76); c.lineTo(w * 0.8, h * 0.42); c.lineTo(w * 0.98, h * 0.76); c.fill();
    c.fillStyle = '#e63946'; c.beginPath(); c.arc(w * 0.8, h * 0.42, 22, 0, Math.PI * 2); c.fill();
    // dino body (green blobs)
    c.fillStyle = '#2a9d8f';
    c.beginPath(); c.ellipse(w * 0.4, h * 0.6, 120, 78, -0.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(w * 0.6, h * 0.45, 46, 40, 0, 0, Math.PI * 2); c.fill(); // head
    c.beginPath(); c.moveTo(w * 0.5, h * 0.5); c.quadraticCurveTo(w * 0.56, h * 0.42, w * 0.6, h * 0.47); c.lineTo(w * 0.52, h * 0.6); c.fill(); // neck
    c.beginPath(); c.moveTo(w * 0.28, h * 0.62); c.quadraticCurveTo(w * 0.08, h * 0.6, w * 0.06, h * 0.75); c.lineTo(w * 0.3, h * 0.7); c.fill(); // tail
    for (const lx of [0.33, 0.47]) { c.fillRect(w * lx, h * 0.66, 34, 80); } // legs
    // spikes
    c.fillStyle = '#e9c46a';
    for (let i = 0; i < 6; i++) { const x = w * 0.28 + i * 34; c.beginPath(); c.moveTo(x, h * 0.53); c.lineTo(x + 16, h * 0.47); c.lineTo(x + 32, h * 0.53); c.fill(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(w * 0.62, h * 0.43, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#222'; c.beginPath(); c.arc(w * 0.635, h * 0.43, 4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#222'; c.lineWidth = 3; c.beginPath(); c.arc(w * 0.64, h * 0.49, 12, 0.2, Math.PI - 0.2); c.stroke();
    // title
    c.fillStyle = '#1d3557'; c.font = 'bold 74px Impact, "Arial Black", sans-serif'; c.textAlign = 'center';
    c.fillText('DINOSAURS!', w / 2, 100);
    c.fillStyle = '#457b9d'; c.font = 'bold 30px sans-serif'; c.fillText('RAWR means I love you', w / 2, h * 0.93);
  });
}

function spacePoster(): THREE.Texture {
  return canvasTex('kids-space', 512, 704, (c, w, h) => {
    const rnd = rng32(77);
    c.fillStyle = '#0b1a3a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    for (let i = 0; i < 160; i++) { const r = rnd() * 2 + 0.5; c.globalAlpha = 0.4 + rnd() * 0.6; c.beginPath(); c.arc(rnd() * w, rnd() * h, r, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1;
    // planet with ring
    c.fillStyle = '#f4a261'; c.beginPath(); c.arc(w * 0.68, h * 0.35, 70, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e76f51'; c.beginPath(); c.arc(w * 0.68, h * 0.35, 70, 0.3, 1.4); c.lineTo(w * 0.68, h * 0.35); c.fill();
    c.strokeStyle = '#e9c46a'; c.lineWidth = 12; c.beginPath(); c.ellipse(w * 0.68, h * 0.35, 120, 28, -0.35, 0, Math.PI * 2); c.stroke();
    // moon
    c.fillStyle = '#d9d9d9'; c.beginPath(); c.arc(w * 0.22, h * 0.22, 40, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#b9b9b9'; for (const [mx, my, mr] of [[0.2, 0.2, 9], [0.26, 0.26, 6], [0.17, 0.27, 5]]) { c.beginPath(); c.arc(w * mx, h * my, mr, 0, Math.PI * 2); c.fill(); }
    // rocket
    c.save(); c.translate(w * 0.32, h * 0.66); c.rotate(-0.5);
    c.fillStyle = '#e63946'; c.beginPath(); c.moveTo(0, -110); c.lineTo(36, -50); c.lineTo(36, 60); c.lineTo(-36, 60); c.lineTo(-36, -50); c.closePath(); c.fill();
    c.fillStyle = '#f1faee'; c.fillRect(-36, -20, 72, 60);
    c.fillStyle = '#a8dadc'; c.beginPath(); c.arc(0, -30, 16, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#457b9d'; c.beginPath(); c.moveTo(-36, 20); c.lineTo(-62, 80); c.lineTo(-36, 60); c.fill(); c.beginPath(); c.moveTo(36, 20); c.lineTo(62, 80); c.lineTo(36, 60); c.fill();
    c.fillStyle = '#ffb703'; c.beginPath(); c.moveTo(-22, 62); c.lineTo(0, 130); c.lineTo(22, 62); c.fill();
    c.fillStyle = '#fb8500'; c.beginPath(); c.moveTo(-12, 62); c.lineTo(0, 100); c.lineTo(12, 62); c.fill();
    c.restore();
    c.fillStyle = '#ffffff'; c.font = 'bold 60px Impact, "Arial Black", sans-serif'; c.textAlign = 'center';
    c.fillText('TO THE MOON', w / 2, h * 0.92);
  });
}

function heightChart(): THREE.Texture {
  return canvasTex('kids-height', 160, 960, (c, w, h) => {
    // chart covers 40 cm (bottom) .. 160 cm (top)
    c.fillStyle = '#fff7d6'; c.fillRect(0, 0, w, h);
    // giraffe body
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f6b93b'); g.addColorStop(1, '#e58e26');
    c.fillStyle = g; c.fillRect(20, 60, 60, h - 60);
    c.fillStyle = '#a0522d';
    const rnd = rng32(9);
    for (let i = 0; i < 26; i++) { c.beginPath(); c.ellipse(28 + rnd() * 44, 90 + rnd() * (h - 120), 8 + rnd() * 6, 6 + rnd() * 6, rnd(), 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#f6b93b'; c.beginPath(); c.ellipse(50, 48, 30, 26, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#222'; c.beginPath(); c.arc(40, 44, 3.5, 0, Math.PI * 2); c.arc(60, 44, 3.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#a0522d'; c.fillRect(38, 14, 6, 14); c.fillRect(56, 14, 6, 14);
    // ticks (every 10 cm), labels every 20
    c.strokeStyle = '#333'; c.fillStyle = '#333'; c.font = 'bold 20px sans-serif'; c.textAlign = 'right'; c.textBaseline = 'middle';
    for (let cm = 40; cm <= 160; cm += 10) {
      const yy = h - ((cm - 40) / 120) * h;
      c.lineWidth = cm % 20 === 0 ? 3 : 1.5;
      c.beginPath(); c.moveTo(w - 4, yy); c.lineTo(w - (cm % 20 === 0 ? 40 : 22), yy); c.stroke();
      if (cm % 20 === 0) c.fillText(String(cm), w - 44, Math.min(h - 12, Math.max(12, yy)));
    }
    // marks
    c.strokeStyle = '#d62828'; c.lineWidth = 3; c.font = '18px "Comic Sans MS", cursive, sans-serif'; c.textAlign = 'left';
    for (const [cm, label] of [[104, 'Sam 4'], [117, 'Sam 6'], [123, 'Mia 7']] as [number, string][]) {
      const yy = h - ((cm - 40) / 120) * h;
      c.beginPath(); c.moveTo(w - 70, yy); c.lineTo(w - 4, yy); c.stroke();
      c.fillStyle = '#d62828'; c.fillText(label, 88, yy - 12);
    }
  });
}

function crayonDrawing(): THREE.Texture {
  return canvasTex('kids-drawing', 256, 362, (c, w, h) => {
    c.fillStyle = '#fbfbf7'; c.fillRect(0, 0, w, h);
    c.lineCap = 'round'; c.lineWidth = 6;
    // sun
    c.strokeStyle = '#f9c74f'; c.beginPath(); c.arc(50, 50, 22, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.beginPath(); c.moveTo(50 + Math.cos(a) * 28, 50 + Math.sin(a) * 28); c.lineTo(50 + Math.cos(a) * 42, 50 + Math.sin(a) * 42); c.stroke(); }
    // house
    c.strokeStyle = '#e76f51'; c.strokeRect(70, 150, 120, 100);
    c.beginPath(); c.moveTo(60, 150); c.lineTo(130, 90); c.lineTo(200, 150); c.stroke();
    c.strokeStyle = '#457b9d'; c.strokeRect(115, 200, 30, 50); c.strokeRect(85, 165, 22, 22); c.strokeRect(155, 165, 22, 22);
    // people
    c.strokeStyle = '#2a9d8f';
    for (const x of [40, 220]) { c.beginPath(); c.arc(x, 270, 12, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(x, 282); c.lineTo(x, 320); c.moveTo(x - 16, 300); c.lineTo(x + 16, 300); c.moveTo(x, 320); c.lineTo(x - 12, 345); c.moveTo(x, 320); c.lineTo(x + 12, 345); c.stroke(); }
    c.strokeStyle = '#90be6d'; c.beginPath(); c.moveTo(0, 350); c.lineTo(w, 350); c.stroke();
  });
}

// -------------------------------------------------------------------------------------------
// Furniture
// -------------------------------------------------------------------------------------------

/** Bunk bed: length along local x (head at -x), open front at -z (wall on +z). */
function bunkBed(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const wood = mats.maple;
  const L = 1.95, Wd = 1.0;
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = Prim.rbox(0.07, 1.78, 0.07, 0.01, wood); p.position.set(sx * (L / 2 - 0.035), 0.89, sz * (Wd / 2 - 0.035)); g.add(p);
    const cap = Prim.sphere(0.045, wood, { segments: 12 }); cap.position.set(sx * (L / 2 - 0.035), 1.8, sz * (Wd / 2 - 0.035)); g.add(cap);
  }
  const tier = (base: number, quiltColor: number, pillowColor: number) => {
    for (const sz of [-1, 1]) { const rail = Prim.box(L - 0.07, 0.14, 0.035, wood); rail.position.set(0, base + 0.07, sz * (Wd / 2 - 0.0175)); g.add(rail); }
    for (const sx of [-1, 1]) { const rail = Prim.box(0.035, 0.14, Wd - 0.07, wood); rail.position.set(sx * (L / 2 - 0.0175), base + 0.07, 0); g.add(rail); }
    const slab = Prim.box(L - 0.1, 0.03, Wd - 0.1, mats.pine); slab.position.set(0, base + 0.09, 0); g.add(slab);
    const matt = Prim.rbox(L - 0.12, 0.17, Wd - 0.12, 0.04, mats.fabric(0xf2efe6)); matt.position.set(0, base + 0.19, 0); g.add(matt);
    const top = base + 0.275;
    const q = Prim.rbox(L - 0.62, 0.07, Wd + 0.02, 0.03, mats.quilt(quiltColor)); q.position.set(0.24, top + 0.03, 0); g.add(q);
    const fold = Prim.rbox(Wd - 0.02, 0.04, 0.14, 0.015, mats.fabric(0xfaf7ef)); fold.rotation.y = Math.PI / 2; fold.position.set(-0.36, top + 0.045, 0); g.add(fold);
    const pillow = cushion(0.42, 0.11, 0.36, mats.fabric(pillowColor)); pillow.position.set(-L / 2 + 0.3, top + 0.05, 0); g.add(pillow);
    return top;
  };
  const lowTop = tier(0.3, 0x3f7fc8, 0xf4d35e);
  const upTop = tier(1.3, 0xe86c3a, 0x8ecae6);
  // guard rails on the upper bunk (front & wall side, both ends)
  const guard = (cx: number, cz: number, len: number, alongX: boolean, spindles: number) => {
    const rail = Prim.box(alongX ? len : 0.035, 0.04, alongX ? 0.035 : len, wood); rail.position.set(cx, 1.95, cz); g.add(rail);
    for (let i = 0; i < spindles; i++) {
      const f = (i + 0.5) / spindles - 0.5;
      const s = Prim.box(0.022, 0.31, 0.022, mats.trim); s.position.set(alongX ? cx + f * len : cx, 1.775, alongX ? cz : cz + f * len); g.add(s);
    }
  };
  guard(-0.2, -(Wd / 2 - 0.02), L - 0.5, true, 7); // front (leaves room for the ladder)
  guard(0, Wd / 2 - 0.02, L - 0.07, true, 10); // wall side
  guard(-(L / 2 - 0.02), 0, Wd - 0.07, false, 5);
  guard(L / 2 - 0.02, 0, Wd - 0.07, false, 5);
  // ladder at the foot end on the front
  const ladderX = L / 2 - 0.27;
  for (const sx of [-1, 1]) { const r = Prim.cylinder(0.02, 0.02, 1.95, wood, { segments: 10 }); r.position.set(ladderX + sx * 0.15, 0.975, -(Wd / 2 + 0.035)); g.add(r); }
  for (let i = 0; i < 5; i++) { const rung = Prim.cylinder(0.015, 0.015, 0.3, wood, { segments: 8 }); rung.rotation.z = Math.PI / 2; rung.position.set(ladderX, 0.34 + i * 0.34, -(Wd / 2 + 0.035)); g.add(rung); }
  // bits of life: a plush on the top bunk, a comic on the lower one
  const plush = teddy(ctx, 0x8fa5c9, 0.7); plush.position.set(-0.05, upTop, -0.15); plush.rotation.y = -0.5; g.add(plush);
  const comic = Prim.rbox(0.19, 0.008, 0.26, 0.002, mats.image(ctx.tex.art(6, 0.73), { roughness: 0.7 }), { keepUV: true }); comic.position.set(0.55, lowTop + 0.075, -0.2); comic.rotation.y = 0.35; g.add(comic);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [L + 0.02, 1.98, Wd + 0.1], center: [0, 0.99, -0.03] }]);
}

/** Toy chest (front +z, hinge at the back). Static body + hinged dynamic lid. */
function toyChest(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const W = 0.8, H = 0.48, D = 0.45;
  const paint = mats.solid(0x3a7bd5, { roughness: 0.45 });
  const accent = mats.solid(0xf4d35e, { roughness: 0.5 });
  const inner = mats.pine;
  const g = new THREE.Group();
  const t = 0.02;
  const wall = (w: number, h: number, d: number, px: number, py: number, pz: number, m: THREE.Material) => { const b = Prim.box(w, h, d, m); b.position.set(px, py, pz); g.add(b); };
  wall(W, t, D, 0, t / 2 + 0.03, 0, inner); // bottom
  wall(W, H, t, 0, H / 2, -D / 2 + t / 2, paint); // back
  wall(W, H, t, 0, H / 2, D / 2 - t / 2, paint); // front
  wall(t, H, D, -W / 2 + t / 2, H / 2, 0, paint); wall(t, H, D, W / 2 - t / 2, H / 2, 0, paint); // sides
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) wall(0.06, 0.03, 0.06, sx * (W / 2 - 0.05), 0.015, sz * (D / 2 - 0.05), mats.walnut);
  // painted stripe + stars on the front
  const stripe = Prim.box(W - 0.08, 0.1, 0.004, accent); stripe.position.set(0, H * 0.55, D / 2 + 0.002); g.add(stripe);
  for (let i = 0; i < 3; i++) { const dot = Prim.cylinder(0.035, 0.035, 0.004, mats.solid([0xe63946, 0x2a9d8f, 0xf4a261][i], { roughness: 0.5 }), { segments: 12 }); dot.rotation.x = Math.PI / 2; dot.position.set(-0.22 + i * 0.22, H * 0.25, D / 2 + 0.003); g.add(dot); }
  // contents (visible when the lid is open)
  const blockMat = [0xe63946, 0x2a9d8f, 0xf4a261, 0x457b9d, 0x8ac926];
  for (let i = 0; i < 7; i++) {
    const b = Prim.rbox(0.06, 0.06, 0.06, 0.006, mats.solid(blockMat[i % blockMat.length], { roughness: 0.55 }));
    b.position.set(-0.3 + (i % 4) * 0.19, 0.08 + Math.floor(i / 4) * 0.06, -0.12 + (i % 3) * 0.1);
    b.rotation.y = ctx.rng() * 0.8;
    g.add(b);
  }
  const bunny = teddy(ctx, 0xd9d3cc, 0.6); bunny.position.set(0.25, 0.05, 0.05); bunny.rotation.y = -0.7; g.add(bunny);
  const beachBall = Prim.sphere(0.075, mats.solid(0xf4a261, { roughness: 0.5 }), { segments: 12 }); beachBall.position.set(-0.05, 0.13, 0.08); g.add(beachBall);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [W, H, D], center: [0, H / 2, 0] }]);
  // lid (dynamic, hinged along x at the back top edge)
  const lidParent = new THREE.Group();
  place(lidParent, x, FLOOR, z, rotY);
  ctx.dynamic.add(lidParent);
  hinged(ctx, lidParent, new THREE.Vector3(0, H + 0.005, -D / 2 + 0.02), (pivot) => {
    const lid = new THREE.Group();
    const slab = Prim.rbox(W + 0.03, 0.035, D + 0.03, 0.008, paint); slab.position.set(0, 0.0175, D / 2 - 0.02); lid.add(slab);
    const lip = Prim.rbox(0.18, 0.02, 0.05, 0.006, accent); lip.position.set(0, 0.04, D - 0.06); lid.add(lip);
    const label = Prim.quad(0.36, 0.09, mats.image(ctx.tex.label('TOYS', { bg: '#f4d35e', fg: '#1d3557', w: 512, h: 128, font: 'bold 90px "Comic Sans MS", cursive, sans-serif' }), { roughness: 0.7 }), { keepUV: true, cast: false });
    label.rotation.x = -Math.PI / 2; label.position.set(0, 0.036, D / 2 - 0.05); lid.add(label);
    pivot.add(mergeByMaterial(lid));
  }, 'toy chest', { axis: 'x', maxAngle: -1.55, sfx: 'drawer' });
}

/** Kids wardrobe (front +z), painted white with coloured knobs. */
function kidsWardrobe(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const W = 1.0, H = 1.95, D = 0.58;
  const white = mats.solid(0xf4f2ec, { roughness: 0.45 });
  const g = new THREE.Group();
  const body = Prim.rbox(W, H - 0.08, D, 0.006, white); body.position.set(0, (H - 0.08) / 2 + 0.06, 0); g.add(body);
  const plinth = Prim.box(W - 0.06, 0.06, D - 0.06, mats.solid(0xdcd8d0, { roughness: 0.6 })); plinth.position.set(0, 0.03, 0); g.add(plinth);
  const cornice = Prim.rbox(W + 0.04, 0.05, D + 0.03, 0.008, white); cornice.position.set(0, H - 0.025, 0.0); g.add(cornice);
  for (const s of [-1, 1]) {
    const door = Prim.rbox(W / 2 - 0.03, H - 0.22, 0.02, 0.005, white); door.position.set(s * (W / 4), (H - 0.22) / 2 + 0.09, D / 2 + 0.01); g.add(door);
    const panel = Prim.box(W / 2 - 0.13, H - 0.4, 0.008, mats.solid(0xdde8f0, { roughness: 0.5 })); panel.position.set(s * (W / 4), (H - 0.22) / 2 + 0.09, D / 2 + 0.024); g.add(panel);
    const knob = Prim.sphere(0.02, mats.solid(s < 0 ? 0xe63946 : 0x2a9d8f, { roughness: 0.4 }), { segments: 10 }); knob.position.set(s * 0.07, 1.0, D / 2 + 0.035); g.add(knob);
  }
  // stickers on a door
  const sticker = Prim.cylinder(0.05, 0.05, 0.004, mats.solid(0xf4d35e, { roughness: 0.5 }), { segments: 5 }); sticker.rotation.x = Math.PI / 2; sticker.position.set(-0.3, 1.45, D / 2 + 0.03); g.add(sticker);
  // a box + a kite on top
  const box = Prim.rbox(0.36, 0.22, 0.3, 0.008, mats.solid(0xc9a97c, { roughness: 0.85 })); box.position.set(-0.2, H + 0.11, -0.05); g.add(box);
  const kite = Prim.box(0.32, 0.005, 0.32, mats.solid(0xe63946, { roughness: 0.6 })); kite.rotation.y = Math.PI / 4; kite.rotation.x = 0.1; kite.position.set(0.22, H + 0.03, 0.02); g.add(kite);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [W + 0.04, H, D + 0.03], center: [0, H / 2, 0] }]);
}

/** Kids desk with drawer (front +z). */
function kidsDesk(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const W = 1.2, H = 0.66, D = 0.55;
  const white = mats.solid(0xf4f2ec, { roughness: 0.45 });
  const g = new THREE.Group();
  const top = Prim.rbox(W, 0.03, D, 0.008, mats.maple); top.position.y = H - 0.015; g.add(top);
  for (const s of [-1, 1]) { const side = Prim.box(0.03, H - 0.03, D - 0.06, white); side.position.set(s * (W / 2 - 0.015), (H - 0.03) / 2, 0); g.add(side); }
  const back = Prim.box(W - 0.06, 0.3, 0.02, white); back.position.set(0, H - 0.18, -D / 2 + 0.04); g.add(back);
  const drawer = Prim.rbox(0.5, 0.1, 0.02, 0.005, white); drawer.position.set(0.25, H - 0.09, D / 2 - 0.05); g.add(drawer);
  const rail = Prim.box(0.5, 0.12, 0.3, white); rail.position.set(0.25, H - 0.09, D / 2 - 0.22); g.add(rail);
  const pull = Prim.rbox(0.1, 0.014, 0.014, 0.005, mats.solid(0xf4a261, { roughness: 0.45 })); pull.position.set(0.25, H - 0.09, D / 2 - 0.035); g.add(pull);
  // crayons + drawing + cup of pencils
  const crayonCols = [0xe63946, 0xf4a261, 0xf9c74f, 0x90be6d, 0x457b9d, 0x9d4edd];
  for (let i = 0; i < crayonCols.length; i++) {
    const cr = Prim.cylinder(0.005, 0.005, 0.09, mats.solid(crayonCols[i], { roughness: 0.6 }), { segments: 6 });
    cr.rotation.z = Math.PI / 2; cr.rotation.y = 0.3 + ctx.rng() * 0.5;
    cr.position.set(0.15 + i * 0.03, H + 0.005, 0.12 + (ctx.rng() - 0.5) * 0.06);
    g.add(cr);
  }
  const paper = Prim.plane(0.21, 0.297, mats.image(crayonDrawing(), { roughness: 0.9 }), { keepUV: true, cast: false }); paper.position.set(-0.15, H + 0.002, 0.05); paper.rotation.y = 0.12; g.add(paper);
  const cup = Prim.cylinder(0.04, 0.035, 0.09, mats.solid(0x2a9d8f, { roughness: 0.4 }), { segments: 14 }); cup.position.set(0.45, H + 0.045, -0.12); g.add(cup);
  for (let i = 0; i < 5; i++) { const p = Prim.cylinder(0.004, 0.004, 0.17, mats.solid([0xf9c74f, 0x457b9d, 0xe63946, 0x222222, 0x90be6d][i], { roughness: 0.6 }), { segments: 5 }); p.position.set(0.45 + (ctx.rng() - 0.5) * 0.04, H + 0.12, -0.12 + (ctx.rng() - 0.5) * 0.04); p.rotation.set((ctx.rng() - 0.5) * 0.3, 0, (ctx.rng() - 0.5) * 0.3); g.add(p); }
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [W, H, D], center: [0, H / 2, 0] }]);
}

/** Fairy light string along a wall: catenary segments between hooks. */
function fairyLights(ctx: Ctx, pts: THREE.Vector3[], wallNormal: THREE.Vector3) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const centre = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
  g.position.copy(centre);
  const cols = [0xffd9a0, 0xff9ec4, 0x9ee8ff, 0xfff59a];
  const onMats = cols.map((c) => mats.emissive(c, 1.8, 0xfff0d8));
  const offMat = mats.solid(0xe8e2d6, { roughness: 0.5 });
  const bulbGroups = cols.map(() => new THREE.Group());
  const wire = new THREE.Group();
  let n = 0;
  for (let s = 0; s < pts.length - 1; s++) {
    const a = pts[s], b = pts[s + 1];
    const len = a.distanceTo(b);
    const steps = Math.max(4, Math.round(len / 0.12));
    let prev: THREE.Vector3 | null = null;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = a.clone().lerp(b, t);
      p.y -= 0.16 * Math.sin(t * Math.PI);
      p.addScaledVector(wallNormal, 0.03);
      if (prev) {
        const seg = Prim.cylinder(0.0025, 0.0025, prev.distanceTo(p), mats.black, { segments: 4, cast: false });
        seg.position.copy(prev).lerp(p, 0.5).sub(centre);
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(prev).normalize());
        wire.add(seg);
      }
      if (i < steps || s === pts.length - 2) {
        const bulb = Prim.sphere(0.013, onMats[n % cols.length], { segments: 7, cast: false });
        bulb.position.copy(p).sub(centre);
        bulb.position.y -= 0.02;
        bulbGroups[n % cols.length].add(bulb);
        n++;
      }
      prev = p;
    }
    // hook
    const hook = Prim.cylinder(0.006, 0.006, 0.03, mats.plasticWhite, { segments: 6 }); hook.position.copy(a).sub(centre); hook.rotation.x = Math.PI / 2; wire.add(hook);
    if (s === pts.length - 2) { const h2 = hook.clone(); h2.position.copy(b).sub(centre); wire.add(h2); }
  }
  // wire + hooks are static
  const wireWorld = new THREE.Group(); wireWorld.position.copy(centre); wireWorld.add(wire);
  addStatic(ctx, wireWorld);
  // bulbs: one merged mesh per colour so the lamp can swap materials
  const emissives: { mesh: THREE.Mesh; on: THREE.Material; off: THREE.Material }[] = [];
  bulbGroups.forEach((bg, i) => {
    const merged = mergeByMaterial(bg);
    for (const m of merged.children) if (m instanceof THREE.Mesh) { g.add(m); emissives.push({ mesh: m, on: onMats[i], off: offMat }); }
  });
  // battery pack (the thing you "click")
  const pack = Prim.rbox(0.07, 0.045, 0.025, 0.006, mats.plasticWhite); pack.position.copy(pts[0]).sub(centre); pack.position.y -= 0.09; pack.position.addScaledVector(wallNormal, 0.015); pack.userData.base = true; g.add(pack);
  ctx.dynamic.add(g);
  const light = ctx.lights.point(centre.x + wallNormal.x * 0.25, centre.y - 0.1, centre.z + wallNormal.z * 0.25, { intensity: 2.2, distance: 4.5, color: 0xffc898, group: 'bedroom2-fairy', emissives });
  ctx.interact.add(new Lamp(ctx, g, light, 'fairy lights'));
}

/** Plug-in nightlight (a little glowing dome). */
function nightlight(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const plate = Prim.rbox(0.07, 0.11, 0.012, 0.004, mats.plasticWhite); plate.position.z = 0.006; plate.userData.base = true; g.add(plate);
  const on = mats.emissive(0xffb070, 1.6, 0xffe0c0), off = mats.solid(0xf7e7d8, { roughness: 0.5 });
  const dome = Prim.sphere(0.028, on, { segments: 12 }); dome.scale.set(1, 1.2, 0.7); dome.position.set(0, 0.01, 0.012); g.add(dome);
  const moon = Prim.torus(0.014, 0.004, mats.solid(0x8a6a4a, { roughness: 0.6 }), { arc: Math.PI * 1.3 }); moon.rotation.set(Math.PI / 2, 0, 0.6); moon.position.set(0, 0.012, 0.03); g.add(moon);
  place(g, x, y, z, rotY);
  ctx.dynamic.add(g);
  const n = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
  const light = ctx.lights.point(x + n.x * 0.12, y, z + n.z * 0.12, { intensity: 1.4, distance: 3, color: 0xffb070, group: 'bedroom2-night', emissives: [{ mesh: dome, on, off }] });
  ctx.interact.add(new Lamp(ctx, g, light, 'nightlight'));
}

function glowStars(ctx: Ctx, x0: number, x1: number, z0: number, z1: number) {
  const mats = ctx.mats;
  const glow = mats.emissive(0xc8ffd0, 0.55, 0xdaf5df);
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.02 : 0.048; const px = Math.cos(a) * r, py = Math.sin(a) * r; i ? star.lineTo(px, py) : star.moveTo(px, py); }
  star.closePath();
  const g = new THREE.Group();
  const rnd = rng32(1234);
  for (let i = 0; i < 18; i++) {
    const m = Prim.extrude(star, 0.003, glow, { cast: false });
    m.rotation.set(Math.PI / 2, 0, rnd() * Math.PI);
    const s = 0.6 + rnd() * 0.8;
    m.scale.setScalar(s);
    m.position.set(x0 + rnd() * (x1 - x0), CEIL - 0.006, z0 + rnd() * (z1 - z0));
    g.add(m);
  }
  // a crescent moon (torus already lies flat in XZ)
  const moon = Prim.torus(0.06, 0.012, glow, { arc: Math.PI * 1.25, cast: false });
  moon.rotation.set(0, 0.8, 0);
  moon.position.set((x0 + x1) / 2 + 0.6, CEIL - 0.014, (z0 + z1) / 2 - 0.4);
  g.add(moon);
  addStatic(ctx, g);
}

// -------------------------------------------------------------------------------------------
// Room
// -------------------------------------------------------------------------------------------

export function buildKidsRoom(ctx: Ctx) {
  const mats = ctx.mats;
  const y = FLOOR;
  const W = -7.85, E = -1.56, S = -1.56, B = -5.85; // wall faces: west, east, south (closet wall), back

  // ---- lighting -------------------------------------------------------------------------------
  ceilingDome(ctx, -4.7, CEIL, -3.7, 'bedroom2');
  lightSwitch(ctx, E, y + 1.2, -4.12, FACE.negX, 'bedroom2', 'bedroom lights');

  // ---- big furniture --------------------------------------------------------------------------
  bunkBed(ctx, -6.825, S - 0.53, 0); // along the south wall, head at the west
  kidsWardrobe(ctx, -7.3, B + 0.32, FACE.posZ); // back wall, west of the window
  kidsDesk(ctx, -4.75, B + 0.3, FACE.posZ); // under the back window
  {
    const chair = simpleChair(ctx, { seatH: 0.38, w: 0.36, wood: mats.solid(0xe0552f, { roughness: 0.5 }), back: 'panel' });
    placeStatic(ctx, chair, -4.75, B + 0.82, FACE.negZ, [{ size: [0.38, 0.8, 0.38], center: [0, 0.4, 0] }]);
  }
  tableLamp(ctx, -5.22, y + 0.66, B + 0.22, { group: 'bedroom2-desk', label: 'desk lamp', color: 0x2a9d8f, shadeColor: 0xf9e79f, height: 0.42 });
  toyChest(ctx, -4.0, S - 0.245, FACE.negZ);
  {
    // picture-book shelf on the east wall + stuffed animals on top
    const { g, shelfY } = shelfUnit(ctx, 0.9, 1.2, 0.3, 3, mats.solid(0xf4f2ec, { roughness: 0.45 }), { backMat: mats.solid(0xdde8f0, { roughness: 0.5 }) });
    const bunny = teddy(ctx, 0xd9d3cc, 0.75); bunny.position.set(-0.25, 1.2, 0.0); bunny.rotation.y = 0.4; g.add(bunny);
    const bear = teddy(ctx, 0x8b5e3c, 0.9); bear.position.set(0.22, 1.2, 0.0); bear.rotation.y = -0.3; g.add(bear);
    const dino = Prim.rbox(0.16, 0.1, 0.09, 0.03, mats.fabric(0x5aa35a)); dino.position.set(0.0, 1.25, -0.03); g.add(dino);
    const dinoHead = Prim.rbox(0.08, 0.07, 0.07, 0.025, mats.fabric(0x5aa35a)); dinoHead.position.set(0.09, 1.31, -0.03); g.add(dinoHead);
    placeStatic(ctx, g, E - 0.17, -2.2, FACE.negX, [{ size: [0.9, 1.2, 0.3], center: [0, 0.6, 0] }]);
    // books (spines face -x)
    bookRow(ctx, E - 0.17, y + shelfY[0], -2.32, 0.5, FACE.negX, 0.24, 71);
    bookRow(ctx, E - 0.17, y + shelfY[1], -2.12, 0.7, FACE.negX, 0.22, 72);
    const bin = Prim.rbox(0.28, 0.2, 0.24, 0.02, mats.solid(0xf4a261, { roughness: 0.5 })); place(bin, E - 0.17, y + shelfY[0] + 0.1, -1.92, 0); addStatic(ctx, bin);
    const blocksOnShelf = new THREE.Group();
    for (let i = 0; i < 3; i++) { const b = Prim.rbox(0.06, 0.06, 0.06, 0.006, mats.solid([0x457b9d, 0xe63946, 0x8ac926][i], { roughness: 0.55 })); b.position.set(0, 0.03 + i * 0.06, 0); b.rotation.y = i * 0.4; blocksOnShelf.add(b); }
    place(blocksOnShelf, E - 0.17, y + shelfY[2], -2.4, 0); addStatic(ctx, blocksOnShelf);
  }
  // laundry hamper (woven look) in the back-east corner
  {
    const g = new THREE.Group();
    const body = Prim.cylinder(0.22, 0.19, 0.62, mats.fabric(0xc9b48a), { segments: 18 }); body.position.y = 0.31; g.add(body);
    const rim = Prim.torus(0.22, 0.015, mats.fabric(0xb39a6e)); rim.position.y = 0.62; g.add(rim);
    const sock = Prim.rbox(0.12, 0.04, 0.07, 0.015, mats.fabric(0xffffff)); sock.position.set(0.12, 0.63, 0.1); sock.rotation.set(0.3, 0.4, 0.2); g.add(sock);
    const tee = Prim.rbox(0.2, 0.05, 0.16, 0.02, mats.fabric(0xe63946)); tee.position.set(-0.04, 0.63, -0.02); tee.rotation.y = 0.5; g.add(tee);
    place(g, -1.95, y, -5.45, 0);
    addStatic(ctx, g, [{ size: [0.44, 0.65, 0.44], center: [0, 0.33, 0] }], { surface: 'fabric' });
  }

  // ---- loose toys (pickups) spilling out in front of the chest ------------------------------
  ball(ctx, -4.55, y, -2.55, 0.11, 0xe63946, 'red ball');
  ball(ctx, -3.5, y, -2.35, 0.075, 0x457b9d, 'blue ball');
  ball(ctx, -4.0, y, -3.0, 0.14, 0xf4d35e, 'beach ball');
  const blockCols = [0xe63946, 0x2a9d8f, 0xf4a261];
  for (let i = 0; i < 3; i++) {
    const b = Prim.rbox(0.065, 0.065, 0.065, 0.007, mats.solid(blockCols[i], { roughness: 0.55 }));
    b.position.set(-3.75 + i * 0.16, y + 0.033, -2.7 + (i % 2) * 0.12);
    b.rotation.y = i * 0.7;
    pickup(ctx, b, { name: 'wooden block', mass: 0.15, shape: { type: 'box', size: new THREE.Vector3(0.065, 0.065, 0.065) } });
  }
  { const car = toyCar(ctx, 0xe63946); car.position.set(-3.3, y + 0.001, -2.85); car.rotation.y = -0.6; pickup(ctx, car, { name: 'toy car', mass: 0.25 }); }
  { const bear = teddy(ctx, 0x9a6a3c, 1.0); bear.position.set(-4.75, y + 0.001, -2.15); bear.rotation.y = -0.9; pickup(ctx, bear, { name: 'teddy bear', mass: 0.3 }); }

  // ---- rug, curtains, decor ------------------------------------------------------------------
  rug(ctx, -4.7, y, -3.8, 2.4, 1.8, 'blue', 0);
  curtains(ctx, W, y, -3.75, FACE.posX, 1.4, 2.3, 0x6fa8dc);
  curtains(ctx, B, y, -4.75, FACE.posZ, 1.6, 2.3, 0x6fa8dc);
  poster(ctx, -2.75, y + 1.6, B, FACE.posZ, 0.5, 0.69, dinoPoster(), { frame: null });
  poster(ctx, E, y + 1.72, -2.2, FACE.negX, 0.5, 0.69, spacePoster(), { frame: 0x1d3557, frameW: 0.025 });
  poster(ctx, -4.0, y + 1.55, S, FACE.negZ, 0.62, 0.46, ctx.tex.art(2), { frame: 0xf4d35e, frameW: 0.03 });
  poster(ctx, E, y + 1.12, -4.65, FACE.negX, 0.24, 1.44, heightChart(), { frame: null });
  wallClock(ctx, -2.7, y + 1.95, S, FACE.negZ, 0.15);
  fairyLights(ctx, [new THREE.Vector3(-7.7, y + 2.2, S), new THREE.Vector3(-6.75, y + 2.2, S), new THREE.Vector3(-5.8, y + 2.2, S), new THREE.Vector3(-4.85, y + 2.2, S), new THREE.Vector3(-3.9, y + 2.2, S)], new THREE.Vector3(0, 0, -1));
  glowStars(ctx, -7.4, -2.0, -5.5, -2.0);
  nightlight(ctx, W, y + 0.35, -2.68, FACE.posX);

  // name letters above the bunk
  {
    const g = new THREE.Group();
    const letters = ['S', 'A', 'M'];
    const cols = [0xe63946, 0x2a9d8f, 0xf4a261];
    letters.forEach((l, i) => {
      const tex = ctx.tex.label(l, { bg: '#' + cols[i].toString(16).padStart(6, '0'), fg: '#ffffff', w: 128, h: 128, font: 'bold 96px "Arial Black", sans-serif' });
      const tile = Prim.rbox(0.16, 0.16, 0.02, 0.005, mats.solid(cols[i], { roughness: 0.5 })); tile.position.set(-0.2 + i * 0.2, 0, 0.01); g.add(tile);
      const face = Prim.quad(0.14, 0.14, mats.image(tex, { roughness: 0.7 }), { keepUV: true, cast: false }); face.position.set(-0.2 + i * 0.2, 0, 0.021); g.add(face);
    });
    place(g, -6.825, y + 2.42, S, FACE.negZ);
    addStatic(ctx, g);
  }
}
