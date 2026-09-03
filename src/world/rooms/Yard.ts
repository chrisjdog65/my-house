/**
 * Yard — terrain, lawn with instanced grass, walkway, driveway, sidewalk & road, fences with a gate,
 * trees and a treeline, hedges, flower beds, patio with furniture, grill and fire pit, shed, mailbox,
 * path lights and string lights (on at night).
 */
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import type { Ctx } from '../Context';
import type { Structure } from '../Structure';
import { Prim, mergeByMaterial } from '../Builder';
import { HOUSE, LOT, PORCH, PATIO, DRIVEWAY, WALKWAY } from '../Plan';
import { addStatic, collider, hinged, Toggle, pickup } from '../Props';

const G = HOUSE.groundY; // terrain level

export function buildYard(ctx: Ctx, structure: Structure) {
  void structure;
  const mats = ctx.mats;
  const rnd = ctx.rng;

  // ---------------------------------------------------------------------------------------------
  // Terrain, paving
  // ---------------------------------------------------------------------------------------------
  // The lawn sits at y = -0.9, which is 2.05 m ABOVE the basement floor, so one unbroken plane roofs
  // the basement over: the stairwell hole in the ground slab looked straight down onto it, which is
  // the grass you could see at the bottom of the basement stairs. Cut the house footprint out of it,
  // at the inner face of the foundation wall so the lawn still tucks under the wall with no seam.
  const hx0 = HOUSE.x0 + HOUSE.extWall / 2, hx1 = HOUSE.x1 - HOUSE.extWall / 2;
  const hz0 = HOUSE.z0 + HOUSE.extWall / 2, hz1 = HOUSE.z1 - HOUSE.extWall / 2;
  for (const [gx0, gz0, gx1, gz1] of [
    [-70, -70, 70, hz0], [-70, hz1, 70, 70], [-70, hz0, hx0, hz1], [hx1, hz0, 70, hz1],
  ] as [number, number, number, number][]) {
    const ground = Prim.plane(gx1 - gx0, gz1 - gz0, mats.grass, { cast: false });
    ground.position.set((gx0 + gx1) / 2, G, (gz0 + gz1) / 2);
    ctx.batch.add(ground, { worldUV: true });
  }

  const paving = (x0: number, z0: number, x1: number, z1: number, mat: THREE.Material, h = 0.02, y = G) => {
    const m = Prim.box(x1 - x0, h, z1 - z0, mat, { cast: false });
    m.position.set((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2);
    ctx.batch.add(m, { worldUV: true });
    return m;
  };
  // front walk from the porch steps to the sidewalk, with a stone border
  const walkStart = PORCH.z1 + 1.5;
  paving(WALKWAY.x0 - 0.12, walkStart, WALKWAY.x1 + 0.12, 17, mats.tex('concrete', { color: 0xb9b6ae }), 0.015);
  paving(WALKWAY.x0, walkStart, WALKWAY.x1, 17, mats.pavers, 0.03);
  // driveway with apron and curb cut
  paving(DRIVEWAY.x0, DRIVEWAY.z0, DRIVEWAY.x1, 17, mats.asphalt, 0.02);
  paving(DRIVEWAY.x0 - 0.15, DRIVEWAY.z0 - 0.15, DRIVEWAY.x1 + 0.15, DRIVEWAY.z0 + 0.6, mats.tex('concrete', { color: 0xc4c2bb }), 0.03);
  // sidewalk across the front of the lot and the road beyond
  paving(LOT.x0 - 20, 17, LOT.x1 + 20, 18.6, mats.tex('concrete', { color: 0xc8c6c0 }), 0.06);
  for (let x = LOT.x0 - 20; x < LOT.x1 + 20; x += 1.5) {
    const joint = Prim.box(0.02, 0.005, 1.6, mats.solid(0x8d8b85, { roughness: 0.9 }), { cast: false });
    joint.position.set(x, G + 0.062, 17.8);
    ctx.batch.add(joint);
  }
  paving(LOT.x0 - 30, 18.6, LOT.x1 + 30, 30, mats.asphalt, 0.04);
  const curb = Prim.box(LOT.x1 - LOT.x0 + 40, 0.12, 0.2, mats.tex('concrete', { color: 0xb5b3ad }));
  curb.position.set(0, G + 0.06, 18.7);
  ctx.batch.add(curb, { worldUV: true });
  for (let x = -38; x < 38; x += 4) {
    const dash = Prim.box(2, 0.006, 0.12, mats.solid(0xe9d66b, { roughness: 0.8 }), { cast: false });
    dash.position.set(x, G + 0.045, 24.3);
    ctx.batch.add(dash);
  }
  // patio with a low retaining edge
  paving(PATIO.x0, PATIO.z0, PATIO.x1, PATIO.z1, mats.pavers, 0.04);
  const edgeMat = mats.tex('concrete', { color: 0xb0aea6 });
  for (const [x0, z0, x1, z1] of [[PATIO.x0 - 0.12, PATIO.z0 - 0.12, PATIO.x1 + 0.12, PATIO.z0], [PATIO.x0 - 0.12, PATIO.z0, PATIO.x0, PATIO.z1], [PATIO.x1, PATIO.z0, PATIO.x1 + 0.12, PATIO.z1]]) {
    paving(x0, z0, x1, z1, edgeMat, 0.08);
  }
  // back-door landing + 3 steps down to the patio
  {
    const dx = 7.0, landW = 1.4, landD = 1.0;
    const zTop = HOUSE.z0 - HOUSE.extWall / 2 - 0.01;
    const landing = Prim.box(landW, 0.9, landD, mats.tex('concrete', { color: 0xc0beb7 }));
    landing.position.set(dx, G + 0.45, zTop - landD / 2);
    ctx.batch.add(landing, { worldUV: true });
    collider(ctx, dx, G + 0.45, zTop - landD / 2, landW, 0.9, landD);
    const steps = 3, rise = 0.9 / steps, tread = 0.34;
    // tread tops sit one riser below the landing each, so the ramp below passes through the
    // nosings (house convention); the last tread is the patio itself, so it needs no block
    for (let i = 0; i < steps - 1; i++) {
      const h = 0.9 - (i + 1) * rise;
      const s = Prim.box(landW, h, tread, mats.tex('concrete', { color: 0xc4c2bb }));
      s.position.set(dx, G + h / 2, zTop - landD - tread * i - tread / 2);
      ctx.batch.add(s, { worldUV: true });
    }
    ctx.physics.addStairRamp(dx - landW / 2, dx + landW / 2, zTop - landD, 0, zTop - landD - steps * tread, G, { surface: 'concrete', stairs: true });
    // railing
    const rail = new THREE.Group();
    for (const sx of [-1, 1]) {
      const top = Prim.rbox(0.05, 0.05, landD + steps * tread + 0.1, 0.02, mats.darkMetal);
      top.position.set(sx * (landW / 2 - 0.03), 0.95 - 0.2, -(landD + steps * tread) / 2);
      top.rotation.x = Math.atan2(0.9, steps * tread) * 0.55;
      rail.add(top);
      for (let k = 0; k < 3; k++) {
        const p = Prim.box(0.035, 0.95 - k * 0.22, 0.035, mats.darkMetal);
        p.position.set(sx * (landW / 2 - 0.03), (0.95 - k * 0.22) / 2 - k * 0.3 * 0, -(0.15 + k * 0.6));
        rail.add(p);
      }
    }
    rail.position.set(dx, G + 0.9, zTop);
    addStatic(ctx, rail, []);
  }

  // ---------------------------------------------------------------------------------------------
  // Exclusion zones for grass / flowers (paved & built areas)
  // ---------------------------------------------------------------------------------------------
  const noGrass: [number, number, number, number][] = [
    [HOUSE.x0 - 0.6, HOUSE.z0 - 0.6, HOUSE.x1 + 0.6, HOUSE.z1 + 0.6],
    [PORCH.x0 - 0.3, PORCH.z0, PORCH.x1 + 0.3, PORCH.z1 + 1.6],
    [WALKWAY.x0 - 0.3, walkStart - 0.3, WALKWAY.x1 + 0.3, 30],
    [DRIVEWAY.x0 - 0.3, DRIVEWAY.z0 - 0.3, DRIVEWAY.x1 + 0.3, 30],
    [PATIO.x0 - 0.3, PATIO.z0 - 0.3, PATIO.x1 + 0.3, PATIO.z1],
    [-40, 16.6, 40, 40],
    [-17.2, -16.2, -13.8, -12.4], // shed
    [-7.2, -11.6, -4.8, -8.4], // garden box
    [4.5, -12.3, 7.3, -10.3], // fire pit + stump seats
  ];
  const clear = (x: number, z: number) => !noGrass.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
  const inLot = (x: number, z: number) => x > LOT.x0 + 0.4 && x < LOT.x1 - 0.4 && z > LOT.z0 + 0.4 && z < 16.6;

  // ---------------------------------------------------------------------------------------------
  // Instanced grass tufts with a gentle sway
  // ---------------------------------------------------------------------------------------------
  {
    const bladeTex = ctx.tex.grassBlade();
    const grassMat = mats.image(bladeTex, { transparent: true, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9, envMapIntensity: 0.3 });
    const timeU = { value: 0 };
    grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = timeU;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat sway = sin(uTime * 1.7 + instanceMatrix[3][0] * 0.9 + instanceMatrix[3][2] * 0.7) * 0.05 * uv.y;\ntransformed.x += sway; transformed.z += sway * 0.6;\n#endif');
    };
    const a = new THREE.PlaneGeometry(0.42, 0.34); a.translate(0, 0.17, 0);
    const b = a.clone(); b.rotateY(Math.PI / 2);
    const c = a.clone(); c.rotateY(Math.PI / 4);
    const geo = BufferGeometryUtils.mergeGeometries([a, b, c], false)!;
    const COUNT = 2600;
    const inst = new THREE.InstancedMesh(geo, grassMat, COUNT);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let placed = 0, tries = 0;
    while (placed < COUNT && tries < COUNT * 20) {
      tries++;
      // denser near the house
      const near = rnd() < 0.55;
      const x = near ? HOUSE.x0 - 4 + rnd() * (HOUSE.x1 - HOUSE.x0 + 8) : LOT.x0 + rnd() * (LOT.x1 - LOT.x0);
      const z = near ? HOUSE.z0 - 5 + rnd() * (HOUSE.z1 - HOUSE.z0 + 12) : LOT.z0 + rnd() * (16.6 - LOT.z0);
      if (!inLot(x, z) || !clear(x, z)) continue;
      const sc = 0.7 + rnd() * 0.8;
      p.set(x, G, z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
      s.set(sc, sc * (0.8 + rnd() * 0.5), sc);
      m.compose(p, q, s);
      inst.setMatrixAt(placed++, m);
    }
    inst.count = placed;
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = false;
    inst.receiveShadow = true;
    inst.frustumCulled = false;
    ctx.dynamic.add(inst);
    ctx.onUpdate((_dt, t) => { timeU.value = t; });
  }

  // ---------------------------------------------------------------------------------------------
  // Fences
  // ---------------------------------------------------------------------------------------------
  const fenceMat = mats.tex('pine', { color: 0xd9cfb8, normalScale: 0.5 });
  const postMat = mats.tex('pine', { color: 0xc9bea6, normalScale: 0.5 });
  const picketFence = (x0: number, x1: number, z: number) => {
    const g = new THREE.Group();
    const L = x1 - x0;
    for (const y of [0.35, 0.8]) {
      const rail = Prim.box(L, 0.08, 0.035, fenceMat);
      rail.position.set(L / 2, y, 0);
      g.add(rail);
    }
    const n = Math.floor(L / 0.16);
    const picketGeo = new THREE.BoxGeometry(0.08, 1.0, 0.02);
    picketGeo.translate(0, 0.5, 0);
    // pointed top
    const tip = new THREE.ConeGeometry(0.056, 0.08, 4);
    tip.rotateY(Math.PI / 4); tip.scale(1, 1, 0.35); tip.translate(0, 1.04, 0);
    const pg = BufferGeometryUtils.mergeGeometries([picketGeo.toNonIndexed(), tip.toNonIndexed()], false)!;
    const pickets = new THREE.InstancedMesh(pg, fenceMat, n);
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { m.makeTranslation(0.08 + i * (L / n), 0.02, 0.03); pickets.setMatrixAt(i, m); }
    pickets.castShadow = true; pickets.receiveShadow = true;
    g.add(pickets);
    for (let x = 0; x <= L + 0.01; x += 2.4) {
      const post = Prim.box(0.1, 1.15, 0.1, postMat);
      post.position.set(Math.min(x, L), 0.575, 0);
      g.add(post);
      const cap = Prim.box(0.14, 0.04, 0.14, postMat);
      cap.position.set(Math.min(x, L), 1.17, 0);
      g.add(cap);
    }
    g.position.set(x0, G, z);
    ctx.scene.add(g); g.updateWorldMatrix(true, true);
    // instanced pickets can't be batched; keep them as one draw call
    g.remove(pickets);
    ctx.batch.add(g);
    ctx.scene.remove(g);
    pickets.position.set(x0, G, z);
    ctx.dynamic.add(pickets);
    collider(ctx, (x0 + x1) / 2, G + 0.55, z, L, 1.1, 0.12);
  };
  const gateX0 = WALKWAY.x0 - 0.15, gateX1 = WALKWAY.x1 + 0.15;
  const fenceZ = 16.55;
  picketFence(LOT.x0, gateX0 - 0.05, fenceZ);
  picketFence(gateX1 + 0.05, DRIVEWAY.x0 - 0.5, fenceZ);
  picketFence(DRIVEWAY.x1 + 0.5, LOT.x1, fenceZ);
  // gate (hinged)
  {
    const gateRoot = new THREE.Group();
    gateRoot.position.set(gateX0, G, fenceZ);
    ctx.dynamic.add(gateRoot);
    const w = gateX1 - gateX0;
    hinged(ctx, gateRoot, new THREE.Vector3(0, 0, 0), (pivot) => {
      const leaf = new THREE.Group();
      for (const y of [0.35, 0.8]) { const r = Prim.box(w, 0.08, 0.035, fenceMat); r.position.set(w / 2, y, 0); leaf.add(r); }
      const n = Math.floor(w / 0.16);
      for (let i = 0; i < n; i++) { const p = Prim.box(0.08, 1.0, 0.02, fenceMat); p.position.set(0.08 + i * (w / n), 0.52, 0.03); leaf.add(p); }
      const diag = Prim.box(0.06, Math.hypot(w, 0.45), 0.03, fenceMat);
      diag.position.set(w / 2, 0.575, -0.03);
      diag.rotation.z = -Math.atan2(0.45, w);
      leaf.add(diag);
      pivot.add(mergeByMaterial(leaf));
    }, 'gate', { maxAngle: -Math.PI * 0.55, sfx: 'doorOpen' });
  }
  // privacy fence around the sides and back
  const privacyFence = (x0: number, z0: number, x1: number, z1: number) => {
    const alongX = Math.abs(z1 - z0) < 1e-6;
    const L = alongX ? x1 - x0 : z1 - z0;
    const g = new THREE.Group();
    const boards = 9;
    for (let i = 0; i < boards; i++) {
      const b = Prim.box(alongX ? L : 0.025, 0.17, alongX ? 0.025 : L, fenceMat);
      b.position.set(alongX ? L / 2 : 0, 0.15 + i * 0.185, alongX ? 0 : L / 2);
      g.add(b);
    }
    for (let d = 0; d <= L + 0.01; d += 2.4) {
      const dd = Math.min(d, L);
      const post = Prim.box(0.12, 1.85, 0.12, postMat);
      post.position.set(alongX ? dd : 0, 0.925, alongX ? 0 : dd);
      g.add(post);
      const cap = Prim.box(0.16, 0.05, 0.16, postMat);
      cap.position.set(alongX ? dd : 0, 1.87, alongX ? 0 : dd);
      g.add(cap);
    }
    g.position.set(x0, G, z0);
    addStatic(ctx, g, [{ size: [alongX ? L : 0.14, 1.9, alongX ? 0.14 : L], center: [alongX ? L / 2 : 0, 0.95, alongX ? 0 : L / 2] }]);
  };
  privacyFence(LOT.x0, LOT.z0, LOT.x1, LOT.z0);
  privacyFence(LOT.x0, LOT.z0, LOT.x0, fenceZ);
  privacyFence(LOT.x1, LOT.z0, LOT.x1, fenceZ);

  // ---------------------------------------------------------------------------------------------
  // Trees, treeline, hedges, flowers
  // ---------------------------------------------------------------------------------------------
  const leafMat = mats.image(ctx.tex.foliage('bush'), { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, envMapIntensity: 0.35 });
  const leafInner = mats.solid(0x2f5a2c, { roughness: 0.9, flatShading: true, envMapIntensity: 0.2 });
  const deciduous = (x: number, z: number, scale = 1) => {
    const g = new THREE.Group();
    const trunkH = 2.6 * scale;
    const trunk = Prim.cylinder(0.16 * scale, 0.26 * scale, trunkH, mats.bark, { segments: 10 });
    trunk.position.y = trunkH / 2;
    g.add(trunk);
    const cy = trunkH + 1.4 * scale;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + rnd();
      const br = Prim.cylinder(0.05 * scale, 0.1 * scale, 1.8 * scale, mats.bark, { segments: 7 });
      br.position.set(Math.cos(a) * 0.6 * scale, trunkH - 0.3 + 0.7 * scale, Math.sin(a) * 0.6 * scale);
      br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      g.add(br);
    }
    // a solid core of overlapping blobs so the canopy has volume, with leaf cards for the fringe
    for (let i = 0; i < 5; i++) {
      const s = Prim.sphere((1.15 + rnd() * 0.55) * scale, leafInner, { segments: 10 });
      s.position.set((rnd() - 0.5) * 1.8 * scale, cy + (rnd() - 0.5) * 1.3 * scale, (rnd() - 0.5) * 1.8 * scale);
      s.scale.y = 0.85;
      g.add(s);
    }
    for (let i = 0; i < 16; i++) {
      const card = Prim.quad(2.3 * scale, 2.1 * scale, leafMat, { keepUV: true });
      const a = rnd() * Math.PI * 2, r = (1.0 + rnd() * 1.1) * scale;
      card.position.set(Math.cos(a) * r, cy + (rnd() - 0.5) * 2.0 * scale, Math.sin(a) * r);
      card.rotation.set((rnd() - 0.5) * 1.0, rnd() * Math.PI, (rnd() - 0.5) * 0.5);
      g.add(card);
    }
    g.position.set(x, G, z);
    g.rotation.y = rnd() * Math.PI * 2;
    addStatic(ctx, g, []);
    ctx.physics.addCylinder({ x, y: G + trunkH / 2, z }, 0.28 * scale, trunkH);
  };
  const conifer = (x: number, z: number, scale = 1) => {
    const g = new THREE.Group();
    const trunk = Prim.cylinder(0.1 * scale, 0.18 * scale, 1.2 * scale, mats.bark, { segments: 8 });
    trunk.position.y = 0.6 * scale;
    g.add(trunk);
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const r = (2.0 - i * 0.32) * scale, h = 1.5 * scale;
      const cone = Prim.cone(r, h, mats.solid(i % 2 ? 0x2a4f2b : 0x315a30, { roughness: 0.95, flatShading: true, envMapIntensity: 0.2 }), { segments: 9 });
      cone.position.y = (0.9 + i * 0.95) * scale + h / 2;
      g.add(cone);
    }
    g.position.set(x, G, z);
    g.rotation.y = rnd() * Math.PI;
    addStatic(ctx, g, []);
    ctx.physics.addCylinder({ x, y: G + 1, z }, 0.35 * scale, 2);
  };
  deciduous(-13.5, 10.5, 1.15);
  deciduous(15.5, 5.5, 1.0);
  deciduous(-12, -11.5, 1.3);
  deciduous(12.5, -12, 1.1);
  deciduous(-15.5, -1, 0.9);
  conifer(16.2, -6, 1.1);
  conifer(-6.5, 13.5, 0.85);
  conifer(6.5, -14.5, 1.0);
  // treeline outside the fence: simple solid silhouettes (blob canopies on trunks) to close the horizon
  {
    const darkA = mats.solid(0x22402a, { roughness: 1, flatShading: true, envMapIntensity: 0.1 });
    const darkB = mats.solid(0x2b4d30, { roughness: 1, flatShading: true, envMapIntensity: 0.1 });
    const line = new THREE.Group();
    const put = (x: number, z: number) => {
      const h = 6 + rnd() * 5;
      const trunk = Prim.cylinder(0.25, 0.4, h * 0.45, mats.bark, { segments: 6, cast: false });
      trunk.position.set(x, G + h * 0.225, z);
      line.add(trunk);
      const mat = rnd() < 0.5 ? darkA : darkB;
      for (let i = 0; i < 3; i++) {
        const r = h * (0.22 + rnd() * 0.12);
        const s = Prim.sphere(r, mat, { segments: 8, cast: false });
        s.position.set(x + (rnd() - 0.5) * h * 0.3, G + h * 0.45 + r * 0.6 + i * h * 0.12, z + (rnd() - 0.5) * h * 0.3);
        s.scale.y = 0.8;
        line.add(s);
      }
    };
    for (let x = -34; x <= 34; x += 3.4) put(x + (rnd() - 0.5) * 2, LOT.z0 - 5 - rnd() * 4);
    for (let z = LOT.z0 - 4; z <= 16; z += 3.4) { put(LOT.x0 - 5 - rnd() * 4, z + (rnd() - 0.5) * 2); put(LOT.x1 + 5 + rnd() * 4, z + (rnd() - 0.5) * 2); }
    for (let x = -36; x <= 36; x += 3.6) put(x + (rnd() - 0.5) * 2, 34 + rnd() * 4);
    addStatic(ctx, line, []);
  }
  // foundation hedges (front, either side of the porch)
  const hedgeMat = mats.solid(0x2e5b2f, { roughness: 0.95, flatShading: true, envMapIntensity: 0.2 });
  const hedge = (x0: number, x1: number, z: number) => {
    const g = new THREE.Group();
    const n = Math.max(2, Math.round((x1 - x0) / 0.7));
    for (let i = 0; i < n; i++) {
      const b = Prim.rbox(0.9, 0.85 + rnd() * 0.15, 0.7, 0.25, hedgeMat);
      b.position.set(x0 + 0.45 + i * ((x1 - x0 - 0.9) / Math.max(1, n - 1)), 0.45, 0);
      b.rotation.y = (rnd() - 0.5) * 0.3;
      g.add(b);
    }
    g.position.set(0, G, z);
    addStatic(ctx, g, [{ size: [x1 - x0, 0.9, 0.7], center: [(x0 + x1) / 2, 0.45, 0] }]);
  };
  hedge(HOUSE.x0 + 0.3, PORCH.x0 - 0.4, HOUSE.z1 + 0.65);
  hedge(PORCH.x1 + 0.4, HOUSE.x1 - 0.3, HOUSE.z1 + 0.65);
  hedge(HOUSE.x0 + 0.3, PATIO.x0 - 0.5, HOUSE.z0 - 0.65); // back hedge west of the patio
  // flower beds along the walkway with instanced flowers
  {
    const bedMat = mats.soil;
    for (const sx of [-1, 1]) {
      const x0 = sx > 0 ? WALKWAY.x1 + 0.2 : WALKWAY.x0 - 1.0;
      const bed = Prim.box(0.8, 0.06, 5.5, bedMat, { cast: false });
      bed.position.set(x0 + 0.4, G + 0.07, walkStart + 2.9); // soil top above the border lip, or it never shows
      ctx.batch.add(bed, { worldUV: true });
      const border = Prim.box(0.8 + 0.12, 0.1, 5.5 + 0.12, mats.tex('concrete', { color: 0xa8a6a0 }));
      border.position.set(x0 + 0.4, G + 0.02, walkStart + 2.9);
      ctx.batch.add(border, { worldUV: true });
    }
    const stemMat = mats.solid(0x3f7a34, { roughness: 0.9 });
    const stemGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.28, 5); stemGeo.translate(0, 0.14, 0);
    const headGeo = new THREE.SphereGeometry(0.045, 8, 6); headGeo.translate(0, 0.31, 0);
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, 120);
    const heads = new THREE.InstancedMesh(headGeo, mats.solid(0xffffff, { roughness: 0.7 }), 120);
    const colors = [0xe0453a, 0xf2b134, 0xf0f0f0, 0xd85ba6, 0x8d5cd6, 0xf28c28];
    const m = new THREE.Matrix4(), col = new THREE.Color();
    let i = 0;
    for (const sx of [-1, 1]) {
      const x0 = sx > 0 ? WALKWAY.x1 + 0.2 : WALKWAY.x0 - 1.0;
      for (let k = 0; k < 60; k++) {
        const x = x0 + 0.12 + rnd() * 0.56, z = walkStart + 0.3 + rnd() * 5.2;
        const sc = 0.8 + rnd() * 0.6;
        m.compose(new THREE.Vector3(x, G + 0.06, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28), new THREE.Vector3(sc, sc, sc));
        stems.setMatrixAt(i, m); heads.setMatrixAt(i, m);
        heads.setColorAt(i, col.setHex(colors[Math.floor(rnd() * colors.length)]));
        i++;
      }
    }
    stems.count = i; heads.count = i;
    stems.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    stems.castShadow = false; heads.castShadow = false;
    stems.frustumCulled = false; heads.frustumCulled = false;
    ctx.dynamic.add(stems, heads);
  }

  // ---------------------------------------------------------------------------------------------
  // Patio furniture, grill, fire pit, string lights
  // ---------------------------------------------------------------------------------------------
  const patioCx = (PATIO.x0 + PATIO.x1) / 2 - 0.4, patioCz = (PATIO.z0 + PATIO.z1) / 2 - 0.3;
  {
    // round table + umbrella
    const t = new THREE.Group();
    const top = Prim.cylinder(0.75, 0.75, 0.04, mats.tex('steel', { color: 0xc9cbcc }), { segments: 28 });
    top.position.y = 0.72;
    t.add(top);
    const stem = Prim.cylinder(0.04, 0.05, 0.7, mats.darkMetal); stem.position.y = 0.36; t.add(stem);
    const base = Prim.cylinder(0.32, 0.36, 0.04, mats.darkMetal); base.position.y = 0.02; t.add(base);
    const pole = Prim.cylinder(0.025, 0.025, 2.4, mats.paintedMetal(0xe9e4d8)); pole.position.y = 1.2; t.add(pole);
    // r 1.05 still overhangs the 1.5 m table but keeps the canopy clear of the string-light run at z -9.2
    const umb = Prim.cone(1.05, 0.5, mats.fabric(0xb8452f), { segments: 10 }); umb.position.y = 2.4; (umb.material as THREE.Material).side = THREE.DoubleSide; t.add(umb);
    const finial = Prim.sphere(0.05, mats.darkMetal); finial.position.y = 2.68; t.add(finial);
    t.position.set(patioCx, G, patioCz);
    addStatic(ctx, t, [{ size: [1.5, 0.76, 1.5], center: [0, 0.38, 0] }]);
    // chairs
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const c = new THREE.Group();
      const seat = Prim.rbox(0.48, 0.05, 0.48, 0.02, mats.paintedMetal(0x3b3f45)); seat.position.y = 0.45; c.add(seat);
      const back = Prim.rbox(0.48, 0.5, 0.04, 0.02, mats.paintedMetal(0x3b3f45)); back.position.set(0, 0.72, -0.22); back.rotation.x = -0.15; c.add(back);
      const cushion = Prim.rbox(0.44, 0.05, 0.44, 0.02, mats.fabric(0xd8c8a8)); cushion.position.y = 0.5; c.add(cushion);
      for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) { const leg = Prim.cylinder(0.015, 0.015, 0.45, mats.darkMetal, { segments: 6 }); leg.position.set(lx, 0.225, lz); c.add(leg); }
      c.position.set(patioCx + Math.cos(a) * 1.15, G, patioCz + Math.sin(a) * 1.15);
      c.rotation.y = -a + Math.PI / 2;
      addStatic(ctx, c, [{ size: [0.5, 0.95, 0.5], center: [0, 0.48, 0] }]);
    }
    // lounge chairs, one down each side of the patio — they are 1.7 m along their local Z, so they
    // have to run along the patio's Z axis to stay on the paving and clear of the back-door steps
    for (const [px, pz] of [[PATIO.x0 + 0.4, PATIO.z0 + 2.2], [PATIO.x1 - 0.4, PATIO.z0 + 1.3]]) {
      const l = new THREE.Group();
      const frame = Prim.rbox(0.62, 0.06, 1.7, 0.02, mats.paintedMetal(0xe8e4dc)); frame.position.y = 0.35; l.add(frame);
      const pad = Prim.rbox(0.56, 0.08, 1.1, 0.03, mats.fabric(0x5a7d9a)); pad.position.set(0, 0.42, 0.25); l.add(pad);
      const backPad = Prim.rbox(0.56, 0.08, 0.7, 0.03, mats.fabric(0x5a7d9a)); backPad.position.set(0, 0.62, -0.55); backPad.rotation.x = 0.65; l.add(backPad);
      for (const [lx, lz] of [[-0.25, -0.7], [0.25, -0.7], [-0.25, 0.7], [0.25, 0.7]]) { const leg = Prim.cylinder(0.015, 0.015, 0.33, mats.darkMetal, { segments: 6 }); leg.position.set(lx, 0.17, lz); l.add(leg); }
      l.position.set(px, G, pz);
      l.rotation.y = Math.PI; // head end toward the house, feet out into the yard
      addStatic(ctx, l, [{ size: [0.65, 0.8, 1.7], center: [0, 0.4, 0] }]);
    }
  }
  // BBQ grill with a hinged lid and a 'light' toggle
  {
    const gx = PATIO.x0 + 0.8, gz = PATIO.z0 + 0.7;
    const root = new THREE.Group();
    root.position.set(gx, G, gz);
    root.rotation.y = Math.PI / 2;
    ctx.dynamic.add(root);
    const body = new THREE.Group();
    const box = Prim.rbox(1.1, 0.45, 0.6, 0.03, mats.tex('steel', { color: 0xb9bcbf })); box.position.y = 0.72; body.add(box);
    const shelf = Prim.box(0.35, 0.03, 0.55, mats.tex('steel', { color: 0xb9bcbf })); shelf.position.set(0.72, 0.9, 0); body.add(shelf);
    const cart = Prim.box(1.05, 0.04, 0.55, mats.darkMetal); cart.position.y = 0.25; body.add(cart);
    for (const [lx, lz] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) { const leg = Prim.box(0.04, 0.72, 0.04, mats.darkMetal); leg.position.set(lx, 0.36, lz); body.add(leg); }
    for (const lx of [-0.5, 0.5]) { const w = Prim.cylinder(0.08, 0.08, 0.04, mats.black, { segments: 12 }); w.rotation.z = Math.PI / 2; w.position.set(lx, 0.08, 0.25); body.add(w); }
    const grate = Prim.box(1.0, 0.01, 0.52, mats.darkMetal); grate.position.y = 0.95; body.add(grate);
    for (let i = 0; i < 3; i++) { const knob = Prim.cylinder(0.03, 0.03, 0.03, mats.plasticBlack, { segments: 8 }); knob.rotation.x = Math.PI / 2; knob.position.set(-0.3 + i * 0.3, 0.6, 0.31); body.add(knob); }
    // merge before use: the pre-merge group is never parented, so registering it as the Toggle's
    // object would leave a pickable ghost copy of the grill at the world origin.
    const grillBody = mergeByMaterial(body);
    root.add(grillBody);
    const flameMat = mats.emissive(0xff7a1a, 2.0, 0xff5a00);
    const flames = new THREE.Group();
    for (let i = 0; i < 6; i++) { const f = Prim.cone(0.05, 0.14, flameMat, { segments: 6, cast: false }); f.position.set(-0.4 + i * 0.16, 0.99, (rnd() - 0.5) * 0.3); flames.add(f); }
    flames.visible = false;
    root.add(flames);
    hinged(ctx, root, new THREE.Vector3(0, 0.96, -0.3), (pivot) => {
      const lid = new THREE.Group();
      const dome = Prim.rbox(1.1, 0.32, 0.6, 0.08, mats.tex('steel', { color: 0xb9bcbf })); dome.position.set(0, 0.16, 0.3); lid.add(dome);
      const handle = Prim.cylinder(0.015, 0.015, 0.6, mats.darkMetal, { segments: 8 }); handle.rotation.z = Math.PI / 2; handle.position.set(0, 0.2, 0.66); lid.add(handle);
      pivot.add(mergeByMaterial(lid));
    }, 'grill lid', { maxAngle: -1.4, axis: 'x', sfx: 'drawer' });
    const light = ctx.lights.point(gx, G + 1.1, gz, { intensity: 0, distance: 3, color: 0xff8a3a, flicker: 0.5, on: false });
    const toggle = new Toggle(grillBody, { on: 'Turn off grill', off: 'Light grill' }, (on) => {
      flames.visible = on;
      ctx.lights.setOn(light, on);
      light.intensity = on ? 3 : 0;
      ctx.audio.play(on ? 'fireIgnite' : 'fireOut', new THREE.Vector3(gx, G + 1, gz));
    }, new THREE.Vector3(gx, G + 0.9, gz));
    ctx.interact.add(toggle);
    collider(ctx, gx, G + 0.5, gz, 0.65, 1.0, 1.15);
  }
  // fire pit
  {
    // on the open lawn south of the patio — on the paving it collided with the table, chairs and grill
    const fx = 6.0, fz = PATIO.z0 - 2.0;
    const ring = new THREE.Group();
    const stoneMat = mats.stone;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const s = Prim.rbox(0.28, 0.22, 0.2, 0.05, stoneMat);
      s.position.set(Math.cos(a) * 0.5, 0.11 + (i % 2) * 0.02, Math.sin(a) * 0.5);
      s.rotation.y = -a;
      ring.add(s);
      const s2 = Prim.rbox(0.26, 0.2, 0.2, 0.05, stoneMat);
      const a2 = a + Math.PI / 14;
      s2.position.set(Math.cos(a2) * 0.5, 0.33, Math.sin(a2) * 0.5);
      s2.rotation.y = -a2;
      ring.add(s2);
    }
    const ash = Prim.cylinder(0.42, 0.42, 0.05, mats.tex('concreteDark'), { segments: 20, cast: false }); ash.position.y = 0.05; ring.add(ash);
    for (let i = 0; i < 4; i++) { const log = Prim.cylinder(0.06, 0.07, 0.5, mats.bark, { segments: 8 }); log.rotation.z = Math.PI / 2; log.rotation.y = i * 0.8; log.position.y = 0.13 + (i > 1 ? 0.1 : 0); ring.add(log); }
    ring.position.set(fx, G, fz);
    addStatic(ctx, ring, [{ size: [1.2, 0.45, 1.2], center: [0, 0.22, 0] }]);
    const flameMat = mats.emissive(0xff8c2a, 2.4, 0xff4a00);
    const flames = new THREE.Group();
    for (let i = 0; i < 5; i++) { const f = Prim.cone(0.12 - i * 0.012, 0.42 + rnd() * 0.2, flameMat, { segments: 7, cast: false }); f.position.set((rnd() - 0.5) * 0.3, 0.38, (rnd() - 0.5) * 0.3); flames.add(f); }
    flames.position.set(fx, G, fz);
    flames.visible = false;
    ctx.dynamic.add(flames);
    ctx.onUpdate((_dt, t) => { if (!flames.visible) return; flames.children.forEach((c, i) => { c.scale.y = 0.85 + Math.sin(t * 9 + i * 1.7) * 0.15; c.rotation.y = t * (0.6 + i * 0.1); }); });
    const light = ctx.lights.point(fx, G + 0.7, fz, { intensity: 0, distance: 7, color: 0xff8a3a, flicker: 0.55, on: false, shadow: true });
    ctx.interact.add(new Toggle(ring, { on: 'Put out fire pit', off: 'Light fire pit' }, (on) => {
      flames.visible = on;
      ctx.lights.setOn(light, on);
      light.intensity = on ? 9 : 0;
      ctx.audio.play(on ? 'fireIgnite' : 'fireOut', new THREE.Vector3(fx, G + 0.5, fz));
      if (on) ctx.audio.startLoop('firepit', 'fire', new THREE.Vector3(fx, G + 0.5, fz), 0.25); else ctx.audio.stopLoop('firepit');
    }, new THREE.Vector3(fx, G + 0.4, fz)));
    // a couple of stump seats
    for (const [sx, sz] of [[fx - 1.1, fz + 0.3], [fx + 0.9, fz + 0.8]]) {
      const stump = Prim.cylinder(0.22, 0.25, 0.42, mats.bark, { segments: 12 });
      stump.position.set(sx, G + 0.21, sz);
      ctx.batch.add(stump);
      const top = Prim.cylinder(0.21, 0.21, 0.02, mats.pine, { segments: 12 });
      top.position.set(sx, G + 0.43, sz);
      ctx.batch.add(top);
      collider(ctx, sx, G + 0.21, sz, 0.5, 0.42, 0.5);
    }
  }
  // string lights across the patio (from the house wall to two posts)
  {
    const bulbs = { on: mats.emissive(0xffd27a, 1.6, 0xfff1cc), off: mats.glassFrosted };
    const posts: [number, number][] = [[PATIO.x0 + 0.3, PATIO.z0 + 0.3], [PATIO.x1 - 0.3, PATIO.z0 + 0.3]];
    for (const [px, pz] of posts) {
      const post = Prim.box(0.09, 2.6, 0.09, mats.tex('pine', { color: 0x8a7050 }));
      post.position.set(px, G + 1.3, pz);
      ctx.batch.add(post);
      collider(ctx, px, G + 1.3, pz, 0.1, 2.6, 0.1);
    }
    const wireMat = mats.black;
    const bulbMeshes: THREE.Mesh[] = [];
    const runs: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(PATIO.x0 + 0.5, G + 2.55, HOUSE.z0 - 0.2), new THREE.Vector3(posts[0][0], G + 2.55, posts[0][1])],
      [new THREE.Vector3(PATIO.x1 - 0.5, G + 2.55, HOUSE.z0 - 0.2), new THREE.Vector3(posts[1][0], G + 2.55, posts[1][1])],
      [new THREE.Vector3(posts[0][0], G + 2.55, posts[0][1]), new THREE.Vector3(posts[1][0], G + 2.55, posts[1][1])],
    ];
    for (const [a, b] of runs) {
      const n = Math.round(a.distanceTo(b) / 0.45);
      let prev = a.clone();
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const p = a.clone().lerp(b, t);
        p.y -= Math.sin(t * Math.PI) * 0.35; // sag
        const seg = Prim.cylinder(0.006, 0.006, prev.distanceTo(p), wireMat, { segments: 4, cast: false });
        seg.position.copy(prev).lerp(p, 0.5);
        seg.lookAt(p); seg.rotateX(Math.PI / 2);
        ctx.batch.add(seg);
        if (i < n) {
          const bulb = Prim.sphere(0.03, bulbs.on, { cast: false, segments: 8 });
          bulb.position.copy(p); bulb.position.y -= 0.06;
          ctx.dynamic.add(bulb);
          bulbMeshes.push(bulb);
        }
        prev = p;
      }
    }
    const l1 = ctx.lights.point(patioCx - 1.2, G + 2.2, patioCz, { group: 'patio', intensity: 6, distance: 7, color: 0xffd08a, on: false, emissives: bulbMeshes.map((mesh) => ({ mesh, on: bulbs.on, off: bulbs.off })) });
    const l2 = ctx.lights.point(patioCx + 1.4, G + 2.2, patioCz - 1, { group: 'patio', intensity: 6, distance: 7, color: 0xffd08a, on: false });
    ctx.onUpdate(() => { const want = ctx.daylight() < 0.55; if (l1.on !== want) { ctx.lights.setOn(l1, want); ctx.lights.setOn(l2, want); } });
  }
  // path lights along the walkway (on at night)
  {
    const bulbs = { on: mats.emissive(0xffe2a8, 1.4, 0xfff4dc), off: mats.glassFrosted };
    const lights = [] as ReturnType<typeof ctx.lights.point>[];
    for (const z of [walkStart + 1.2, walkStart + 3.6, walkStart + 6.0]) {
      for (const sx of [-1, 1]) {
        const x = sx * 1.35;
        const post = Prim.cylinder(0.025, 0.03, 0.45, mats.darkMetal, { segments: 8 });
        post.position.set(x, G + 0.225, z);
        ctx.batch.add(post);
        const cap = Prim.cone(0.09, 0.07, mats.darkMetal, { segments: 8 });
        cap.position.set(x, G + 0.53, z);
        ctx.batch.add(cap);
        const lens = Prim.cylinder(0.04, 0.04, 0.06, bulbs.on, { segments: 8, cast: false });
        lens.position.set(x, G + 0.47, z);
        ctx.dynamic.add(lens);
        lights.push(ctx.lights.point(x, G + 0.5, z, { group: 'path', intensity: 2.5, distance: 3.5, color: 0xffd9a0, on: false, emissives: [{ mesh: lens, on: bulbs.on, off: bulbs.off }] }));
        collider(ctx, x, G + 0.25, z, 0.08, 0.5, 0.08);
      }
    }
    ctx.onUpdate(() => { const want = ctx.daylight() < 0.55; if (lights[0].on !== want) for (const l of lights) ctx.lights.setOn(l, want); });
  }

  // ---------------------------------------------------------------------------------------------
  // Shed, mailbox, AC unit, garden box, bench, birdbath, firewood, rocks, hose reel
  // ---------------------------------------------------------------------------------------------
  {
    // shed 2.4 x 3 m in the back-left corner
    const sx = -15.5, sz = -14.3, w = 2.4, d = 3.0, h = 2.2;
    const g = new THREE.Group();
    const walls = Prim.box(w, h, d, mats.siding(0xcfd5c8)); walls.position.y = h / 2; g.add(walls);
    const slab = Prim.box(w + 0.2, 0.12, d + 0.2, mats.tex('concrete', { color: 0xb5b3ad })); slab.position.y = 0.06; g.add(slab);
    const rise = 0.8;
    for (const side of [1, -1]) {
      const len = Math.hypot(w / 2 + 0.25, rise);
      const slope = Prim.box(len, 0.12, d + 0.5, mats.shingles);
      slope.position.set(side * (w / 4 + 0.05), h + rise / 2 + 0.05, 0);
      slope.rotation.z = -side * Math.atan2(rise, w / 2 + 0.25);
      g.add(slope);
    }
    const gable = new THREE.Shape(); gable.moveTo(-w / 2, 0); gable.lineTo(w / 2, 0); gable.lineTo(0, rise + 0.05); gable.closePath();
    for (const zz of [d / 2 - 0.05, -d / 2 + 0.05]) {
      const tri = Prim.extrude(gable, 0.1, mats.siding(0xcfd5c8));
      tri.position.set(0, h, zz);
      g.add(tri);
    }
    const door = Prim.box(0.9, 1.9, 0.05, mats.tex('pine', { color: 0x7a5a3a })); door.position.set(0, 0.95 + 0.12, d / 2 + 0.03); g.add(door);
    const knob = Prim.sphere(0.03, mats.brass, { segments: 8 }); knob.position.set(0.35, 1.05, d / 2 + 0.07); g.add(knob);
    const win = Prim.box(0.6, 0.5, 0.04, mats.glassFrosted, { cast: false }); win.position.set(w / 2 + 0.02, 1.5, 0); g.add(win);
    const trim = Prim.box(0.68, 0.58, 0.03, mats.trim); trim.position.set(w / 2 + 0.005, 1.5, 0); g.add(trim);
    g.position.set(sx, G, sz);
    g.rotation.y = 0.15;
    addStatic(ctx, g, [{ size: [w + 0.2, h + 1, d + 0.2], center: [0, (h + 1) / 2, 0] }]);
  }
  {
    // mailbox by the driveway at the sidewalk
    const mx = DRIVEWAY.x0 - 0.6, mz = 16.2;
    const g = new THREE.Group();
    const post = Prim.box(0.1, 1.1, 0.1, mats.tex('pine', { color: 0x6d5236 })); post.position.y = 0.55; g.add(post);
    const arm = Prim.box(0.1, 0.08, 0.5, mats.tex('pine', { color: 0x6d5236 })); arm.position.set(0, 1.05, 0.15); g.add(arm);
    const box = Prim.rbox(0.22, 0.24, 0.5, 0.08, mats.paintedMetal(0x2b2f36)); box.position.set(0, 1.22, 0.2); g.add(box);
    const flag = Prim.box(0.02, 0.16, 0.05, mats.solid(0xd0342c, { roughness: 0.6 })); flag.position.set(0.13, 1.28, 0.05); g.add(flag);
    const num = Prim.quad(0.3, 0.1, mats.image(ctx.tex.label('1224', { bg: '#2b2f36', fg: '#f2e6c9', w: 512, h: 170 })), { keepUV: true, cast: false });
    num.position.set(0.115, 1.2, 0.2); num.rotation.y = Math.PI / 2; g.add(num);
    g.position.set(mx, G, mz);
    addStatic(ctx, g, [{ size: [0.3, 1.4, 0.6], center: [0, 0.7, 0.15] }]);
  }
  {
    // AC condenser on the east side
    const ax = HOUSE.x1 + 0.7, az = -2.2;
    const g = new THREE.Group();
    const pad = Prim.box(1.0, 0.08, 1.0, mats.tex('concrete', { color: 0xb5b3ad })); pad.position.y = 0.04; g.add(pad);
    const unit = Prim.rbox(0.8, 0.75, 0.8, 0.02, mats.paintedMetal(0xc9c9c4)); unit.position.y = 0.08 + 0.375; g.add(unit);
    const grille = Prim.cylinder(0.32, 0.32, 0.02, mats.darkMetal, { segments: 24 }); grille.position.y = 0.84; g.add(grille);
    const fan = Prim.cylinder(0.2, 0.2, 0.01, mats.solid(0x555a60, { roughness: 0.6 }), { segments: 12 }); fan.position.y = 0.82; g.add(fan);
    for (let i = 0; i < 4; i++) { const slat = Prim.box(0.78, 0.01, 0.02, mats.darkMetal); slat.position.set(0, 0.2 + i * 0.16, 0.41); g.add(slat); }
    g.position.set(ax, G, az);
    addStatic(ctx, g, [{ size: [1.0, 0.9, 1.0], center: [0, 0.45, 0] }]);
    ctx.onUpdate((_dt, t) => { fan.rotation.y = t * 12; });
    // fan is batched (static) — spin a separate cheap disc instead
    const spin = Prim.cylinder(0.19, 0.19, 0.012, mats.solid(0x4a4f55, { roughness: 0.6 }), { segments: 12, cast: false });
    spin.position.set(ax, G + 0.83, az);
    ctx.dynamic.add(spin);
    ctx.onUpdate((_dt, t) => { spin.rotation.y = t * 14; });
  }
  {
    // raised vegetable garden box in the back yard
    const gx = -6, gz = -10;
    const g = new THREE.Group();
    const boardMat = mats.tex('pine', { color: 0xb08a62 });
    for (const [x, z, w, d] of [[0, -0.6, 2.4, 0.05], [0, 0.6, 2.4, 0.05], [-1.2, 0, 0.05, 1.2], [1.2, 0, 0.05, 1.2]]) {
      const b = Prim.box(w, 0.4, d, boardMat); b.position.set(x, 0.2, z); g.add(b);
    }
    const soilTop = Prim.box(2.3, 0.02, 1.1, mats.soil, { cast: false }); soilTop.position.y = 0.34; g.add(soilTop);
    const leaf = mats.solid(0x4c8a3c, { roughness: 0.9, flatShading: true });
    for (let i = 0; i < 12; i++) {
      const p = Prim.sphere(0.12 + rnd() * 0.08, leaf, { segments: 8 });
      p.position.set(-1.0 + (i % 6) * 0.4, 0.42, (i < 6 ? -0.3 : 0.3));
      p.scale.y = 0.7;
      g.add(p);
      const stake = Prim.box(0.02, 0.7, 0.02, boardMat); stake.position.set(-1.0 + (i % 6) * 0.4, 0.6, (i < 6 ? -0.3 : 0.3) - 0.08); if (i % 3 === 0) g.add(stake);
    }
    g.position.set(gx, G, gz);
    addStatic(ctx, g, [{ size: [2.5, 0.45, 1.3], center: [0, 0.22, 0] }]);
  }
  {
    // garden bench facing the house, birdbath, rocks, firewood rack, hose reel
    const bx = -8.5, bz = 11;
    const b = new THREE.Group();
    const seat = Prim.box(1.5, 0.05, 0.42, mats.tex('pine', { color: 0x9a7a55 })); seat.position.y = 0.45; b.add(seat);
    const back = Prim.box(1.5, 0.4, 0.04, mats.tex('pine', { color: 0x9a7a55 })); back.position.set(0, 0.75, -0.2); back.rotation.x = -0.15; b.add(back);
    for (const sx of [-0.65, 0.65]) { const leg = Prim.box(0.06, 0.45, 0.4, mats.darkMetal); leg.position.set(sx, 0.225, 0); b.add(leg); const arm = Prim.box(0.06, 0.04, 0.42, mats.darkMetal); arm.position.set(sx, 0.68, 0); b.add(arm); const up = Prim.box(0.04, 0.24, 0.04, mats.darkMetal); up.position.set(sx, 0.56, 0.17); b.add(up); }
    b.position.set(bx, G, bz);
    b.rotation.y = Math.PI * 0.85;
    addStatic(ctx, b, [{ size: [1.6, 0.9, 0.5], center: [0, 0.45, 0] }]);

    const bath = Prim.lathe([[0, 0], [0.18, 0], [0.16, 0.06], [0.08, 0.1], [0.07, 0.7], [0.14, 0.75], [0.42, 0.8], [0.44, 0.88], [0.4, 0.9], [0.05, 0.86], [0, 0.86]], mats.tex('concrete', { color: 0xbdbcb6 }), { segments: 20 });
    bath.position.set(-6.5, G, 10.2);
    ctx.batch.add(bath);
    const water = Prim.cylinder(0.36, 0.36, 0.01, mats.water, { segments: 20, cast: false }); water.position.set(-6.5, G + 0.86, 10.2); ctx.dynamic.add(water);
    collider(ctx, -6.5, G + 0.45, 10.2, 0.8, 0.9, 0.8);

    const rockMat = mats.solid(0x7d7a74, { roughness: 0.95, flatShading: true });
    for (const [rx, rz, r] of [[-11, 6, 0.45], [-10.4, 6.4, 0.3], [14, 12, 0.5], [13.4, 11.4, 0.28]]) {
      const rock = Prim.sphere(r, rockMat, { segments: 7 });
      rock.scale.set(1.3, 0.6, 1);
      rock.rotation.y = rnd() * 3;
      rock.position.set(rx, G + r * 0.35, rz);
      ctx.batch.add(rock);
      collider(ctx, rx, G + r * 0.3, rz, r * 2.4, r * 1.2, r * 2);
    }

    // firewood rack beside the back steps
    const fw = new THREE.Group();
    const rackMat = mats.darkMetal;
    for (const x of [-0.6, 0.6]) { const u = Prim.box(0.04, 1.1, 0.04, rackMat); u.position.set(x, 0.55, -0.2); fw.add(u); const u2 = u.clone(); u2.position.z = 0.2; fw.add(u2); }
    const base = Prim.box(1.24, 0.04, 0.44, rackMat); base.position.y = 0.1; fw.add(base);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      const log = Prim.cylinder(0.06 + rnd() * 0.02, 0.07, 0.4, mats.bark, { segments: 7 });
      log.rotation.x = Math.PI / 2;
      log.position.set(-0.5 + c * 0.25 + (r % 2) * 0.12, 0.19 + r * 0.14, 0);
      fw.add(log);
      const end = Prim.cylinder(0.06, 0.06, 0.005, mats.pine, { segments: 7, cast: false });
      end.rotation.x = Math.PI / 2; end.position.set(log.position.x, log.position.y, 0.2);
      fw.add(end);
    }
    fw.position.set(4.6, G, HOUSE.z0 - 0.45);
    addStatic(ctx, fw, [{ size: [1.3, 1.1, 0.5], center: [0, 0.55, 0] }]);

    // hose reel on the west wall
    const hr = new THREE.Group();
    const bracket = Prim.box(0.06, 0.4, 0.3, mats.darkMetal); hr.add(bracket);
    // reel hangs outward (-x): the wall's outside face is x -8.15 and the bracket sits at -8.2
    const reel = Prim.cylinder(0.22, 0.22, 0.2, mats.solid(0x2e7d3a, { roughness: 0.6 }), { segments: 16 }); reel.rotation.z = Math.PI / 2; reel.position.x = -0.13; hr.add(reel);
    const hose = Prim.torus(0.2, 0.03, mats.solid(0x2e7d3a, { roughness: 0.7 })); hose.rotation.z = Math.PI / 2; hose.position.x = -0.13; hr.add(hose);
    hr.position.set(HOUSE.x0 - 0.2, G + 0.9, -1.0);
    addStatic(ctx, hr, []);

    // a lost ball on the lawn to kick around
    pickup(ctx, place(Prim.sphere(0.12, mats.solid(0xf2f2f2, { roughness: 0.6 })), 2.5, G + 0.12, 12.5), { name: 'soccer ball', mass: 0.45, shape: { type: 'sphere', radius: 0.12 }, restitution: 0.7 });
  }
}

function place<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T { o.position.set(x, y, z); return o; }
