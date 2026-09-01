/**
 * Office bedroom (bedroom4): daybed, L-desk with two monitors (animated when the computer is on),
 * office chair, bookshelf with binders, printer cabinet, filing cabinet, whiteboard, corkboard,
 * plant, rug, curtains, recessed lights, wall clock, wastebasket.
 */
import * as THREE from 'three';
import { Prim, place, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import { addStatic, bookRow, curtains, lightSwitch, looseBook, mug, plant, recessedLight, rug, tableLamp, Toggle, wallClock } from '../Props';
import { FLOOR, CEIL, FACE, canvasTex, cushion, liveCanvas, placeStatic, rng32, shelfUnit } from './Bedrooms.shared';

// -------------------------------------------------------------------------------------------
// Canvas art
// -------------------------------------------------------------------------------------------

function whiteboardTex(): THREE.Texture {
  return canvasTex('office-whiteboard', 1024, 700, (c, w, h) => {
    c.fillStyle = '#f7f8f8'; c.fillRect(0, 0, w, h);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const marker = (col: string, lw = 5) => { c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; };
    marker('#1d4ed8', 6);
    c.font = 'bold 44px "Segoe Print", "Comic Sans MS", cursive, sans-serif'; c.fillText('Sprint 14 — house v3', 40, 70);
    c.beginPath(); c.moveTo(40, 88); c.lineTo(520, 92); c.stroke();
    // boxes with arrows
    marker('#111827', 5);
    const box = (x: number, y: number, bw: number, bh: number, t: string) => { c.strokeRect(x, y, bw, bh); c.font = '30px "Segoe Print", "Comic Sans MS", cursive, sans-serif'; c.fillText(t, x + 14, y + bh / 2 + 10); };
    box(60, 140, 200, 80, 'textures'); box(340, 140, 200, 80, 'rooms'); box(620, 140, 200, 80, 'QA loop');
    const arrow = (x0: number, y0: number, x1: number, y1: number) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); const a = Math.atan2(y1 - y0, x1 - x0); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - 16 * Math.cos(a - 0.5), y1 - 16 * Math.sin(a - 0.5)); c.moveTo(x1, y1); c.lineTo(x1 - 16 * Math.cos(a + 0.5), y1 - 16 * Math.sin(a + 0.5)); c.stroke(); };
    arrow(262, 180, 336, 180); arrow(542, 180, 616, 180); arrow(720, 224, 720, 300);
    marker('#dc2626', 5);
    c.font = '32px "Segoe Print", "Comic Sans MS", cursive, sans-serif';
    ['[x] fix z-fighting on rugs', '[x] bunk bed ladder', '[ ] guest curtains', '[ ] closet bins labels!!'].forEach((t, i) => c.fillText(t, 60, 300 + i * 52));
    marker('#16a34a', 5);
    c.fillText('demo Fri 3pm', 660, 380);
    c.beginPath(); c.ellipse(760, 372, 130, 40, 0, 0, Math.PI * 2); c.stroke();
    // smiley + a little chart
    marker('#111827', 5);
    c.beginPath(); c.arc(860, 560, 50, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(842, 545, 5, 0, Math.PI * 2); c.arc(878, 545, 5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(860, 565, 28, 0.3, Math.PI - 0.3); c.stroke();
    marker('#1d4ed8', 4);
    c.beginPath(); c.moveTo(80, 640); c.lineTo(80, 500); c.moveTo(80, 640); c.lineTo(360, 640); c.stroke();
    c.beginPath(); c.moveTo(90, 620); c.lineTo(160, 590); c.lineTo(220, 600); c.lineTo(290, 530); c.lineTo(350, 515); c.stroke();
    c.font = '20px sans-serif'; c.fillText('fps', 40, 520); c.fillText('rooms', 300, 665);
  });
}

function corkTex(): THREE.Texture {
  return canvasTex('office-cork', 512, 384, (c, w, h) => {
    const rnd = rng32(31);
    c.fillStyle = '#c8a06a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(90,55,20,0.35)' : 'rgba(255,230,180,0.3)'; c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 1 + rnd() * 3); }
  });
}

