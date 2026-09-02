/**
 * DiningRoom — formal dining room: mahogany table for six with full place settings, slatted
 * chairs, a six-arm brass chandelier, walnut sideboard (decanter, candlesticks, fruit bowl,
 * buffet lamp), a china cabinet with hinged glass doors, a bar cart, beadboard wainscoting
 * with a chair rail, curtains, paintings, a mirror, a clock and a corner plant.
 *
 * Room: x -8..-1.5, z -6..0 (ground floor). Openings: west window (z=-3), back window
 * (x=-4.75), hall door on the east wall (z=-0.7, swings in), wide arch to the living room
 * on the front wall (x=-4.75).
 */
import * as THREE from 'three';
import type { Ctx } from '../Context';
import type { Structure } from '../Structure';
import { roomById, LEVELS, HOUSE } from '../Plan';
import { Prim, mergeByMaterial } from '../Builder';
import { addStatic, recessedLight, lightSwitch, tableLamp, pictureFrame, rug, plant, curtains, wallClock, pickup, collider } from '../Props';
import { buildTable, buildChair, placeSetting, chandelier, buildSideboard, buildChinaCabinet, buildBarCart, wineGlass } from './DiningRoom.furniture';
import { ceilingMedallion, wallSconce } from './DiningRoom.decor';

