/**
 * Rec room (room id 'rec'): sectional + TV wall, pool table, bar with neon sign, dartboard,
 * arcade cabinet, board-game shelf, beanbag, guitar, lamps and posters.
 */
import * as THREE from 'three';
import { Prim, mergeByMaterial } from '../Builder';
import type { Ctx } from '../Context';
import { pickup, recessedLight, floorLamp, lightSwitch, pictureFrame, rug, hinged, Toggle, bookRow } from '../Props';
import { FLOOR_Y, CEIL_H, CEIL_Y, bmats, labelQuad, imageMat, placeStatic, AnimatedScreen, lowSphere, type BasementPower } from './Basement.helpers';

const GROUP = 'rec';
const BALL_R = 0.0286;
const BALL_COLORS = [0xf5c400, 0x1f4fbf, 0xd22b2b, 0x5a2d91, 0xf07a1d, 0x1f8a3a, 0x7a1f2a, 0x121212];

// ---------------------------------------------------------------------------------------------
// canvas scenes
// ---------------------------------------------------------------------------------------------
function drawSports(c: CanvasRenderingContext2D, w: number, h: number, t: number) {
  c.fillStyle = '#2e8b3d'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; c.fillRect((i * w) / 8, 0, w / 8, h); }
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3;
  c.strokeRect(20, 20, w - 40, h - 40);
  c.beginPath(); c.moveTo(w / 2, 20); c.lineTo(w / 2, h - 20); c.stroke();
  c.beginPath(); c.arc(w / 2, h / 2, 40, 0, Math.PI * 2); c.stroke();
  c.strokeRect(20, h / 2 - 60, 60, 120); c.strokeRect(w - 80, h / 2 - 60, 60, 120);
  for (let i = 0; i < 10; i++) {
    const team = i < 5;
    const px = w / 2 + Math.sin(t * 0.7 + i * 1.3) * w * 0.36 + Math.cos(t * 0.4 + i) * 30;
    const py = h / 2 + Math.cos(t * 0.5 + i * 0.9) * h * 0.32;
    c.fillStyle = team ? '#e63946' : '#f1faee';
    c.beginPath(); c.arc(px, py, 7, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(px, py + 9, 8, 3, 0, 0, Math.PI * 2); c.fill();
  }
  const bx = w / 2 + Math.sin(t * 1.1) * w * 0.3, by = h / 2 + Math.sin(t * 1.7) * h * 0.25;
  c.fillStyle = '#fff'; c.beginPath(); c.arc(bx, by, 4, 0, Math.PI * 2); c.fill();
  // score bug
  c.fillStyle = 'rgba(10,12,30,0.88)'; c.fillRect(16, 14, 230, 34);
  c.fillStyle = '#ffd23f'; c.font = 'bold 18px Arial, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
  const secs = Math.floor(t) % 60, mins = 63 + (Math.floor(t / 60) % 27);
  c.fillText(`HOME 2 - 1 AWAY   ${mins}:${secs < 10 ? '0' : ''}${secs}`, 26, 31);
  c.fillStyle = '#e63946'; c.fillRect(236, 20, 26, 22); c.fillStyle = '#fff'; c.font = 'bold 12px Arial'; c.fillText('LIVE', 238, 31);
  // ticker
  c.fillStyle = 'rgba(10,12,30,0.9)'; c.fillRect(0, h - 28, w, 28);
  c.fillStyle = '#f1faee'; c.font = '16px Arial, sans-serif';
  const msg = 'DERBY DAY  ·  HOME LEAD 2-1 AT THE HOUR  ·  NEXT: CUP FINAL SATURDAY 8PM  ·  ';
  const tw = c.measureText(msg).width;
  const off = (t * 60) % tw;
  c.fillText(msg + msg, -off, h - 14);
}

function drawArcade(c: CanvasRenderingContext2D, w: number, h: number, t: number) {
  c.fillStyle = '#050614'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    const sx = (i * 97) % w, sy = ((i * 53) + t * (20 + (i % 3) * 15)) % h;
    c.fillStyle = i % 4 ? '#8fa3c7' : '#ffffff';
    c.fillRect(sx, sy, 2, 2);
  }
  const ox = Math.sin(t * 1.5) * 22;
  const cols = ['#7cf29a', '#f2e85c', '#f27b5c'];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
    const ax = 40 + i * 32 + ox, ay = 30 + r * 22 + (Math.floor(t * 2) % 2) * 2;
    c.fillStyle = cols[r];
    c.fillRect(ax, ay, 14, 8); c.fillRect(ax + 2, ay - 3, 10, 3); c.fillRect(ax - 3, ay + 3, 3, 6); c.fillRect(ax + 14, ay + 3, 3, 6);
    c.fillStyle = '#050614'; c.fillRect(ax + 3, ay + 2, 3, 2); c.fillRect(ax + 8, ay + 2, 3, 2);
  }
  const shipX = w / 2 + Math.sin(t * 0.8) * 70;
  c.fillStyle = '#5cd6f2';
  c.beginPath(); c.moveTo(shipX, h - 30); c.lineTo(shipX - 12, h - 12); c.lineTo(shipX + 12, h - 12); c.closePath(); c.fill();
  if (t % 1 < 0.5) { c.fillStyle = '#ff4d8d'; c.fillRect(shipX - 1, h - 30 - ((t % 0.5) * 240), 2, 12); }
  c.fillStyle = '#fff'; c.font = 'bold 11px monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
  c.fillText(`SCORE ${String(4250 + Math.floor(t) * 10).padStart(6, '0')}`, 8, 6);
  c.textAlign = 'right'; c.fillText('HI 012000', w - 8, 6);
  c.fillStyle = '#7cf29a'; c.fillRect(0, h - 4, w, 2);
}