/** Terminal-looking screen (animated: new lines scroll in). */
function terminalScreen() {
  const { tex, ctx: c, update } = liveCanvas(640, 384);
  const w = 640, h = 384;
  const rnd = rng32(2024);
  const names = ['batch', 'room', 'light', 'physics', 'ctx', 'mesh', 'quilt', 'rug', 'door', 'tex'];
  const fns = ['build', 'merge', 'place', 'addStatic', 'bake', 'load', 'update', 'raycast'];
  const kinds: (() => [string, string][])[] = [
    () => [['const ', '#c678dd'], [names[Math.floor(rnd() * names.length)], '#e5c07b'], [' = ', '#abb2bf'], [fns[Math.floor(rnd() * fns.length)] + '(', '#61afef'], [`'${names[Math.floor(rnd() * names.length)]}'`, '#98c379'], [');', '#abb2bf']],
    () => [['if ', '#c678dd'], ['(', '#abb2bf'], [names[Math.floor(rnd() * names.length)], '#e5c07b'], ['.length > ', '#abb2bf'], [String(Math.floor(rnd() * 200)), '#d19a66'], [') {', '#abb2bf']],
    () => [['  return ', '#c678dd'], [names[Math.floor(rnd() * names.length)], '#e5c07b'], ['.map(', '#abb2bf'], ['x => x * ', '#abb2bf'], [(rnd() * 4).toFixed(2), '#d19a66'], [');', '#abb2bf']],
    () => [['}', '#abb2bf']],
    () => [['// TODO: ', '#5c6370'], [['fix z-fighting', 'more cushions', 'bake AO', 'tune bloom'][Math.floor(rnd() * 4)], '#5c6370']],
    () => [['$ ', '#98c379'], [['npm run build', 'npx tsc --noEmit', 'node tools/screenshot.mjs', 'git status'][Math.floor(rnd() * 4)], '#e6e6e6']],
    () => [['✓ ', '#98c379'], [`${40 + Math.floor(rnd() * 60)} tests passed`, '#98c379'], [`  (${(rnd() * 3 + 0.5).toFixed(1)}s)`, '#5c6370']],
    () => [['[world] ', '#56b6c2'], [`static batches: ${20 + Math.floor(rnd() * 40)} parts: ${1000 + Math.floor(rnd() * 3000)}`, '#abb2bf']],
  ];
  const lines: [string, string][][] = [];
  for (let i = 0; i < 12; i++) lines.push(kinds[Math.floor(rnd() * kinds.length)]());
  let blink = true;
  const draw = () => {
    c.fillStyle = '#1e2127'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2c313a'; c.fillRect(0, 0, w, 30);
    c.fillStyle = '#e06c75'; c.beginPath(); c.arc(18, 15, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e5c07b'; c.beginPath(); c.arc(38, 15, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#98c379'; c.beginPath(); c.arc(58, 15, 6, 0, Math.PI * 2); c.fill();
    c.font = '15px monospace'; c.fillStyle = '#9da5b4'; c.textAlign = 'center'; c.fillText('house — zsh — 120x40', w / 2, 20); c.textAlign = 'left';
    c.font = '19px "Courier New", monospace';
    const start = Math.max(0, lines.length - 15);
    for (let i = start; i < lines.length; i++) {
      let x = 14; const yy = 56 + (i - start) * 22;
      for (const [t, col] of lines[i]) { c.fillStyle = col; c.fillText(t, x, yy); x += c.measureText(t).width; }
    }
    if (blink) { c.fillStyle = '#abb2bf'; c.fillRect(14, 56 + (lines.length - start) * 22 - 16, 10, 20); }
    update();
  };
  draw();
  let acc = 0;
  return {
    tex,
    tick(dt: number) {
      acc += dt;
      if (acc < 0.55) return;
      acc = 0;
      blink = !blink;
      if (rnd() < 0.6) { lines.push(kinds[Math.floor(rnd() * kinds.length)]()); if (lines.length > 40) lines.splice(0, 10); }
      draw();
    },
  };
}

/** Dashboard screen with a scrolling line chart and bars. */
function chartScreen() {
  const { tex, ctx: c, update } = liveCanvas(640, 384);
  const w = 640, h = 384;
  const rnd = rng32(99);
  const series = [Array.from({ length: 60 }, () => 0.4 + rnd() * 0.3), Array.from({ length: 60 }, () => 0.2 + rnd() * 0.25)];
  const bars = Array.from({ length: 12 }, () => 0.3 + rnd() * 0.6);
  let t = 0;
  const draw = () => {
    c.fillStyle = '#0f172a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1e293b'; c.fillRect(0, 0, w, 36);
    c.fillStyle = '#e2e8f0'; c.font = 'bold 18px sans-serif'; c.textAlign = 'left'; c.fillText('render stats', 16, 25);
    c.fillStyle = '#22c55e'; c.beginPath(); c.arc(w - 24, 18, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#94a3b8'; c.font = '14px sans-serif'; c.fillText('live', w - 62, 23);
    // grid
    const gx0 = 50, gy0 = 60, gw = w - 70, gh = 170;
    c.strokeStyle = '#1e293b'; c.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const yy = gy0 + (gh * i) / 4; c.beginPath(); c.moveTo(gx0, yy); c.lineTo(gx0 + gw, yy); c.stroke(); }
    c.fillStyle = '#64748b'; c.font = '12px sans-serif'; c.textAlign = 'right';
    ['100', '75', '50', '25', '0'].forEach((l, i) => c.fillText(l, gx0 - 8, gy0 + (gh * i) / 4 + 4));
    const cols = ['#38bdf8', '#f472b6'];
    series.forEach((s, si) => {
      c.strokeStyle = cols[si]; c.lineWidth = 2.5; c.beginPath();
      s.forEach((v, i) => { const x = gx0 + (i / (s.length - 1)) * gw, yy = gy0 + gh - v * gh; i ? c.lineTo(x, yy) : c.moveTo(x, yy); });
      c.stroke();
      c.globalAlpha = 0.15; c.fillStyle = cols[si]; c.lineTo(gx0 + gw, gy0 + gh); c.lineTo(gx0, gy0 + gh); c.closePath(); c.fill(); c.globalAlpha = 1;
    });
    c.textAlign = 'left'; c.font = '13px sans-serif';
    c.fillStyle = cols[0]; c.fillText('■ frame ms', gx0, gy0 + gh + 18); c.fillStyle = cols[1]; c.fillText('■ draw calls', gx0 + 100, gy0 + gh + 18);
    // bars
    const by = 270, bh = 90;
    bars.forEach((v, i) => {
      const x = gx0 + i * (gw / 12) + 6, bw = gw / 12 - 12;
      c.fillStyle = i % 3 === 0 ? '#a78bfa' : '#38bdf8';
      c.fillRect(x, by + bh - v * bh, bw, v * bh);
    });
    c.fillStyle = '#64748b'; c.font = '12px sans-serif'; c.fillText('rooms', gx0, by + bh + 16);
    // big number
    c.fillStyle = '#e2e8f0'; c.font = 'bold 36px sans-serif'; c.textAlign = 'right'; c.fillText(`${(58 + Math.sin(t) * 3).toFixed(0)} fps`, w - 20, by + 30); c.textAlign = 'left';
    update();
  };
  draw();
  let acc = 0;
  return {
    tex,
    tick(dt: number) {
      acc += dt;
      if (acc < 0.5) return;
      acc = 0; t += 0.5;
      series.forEach((s, i) => { s.shift(); s.push(Math.min(0.95, Math.max(0.05, s[s.length - 1] + (rnd() - 0.5) * (i ? 0.12 : 0.18)))); });
      if (rnd() < 0.3) bars[Math.floor(rnd() * bars.length)] = 0.3 + rnd() * 0.6;
      draw();
    },
  };
}

// -------------------------------------------------------------------------------------------
// Furniture
// -------------------------------------------------------------------------------------------

/** Sofa-style daybed (front +z), 1.7 m long. */
function daybed(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const L = 1.7, D = 0.85;
  const wood = mats.walnut;
  const g = new THREE.Group();
  const frame = Prim.rbox(L, 0.16, D, 0.01, wood); frame.position.y = 0.2; g.add(frame);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = Prim.box(0.05, 0.12, 0.05, wood); leg.position.set(sx * (L / 2 - 0.06), 0.06, sz * (D / 2 - 0.06)); g.add(leg); }
  for (const sx of [-1, 1]) { const arm = Prim.rbox(0.06, 0.4, D, 0.01, wood); arm.position.set(sx * (L / 2 - 0.03), 0.4, 0); g.add(arm); }
  const back = Prim.rbox(L - 0.12, 0.42, 0.05, 0.01, wood); back.position.set(0, 0.45, -D / 2 + 0.025); g.add(back);
  const matt = Prim.rbox(L - 0.14, 0.16, D - 0.1, 0.045, mats.fabric(0x6f7d8c)); matt.position.set(0, 0.36, 0.02); g.add(matt);
  const backCols = [0xb8c1cc, 0xd8a47f, 0x6f7d8c];
  for (let i = 0; i < 3; i++) { const cu = cushion(0.48, 0.42, 0.13, mats.fabric(backCols[i])); cu.position.set(-0.52 + i * 0.52, 0.66, -D / 2 + 0.13); cu.rotation.x = -0.14; g.add(cu); }
  const throwPillow = cushion(0.36, 0.34, 0.12, mats.fabric(0xd8a47f)); throwPillow.position.set(0.5, 0.62, -0.1); throwPillow.rotation.set(-0.35, 0.5, 0); g.add(throwPillow);
  const blanket = Prim.rbox(0.55, 0.05, 0.6, 0.02, mats.fabric(0xa3b18a)); blanket.position.set(-0.4, 0.465, 0.05); blanket.rotation.y = 0.08; g.add(blanket);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [L, 0.9, D], center: [0, 0.45, 0] }], { surface: 'fabric' });
}