export function buildDiningRoom(ctx: Ctx, structure: Structure) {
  void structure;
  const mats = ctx.mats;
  const room = roomById('dining');
  const lvl = LEVELS[room.floor];
  const Y = lvl.y;
  const CEIL = Y + lvl.ceiling;
  // inner wall faces
  const WX0 = room.x0 + HOUSE.extWall / 2; // -7.85 west (exterior)
  const WX1 = room.x1 - HOUSE.intWall / 2; // -1.56 east (to hall)
  const WZ0 = room.z0 + HOUSE.extWall / 2; // -5.85 back (exterior)
  const WZ1 = room.z1 - HOUSE.intWall / 2; // -0.06 front (to living room, arch)
  const GROUP = room.id; // 'dining'

  // shared transparent mesh for all the glassware in the room
  const glassGroup = new THREE.Group();

  // ---------------------------------------------------------------------------------------
  // Wainscoting: painted board-and-batten panels below a chair rail on every wall,
  // interrupted by the door, the arch and the window casings (panels run up to the sills)
  // ---------------------------------------------------------------------------------------
  {
    const wains = new THREE.Group();
    const RAIL_Y = 0.9, PANEL_Y0 = 0.10, PANEL_Y1 = 0.87, SILL_Y = 0.82;
    const paint = mats.trim;
    type Seg = [number, number, boolean]; // [from, to, underWindow]
    const run = (along: 'x' | 'z', face: number, inward: 1 | -1, segs: Seg[]) => {
      for (const [a, b, under] of segs) {
        const L = b - a;
        if (L < 0.05) continue;
        const c = (a + b) / 2;
        const y1 = under ? SILL_Y : PANEL_Y1;
        const ph = y1 - PANEL_Y0;
        const panel = along === 'x' ? Prim.box(L, ph, 0.01, paint, { cast: false }) : Prim.box(0.01, ph, L, paint, { cast: false });
        const pOff = inward * 0.005;
        if (along === 'x') panel.position.set(c, Y + PANEL_Y0 + ph / 2, face + pOff); else panel.position.set(face + pOff, Y + PANEL_Y0 + ph / 2, c);
        wains.add(panel);
        // vertical battens, evenly spaced, one at each end of the segment
        const n = Math.max(1, Math.round(L / 0.4));
        const bh = ph - 0.02;
        for (let k = 0; k <= n; k++) {
          const p = a + (L * k) / n + (k === 0 ? 0.03 : k === n ? -0.03 : 0);
          const bat = along === 'x' ? Prim.box(0.05, bh, 0.022, paint) : Prim.box(0.022, bh, 0.05, paint);
          const bOff = inward * 0.011;
          if (along === 'x') bat.position.set(p, Y + PANEL_Y0 + ph / 2, face + bOff); else bat.position.set(face + bOff, Y + PANEL_Y0 + ph / 2, p);
          wains.add(bat);
        }
        if (under) continue;
        const rail = along === 'x' ? Prim.rbox(L, 0.06, 0.03, 0.006, mats.trim) : Prim.rbox(0.03, 0.06, L, 0.006, mats.trim);
        const rOff = inward * 0.015;
        if (along === 'x') rail.position.set(c, Y + RAIL_Y, face + rOff); else rail.position.set(face + rOff, Y + RAIL_Y, c);
        wains.add(rail);
        const cap = along === 'x' ? Prim.box(L, 0.014, 0.045, mats.trim) : Prim.box(0.045, 0.014, L, mats.trim);
        const cOff = inward * 0.0225;
        if (along === 'x') cap.position.set(c, Y + RAIL_Y + 0.037, face + cOff); else cap.position.set(face + cOff, Y + RAIL_Y + 0.037, c);
        wains.add(cap);
      }
    };
    // west wall (faces +x): window z -3.8..-2.2, casing to ±0.87
    run('z', WX0, 1, [[WZ0, -3.87, false], [-3.87, -2.13, true], [-2.13, WZ1, false]]);
    // back wall (faces +z): window x -5.65..-3.85
    run('x', WZ0, 1, [[WX0, -5.72, false], [-5.72, -3.78, true], [-3.78, WX1, false]]);
    // east wall (faces -x): door z -1.15..-0.25 with casing -1.225..-0.175
    run('z', WX1, -1, [[WZ0, -1.225, false], [-0.175, WZ1, false]]);
    // front wall (faces -z): arch x -6.35..-3.15 with casing -6.435..-3.065
    run('x', WZ1, -1, [[WX0, -6.435, false], [-3.065, WX1, false]]);
    addStatic(ctx, wains, [], { worldUV: true });
  }

  // ---------------------------------------------------------------------------------------
  // Rug, table, chairs, place settings, centrepiece
  // ---------------------------------------------------------------------------------------
  const TX = -4.75, TZ = -3.1; // table centre
  rug(ctx, TX, Y, TZ, 3.5, 2.5, 'blue', 0);
  const FURN_Y = Y + 0.02; // furniture stands on the rug
  buildTable(ctx, TX, FURN_Y, TZ);
  const TOP = FURN_Y + 0.75;

  const cushion = mats.fabric(0x62748f);
  const rnd = ctx.rng;
  const jitter = () => (rnd() - 0.5) * 0.08;
  // chairs: [x, z, rotY] — rotY makes the chair face the table
  const chairs: [number, number, number][] = [
    [TX - 0.5, TZ + 0.62, Math.PI], [TX + 0.5, TZ + 0.62, Math.PI],
    [TX - 0.5, TZ - 0.62, 0], [TX + 0.5, TZ - 0.62, 0],
    [TX - 1.17, TZ, Math.PI / 2], [TX + 1.17, TZ, -Math.PI / 2],
  ];
  const chairProto = buildChair(ctx, cushion);
  chairs.forEach(([cx, cz, ry], i) => {
    // one chair is pulled out and angled a little, the rest have small jitter
    const pulled = i === 5;
    const px = cx + (pulled ? 0.16 : 0), pz = cz + (pulled ? 0.05 : 0);
    const c = chairProto.clone();
    c.position.set(px, FURN_Y, pz);
    c.rotation.y = ry + (pulled ? 0.35 : jitter());
    addStatic(ctx, c, [{ size: [0.45, 0.98, 0.45], center: [0, 0.49, 0] }]);
  });
  // place settings (napkins in a deep red linen), local +z toward the table centre
  const napkin = mats.fabric(0x8a2e2e);
  const settings: [number, number, number][] = [
    [TX - 0.5, TZ + 0.32, Math.PI], [TX + 0.5, TZ + 0.32, Math.PI],
    [TX - 0.5, TZ - 0.32, 0], [TX + 0.5, TZ - 0.32, 0],
    [TX - 0.78, TZ, Math.PI / 2], [TX + 0.78, TZ, -Math.PI / 2],
  ];
  const settingProto = placeSetting(ctx, napkin);
  const RUNNER_T = 0.006; // the two end settings sit on the runner, the side ones on bare wood
  for (const [sx, sz, ry] of settings) {
    const s = settingProto.clone();
    s.position.set(sx, TOP + (Math.abs(ry) === Math.PI / 2 ? RUNNER_T : 0), sz);
    s.rotation.y = ry;
    addStatic(ctx, s, []);
    // wine glass ahead-right of the plate (world space, into the shared glass mesh)
    s.updateMatrixWorld(true);
    const glass = wineGlass(ctx);
    glass.position.copy(s.localToWorld(new THREE.Vector3(-0.15, 0, 0.17)));
    glassGroup.add(glass);
  }

  {
    // table runner + centrepiece vase with flowers + salt & pepper
    const g = new THREE.Group();
    const runner = Prim.rbox(2.0, RUNNER_T, 0.36, 0.002, mats.fabric(0x2f3d5c));
    runner.position.set(0, RUNNER_T / 2, 0);
    g.add(runner);
    const vase = Prim.lathe([[0, 0], [0.045, 0], [0.06, 0.02], [0.07, 0.09], [0.062, 0.16], [0.04, 0.2], [0.036, 0.24], [0.042, 0.27], [0.032, 0.27], [0.03, 0.25], [0, 0.25]], mats.solid(0x2f5f7a, { roughness: 0.15, physical: true, clearcoat: 0.8 }), { segments: 20 });
    vase.position.set(0, 0.006, 0);
    g.add(vase);
    const stemMat = mats.solid(0x3f6b3a, { roughness: 0.8 });
    const petalColors = [0xd9433a, 0xf2c94c, 0xf4f0e6, 0xe58ab4, 0xc9542a, 0xf7d7e0];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.6;
      const tilt = 0.25 + rnd() * 0.45;
      const len = 0.22 + rnd() * 0.12;
      const stem = Prim.cylinder(0.003, 0.004, len, stemMat, { segments: 6 });
      stem.position.set(Math.sin(a) * len * 0.5 * Math.sin(tilt), 0.25 + Math.cos(tilt) * len * 0.5, Math.cos(a) * len * 0.5 * Math.sin(tilt));
      stem.rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt);
      g.add(stem);
      const tipX = Math.sin(a) * len * Math.sin(tilt), tipY = 0.25 + Math.cos(tilt) * len, tipZ = Math.cos(a) * len * Math.sin(tilt);
      const col = petalColors[Math.floor(rnd() * petalColors.length)];
      const head = i % 3 === 2
        ? Prim.cone(0.022, 0.05, mats.solid(col, { roughness: 0.7 }), { segments: 8 })
        : Prim.sphere(0.026 + rnd() * 0.012, mats.solid(col, { roughness: 0.75 }), { segments: 10 });
      head.position.set(tipX, tipY + 0.015, tipZ);
      g.add(head);
      if (i % 2 === 0) {
        const leaf = Prim.sphere(0.012, stemMat, { segments: 6 });
        leaf.scale.set(1.2, 0.3, 2.6);
        leaf.position.set(tipX * 0.6, 0.25 + Math.cos(tilt) * len * 0.6, tipZ * 0.6);
        leaf.rotation.y = a;
        g.add(leaf);
      }
    }
    for (const sx of [-0.3, 0.3]) {
      const shaker = Prim.lathe([[0, 0], [0.016, 0], [0.018, 0.03], [0.014, 0.06], [0.012, 0.07], [0, 0.072]], sx < 0 ? mats.ceramic : mats.solid(0x333333, { roughness: 0.4 }), { segments: 12 });
      shaker.position.set(sx, 0.006, 0.06);
      g.add(shaker);
      const cap = Prim.cylinder(0.011, 0.013, 0.012, mats.chrome, { segments: 12 });
      cap.position.set(sx, 0.006 + 0.07, 0.06);
      g.add(cap);
    }
    g.position.set(TX, TOP, TZ);
    addStatic(ctx, g, []);
  }

  // ---------------------------------------------------------------------------------------
  // Chandelier (under a plaster medallion) + ceiling cans + sconces + switch
  // ---------------------------------------------------------------------------------------
  ceilingMedallion(ctx, TX, CEIL, TZ, 0.36);
  chandelier(ctx, glassGroup, TX, CEIL - 0.028, TZ, GROUP); // canopy tucks up inside the medallion boss
  recessedLight(ctx, -2.6, CEIL, -5.0, GROUP, { intensity: 9, distance: 6 });
  recessedLight(ctx, -6.9, CEIL, -5.0, GROUP, { intensity: 9, distance: 6 });
  // brass candle sconces flanking the landscape on the east wall (painting spans z -3.8..-2.6)
  wallSconce(ctx, WX1 - 0.004, Y + 1.62, -4.1, -Math.PI / 2, GROUP);
  wallSconce(ctx, WX1 - 0.004, Y + 1.62, -2.3, -Math.PI / 2, GROUP);
  // switch on the latch side of the hall door (door z -1.15..-0.25, latch side toward the corner)
  lightSwitch(ctx, WX1 - 0.003, Y + 1.2, -0.125, -Math.PI / 2, GROUP, 'dining room lights');

  // ---------------------------------------------------------------------------------------
  // Sideboard on the back wall (east of the window) with everything on it
  // ---------------------------------------------------------------------------------------
  const SBX = -2.6, SBZ = WZ0 + 0.27;
  const sbTop = Y + buildSideboard(ctx, SBX, Y, SBZ);
  // buffet lamp at the east end (own group so the room switch leaves it alone)
  tableLamp(ctx, -1.95, sbTop, SBZ, { group: 'diningLamp', label: 'buffet lamp', color: 0x7a4a2a, shadeColor: 0xf1e6cf, height: 0.5 });
  {
    const g = new THREE.Group();
    // lacquered tray with the decanter and two glasses
    const tray = Prim.rbox(0.5, 0.012, 0.32, 0.004, mats.solid(0x1e1a18, { roughness: 0.25, physical: true, clearcoat: 0.9 }));
    tray.position.set(-2.6, sbTop + 0.006, SBZ - 0.03);
    g.add(tray);
    // tray lip: a thin frame made from four bars
    for (const [w, d, ox, oz] of [[0.5, 0.012, 0, 0.154], [0.5, 0.012, 0, -0.154], [0.012, 0.32, 0.244, 0], [0.012, 0.32, -0.244, 0]] as [number, number, number, number][]) {
      const bar = Prim.box(w, 0.03, d, mats.solid(0x1e1a18, { roughness: 0.25, physical: true, clearcoat: 0.9 }));
      bar.position.set(-2.6 + ox, sbTop + 0.021, SBZ - 0.03 + oz);
      g.add(bar);
    }
    // brass candlesticks (candles are pickups added below)
    const stick: [number, number][] = [[0, 0], [0.04, 0], [0.042, 0.012], [0.02, 0.025], [0.014, 0.08], [0.024, 0.11], [0.014, 0.14], [0.014, 0.19], [0.026, 0.2], [0.028, 0.22], [0.016, 0.22], [0.016, 0.205], [0, 0.205]];
    for (const [cx, cz] of [[-3.05, SBZ + 0.08], [-2.18, SBZ + 0.08]]) {
      const s = Prim.lathe(stick, mats.brass, { segments: 16 });
      s.position.set(cx, sbTop, cz);
      g.add(s);
      collider(ctx, cx, sbTop + 0.1025, cz, 0.06, 0.205, 0.06); // top = cup floor, so the candle seats inside the cup
    }
    // fruit bowl (fruit are pickups)
    const bowl = Prim.lathe([[0, 0], [0.07, 0], [0.11, 0.01], [0.15, 0.05], [0.165, 0.09], [0.155, 0.092], [0.14, 0.06], [0.1, 0.03], [0, 0.028]], mats.solid(0xe8e2d4, { roughness: 0.2, physical: true, clearcoat: 0.7 }), { segments: 24 });
    bowl.position.set(-3.3, sbTop, SBZ - 0.04);
    g.add(bowl);
    collider(ctx, -3.3, sbTop + 0.015, SBZ - 0.04, 0.24, 0.03, 0.24);
    // a small stack of side plates at the back
    for (let i = 0; i < 3; i++) {
      const p = Prim.cylinder(0.09, 0.085, 0.01, mats.ceramic, { segments: 22 });
      p.position.set(-2.95, sbTop + 0.005 + i * 0.011, SBZ - 0.12);
      g.add(p);
    }
    addStatic(ctx, g, []);
    // decanter + glasses into the shared glass mesh
    const decanter = Prim.lathe([[0, 0], [0.05, 0], [0.058, 0.01], [0.062, 0.1], [0.05, 0.16], [0.02, 0.2], [0.017, 0.24], [0.022, 0.25], [0.02, 0.26], [0, 0.26]], mats.glassClear, { segments: 18, cast: false });
    decanter.position.set(-2.5, sbTop + 0.012, SBZ - 0.06);
    glassGroup.add(decanter);
    const stopper = Prim.sphere(0.024, mats.glassClear, { segments: 12, cast: false });
    stopper.position.set(-2.5, sbTop + 0.012 + 0.275, SBZ - 0.06);
    glassGroup.add(stopper);
    for (const [gx, gz] of [[-2.72, SBZ + 0.02], [-2.66, SBZ - 0.1]]) {
      const wg = wineGlass(ctx);
      wg.position.set(gx, sbTop + 0.012, gz);
      glassGroup.add(wg);
    }
  }
  // candles (pickups) resting in the candlesticks
  const candleMat = mats.solid(0xf3ecdc, { roughness: 0.6 });
  for (const [cx, cz, i] of [[-3.05, SBZ + 0.08, 0], [-2.18, SBZ + 0.08, 1]]) {
    const c = new THREE.Group();
    const body = Prim.cylinder(0.014, 0.014, 0.2, candleMat, { segments: 12 });
    c.add(body);
    const wick = Prim.cylinder(0.002, 0.002, 0.015, mats.black, { segments: 4 });
    wick.position.y = 0.105;
    c.add(wick);
    c.position.set(cx, sbTop + 0.205 + 0.1 + 0.003, cz);
    pickup(ctx, c, { name: i === 0 ? 'candle' : 'taper candle', mass: 0.15, shape: { type: 'cylinder', radius: 0.014, height: 0.2 }, restitution: 0.1 });
  }
  // fruit (pickups) in the bowl
  const fruits: [number, number, number, string, number][] = [
    [0.055, 0.0, 0xc0392b, 'apple', 0.037], [-0.05, 0.03, 0x8fbf3a, 'green apple', 0.036], [0.0, -0.05, 0xe67e22, 'orange', 0.04],
  ];
  for (const [fx, fz, col, name, r] of fruits) {
    const f = new THREE.Group();
    const body = Prim.sphere(r, mats.solid(col, { roughness: 0.45, physical: true, clearcoat: 0.4 }), { segments: 14 });
    f.add(body);
    if (name !== 'orange') {
      const stem = Prim.cylinder(0.002, 0.003, 0.02, mats.solid(0x4a3320, { roughness: 0.8 }), { segments: 5 });
      stem.position.y = r;
      f.add(stem);
    }
    f.position.set(-3.3 + fx, sbTop + 0.03 + r, SBZ - 0.04 + fz);
    pickup(ctx, f, { name, mass: 0.2, shape: { type: 'sphere', radius: r }, restitution: 0.2, friction: 0.9 });
  }

  // ---------------------------------------------------------------------------------------
  // China cabinet on the west wall (north of the window), bar cart on the east wall
  // ---------------------------------------------------------------------------------------
  buildChinaCabinet(ctx, WX0 + 0.245, Y, -5.0, Math.PI / 2);
  buildBarCart(ctx, glassGroup, WX1 - 0.3, Y, -4.35, Math.PI / 2);

  // ---------------------------------------------------------------------------------------
  // Windows: curtains. Art, mirror, clock, plant.
  // ---------------------------------------------------------------------------------------
  const curtainColor = 0x4b5a78;
  curtains(ctx, WX0, Y, -3, Math.PI / 2, 1.6, Y + 2.3, curtainColor);
  curtains(ctx, TX, Y, WZ0, 0, 1.8, Y + 2.3, curtainColor);
  // painting above the sideboard
  pictureFrame(ctx, SBX - 0.1, Y + 1.7, WZ0, 0, 1.0, 0.7, ctx.tex.art(3, 1.43), { frameColor: 0x3a2a1a, frameW: 0.05 });
  // large landscape on the east wall
  pictureFrame(ctx, WX1, Y + 1.55, -3.2, -Math.PI / 2, 1.1, 0.8, ctx.tex.art(5, 1.375), { frameColor: 0x8a6a2a, frameW: 0.055 });
  // gilt mirror on the west wall (south of the window)
  {
    const g = new THREE.Group();
    const gilt = mats.solid(0xb8934f, { roughness: 0.35, metalness: 0.6, envMapIntensity: 1.0 });
    const w = 0.64, h = 0.94, fw = 0.07;
    const top = Prim.rbox(w + 2 * fw, fw, 0.04, 0.008, gilt); top.position.set(0, h / 2 + fw / 2, 0.02);
    const bot = Prim.rbox(w + 2 * fw, fw, 0.04, 0.008, gilt); bot.position.set(0, -h / 2 - fw / 2, 0.02);
    const l = Prim.rbox(fw, h, 0.04, 0.008, gilt); l.position.set(-w / 2 - fw / 2, 0, 0.02);
    const r = Prim.rbox(fw, h, 0.04, 0.008, gilt); r.position.set(w / 2 + fw / 2, 0, 0.02);
    const back = Prim.box(w, h, 0.02, mats.black); back.position.z = 0.01;
    // slightly smoked glass: the plain env-map mirror reads as a blown-out white panel in daylight
    const face = Prim.quad(w, h, mats.solid(0x9aa6ae, { roughness: 0.04, metalness: 1, envMapIntensity: 1.1 }), { cast: false }); face.position.z = 0.022;
    const crest = Prim.sphere(0.05, gilt, { segments: 12 }); crest.scale.set(1.6, 0.7, 0.5); crest.position.set(0, h / 2 + fw + 0.02, 0.02);
    g.add(top, bot, l, r, back, face, crest);
    g.position.set(WX0, Y + 1.5, -1.1);
    g.rotation.y = Math.PI / 2;
    addStatic(ctx, g, []);
  }
  wallClock(ctx, -2.3, Y + 1.95, WZ1 - 0.02, Math.PI, 0.17);
  plant(ctx, WX0 + 0.42, Y, WZ1 - 0.45, 1.4, { kind: 'leaf', potColor: 0x4a4a48 });

  // ---------------------------------------------------------------------------------------
  // All glassware → one transparent mesh
  // ---------------------------------------------------------------------------------------
  const glass = mergeByMaterial(glassGroup);
  glass.traverse((o) => { o.renderOrder = 5; });
  ctx.dynamic.add(glass);
}