function dartboardTexture(): THREE.CanvasTexture {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const c = cv.getContext('2d')!;
  const cx = S / 2, cy = S / 2, R = S / 2 - 2;
  c.fillStyle = '#111'; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
  const ring = (r0: number, r1: number, a: string, b: string) => {
    for (let i = 0; i < 20; i++) {
      const a0 = (i - 0.5) * (Math.PI / 10) - Math.PI / 2, a1 = a0 + Math.PI / 10;
      c.fillStyle = i % 2 ? a : b;
      c.beginPath(); c.arc(cx, cy, r1, a0, a1); c.arc(cx, cy, r0, a1, a0, true); c.closePath(); c.fill();
    }
  };
  ring(0.07 * R, 0.55 * R, '#1c1c1c', '#e8e0cf');
  ring(0.55 * R, 0.61 * R, '#c0272d', '#1f7a3a');
  ring(0.61 * R, 0.84 * R, '#1c1c1c', '#e8e0cf');
  ring(0.84 * R, 0.9 * R, '#c0272d', '#1f7a3a');
  c.fillStyle = '#1f7a3a'; c.beginPath(); c.arc(cx, cy, 0.07 * R, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#c0272d'; c.beginPath(); c.arc(cx, cy, 0.03 * R, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#c9c9c9'; c.lineWidth = 1.5;
  for (let i = 0; i < 20; i++) { const a = (i - 0.5) * (Math.PI / 10) - Math.PI / 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * 0.07 * R, cy + Math.sin(a) * 0.07 * R); c.lineTo(cx + Math.cos(a) * 0.9 * R, cy + Math.sin(a) * 0.9 * R); c.stroke(); }
  const nums = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  c.fillStyle = '#eee'; c.font = 'bold 26px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
  nums.forEach((n, i) => { const a = i * (Math.PI / 10) - Math.PI / 2; c.fillText(String(n), cx + Math.cos(a) * 0.95 * R, cy + Math.sin(a) * 0.95 * R); });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------------------------------------------------------------------------------------------

function poolBall(ctx: Ctx, x: number, y: number, z: number, num: number) {
  const m = ctx.mats;
  const glossy = (c: number) => m.solid(c, { roughness: 0.15, envMapIntensity: 1.0, physical: true, clearcoat: 0.8 });
  const g = new THREE.Group();
  if (num === 0) g.add(lowSphere(BALL_R, glossy(0xf4f1e6)));
  else if (num <= 8) g.add(lowSphere(BALL_R, glossy(BALL_COLORS[num - 1])));
  else {
    g.add(lowSphere(BALL_R, glossy(0xf4f1e6)));
    const band = Prim.cylinder(BALL_R * 1.012, BALL_R * 1.012, BALL_R * 0.95, glossy(BALL_COLORS[num - 9]), { segments: 14 });
    g.add(band);
  }
  if (num > 0 && num <= 8) {
    const dot = Prim.cylinder(BALL_R * 0.4, BALL_R * 0.4, 0.0015, glossy(0xf4f1e6), { segments: 10, cast: false });
    dot.position.y = BALL_R;
    g.add(dot);
  }
  g.position.set(x, y, z);
  g.rotation.set(ctx.rng() * 3, ctx.rng() * 3, ctx.rng() * 3);
  return pickup(ctx, mergeByMaterial(g), { name: num === 0 ? 'cue ball' : `${num} ball`, mass: 0.17, shape: { type: 'sphere', radius: BALL_R }, restitution: 0.55, friction: 0.35 });
}

function sodaCan(ctx: Ctx, x: number, y: number, z: number, color: number, name = 'soda can') {
  const m = ctx.mats;
  const g = new THREE.Group();
  const body = Prim.cylinder(0.033, 0.033, 0.115, m.solid(color, { roughness: 0.3, metalness: 0.6, envMapIntensity: 1.0 }), { segments: 14 });
  body.position.y = 0.0575;
  g.add(body);
  const top = Prim.cylinder(0.03, 0.033, 0.01, m.chrome, { segments: 14 });
  top.position.y = 0.12;
  g.add(top);
  g.position.set(x, y, z);
  g.rotation.y = ctx.rng() * 6;
  return pickup(ctx, mergeByMaterial(g), { name, mass: 0.3, shape: { type: 'cylinder', radius: 0.034, height: 0.125 }, offset: new THREE.Vector3(0, 0.0625, 0) });
}

function bottleProfile(kind: 'wine' | 'whisky' | 'gin'): [number, number][] {
  switch (kind) {
    case 'wine': return [[0, 0], [0.034, 0], [0.037, 0.02], [0.037, 0.2], [0.03, 0.24], [0.013, 0.28], [0.013, 0.32], [0.015, 0.33], [0, 0.33]];
    case 'whisky': return [[0, 0], [0.042, 0], [0.045, 0.02], [0.045, 0.16], [0.034, 0.19], [0.017, 0.21], [0.017, 0.26], [0.021, 0.27], [0, 0.27]];
    case 'gin': return [[0, 0], [0.03, 0], [0.032, 0.02], [0.032, 0.22], [0.02, 0.26], [0.012, 0.28], [0.012, 0.31], [0.014, 0.32], [0, 0.32]];
  }
}

function neonSegments(ch: string, x0: number, w: number, h: number, mat: THREE.Material, stroke: number, out: THREE.Object3D) {
  const seg = (ax: number, ay: number, bx: number, by: number) => {
    const len = Math.hypot(bx - ax, by - ay) + stroke;
    const b = Prim.rbox(len, stroke, stroke, stroke * 0.45, mat, { segments: 2 });
    b.position.set((ax + bx) / 2, (ay + by) / 2, 0);
    b.rotation.z = Math.atan2(by - ay, bx - ax);
    out.add(b);
  };
  if (ch === 'B') {
    seg(x0, 0, x0, h); seg(x0, h, x0 + w * 0.8, h); seg(x0, h / 2, x0 + w * 0.78, h / 2); seg(x0, 0, x0 + w * 0.85, 0);
    seg(x0 + w * 0.8, h, x0 + w * 0.8, h / 2); seg(x0 + w * 0.85, h / 2, x0 + w * 0.85, 0);
  } else if (ch === 'A') {
    seg(x0, 0, x0 + w / 2, h); seg(x0 + w, 0, x0 + w / 2, h); seg(x0 + w * 0.2, h * 0.4, x0 + w * 0.8, h * 0.4);
  } else if (ch === 'R') {
    seg(x0, 0, x0, h); seg(x0, h, x0 + w * 0.8, h); seg(x0, h * 0.5, x0 + w * 0.78, h * 0.5);
    seg(x0 + w * 0.8, h, x0 + w * 0.8, h * 0.5); seg(x0 + w * 0.4, h * 0.5, x0 + w * 0.95, 0);
  }
}

export function buildRecRoom(ctx: Ctx, power: BasementPower) {
  const m = ctx.mats;
  const bm = bmats(ctx);
  const y0 = FLOOR_Y;
  const rng = ctx.rng;

  // ------------------------------------------------------------------ lights (registered first so decor can attach emissives)
  const lightA = recessedLight(ctx, -6.0, CEIL_Y, 4.2, GROUP, { intensity: 14, distance: 7 });
  const lightB = recessedLight(ctx, -2.9, CEIL_Y, 3.4, GROUP, { intensity: 13, distance: 7 });
  const lightC = recessedLight(ctx, -6.2, CEIL_Y, -3.9, GROUP, { intensity: 14, distance: 7 });
  const lightD = recessedLight(ctx, -2.9, CEIL_Y, -2.6, GROUP, { intensity: 13, distance: 7 });
  void lightA; void lightB;
  const attach = (light: typeof lightC, mesh: THREE.Mesh, on: THREE.Material, off: THREE.Material) => {
    (light.emissives ??= []).push({ mesh, on, off });
    mesh.material = light.on ? on : off;
  };

  // ------------------------------------------------------------------ sectional sofa (faces the TV wall at x=-7.85)
  {
    const fab = m.fabric(0x596273);
    const fabDark = m.fabric(0x4a525f);
    const g = new THREE.Group();
    const part = (w: number, h: number, d: number, x: number, y: number, z: number, mat = fab, r = 0.03) => {
      const b = Prim.rbox(w, h, d, r, mat);
      b.position.set(x, y, z);
      g.add(b);
      return b;
    };
    // bases
    part(0.95, 0.36, 3.25, -5.275, 0.23, 4.225, fabDark, 0.02);
    part(1.45, 0.36, 0.95, -6.475, 0.23, 5.375, fabDark, 0.02);
    // backs
    part(0.25, 0.82, 3.45, -4.675, 0.45, 4.125, fab, 0.05);
    part(1.45, 0.82, 0.25, -6.475, 0.45, 5.725, fab, 0.05);
    // arms
    part(1.2, 0.6, 0.22, -5.15, 0.31, 2.51, fab, 0.05);
    part(0.22, 0.6, 0.95, -7.31, 0.31, 5.375, fab, 0.05);
    // feet
    const footMat = m.solid(0x2a2320, { roughness: 0.5 });
    for (const [x, z] of [[-5.7, 2.65], [-4.85, 2.65], [-5.7, 5.8], [-7.15, 5.8], [-7.15, 4.95], [-5.7, 4.2]]) {
      const f = Prim.cylinder(0.03, 0.035, 0.06, footMat, { segments: 10 });
      f.position.set(x, 0.03, z);
      g.add(f);
    }
    // seat cushions
    part(0.87, 0.15, 1.09, -5.285, 0.485, 3.175, fab, 0.05);
    part(0.87, 0.15, 1.09, -5.285, 0.485, 4.295, fab, 0.05);
    part(0.87, 0.15, 0.92, -5.285, 0.485, 5.35, fab, 0.05);
    part(1.39, 0.15, 0.9, -6.475, 0.485, 5.36, fab, 0.05);
    // back cushions (leaning)
    for (const z of [3.175, 4.295, 5.35]) {
      const c = part(0.17, 0.44, 1.05, -4.9, 0.8, z, fab, 0.05);
      c.rotation.z = -0.12;
    }
    const rc = part(1.35, 0.44, 0.17, -6.475, 0.8, 5.53, fab, 0.05);
    rc.rotation.x = 0.12;
    // throw pillows
    const pillows: [number, number, number, number, number][] = [[-4.98, 0.78, 3.0, 0xc9a15a, Math.PI / 2 + 0.25], [-5.02, 0.78, 4.55, 0x9c4a3c, Math.PI / 2 - 0.2], [-6.95, 0.78, 5.42, 0xe7e2d6, 0.3]];
    for (const [x, y, z, col, yaw] of pillows) {
      const p = Prim.rbox(0.42, 0.42, 0.12, 0.04, m.fabric(col));
      p.position.set(x, y, z);
      p.rotation.set(0, yaw, 0.08);
      g.add(p);
    }
    // folded throw blanket over the return arm
    const blanket = m.quilt(0xb4553f);
    const bl = Prim.rbox(0.28, 0.06, 0.62, 0.02, blanket);
    bl.position.set(-7.31, 0.64, 5.375);
    g.add(bl);
    const flap = Prim.rbox(0.05, 0.36, 0.6, 0.015, blanket);
    flap.position.set(-7.44, 0.44, 5.36);
    g.add(flap);
    placeStatic(ctx, g, 0, 0, 0, [
      { size: [1.2, 0.85, 3.45], center: [-5.15, 0.425, 4.125] },
      { size: [1.65, 0.85, 0.95], center: [-6.575, 0.425, 5.375] },
    ], 'fabric');
  }

  // ------------------------------------------------------------------ TV wall: console, TV, soundbar, game console
  {
    const g = new THREE.Group();
    const consoleMat = m.espresso;
    const body = Prim.rbox(0.47, 0.5, 1.8, 0.01, consoleMat);
    body.position.set(-7.615, 0.28, 4.0);
    g.add(body);
    for (const z of [3.55, 4.45]) {
      const door = Prim.rbox(0.012, 0.34, 0.82, 0.004, m.solid(0x3a2a20, { roughness: 0.55 }));
      door.position.set(-7.372, 0.24, z);
      g.add(door);
      const knob = Prim.cylinder(0.008, 0.008, 0.02, m.brass, { segments: 8 });
      knob.rotation.z = Math.PI / 2;
      knob.position.set(-7.36, 0.24, z + (z < 4 ? 0.3 : -0.3));
      g.add(knob);
    }
    // open shelf slot above the doors
    const slot = Prim.box(0.42, 0.1, 1.7, m.solid(0x1c1512, { roughness: 0.8 }));
    slot.position.set(-7.6, 0.46, 4.0);
    g.add(slot);
    const gameConsole = Prim.rbox(0.28, 0.06, 0.3, 0.01, m.plasticBlack);
    gameConsole.position.set(-7.6, 0.44, 4.35);
    g.add(gameConsole);
    const led = Prim.box(0.004, 0.006, 0.05, m.emissive(0x3ec6ff, 2, 0x113344));
    led.position.set(-7.457, 0.44, 4.35);
    g.add(led);
    const soundbar = Prim.rbox(0.09, 0.06, 0.95, 0.02, m.plasticBlack);
    soundbar.position.set(-7.62, 0.56, 4.0);
    g.add(soundbar);
    const grille = Prim.box(0.005, 0.04, 0.9, m.solid(0x2c2e33, { roughness: 0.9 }));
    grille.position.set(-7.574, 0.56, 4.0);
    g.add(grille);
    // TV
    const frame = Prim.rbox(0.045, 0.86, 1.48, 0.006, m.plasticBlack);
    frame.position.set(-7.815, 1.36, 4.0);
    g.add(frame);
    const mount = Prim.box(0.03, 0.3, 0.4, bm.steelDark);
    mount.position.set(-7.84, 1.36, 4.0);
    g.add(mount);
    // cable
    const cable = Prim.cylinder(0.005, 0.005, 0.5, bm.rubber, { segments: 6 });
    cable.position.set(-7.83, 0.8, 4.05);
    g.add(cable);
    // wall shelf with a photo + speakers either side
    for (const z of [3.0, 5.0]) {
      const spk = Prim.rbox(0.18, 0.3, 0.16, 0.01, m.plasticBlack);
      spk.position.set(-7.74, 0.65, z);
      g.add(spk);
    }
    placeStatic(ctx, g, 0, 0, 0, [{ size: [0.5, 0.53, 1.85], center: [-7.6, 0.265, 4.0] }, { size: [0.1, 0.07, 0.96], center: [-7.62, 0.565, 4.0] }], 'wood');

    const screen = new AnimatedScreen(ctx, 512, 288, drawSports, 12);
    const onMat = imageMat(ctx, screen.tex, { emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.3 });
    const scr = Prim.quad(1.42, 0.8, m.screenOff, { keepUV: true, cast: false });
    scr.rotation.y = Math.PI / 2;
    scr.position.set(-7.79, y0 + 1.36, 4.0);
    ctx.dynamic.add(scr);
    const pos = scr.position.clone();
    const tv = new Toggle(scr, { on: 'Turn off TV', off: 'Turn on TV' }, (on) => {
      scr.material = on ? onMat : m.screenOff;
      screen.on = on;
      ctx.audio.play(on ? 'tvOn' : 'tvOff', pos);
      if (on) ctx.audio.startLoop('recTV', 'tv', pos, 0.18); else ctx.audio.stopLoop('recTV');
    }, pos);
    tv.radius = 3.2;
    ctx.interact.add(tv);
    power.listeners.push((on) => { if (!on) tv.set(false); });

    // controllers (pickups) on the console top
    for (const [z, col] of [[3.22, 0x1a1a1c], [3.5, 0xf0f0ec]] as [number, number][]) {
      const cg = new THREE.Group();
      const bodyM = m.solid(col, { roughness: 0.45 });
      const b = Prim.rbox(0.1, 0.035, 0.15, 0.015, bodyM);
      cg.add(b);
      for (const s of [-1, 1]) {
        const grip = Prim.rbox(0.05, 0.035, 0.06, 0.02, bodyM);
        grip.position.set(0.03, -0.005, s * 0.07);
        cg.add(grip);
        const stick = Prim.cylinder(0.008, 0.008, 0.012, m.plasticBlack, { segments: 8 });
        stick.position.set(-0.01, 0.022, s * 0.03);
        cg.add(stick);
      }
      cg.position.set(-7.49, y0 + 0.53 + 0.022, z);
      cg.rotation.y = (rng() - 0.5) * 0.3;
      pickup(ctx, mergeByMaterial(cg), { name: 'game controller', mass: 0.25, shape: { type: 'box', size: new THREE.Vector3(0.11, 0.04, 0.2) } });
    }
  }

  // ------------------------------------------------------------------ coffee table + snacks + rug + end table
  rug(ctx, -6.25, y0, 4.05, 3.0, 3.4, 'neutral');
  {
    const g = new THREE.Group();
    const top = Prim.rbox(0.6, 0.04, 1.1, 0.01, m.walnut);
    top.position.set(0, 0.4, 0);
    g.add(top);
    const shelf = Prim.rbox(0.5, 0.02, 0.95, 0.005, m.walnut);
    shelf.position.set(0, 0.14, 0);
    g.add(shelf);
    for (const [x, z] of [[-0.25, -0.5], [0.25, -0.5], [-0.25, 0.5], [0.25, 0.5]]) {
      const leg = Prim.cylinder(0.012, 0.012, 0.38, m.darkMetal, { segments: 8 });
      leg.position.set(x, 0.19, z);
      g.add(leg);
    }
    // magazines on the shelf
    for (let i = 0; i < 3; i++) {
      const mag = Prim.box(0.21, 0.006, 0.28, m.solid([0x2f6fd0, 0xd85a1e, 0xf0f0ec][i], { roughness: 0.6 }));
      mag.position.set(0.02 * i, 0.155 + i * 0.006, -0.2 + i * 0.03);
      mag.rotation.y = (i - 1) * 0.15;
      g.add(mag);
    }
    // coasters
    for (const z of [-0.3, 0.35]) {
      const co = Prim.cylinder(0.045, 0.045, 0.005, m.solid(0x2c2c2c, { roughness: 0.9 }), { segments: 12 });
      co.position.set(0.15, 0.4225, z);
      g.add(co);
    }
    placeStatic(ctx, g, -6.5, 3.9, 0, [{ size: [0.62, 0.42, 1.12], center: [0, 0.21, 0] }], 'wood');
    // popcorn bowl (pickup)
    const bowl = new THREE.Group();
    const bowlMesh = Prim.lathe([[0, 0], [0.07, 0], [0.13, 0.05], [0.145, 0.095], [0.135, 0.095], [0.12, 0.05], [0.065, 0.012], [0, 0.012]], m.ceramic, { segments: 20 });
    bowl.add(bowlMesh);
    const popMat = m.solid(0xf6eccb, { roughness: 0.9 });
    for (let i = 0; i < 14; i++) {
      const a = rng() * Math.PI * 2, r = rng() * 0.09;
      const p = Prim.sphere(0.018 + rng() * 0.01, popMat, { segments: 7 });
      p.position.set(Math.cos(a) * r, 0.07 + rng() * 0.04, Math.sin(a) * r);
      p.scale.set(1, 0.8, 1.1);
      bowl.add(p);
    }
    bowl.position.set(-6.55, y0 + 0.42, 3.75);
    pickup(ctx, mergeByMaterial(bowl), { name: 'bowl of popcorn', mass: 0.5, shape: { type: 'cylinder', radius: 0.145, height: 0.12 }, offset: new THREE.Vector3(0, 0.06, 0) });
    sodaCan(ctx, -6.35, y0 + 0.42, 4.25, 0xc0392b);
    sodaCan(ctx, -6.62, y0 + 0.42, 4.35, 0x2e86de);
    sodaCan(ctx, -6.4, y0 + 0.42, 3.4, 0xd8d8d2, 'seltzer can');
    // remote
    const remote = Prim.rbox(0.045, 0.018, 0.17, 0.006, m.plasticBlack);
    remote.position.set(-6.6, y0 + 0.43, 4.05);
    remote.rotation.y = 0.4;
    pickup(ctx, remote, { name: 'remote', mass: 0.15, shape: { type: 'box', size: new THREE.Vector3(0.045, 0.018, 0.17) } });
  }
  // end table by the sofa arm
  {
    const g = new THREE.Group();
    const top = Prim.rbox(0.45, 0.03, 0.45, 0.01, m.walnut);
    top.position.y = 0.55;
    g.add(top);
    const low = Prim.rbox(0.4, 0.02, 0.4, 0.01, m.walnut);
    low.position.y = 0.15;
    g.add(low);
    for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) {
      const leg = Prim.box(0.03, 0.55, 0.03, m.walnut);
      leg.position.set(x, 0.275, z);
      g.add(leg);
    }
    const books = Prim.box(0.24, 0.09, 0.18, m.image(ctx.tex.bookRow(7), { roughness: 0.7 }), { keepUV: true });
    books.position.set(0, 0.205, 0);
    g.add(books);
    placeStatic(ctx, g, -5.15, 2.1, 0.1, [{ size: [0.47, 0.565, 0.47], center: [0, 0.2825, 0] }], 'wood');
    sodaCan(ctx, -5.05, y0 + 0.565, 2.2, 0x27ae60);
  }

  // ------------------------------------------------------------------ beanbag + guitar on a stand
  {
    const g = new THREE.Group();
    const bean = Prim.sphere(0.5, m.fabric(0xb85c3c), { segments: 18 });
    bean.scale.set(1, 0.56, 1);
    bean.position.y = 0.27;
    g.add(bean);
    const dent = Prim.sphere(0.34, m.fabric(0xa4502f), { segments: 14 });
    dent.scale.set(1, 0.3, 1);
    dent.position.set(-0.08, 0.42, 0.06);
    g.add(dent);
    placeStatic(ctx, g, -3.1, 4.7, 0, [], 'fabric');
    ctx.physics.addCylinder({ x: -3.1, y: y0 + 0.25, z: 4.7 }, 0.45, 0.5, { meta: { surface: 'fabric' } });
  }
  {
    const g = new THREE.Group();
    const wood = m.solid(0xd9a866, { roughness: 0.35, envMapIntensity: 0.8, physical: true, clearcoat: 0.6 });
    const bodyG = new THREE.Group();
    const lower = Prim.cylinder(0.2, 0.2, 0.09, wood, { segments: 24 });
    lower.rotation.x = Math.PI / 2; lower.position.y = 0.2;
    bodyG.add(lower);
    const upper = Prim.cylinder(0.15, 0.15, 0.09, wood, { segments: 20 });
    upper.rotation.x = Math.PI / 2; upper.position.y = 0.44;
    bodyG.add(upper);
    const hole = Prim.cylinder(0.045, 0.045, 0.004, m.solid(0x1a120c, { roughness: 0.9 }), { segments: 16, cast: false });
    hole.rotation.x = Math.PI / 2; hole.position.set(0, 0.34, 0.046);
    bodyG.add(hole);
    const bridge = Prim.box(0.12, 0.01, 0.012, m.solid(0x2a1a10, { roughness: 0.6 }));
    bridge.position.set(0, 0.2, 0.048);
    bodyG.add(bridge);
    const neck = Prim.box(0.05, 0.62, 0.02, m.espresso);
    neck.position.set(0, 0.8, 0.02);
    bodyG.add(neck);
    const head = Prim.rbox(0.07, 0.15, 0.015, 0.01, m.espresso);
    head.position.set(0, 1.16, 0.02);
    bodyG.add(head);
    const strings = Prim.box(0.03, 0.9, 0.002, m.chrome);
    strings.position.set(0, 0.68, 0.05);
    bodyG.add(strings);
    bodyG.rotation.x = -0.18;
    bodyG.position.y = 0.06;
    g.add(bodyG);
    // stand
    const stMat = m.darkMetal;
    const post = Prim.cylinder(0.01, 0.01, 0.75, stMat, { segments: 8 });
    post.position.set(0, 0.375, -0.16);
    g.add(post);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const leg = Prim.cylinder(0.007, 0.007, 0.36, stMat, { segments: 6 });
      leg.position.set(Math.cos(a) * 0.14, 0.12, -0.16 + Math.sin(a) * 0.14);
      leg.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      g.add(leg);
    }
    const cradle = Prim.box(0.1, 0.02, 0.06, stMat);
    cradle.position.set(0, 0.74, -0.09);
    g.add(cradle);
    placeStatic(ctx, g, -2.15, 3.7, -Math.PI / 2 - 0.4, [{ size: [0.45, 1.25, 0.4], center: [0, 0.62, -0.05] }], 'wood');
  }

  // ------------------------------------------------------------------ pool table + balls + billiard lamp
  const TX = -5.2, TZ = -1.0;
  {
    const g = new THREE.Group();
    const felt = m.fabric(0x1e6b3a);
    for (const [x, z] of [[-0.55, -1.1], [0.55, -1.1], [-0.55, 1.1], [0.55, 1.1]]) {
      const leg = Prim.rbox(0.16, 0.62, 0.16, 0.01, m.walnut);
      leg.position.set(x, 0.31, z);
      g.add(leg);
    }
    const apron = Prim.rbox(1.42, 0.18, 2.54, 0.01, m.walnut);
    apron.position.y = 0.69;
    g.add(apron);
    const bed = Prim.box(1.18, 0.03, 2.3, felt);
    bed.position.y = 0.77;
    g.add(bed);
    for (const x of [-0.65, 0.65]) {
      const r = Prim.rbox(0.12, 0.05, 2.54, 0.012, m.walnut);
      r.position.set(x, 0.805, 0);
      g.add(r);
      const c = Prim.box(0.04, 0.035, 2.2, felt);
      c.position.set(x + (x < 0 ? 0.07 : -0.07), 0.8, 0);
      g.add(c);
    }
    for (const z of [-1.21, 1.21]) {
      const r = Prim.rbox(1.42, 0.05, 0.12, 0.012, m.walnut);
      r.position.set(0, 0.805, z);
      g.add(r);
      const c = Prim.box(1.1, 0.035, 0.04, felt);
      c.position.set(0, 0.8, z + (z < 0 ? 0.07 : -0.07));
      g.add(c);
    }
    const pocketMat = m.solid(0x151515, { roughness: 0.8 });
    const leatherMat = m.leather(0x3b2a20);
    for (const [x, z] of [[-0.61, -1.17], [0.61, -1.17], [-0.61, 1.17], [0.61, 1.17], [-0.66, 0], [0.66, 0]]) {
      const p = Prim.cylinder(0.062, 0.062, 0.012, pocketMat, { segments: 14 });
      p.position.set(x, 0.836, z);
      g.add(p);
      const bag = Prim.cylinder(0.055, 0.05, 0.1, leatherMat, { segments: 12 });
      bag.position.set(x, 0.55, z);
      g.add(bag);
    }
    // rail sights
    const sight = m.solid(0xe8dcc0, { roughness: 0.4 });
    for (let i = -3; i <= 3; i++) {
      for (const x of [-0.65, 0.65]) {
        const s = Prim.cylinder(0.008, 0.008, 0.002, sight, { segments: 6, cast: false });
        s.position.set(x, 0.831, i * 0.3);
        g.add(s);
      }
    }
    placeStatic(ctx, g, TX, TZ, 0, [
      { size: [1.42, 0.79, 2.54], center: [0, 0.395, 0] },
      { size: [0.12, 0.05, 2.54], center: [-0.65, 0.805, 0] },
      { size: [0.12, 0.05, 2.54], center: [0.65, 0.805, 0] },
      { size: [1.42, 0.05, 0.12], center: [0, 0.805, -1.21] },
      { size: [1.42, 0.05, 0.12], center: [0, 0.805, 1.21] },
    ], 'wood');
    // balls
    const by = y0 + 0.79 + BALL_R + 0.002;
    const rack = [[1], [9, 2], [10, 8, 3], [11, 7, 14, 4], [5, 13, 15, 6, 12]];
    const apexZ = TZ - 0.6;
    rack.forEach((row, r) => row.forEach((num, i) => {
      poolBall(ctx, TX + (i - r / 2) * (2 * BALL_R + 0.0015), by, apexZ - r * (2 * BALL_R + 0.001) * Math.cos(Math.PI / 6), num);
    }));
    poolBall(ctx, TX + 0.05, by, TZ + 0.6, 0);
    // billiard lamp (emissive-only, toggles with the room lights)
    const lg = new THREE.Group();
    const shade = Prim.rbox(0.95, 0.18, 0.36, 0.02, m.paintedMetal(0x2f5a3c));
    shade.position.y = CEIL_H - 0.75;
    lg.add(shade);
    for (const z of [-0.18, 0.18]) {
      const trim = Prim.box(0.97, 0.02, 0.02, m.brass);
      trim.position.set(0, CEIL_H - 0.84, z);
      lg.add(trim);
    }
    for (const z of [-0.3, 0.3]) {
      const chain = Prim.cylinder(0.003, 0.003, 0.66, m.brass, { segments: 6 });
      chain.position.set(0, CEIL_H - 0.33, z);
      lg.add(chain);
    }
    placeStatic(ctx, lg, TX, TZ, 0, [], 'metal');
    const bulbOn = m.emissive(0xffe0b0, 1.3, 0xfff4e0), bulbOff = m.solid(0xf1ece2, { roughness: 0.4 });
    for (const x of [-0.3, 0, 0.3]) {
      const b = Prim.sphere(0.032, bulbOn, { segments: 12, cast: false });
      b.position.set(TX + x, CEIL_Y - 0.86, TZ);
      ctx.dynamic.add(b);
      attach(lightC, b, bulbOn, bulbOff);
    }
  }

  // ------------------------------------------------------------------ cue rack (east wall) + chalk
  {
    const g = new THREE.Group();
    const plate = Prim.rbox(0.02, 0.95, 0.32, 0.005, m.walnut);
    plate.position.set(0, 1.42, 0);
    g.add(plate);
    const ledge = Prim.box(0.09, 0.02, 0.32, m.walnut);
    ledge.position.set(-0.045, 0.96, 0);
    g.add(ledge);
    const shelf = Prim.box(0.12, 0.02, 0.32, m.walnut);
    shelf.position.set(-0.06, 1.2, 0);
    g.add(shelf);
    const clipMat = m.solid(0x2a2a2a, { roughness: 0.6 });
    for (const z of [-0.08, 0.08]) {
      const clip = Prim.box(0.05, 0.03, 0.04, clipMat);
      clip.position.set(-0.03, 1.8, z);
      g.add(clip);
      const cue = Prim.lathe([[0, 0], [0.0145, 0], [0.0145, 0.02], [0.014, 0.5], [0.009, 0.9], [0.0065, 1.44], [0, 1.45]], m.maple, { segments: 10 });
      cue.position.set(-0.045, 0.97, z);
      g.add(cue);
      const wrap = Prim.cylinder(0.0148, 0.0146, 0.32, m.solid(0x1c1c1c, { roughness: 0.7 }), { segments: 10 });
      wrap.position.set(-0.045, 1.35, z);
      g.add(wrap);
      const tip = Prim.cylinder(0.0066, 0.0066, 0.012, m.solid(0x2a5fb8, { roughness: 0.8 }), { segments: 8 });
      tip.position.set(-0.045, 2.425, z);
      g.add(tip);
    }
    // triangle rack hanging on the wall
    const tri = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const bar = Prim.box(0.02, 0.03, 0.34, m.walnut);
      const a = (i / 3) * Math.PI * 2;
      bar.position.set(0, Math.sin(a) * 0.098, Math.cos(a) * 0.098);
      bar.rotation.x = a + Math.PI / 2;
      tri.add(bar);
    }
    tri.position.set(-0.012, 1.6, -0.55);
    g.add(tri);
    placeStatic(ctx, g, -1.56, -1.65, 0, [{ size: [0.06, 1.0, 0.36], center: [-0.02, 1.5, 0] }], 'wood');
    const chalk = Prim.rbox(0.024, 0.022, 0.024, 0.003, m.solid(0x2a5fb8, { roughness: 0.95 }));
    chalk.position.set(-1.655, y0 + 1.223, -1.72);
    pickup(ctx, chalk, { name: 'cue chalk', mass: 0.05, shape: { type: 'box', size: new THREE.Vector3(0.024, 0.022, 0.024) } });
  }

  // ------------------------------------------------------------------ bar (SW corner)
  {
    const g = new THREE.Group();
    const beer = m.beadboard;
    const top = m.walnut;
    const put = (mesh: THREE.Mesh, x: number, y: number, z: number, ry = 0) => { mesh.position.set(x, y, z); mesh.rotation.y = ry; g.add(mesh); return mesh; };
    // back-bar cabinet + counter top
    put(Prim.rboxUp(1.45, 0.9, 0.5, 0.01, m.espresso), -6.975, 0, -5.6);
    for (const x of [-7.33, -6.62]) {
      put(Prim.rbox(0.66, 0.78, 0.012, 0.004, m.solid(0x3a2a20, { roughness: 0.55 })), x, 0.45, -5.344);
      const kn = Prim.cylinder(0.008, 0.008, 0.02, m.brass, { segments: 8 });
      kn.rotation.x = Math.PI / 2;
      put(kn, x + (x < -7 ? 0.28 : -0.28), 0.45, -5.335);
    }
    put(Prim.rbox(2.05, 0.04, 0.55, 0.008, top), -6.7, 0.92, -5.6);
    // mini fridge body (hollow so the inside shows when opened)
    const fr = m.solid(0x202225, { roughness: 0.35, metalness: 0.2, envMapIntensity: 0.7 });
    const liner = m.solid(0xe8e9e6, { roughness: 0.5 });
    put(Prim.box(0.5, 0.85, 0.03, fr), -5.95, 0.425, -5.835);
    put(Prim.box(0.03, 0.85, 0.5, fr), -6.185, 0.425, -5.6);
    put(Prim.box(0.03, 0.85, 0.5, fr), -5.715, 0.425, -5.6);
    put(Prim.box(0.5, 0.03, 0.5, fr), -5.95, 0.835, -5.6);
    put(Prim.box(0.5, 0.05, 0.5, fr), -5.95, 0.025, -5.6);
    put(Prim.box(0.44, 0.76, 0.01, liner), -5.95, 0.43, -5.815);
    put(Prim.box(0.01, 0.76, 0.44, liner), -6.165, 0.43, -5.6);
    put(Prim.box(0.01, 0.76, 0.44, liner), -5.735, 0.43, -5.6);
    put(Prim.box(0.42, 0.012, 0.4, m.glassFrosted), -5.95, 0.42, -5.6);
    for (const [x, z, col] of [[-6.05, -5.55, 0xc0392b], [-5.9, -5.65, 0x2e86de], [-6.0, -5.7, 0x27ae60]] as [number, number, number][]) {
      const can = Prim.cylinder(0.033, 0.033, 0.115, m.solid(col, { roughness: 0.3, metalness: 0.6, envMapIntensity: 1.0 }), { segments: 12 });
      put(can, x, 0.11, z);
      const can2 = Prim.cylinder(0.033, 0.033, 0.115, m.solid(col, { roughness: 0.3, metalness: 0.6, envMapIntensity: 1.0 }), { segments: 12 });
      put(can2, x + 0.02, 0.49, z);
    }
    // upper shelves + smoked back panel
    put(Prim.box(2.05, 0.9, 0.02, m.solid(0x2a2d33, { roughness: 0.15, metalness: 0.6, envMapIntensity: 1.2 })), -6.7, 1.6, -5.84);
    for (const yy of [1.28, 1.63, 1.98]) {
      put(Prim.rbox(2.05, 0.03, 0.26, 0.006, top), -6.7, yy, -5.72);
      for (const x of [-7.68, -5.72]) put(Prim.box(0.02, 0.1, 0.2, m.brass), x, yy - 0.065, -5.72);
    }
    // bar counter (L)
    put(Prim.rboxUp(1.975, 1.0, 0.55, 0.01, m.espresso), -6.1125, 0, -4.3);
    put(Prim.rboxUp(0.55, 1.0, 1.275, 0.01, m.espresso), -5.4, 0, -5.2125);
    put(Prim.box(1.9, 0.88, 0.014, beer), -6.1, 0.5, -4.018);
    put(Prim.box(0.014, 0.88, 1.2, beer), -5.118, 0.5, -5.25);
    put(Prim.rbox(2.14, 0.06, 0.7, 0.012, top), -6.08, 1.03, -4.33);
    put(Prim.rbox(0.7, 0.06, 1.17, 0.012, top), -5.36, 1.03, -5.265);
    // foot rails
    const rail1 = Prim.cylinder(0.02, 0.02, 1.95, m.brass, { segments: 10 });
    rail1.rotation.z = Math.PI / 2;
    put(rail1, -6.1, 0.2, -3.9);
    const rail2 = Prim.cylinder(0.02, 0.02, 1.15, m.brass, { segments: 10 });
    rail2.rotation.x = Math.PI / 2;
    put(rail2, -4.99, 0.2, -5.25);
    for (const x of [-6.9, -6.1, -5.3]) put(Prim.box(0.03, 0.03, 0.12, m.brass), x, 0.2, -3.96);
    for (const z of [-5.7, -4.8]) put(Prim.box(0.12, 0.03, 0.03, m.brass), -5.05, 0.2, z);
    // tap tower + drip tray, coasters, shaker
    put(Prim.cylinder(0.06, 0.07, 0.012, m.chrome, { segments: 16 }), -5.45, 1.066, -4.42);
    put(Prim.cylinder(0.035, 0.04, 0.3, m.chrome, { segments: 16 }), -5.45, 1.22, -4.42);
    for (const dx of [-0.03, 0.03]) {
      const spout = Prim.cylinder(0.008, 0.008, 0.06, m.chrome, { segments: 8 });
      spout.rotation.x = Math.PI / 2;
      put(spout, -5.45 + dx, 1.3, -4.36);
      const handle = Prim.rbox(0.025, 0.11, 0.02, 0.008, m.solid(dx < 0 ? 0x1f2a44 : 0x8b1e2d, { roughness: 0.4 }));
      handle.rotation.x = -0.35;
      put(handle, -5.45 + dx, 1.42, -4.38);
    }
    put(Prim.rbox(0.26, 0.015, 0.12, 0.004, m.chrome), -5.45, 1.067, -4.25);
    for (const [x, z] of [[-6.5, -4.2], [-6.9, -4.35], [-5.95, -4.15]]) put(Prim.cylinder(0.045, 0.045, 0.005, m.solid(0x2c2c2c, { roughness: 0.9 }), { segments: 12 }), x, 1.063, z);
    put(Prim.lathe([[0, 0], [0.04, 0], [0.045, 0.12], [0.035, 0.19], [0.03, 0.22], [0.02, 0.23], [0, 0.23]], m.chrome, { segments: 16 }), -6.9, 1.06, -4.5);
    // bottle caps + labels are static; glass parts are gathered below (transparent → dynamic)
    const bottles: { kind: 'wine' | 'whisky' | 'gin'; x: number; y: number; z: number; color: number; label?: string }[] = [];
    const cols = [0x2f7a3e, 0x4a2d16, 0x8fd3ff, 0x9b1f2e, 0x1b3d8f, 0xd8b15a, 0xe8e8e8];
    const kinds: ('wine' | 'whisky' | 'gin')[] = ['wine', 'whisky', 'gin'];
    const names = ['OLD OAK', 'GIN No.7', 'RED FOX', 'ISLA', 'BLUE TAP', 'AMBER'];
    let n = 0;
    for (const [yy, count] of [[1.295, 6], [1.645, 6], [1.995, 4]] as [number, number][]) {
      for (let i = 0; i < count; i++) {
        const x = -7.55 + i * (count === 4 ? 0.44 : 0.34) + (rng() - 0.5) * 0.04;
        bottles.push({ kind: kinds[(n + i) % 3], x, y: yy, z: -5.71 + (rng() - 0.5) * 0.04, color: cols[(n * 3 + i) % cols.length], label: n % 2 === 0 ? names[i % names.length] : undefined });
        n++;
      }
    }
    const glassG = new THREE.Group();
    for (const b of bottles) {
      const prof = bottleProfile(b.kind);
      const gm = m.solid(b.color, { opacity: 0.7, roughness: 0.08, envMapIntensity: 1.1 });
      const mesh = Prim.lathe(prof, gm, { segments: 14 });
      mesh.position.set(b.x, y0 + b.y, b.z);
      glassG.add(mesh);
      const capY = prof[prof.length - 1][1];
      const capR = prof[prof.length - 2][0];
      const cap = Prim.cylinder(capR + 0.002, capR + 0.002, 0.028, m.solid([0x111111, 0xc9a44a, 0x8b1e2d][n % 3], { roughness: 0.4, metalness: 0.5 }), { segments: 10 });
      put(cap, b.x, b.y + capY - 0.01, b.z);
      const bodyR = Math.max(...prof.map((p) => p[0]));
      const band = Prim.cylinder(bodyR + 0.0015, bodyR + 0.0015, capY * 0.22, bm.paper, { segments: 14 });
      put(band, b.x, b.y + capY * 0.33, b.z);
      if (b.label) {
        const lq = labelQuad(ctx, b.label, bodyR * 1.5, capY * 0.16, { bg: '#f1e9d6', fg: '#3b2412', font: 'bold 70px Georgia, serif' });
        put(lq, b.x, b.y + capY * 0.33, b.z + bodyR + 0.003);
      }
      n++;
    }
    // glasses
    const glass = m.glassClear;
    for (const x of [-7.4, -7.2, -6.5, -6.3]) {
      const tumbler = Prim.lathe([[0, 0], [0.033, 0], [0.036, 0.01], [0.038, 0.09], [0.035, 0.09], [0.033, 0.012], [0, 0.012]], glass, { segments: 14 });
      tumbler.position.set(x, y0 + 0.94, -5.5 + (rng() - 0.5) * 0.06);
      glassG.add(tumbler);
    }
    for (const x of [-6.0, -5.85]) {
      const wine = Prim.lathe([[0, 0], [0.03, 0], [0.03, 0.005], [0.004, 0.01], [0.004, 0.08], [0.022, 0.09], [0.031, 0.13], [0.028, 0.18], [0, 0.18]], glass, { segments: 14 });
      wine.position.set(x, y0 + 2.01, -5.72);
      glassG.add(wine);
    }
    ctx.dynamic.add(mergeByMaterial(glassG));
    // LED strips under the shelves (emissive, follow the room lights)
    const ledOn = m.emissive(0xffd9a0, 1.6, 0xfff0d8), ledOff = m.solid(0xd8d0c0, { roughness: 0.5 });
    for (const yy of [1.28, 1.63, 1.98]) {
      const strip = Prim.box(1.95, 0.008, 0.02, ledOn, { cast: false });
      strip.position.set(-6.7, y0 + yy - 0.02, -5.6);
      ctx.dynamic.add(strip);
      attach(lightC, strip, ledOn, ledOff);
    }
    // neon "BAR" sign
    const neonG = new THREE.Group();
    const neonOn = m.emissive(0xff4d8d, 3.2, 0xff2a6f);
    const neonOff = m.solid(0xd88aa6, { roughness: 0.35, envMapIntensity: 0.6 });
    neonSegments('B', -0.36, 0.22, 0.34, neonOn, 0.028, neonG);
    neonSegments('A', -0.08, 0.24, 0.34, neonOn, 0.028, neonG);
    neonSegments('R', 0.22, 0.22, 0.34, neonOn, 0.028, neonG);
    const neon = mergeByMaterial(neonG).children[0] as THREE.Mesh;
    neon.position.set(-6.7, y0 + 2.12, -5.8);
    ctx.dynamic.add(neon);
    attach(lightC, neon, neonOn, neonOff);
    put(Prim.rbox(0.98, 0.5, 0.016, 0.006, m.solid(0x15171a, { roughness: 0.6 })), -6.7, 2.31, -5.838);
    // a couple of framed things on the smoked panel? keep it clean. Bar mat on the counter:
    put(Prim.rbox(0.5, 0.008, 0.2, 0.003, bm.rubber), -6.5, 1.064, -4.4);
    placeStatic(ctx, g, 0, 0, 0, [
      { size: [1.45, 0.94, 0.5], center: [-6.975, 0.47, -5.6] },
      { size: [0.5, 0.88, 0.5], center: [-5.95, 0.44, -5.6] },
      { size: [2.14, 1.06, 0.7], center: [-6.08, 0.53, -4.33] },
      { size: [0.7, 1.06, 1.3], center: [-5.36, 0.53, -5.2] },
    ], 'wood');
    // mini fridge door (hinged) in its own dynamic group
    const fd = new THREE.Group();
    fd.position.set(-5.95, y0, -5.6);
    ctx.dynamic.add(fd);
    hinged(ctx, fd, new THREE.Vector3(-0.24, 0.42, 0.25), (pivot) => {
      const leaf = Prim.rbox(0.48, 0.82, 0.03, 0.006, fr);
      leaf.position.set(0.24, 0, 0.015);
      pivot.add(leaf);
      const handle = Prim.rbox(0.02, 0.3, 0.02, 0.006, m.chrome);
      handle.position.set(0.44, 0.05, 0.04);
      pivot.add(handle);
      const logo = labelQuad(ctx, 'FRIGO', 0.08, 0.02, { bg: '#202225', fg: '#c9c9c9', font: 'bold 60px Arial, sans-serif' });
      logo.position.set(0.24, -0.34, 0.031);
      pivot.add(logo);
    }, 'mini fridge', { maxAngle: -Math.PI * 0.55, sfx: 'fridge' });
    // beer bottle on the counter (pickup)
    const bb = Prim.lathe(bottleProfile('gin').map(([r, y]) => [r * 0.9, y * 0.75] as [number, number]), m.solid(0x4a2d16, { opacity: 0.85, roughness: 0.1, envMapIntensity: 1.0 }), { segments: 12 });
    bb.position.set(-6.6, y0 + 1.06, -4.25);
    pickup(ctx, bb, { name: 'beer bottle', mass: 0.4, shape: { type: 'cylinder', radius: 0.03, height: 0.24 }, offset: new THREE.Vector3(0, 0.12, 0) });
  }
  // bar stools
  for (const x of [-6.75, -6.15, -5.55]) {
    const g = new THREE.Group();
    const base = Prim.cylinder(0.17, 0.19, 0.02, m.chrome, { segments: 20 });
    base.position.y = 0.01;
    g.add(base);
    const col = Prim.cylinder(0.024, 0.024, 0.7, m.chrome, { segments: 12 });
    col.position.y = 0.36;
    g.add(col);
    const ring = Prim.torus(0.15, 0.01, m.chrome);
    ring.position.y = 0.26;
    g.add(ring);
    const seat = Prim.cylinder(0.18, 0.17, 0.07, m.leather(0x3b2a20), { segments: 20 });
    seat.position.y = 0.755;
    g.add(seat);
    const back = Prim.rbox(0.3, 0.16, 0.03, 0.01, m.leather(0x3b2a20));
    back.position.set(0, 0.9, -0.16);
    back.rotation.x = 0.15;
    g.add(back);
    for (const sx of [-0.12, 0.12]) {
      const p = Prim.cylinder(0.008, 0.008, 0.16, m.chrome, { segments: 8 });
      p.position.set(sx, 0.83, -0.15);
      g.add(p);
    }
    placeStatic(ctx, g, x, -3.62, Math.PI + (rng() - 0.5) * 0.4, [], 'metal');
    ctx.physics.addCylinder({ x, y: y0 + 0.4, z: -3.62 }, 0.19, 0.8, { meta: { surface: 'metal' } });
  }

  // ------------------------------------------------------------------ dartboard (west wall) with darts
  {
    const g = new THREE.Group();
    const back = Prim.cylinder(0.33, 0.33, 0.02, m.solid(0x1a1a1c, { roughness: 0.8 }), { segments: 32 });
    back.rotation.z = -Math.PI / 2;
    back.position.set(0.01, 1.73, 0);
    g.add(back);
    const face = Prim.cylinder(0.225, 0.225, 0.035, imageMat(ctx, dartboardTexture(), { roughness: 0.7 }), { segments: 40, keepUV: true });
    face.rotation.z = -Math.PI / 2;
    face.position.set(0.0375, 1.73, 0);
    g.add(face);
    const flightMats = [m.solid(0xc0272d, { roughness: 0.6, side: THREE.DoubleSide }), m.solid(0x1f4fbf, { roughness: 0.6, side: THREE.DoubleSide }), m.solid(0xf2c230, { roughness: 0.6, side: THREE.DoubleSide })];
    for (let i = 0; i < 3; i++) {
      const d = new THREE.Group();
      const shaft = Prim.cylinder(0.004, 0.004, 0.12, m.chrome, { segments: 6 });
      shaft.rotation.z = -Math.PI / 2;
      shaft.position.x = 0.06;
      d.add(shaft);
      const barrel = Prim.cylinder(0.006, 0.006, 0.05, m.solid(0x333333, { roughness: 0.4, metalness: 0.7 }), { segments: 8 });
      barrel.rotation.z = -Math.PI / 2;
      barrel.position.x = 0.035;
      d.add(barrel);
      for (const rot of [0, Math.PI / 2]) {
        const f = Prim.quad(0.045, 0.035, flightMats[i], { cast: false });
        f.rotation.set(0, Math.PI / 2, 0);
        f.rotateX(rot);
        f.position.x = 0.115;
        d.add(f);
      }
      d.position.set(0.055, 1.73 + (rng() - 0.5) * 0.12, (rng() - 0.5) * 0.12);
      d.rotation.z = -0.15 - rng() * 0.1;
      d.rotation.y = (rng() - 0.5) * 0.2;
      g.add(d);
    }
    placeStatic(ctx, g, -7.85, -2.6, 0, [], 'wood');
    // throw line on the floor
    const line = Prim.box(0.02, 0.003, 0.6, m.solid(0xe8e0cf, { roughness: 0.9 }));
    line.position.set(-5.5, y0 + 0.0025, -2.6);
    ctx.batch.add(line);
  }

  // ------------------------------------------------------------------ arcade cabinet (east wall)
  {
    const g = new THREE.Group();
    const body = Prim.rboxUp(0.7, 1.85, 0.75, 0.01, m.plasticBlack);
    g.add(body);
    const sideArt = [m.solid(0xe33e6b, { roughness: 0.5 }), m.solid(0x3ec6e0, { roughness: 0.5 })];
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const stripe = Prim.box(0.006, 1.4, 0.08, sideArt[i]);
        stripe.position.set(sx * 0.352, 1.0, -0.2 + i * 0.16);
        stripe.rotation.x = 0.25;
        g.add(stripe);
      }
    }
    const panel = Prim.rbox(0.66, 0.06, 0.32, 0.01, m.solid(0x2a2c30, { roughness: 0.5 }));
    panel.position.set(0, 0.98, 0.45);
    panel.rotation.x = -0.18;
    g.add(panel);
    const stick = Prim.cylinder(0.008, 0.008, 0.08, m.chrome, { segments: 8 });
    stick.position.set(-0.18, 1.04, 0.45);
    g.add(stick);
    const knob = Prim.sphere(0.02, m.solid(0xc0272d, { roughness: 0.3 }), { segments: 10 });
    knob.position.set(-0.18, 1.085, 0.45);
    g.add(knob);
    for (const [x, col] of [[0.05, 0xc0272d], [0.12, 0xf2c230], [0.19, 0x1f4fbf]] as [number, number][]) {
      const b = Prim.cylinder(0.014, 0.014, 0.014, m.solid(col, { roughness: 0.3 }), { segments: 10 });
      b.position.set(x, 1.015, 0.45 + (x - 0.12) * 0.3);
      g.add(b);
    }
    const bezel = Prim.box(0.6, 0.5, 0.02, m.solid(0x101012, { roughness: 0.8 }));
    bezel.position.set(0, 1.35, 0.33);
    bezel.rotation.x = -0.2;
    g.add(bezel);
    const coin = Prim.rbox(0.28, 0.2, 0.012, 0.004, bm.steelGrey);
    coin.position.set(0, 0.5, 0.378);
    g.add(coin);
    for (const x of [-0.06, 0.06]) {
      const slot = Prim.box(0.03, 0.06, 0.01, m.solid(0xc0272d, { roughness: 0.5 }));
      slot.position.set(x, 0.53, 0.385);
      g.add(slot);
    }
    const kick = Prim.box(0.66, 0.1, 0.01, bm.steelDark);
    kick.position.set(0, 0.05, 0.38);
    g.add(kick);
    placeStatic(ctx, g, -1.96, -4.8, -Math.PI / 2, [{ size: [0.72, 1.85, 0.95], center: [0, 0.925, 0.1] }], 'wood');
    // screen + marquee (emissive, toggle with the room lights)
    const arc = new AnimatedScreen(ctx, 256, 192, drawArcade, 10);
    const arcOn = imageMat(ctx, arc.tex, { emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.3 });
    const scr = Prim.quad(0.5, 0.4, arcOn, { keepUV: true, cast: false });
    const local = new THREE.Vector3(0, 1.35, 0.345);
    const yaw = -Math.PI / 2;
    const w = local.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(-1.96, y0, -4.8));
    scr.position.copy(w);
    scr.rotation.set(0, yaw, 0);
    scr.rotateX(-0.2);
    ctx.dynamic.add(scr);
    attach(lightD, scr, arcOn, m.screenOff);
    lightD.onToggle = (on) => { arc.on = on; };
    arc.on = lightD.on;
    const marqTex = ctx.tex.label('GALAXY RAID', { bg: '#120a2e', fg: '#ffd23f', font: 'bold 90px Impact, "Arial Black", sans-serif', w: 512, h: 128 });
    const marqOn = imageMat(ctx, marqTex, { emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.4 });
    const marq = Prim.quad(0.62, 0.155, marqOn, { keepUV: true, cast: false });
    const ml = new THREE.Vector3(0, 1.74, 0.38).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(-1.96, y0, -4.8));
    marq.position.copy(ml);
    marq.rotation.set(0, yaw, 0);
    ctx.dynamic.add(marq);
    attach(lightD, marq, marqOn, m.solid(0x2a2040, { roughness: 0.6 }));
  }

  // ------------------------------------------------------------------ board-game shelf (east wall)
  {
    const g = new THREE.Group();
    const W = 1.0, H = 1.8, D = 0.34;
    const side = (x: number) => { const s = Prim.box(0.02, H, D, m.espresso); s.position.set(x, H / 2, 0); g.add(s); };
    side(-W / 2 + 0.01); side(W / 2 - 0.01);
    for (const yy of [0.01, 0.45, 0.9, 1.35, H - 0.01]) {
      const s = Prim.box(W - 0.04, 0.02, D - 0.02, m.espresso);
      s.position.set(0, yy, 0.01);
      g.add(s);
    }
    const back = Prim.box(W, H, 0.01, m.espresso);
    back.position.set(0, H / 2, -D / 2 + 0.005);
    g.add(back);
    const games: [string, number][] = [['MONOPOLY', 0xc0392b], ['SCRABBLE', 0x8e2a2a], ['CATAN', 0xe67e22], ['RISK', 0x2c3e50], ['CLUE', 0x8e44ad], ['TICKET TO RIDE', 0x2e86de], ['UNO', 0xf1c40f], ['CHESS', 0x27ae60], ['PICTIONARY', 0x16a085], ['JENGA', 0xd35400], ['SORRY!', 0x2980b9], ['TRIVIA', 0x7f8c8d]];
    let gi = 0;
    for (const [shelfY, count] of [[0.02, 4], [0.46, 4], [0.91, 4]] as [number, number][]) {
      let yy = shelfY;
      for (let i = 0; i < count; i++) {
        const [name, col] = games[gi++ % games.length];
        const bw = 0.36 + rng() * 0.08, bd = 0.25 + rng() * 0.04, bh = 0.055 + rng() * 0.015;
        const box = Prim.rbox(bw, bh, bd, 0.004, m.solid(col, { roughness: 0.55 }));
        const ox = (rng() - 0.5) * 0.06;
        box.position.set(ox, yy + bh / 2, 0.01);
        g.add(box);
        const lbl = labelQuad(ctx, name, bw * 0.85, bh * 0.75, { bg: '#' + new THREE.Color(col).getHexString(), fg: '#fff8e8', font: 'bold 110px Impact, "Arial Black", sans-serif', tw: 512, th: 96 });
        lbl.position.set(ox, yy + bh / 2, 0.01 + bd / 2 + 0.002);
        g.add(lbl);
        yy += bh;
      }
    }
    // top shelf: trophy + dice cup + a small plant pot
    const trophy = Prim.lathe([[0, 0], [0.05, 0], [0.05, 0.015], [0.015, 0.02], [0.015, 0.09], [0.06, 0.12], [0.065, 0.2], [0.05, 0.21], [0, 0.21]], m.brass, { segments: 14 });
    trophy.position.set(-0.3, 1.37, 0);
    g.add(trophy);
    const cup = Prim.cylinder(0.04, 0.035, 0.09, m.leather(0x5a3a26), { segments: 12 });
    cup.position.set(0.05, 1.415, 0.02);
    g.add(cup);
    for (let i = 0; i < 4; i++) {
      const die = Prim.rbox(0.016, 0.016, 0.016, 0.003, m.solid(0xf4f1e6, { roughness: 0.4 }));
      die.position.set(0.2 + rng() * 0.15, 1.378, (rng() - 0.5) * 0.15);
      die.rotation.y = rng() * 2;
      g.add(die);
    }
    placeStatic(ctx, g, -1.74, -3.05, -Math.PI / 2, [{ size: [W, H, D], center: [0, H / 2, 0] }], 'wood');
    bookRow(ctx, -1.72, y0 + 1.81, -3.3, 0.5, -Math.PI / 2, 0.2, 21);
  }

  // ------------------------------------------------------------------ posters, pennants, lamps, switch
  pictureFrame(ctx, -1.56, y0 + 1.55, 3.9, -Math.PI / 2, 0.6, 0.8, ctx.tex.art(2, 0.75), { frameColor: 0x1a1a1a });
  pictureFrame(ctx, -3.2, y0 + 1.6, 5.85, Math.PI, 0.9, 0.65, ctx.tex.art(6, 1.38), { frameColor: 0x3a2a20 });
  pictureFrame(ctx, -7.85, y0 + 1.55, 0.9, Math.PI / 2, 0.55, 0.75,
    ctx.tex.label('GAME NIGHT', { bg: '#1d2a44', fg: '#ffd23f', sub: 'EVERY FRIDAY · 8PM · BRING SNACKS', font: 'bold 64px Impact, "Arial Black", sans-serif', w: 384, h: 512 }), { frameColor: 0x111111 });
  pictureFrame(ctx, -7.85, y0 + 1.6, -0.6, Math.PI / 2, 0.55, 0.75,
    ctx.tex.label('POOL RULES', { bg: '#f4efe4', fg: '#1f2a44', sub: 'RACK EM · CHALK UP · NO MASSÉ', font: 'bold 70px Georgia, serif', w: 384, h: 512 }), { frameColor: 0x3a2a20 });
  {
    const g = new THREE.Group();
    const pennant = (z: number, col: number, stripe: number, tilt: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.11); shape.lineTo(0.55, 0); shape.lineTo(0, -0.11); shape.closePath();
      const p = Prim.extrude(shape, 0.008, m.fabric(col));
      const s = Prim.box(0.02, 0.24, 0.012, m.fabric(stripe));
      s.position.x = 0.01;
      const pg = new THREE.Group();
      pg.add(p, s);
      pg.position.set(0, 2.2, z);
      pg.rotation.set(0, -Math.PI / 2, tilt);
      g.add(pg);
    };
    pennant(-4.9, 0x1f3a93, 0xf4f1e6, -0.2);
    pennant(-3.9, 0x9b1c2e, 0xd6b25a, -0.12);
    pennant(-2.4, 0x1f7a3a, 0xf4f1e6, -0.25);
    placeStatic(ctx, g, -1.56, 0, 0, [], 'fabric');
  }
  floorLamp(ctx, -7.55, y0, 2.35, { group: GROUP });
  floorLamp(ctx, -2.0, y0, 5.45, { group: GROUP });
  lightSwitch(ctx, -1.56, y0 + 1.2, 2.55, -Math.PI / 2, GROUP);
}