/** Five-star office chair (front +z). */
function officeChair(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const metal = mats.darkMetal;
  const mesh = mats.fabric(0x2b2e33);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = Prim.rbox(0.3, 0.03, 0.04, 0.01, metal); arm.position.set(Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15); arm.rotation.y = -a; g.add(arm);
    const caster = Prim.sphere(0.028, mats.plasticBlack, { segments: 10 }); caster.position.set(Math.cos(a) * 0.29, 0.028, Math.sin(a) * 0.29); g.add(caster);
  }
  const lift = Prim.cylinder(0.025, 0.03, 0.34, metal, { segments: 12 }); lift.position.y = 0.22; g.add(lift);
  const boot = Prim.cylinder(0.035, 0.035, 0.12, mats.plasticBlack, { segments: 12 }); boot.position.y = 0.16; g.add(boot);
  const seatPlate = Prim.box(0.28, 0.02, 0.28, mats.plasticBlack); seatPlate.position.y = 0.4; g.add(seatPlate);
  const seat = Prim.rbox(0.5, 0.08, 0.5, 0.03, mesh); seat.position.set(0, 0.45, 0.02); g.add(seat);
  for (const sx of [-1, 1]) { const armrest = Prim.rbox(0.05, 0.02, 0.26, 0.008, mats.plasticBlack); armrest.position.set(sx * 0.26, 0.68, 0.0); g.add(armrest); const post = Prim.box(0.03, 0.2, 0.04, mats.plasticBlack); post.position.set(sx * 0.26, 0.58, 0.02); g.add(post); }
  const spine = Prim.box(0.06, 0.3, 0.03, mats.plasticBlack); spine.position.set(0, 0.6, -0.22); spine.rotation.x = -0.1; g.add(spine);
  const back = Prim.rbox(0.48, 0.58, 0.07, 0.03, mesh); back.position.set(0, 0.85, -0.25); back.rotation.x = -0.12; g.add(back);
  const headrest = Prim.rbox(0.28, 0.12, 0.06, 0.02, mesh); headrest.position.set(0, 1.2, -0.29); headrest.rotation.x = -0.15; g.add(headrest);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [], { surface: 'fabric' });
  ctx.physics.addCylinder({ x, y: FLOOR + 0.55, z }, 0.32, 1.1);
}

