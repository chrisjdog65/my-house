/**
 * Freeze pass: after the world is built, bake every dynamic-group mesh that provably never
 * changes into the static batch. A mesh is kept dynamic when it
 *   - belongs to an interactable's object tree (doors, hinged panels, toggles, lamps, pickups),
 *   - is an emissive that a light toggles, a physics-driven prop, an instanced/skinned mesh,
 *   - uses a shader / transparent / points material,
 *   - is invisible, or flagged with userData.keepSeparate / animated,
 *   - or actually changed transform, material or visibility during a short simulated run.
 * Everything else is merged per material, which removes hundreds of draw calls per pass.
 */
import * as THREE from 'three';
import type { Ctx } from './Context';

export interface FreezeResult { frozen: number; kept: number; animated: number }

export function freezeStaticParts(ctx: Ctx, updaters: ((dt: number, t: number) => void)[], simSeconds = 1.2): FreezeResult {
  const root = ctx.dynamic;
  const excluded = new Set<THREE.Object3D>();
  const markTree = (o: THREE.Object3D | undefined | null) => { if (o) o.traverse((c) => excluded.add(c)); };

  for (const it of ctx.interact.items) markTree(it.object);
  for (const v of ctx.lights.virtual) for (const e of v.emissives ?? []) excluded.add(e.mesh);
  for (const d of ctx.physics.dynamics) markTree(d.mesh);

  // snapshot -> simulate -> snapshot to find things that animate on their own
  const meshes: THREE.Mesh[] = [];
  root.updateWorldMatrix(true, true);
  root.traverse((o) => { if (o instanceof THREE.Mesh) meshes.push(o); });
  const key = (m: THREE.Mesh) => {
    const e = m.matrixWorld.elements;
    let s = '';
    for (let i = 0; i < 16; i++) s += Math.round(e[i] * 1000) + ',';
    const mat = m.material as THREE.Material | THREE.Material[];
    return s + (Array.isArray(mat) ? mat.map((x) => x.uuid).join('|') : mat.uuid) + ':' + (m.visible ? 1 : 0);
  };
  const before = new Map<THREE.Mesh, string>();
  for (const m of meshes) before.set(m, key(m));
  const dt = 1 / 60;
  let t = 0.37; // arbitrary phase
  for (let i = 0; i < Math.round(simSeconds / dt); i++) {
    t += dt;
    for (const u of updaters) { try { u(dt, t); } catch { /* ignore during probing */ } }
    try { ctx.interact.update(dt, t); } catch { /* ignore */ }
  }
  root.updateWorldMatrix(true, true);
  let animated = 0;
  for (const m of meshes) {
    if (before.get(m) !== key(m)) { animated++; markTree(m); let p = m.parent; while (p && p !== root) { excluded.add(p); p = p.parent; } }
  }

  let frozen = 0, kept = 0;
  const toFreeze: THREE.Mesh[] = [];
  for (const m of meshes) {
    if (excluded.has(m)) { kept++; continue; }
    // any excluded ancestor (a moving group) keeps its children
    let p = m.parent, skip = false;
    while (p && p !== root) { if (excluded.has(p)) { skip = true; break; } p = p.parent; }
    if (skip) { kept++; continue; }
    if ((m as any).isInstancedMesh || (m as any).isSkinnedMesh || !m.visible) { kept++; continue; }
    if (m.userData.keepSeparate || m.userData.animated || m.userData.pickup || m.userData.dynamic) { kept++; continue; }
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const bad = mats.some((mat) => !(mat as any).isMeshStandardMaterial || mat.transparent || mat.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile);
    if (bad || mats.length !== 1) { kept++; continue; }
    toFreeze.push(m);
  }
  for (const m of toFreeze) {
    ctx.batch.add(m);
    m.parent?.remove(m);
    frozen++;
  }
  ctx.batch.build();
  // drop now-empty groups
  const prune = (o: THREE.Object3D) => {
    for (const c of [...o.children]) prune(c);
    if (o !== root && o.children.length === 0 && !(o instanceof THREE.Mesh) && !(o as any).isLight && !(o as any).isPoints && !excluded.has(o)) o.parent?.remove(o);
  };
  prune(root);
  return { frozen, kept, animated };
}