/** The L-shaped desk with everything on it. Built in world coordinates. */
function lDesk(ctx: Ctx) {
  const mats = ctx.mats;
  const y = FLOOR;
  const wood = mats.oak;
  const white = mats.solid(0xf2f1ec, { roughness: 0.45 });
  const g = new THREE.Group();
  const H = 0.74;
  // leg A along the back wall, leg B (short return) along the east wall
  const A = { x0: 5.88, x1: 7.83, z0: -5.83, z1: -5.13 };
  const B = { x0: 7.13, x1: 7.83, z0: -5.13, z1: -4.62 };
  const slab = (r: typeof A) => { const m = Prim.rbox(r.x1 - r.x0, 0.035, r.z1 - r.z0, 0.008, wood); m.position.set((r.x0 + r.x1) / 2, H - 0.0175, (r.z0 + r.z1) / 2); g.add(m); };
  slab(A); slab(B);
  // 3-drawer pedestal at the west end of leg A
  const ped = Prim.rbox(0.42, H - 0.04, 0.62, 0.006, white); ped.position.set(A.x0 + 0.23, (H - 0.04) / 2, (A.z0 + A.z1) / 2); g.add(ped);
  for (let i = 0; i < 3; i++) { const f = Prim.rbox(0.36, 0.18, 0.012, 0.004, white); f.position.set(A.x0 + 0.23, 0.14 + i * 0.22, A.z1 - 0.005); g.add(f); const pull = Prim.rbox(0.1, 0.012, 0.012, 0.005, mats.chrome); pull.position.set(A.x0 + 0.23, 0.14 + i * 0.22, A.z1 + 0.01); g.add(pull); }
  // panels: east end of leg A, and far end of leg B, plus a modesty panel under the monitors
  const panelE = Prim.box(0.03, H - 0.04, 0.62, white); panelE.position.set(A.x1 - 0.03, (H - 0.04) / 2, (A.z0 + A.z1) / 2); g.add(panelE);
  const panelB = Prim.box(0.62, H - 0.04, 0.03, white); panelB.position.set((B.x0 + B.x1) / 2, (H - 0.04) / 2, B.z1 - 0.03); g.add(panelB);
  const modesty = Prim.box(A.x1 - A.x0 - 0.5, 0.3, 0.02, white); modesty.position.set((A.x0 + 0.46 + A.x1) / 2, H - 0.2, A.z0 + 0.12); g.add(modesty);
  // keyboard (keys as little boxes), mouse, mousepad
  const kb = new THREE.Group();
  const kbBody = Prim.rbox(0.44, 0.018, 0.15, 0.005, mats.plasticBlack); kbBody.position.y = 0.009; kb.add(kbBody);
  const keyMat = mats.solid(0x3a3d42, { roughness: 0.5 });
  for (let r = 0; r < 5; r++) for (let cI = 0; cI < 14; cI++) {
    if (r === 4 && cI > 3 && cI < 10) continue;
    const k = Prim.box(0.024, 0.006, 0.022, keyMat); k.position.set(-0.2 + cI * 0.03 + (r === 4 ? 0 : r * 0.004), 0.021, -0.055 + r * 0.028); kb.add(k);
  }
  const space = Prim.box(0.17, 0.006, 0.022, keyMat); space.position.set(0.0, 0.021, -0.055 + 4 * 0.028); kb.add(space);
  kb.position.set(6.72, H, -5.32); kb.rotation.y = 0.02; g.add(kb);
  const pad = Prim.rbox(0.26, 0.004, 0.22, 0.002, mats.solid(0x23262b, { roughness: 0.9 })); pad.position.set(7.15, H + 0.002, -5.32); g.add(pad);
  const mouse = Prim.rbox(0.062, 0.035, 0.11, 0.016, mats.plasticBlack); mouse.position.set(7.15, H + 0.02, -5.32); mouse.rotation.y = -0.2; g.add(mouse);
  // notebook + pen, headphones on the return
  const nb = Prim.rbox(0.15, 0.015, 0.21, 0.003, mats.solid(0x2f3e46, { roughness: 0.6 })); nb.position.set(7.48, H + 0.0075, -4.95); nb.rotation.y = 0.1; g.add(nb);
  const pages = Prim.box(0.14, 0.012, 0.2, mats.solid(0xf3efe4, { roughness: 0.9 })); pages.position.set(7.48, H + 0.0075, -4.95); pages.rotation.y = 0.1; g.add(pages);
  const pen = Prim.cylinder(0.004, 0.004, 0.14, mats.solid(0x1f3a93, { roughness: 0.4 }), { segments: 6 }); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.5; pen.position.set(7.42, H + 0.02, -4.82); g.add(pen);
  const hp = new THREE.Group();
  const band = Prim.torus(0.085, 0.009, mats.plasticBlack, { arc: Math.PI }); band.rotation.set(0, 0, 0); hp.add(band);
  for (const s of [-1, 1]) { const cup = Prim.cylinder(0.04, 0.04, 0.03, mats.plasticBlack, { segments: 14 }); cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.085, 0, 0); hp.add(cup); const padM = Prim.cylinder(0.036, 0.036, 0.012, mats.leather(0x2a2a2a), { segments: 14 }); padM.rotation.z = Math.PI / 2; padM.position.set(s * 0.065, 0, 0); hp.add(padM); }
  hp.rotation.set(0, 0.3, 0); hp.position.set(7.5, H + 0.04, -4.72); g.add(hp);
  // PC tower on the floor under the return
  const tower = Prim.rbox(0.2, 0.44, 0.44, 0.008, mats.solid(0x2a2c30, { roughness: 0.4, metalness: 0.4 })); tower.position.set(7.62, 0.22, -4.86); g.add(tower);
  const towerGlass = Prim.box(0.004, 0.32, 0.3, mats.solid(0x0a0c10, { roughness: 0.1, metalness: 0.4 })); towerGlass.position.set(7.518, 0.24, -4.86); g.add(towerGlass);
  // monitor stands + bezels (screens are dynamic, added separately)
  for (const mx of [6.42, 6.98]) {
    const foot = Prim.rbox(0.26, 0.012, 0.16, 0.004, mats.plasticBlack); foot.position.set(mx, H + 0.006, -5.62); g.add(foot);
    const neck = Prim.box(0.04, 0.16, 0.02, mats.plasticBlack); neck.position.set(mx, H + 0.09, -5.65); g.add(neck);
    const bezel = Prim.rbox(0.55, 0.34, 0.03, 0.004, mats.plasticBlack); bezel.position.set(mx, H + 0.3, -5.63); g.add(bezel);
  }
  // cable
  const cable = Prim.cylinder(0.004, 0.004, 0.5, mats.black, { segments: 5 }); cable.position.set(7.4, H - 0.25, -5.4); cable.rotation.x = 0.4; g.add(cable);
  place(g, 0, y, 0, 0);
  addStatic(ctx, g, [
    { size: [A.x1 - A.x0, H, A.z1 - A.z0], center: [(A.x0 + A.x1) / 2, H / 2, (A.z0 + A.z1) / 2] },
    { size: [B.x1 - B.x0, H, B.z1 - B.z0], center: [(B.x0 + B.x1) / 2, H / 2, (B.z0 + B.z1) / 2] },
  ]);

  // ---- the computer: two screens + power LED + a toggle ------------------------------------------
  const pc = new THREE.Group();
  const term = terminalScreen(), chart = chartScreen();
  const screenOn = (t: THREE.Texture) => mats.image(t, { emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.25, envMapIntensity: 0.3 });
  const termMat = screenOn(term.tex), chartMat = screenOn(chart.tex);
  const s1 = Prim.quad(0.51, 0.3, mats.screenOff, { keepUV: true, cast: false }); s1.position.set(6.42, y + H + 0.3, -5.612); pc.add(s1);
  const s2 = Prim.quad(0.51, 0.3, mats.screenOff, { keepUV: true, cast: false }); s2.position.set(6.98, y + H + 0.3, -5.612); pc.add(s2);
  const ledOn = mats.emissive(0x38bdf8, 2.5, 0x0a2a3a), ledOff = mats.solid(0x123, { roughness: 0.5 });
  const led = Prim.sphere(0.006, ledOff, { segments: 6 }); led.position.set(7.515, y + 0.4, -4.68); pc.add(led);
  const powerBtn = Prim.cylinder(0.012, 0.012, 0.006, mats.solid(0x555a60, { roughness: 0.4, metalness: 0.5 }), { segments: 10 }); powerBtn.rotation.z = Math.PI / 2; powerBtn.position.set(7.515, y + 0.42, -4.72); pc.add(powerBtn);
  ctx.dynamic.add(pc);
  const glow = ctx.lights.point(6.7, y + H + 0.35, -5.35, { intensity: 1.6, distance: 2.8, color: 0x9ecbff, on: false });
  const toggle = new Toggle(pc, { on: 'Turn off computer', off: 'Turn on computer' }, (on) => {
    s1.material = on ? termMat : mats.screenOff;
    s2.material = on ? chartMat : mats.screenOff;
    led.material = on ? ledOn : ledOff;
    ctx.lights.setOn(glow, on);
    ctx.audio.play(on ? 'tvOn' : 'tvOff', new THREE.Vector3(6.7, y + 1, -5.5));
  }, new THREE.Vector3(6.7, y + 1.0, -5.5));
  ctx.interact.add(toggle);
  ctx.onUpdate((dt) => { if (!toggle.on) return; term.tick(dt); chart.tick(dt); });
}

function printerCabinet(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const W = 0.8, H = 0.7, D = 0.45;
  const white = mats.solid(0xf2f1ec, { roughness: 0.45 });
  const g = new THREE.Group();
  const body = Prim.rbox(W, H - 0.05, D, 0.006, white); body.position.y = (H - 0.05) / 2 + 0.05; g.add(body);
  const plinth = Prim.box(W - 0.05, 0.05, D - 0.05, mats.solid(0xd4d2cc, { roughness: 0.6 })); plinth.position.set(0, 0.025, -0.02); g.add(plinth);
  for (const s of [-1, 1]) { const door = Prim.rbox(W / 2 - 0.03, H - 0.13, 0.012, 0.004, white); door.position.set(s * W / 4, (H - 0.13) / 2 + 0.07, D / 2 + 0.006); g.add(door); const pull = Prim.rbox(0.012, 0.1, 0.012, 0.005, mats.chrome); pull.position.set(s * 0.05, H / 2 + 0.05, D / 2 + 0.02); g.add(pull); }
  // printer
  const pr = new THREE.Group();
  const base = Prim.rbox(0.44, 0.13, 0.36, 0.015, mats.solid(0x3a3d42, { roughness: 0.5 })); base.position.y = 0.065; pr.add(base);
  const topP = Prim.rbox(0.4, 0.06, 0.3, 0.015, mats.solid(0xe9e8e3, { roughness: 0.5 })); topP.position.set(0, 0.16, -0.02); pr.add(topP);
  const tray = Prim.box(0.3, 0.006, 0.16, mats.solid(0xe9e8e3, { roughness: 0.5 })); tray.position.set(0, 0.2, 0.05); tray.rotation.x = -0.25; pr.add(tray);
  const paper = Prim.box(0.21, 0.006, 0.28, mats.solid(0xfafaf7, { roughness: 0.9 })); paper.position.set(0, 0.006, 0.2); pr.add(paper);
  const panel = Prim.quad(0.07, 0.03, mats.emissive(0x8fd3ff, 0.8, 0x203040), { cast: false }); panel.position.set(0.14, 0.11, 0.181); pr.add(panel);
  pr.position.set(0, H, 0.0); g.add(pr);
  // paper ream + a stapler beside
  const ream = Prim.rbox(0.22, 0.05, 0.3, 0.004, mats.solid(0xe8e4d8, { roughness: 0.9 })); ream.position.set(-0.28, H + 0.025, 0.02); g.add(ream);
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [W, H + 0.2, D], center: [0, (H + 0.2) / 2, 0] }]);
}

function filingCabinet(ctx: Ctx, x: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const W = 0.45, H = 0.72, D = 0.6;
  const metal = mats.paintedMetal(0x8a8f95);
  const g = new THREE.Group();
  const body = Prim.rbox(W, H, D, 0.006, metal); body.position.y = H / 2; g.add(body);
  for (let i = 0; i < 2; i++) {
    const f = Prim.rbox(W - 0.04, 0.3, 0.012, 0.004, metal); f.position.set(0, 0.2 + i * 0.34, D / 2 + 0.006); g.add(f);
    const handle = Prim.rbox(0.14, 0.02, 0.02, 0.006, mats.chrome); handle.position.set(0, 0.28 + i * 0.34, D / 2 + 0.02); g.add(handle);
    const tag = Prim.quad(0.08, 0.03, mats.image(ctx.tex.label(i ? 'A–M' : 'N–Z', { bg: '#f4f1e6', fg: '#333', w: 256, h: 96, font: 'bold 56px sans-serif' }), { roughness: 0.7 }), { keepUV: true, cast: false }); tag.position.set(0, 0.34 + i * 0.34, D / 2 + 0.013); g.add(tag);
  }
  place(g, x, FLOOR, z, rotY);
  addStatic(ctx, g, [{ size: [W, H, D], center: [0, H / 2, 0] }], { surface: 'metal' });
}

function whiteboard(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const w = 1.1, h = 0.8;
  const g = new THREE.Group();
  const alu = mats.solid(0xc8cacc, { roughness: 0.35, metalness: 0.8 });
  const board = Prim.box(w, h, 0.015, mats.solid(0xf7f8f8, { roughness: 0.25 })); board.position.z = 0.0125; g.add(board);
  const face = Prim.quad(w - 0.02, h - 0.02, mats.image(whiteboardTex(), { roughness: 0.25, envMapIntensity: 0.5 }), { keepUV: true, cast: false }); face.position.z = 0.0205; g.add(face);
  for (const [bw, bh, px, py] of [[w + 0.04, 0.02, 0, h / 2 + 0.01], [w + 0.04, 0.02, 0, -h / 2 - 0.01], [0.02, h, -w / 2 - 0.01, 0], [0.02, h, w / 2 + 0.01, 0]]) { const b = Prim.box(bw, bh, 0.02, alu); b.position.set(px, py, 0.012); g.add(b); }
  const trayM = Prim.box(0.5, 0.015, 0.06, alu); trayM.position.set(0, -h / 2 - 0.03, 0.04); g.add(trayM);
  for (let i = 0; i < 3; i++) { const m = Prim.cylinder(0.008, 0.008, 0.12, mats.solid([0x1d4ed8, 0xdc2626, 0x111827][i], { roughness: 0.4 }), { segments: 8 }); m.rotation.z = Math.PI / 2; m.position.set(-0.15 + i * 0.12, -h / 2 - 0.018, 0.045); g.add(m); }
  const eraser = Prim.rbox(0.1, 0.03, 0.05, 0.006, mats.solid(0x333, { roughness: 0.7 })); eraser.position.set(0.2, -h / 2 - 0.008, 0.045); g.add(eraser);
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
}

function corkboard(ctx: Ctx, x: number, y: number, z: number, rotY: number) {
  const mats = ctx.mats;
  const w = 0.9, h = 0.6;
  const g = new THREE.Group();
  const frame = Prim.rbox(w + 0.05, h + 0.05, 0.03, 0.006, mats.pine); frame.position.z = 0.015; g.add(frame);
  const cork = Prim.quad(w, h, mats.image(corkTex(), { roughness: 0.95 }), { keepUV: true, cast: false }); cork.position.z = 0.031; g.add(cork);
  const rnd = rng32(7);
  const noteCols = [0xfff176, 0xf48fb1, 0x80deea, 0xc5e1a5, 0xffcc80, 0xfafafa];
  for (let i = 0; i < 9; i++) {
    const col = noteCols[i % noteCols.length];
    const nw = 0.1 + rnd() * 0.08, nh = 0.09 + rnd() * 0.08;
    const note = Prim.box(nw, nh, 0.003, mats.solid(col, { roughness: 0.9 }));
    const px = -w / 2 + 0.1 + rnd() * (w - 0.2), py = -h / 2 + 0.09 + rnd() * (h - 0.18);
    note.position.set(px, py, 0.034); note.rotation.z = (rnd() - 0.5) * 0.3; g.add(note);
    const pin = Prim.sphere(0.007, mats.solid([0xe53935, 0x1e88e5, 0x43a047][i % 3], { roughness: 0.3 }), { segments: 8 }); pin.position.set(px, py + nh / 2 - 0.012, 0.042); g.add(pin);
    // a scribble line on the note
    for (let l = 0; l < 3; l++) { const line = Prim.box(nw * 0.6, 0.004, 0.001, mats.solid(0x555555, { roughness: 0.9 })); line.position.set(px - nw * 0.05, py + nh * 0.25 - l * nh * 0.22, 0.0362); line.rotation.z = note.rotation.z; g.add(line); }
  }
  const photo = Prim.quad(0.14, 0.1, mats.image(ctx.tex.photo(9), { roughness: 0.6 }), { keepUV: true, cast: false }); photo.position.set(w / 2 - 0.12, h / 2 - 0.1, 0.035); photo.rotation.z = 0.08; g.add(photo);
  const pin2 = Prim.sphere(0.007, mats.solid(0xe53935, { roughness: 0.3 }), { segments: 8 }); pin2.position.set(w / 2 - 0.12, h / 2 - 0.055, 0.042); g.add(pin2);
  place(g, x, y, z, rotY);
  addStatic(ctx, g);
}

function wastebasket(ctx: Ctx, x: number, z: number) {
  const mats = ctx.mats;
  const g = new THREE.Group();
  const bin = Prim.cylinder(0.14, 0.11, 0.3, mats.paintedMetal(0x4b5563), { segments: 18, open: true }); bin.position.y = 0.15; g.add(bin);
  const bottom = Prim.cylinder(0.11, 0.11, 0.01, mats.paintedMetal(0x4b5563), { segments: 18 }); bottom.position.y = 0.005; g.add(bottom);
  const inner = Prim.cylinder(0.13, 0.105, 0.28, mats.solid(0x2f353d, { roughness: 0.8, side: THREE.BackSide }), { segments: 18, open: true }); inner.position.y = 0.15; g.add(inner);
  for (let i = 0; i < 3; i++) { const ballP = Prim.sphere(0.035, mats.solid(0xf1efe8, { roughness: 0.95, flatShading: true }), { segments: 7 }); ballP.position.set((ctx.rng() - 0.5) * 0.1, 0.06 + i * 0.05, (ctx.rng() - 0.5) * 0.1); g.add(ballP); }
  place(g, x, FLOOR, z, 0);
  addStatic(ctx, g, [{ size: [0.28, 0.3, 0.28], center: [0, 0.15, 0] }], { surface: 'metal' });
}

// -------------------------------------------------------------------------------------------
// Room
// -------------------------------------------------------------------------------------------

export function buildOffice(ctx: Ctx) {
  const mats = ctx.mats;
  const y = FLOOR;
  const W = 1.56, E = 7.85, B = -5.85, N = -1.56;

  // ---- lighting -------------------------------------------------------------------------------
  recessedLight(ctx, 3.6, CEIL, -3.7, 'bedroom4');
  recessedLight(ctx, 6.3, CEIL, -3.7, 'bedroom4');
  lightSwitch(ctx, W, y + 1.2, -2.9, FACE.posX, 'bedroom4', 'office lights');

  // ---- furniture --------------------------------------------------------------------------------
  daybed(ctx, W + 0.02 + 0.425, -4.98, FACE.posX);
  lDesk(ctx);
  officeChair(ctx, 6.7, -4.5, FACE.negZ);
  tableLamp(ctx, 6.05, y + 0.74, -5.58, { group: 'bedroom4-desk', label: 'desk lamp', color: 0x2a2c30, shadeColor: 0xe8e2d2, height: 0.5 });
  mug(ctx, 7.5, y + 0.74, -5.45, 0x2f5d8a, 'coffee mug');
  {
    const { g, shelfY } = shelfUnit(ctx, 1.0, 1.9, 0.3, 5, mats.walnut);
    // binders on the middle shelf
    const binderCols = [0x1f3a93, 0x1f3a93, 0xb91c1c, 0x374151, 0x047857];
    binderCols.forEach((c, i) => {
      const b = Prim.rbox(0.07, 0.3, 0.26, 0.006, mats.solid(c, { roughness: 0.55 })); b.position.set(-0.4 + i * 0.075, shelfY[2] + 0.15, -0.01); g.add(b);
      const lbl = Prim.box(0.045, 0.14, 0.004, mats.solid(0xf4f1e6, { roughness: 0.8 })); lbl.position.set(-0.4 + i * 0.075, shelfY[2] + 0.2, 0.122); g.add(lbl);
    });
    const boxFile = Prim.rbox(0.3, 0.25, 0.26, 0.006, mats.solid(0x8b7355, { roughness: 0.85 })); boxFile.position.set(0.3, shelfY[2] + 0.125, -0.01); g.add(boxFile);
    const globe = Prim.sphere(0.09, mats.solid(0x3b6ea5, { roughness: 0.4 }), { segments: 16 }); globe.position.set(0.3, shelfY[4] + 0.12, 0); g.add(globe);
    const globeBase = Prim.cylinder(0.05, 0.06, 0.03, mats.walnut, { segments: 12 }); globeBase.position.set(0.3, shelfY[4] + 0.015, 0); g.add(globeBase);
    const trophy = Prim.lathe([[0, 0], [0.04, 0], [0.04, 0.01], [0.012, 0.02], [0.012, 0.06], [0.045, 0.1], [0.05, 0.16], [0.045, 0.17], [0, 0.17]], mats.brass, { segments: 14 }); trophy.position.set(-0.3, shelfY[4], 0); g.add(trophy);
    placeStatic(ctx, g, 2.7, N - 0.02 - 0.15, FACE.negZ, [{ size: [1.0, 1.9, 0.3], center: [0, 0.95, 0] }]);
    bookRow(ctx, 2.7, y + shelfY[0], N - 0.17, 0.9, FACE.negZ, 0.3, 81);
    bookRow(ctx, 2.55, y + shelfY[1], N - 0.17, 0.6, FACE.negZ, 0.26, 82);
    bookRow(ctx, 2.7, y + shelfY[3], N - 0.17, 0.88, FACE.negZ, 0.24, 83);
    looseBook(ctx, 3.05, y + shelfY[1], N - 0.17, FACE.negZ + 0.3, 0x2f4858, 'manual');
  }
  printerCabinet(ctx, 4.05, N - 0.02 - 0.225, FACE.negZ);
  filingCabinet(ctx, E - 0.02 - 0.3, -3.75, FACE.negX);
  wastebasket(ctx, 5.66, -5.45);
  plant(ctx, 3.05, y, -5.4, 1.35, { potColor: 0x55524c });

  // ---- walls -------------------------------------------------------------------------------------
  whiteboard(ctx, W, y + 1.5, -2.2, FACE.posX);
  corkboard(ctx, 6.7, y + 1.58, B, FACE.posZ);
  wallClock(ctx, 5.2, y + 1.95, N, FACE.negZ, 0.16);
  {
    // framed certificate above the daybed
    const tex = ctx.tex.label('CERTIFICATE', { bg: '#f7f3e8', fg: '#2b2b2b', w: 512, h: 384, font: 'bold 54px Georgia, serif', sub: 'Best home office, 2026' });
    const g = new THREE.Group();
    const frame = Prim.rbox(0.44, 0.34, 0.025, 0.006, mats.solid(0x2a2018, { roughness: 0.5 })); frame.position.z = 0.0125; g.add(frame);
    const pic = Prim.quad(0.38, 0.28, mats.image(tex, { roughness: 0.8 }), { keepUV: true, cast: false }); pic.position.z = 0.026; g.add(pic);
    place(g, W, y + 1.75, -4.98, FACE.posX);
    addStatic(ctx, g);
  }

  // ---- soft goods -----------------------------------------------------------------------------------
  rug(ctx, 4.6, y, -3.75, 2.6, 1.9, 'green', 0);
  curtains(ctx, 4.75, y, B, FACE.posZ, 1.6, 2.3, 0x8a9a8a);
  curtains(ctx, E, y, -3.75, FACE.negX, 1.4, 2.3, 0x8a9a8a);
}
