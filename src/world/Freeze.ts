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

export interface FreezeResult { frozen: number; kept: number; animated: number; reasons: Record<string, number> }

export function freezeStaticParts(ctx: Ctx, updaters: ((dt: number, t: number) => void)[], simSeconds = 1.2): FreezeResult {
  const root = ctx.dynamic;
  const excluded = new Set<THREE.Object3D>();
  const markTree = (o: THREE.Object3D | undefined | null) => { if (o) o.traverse((c) => excluded.add(c)); };

  const interactMeshes = new Set<THREE.Object3D>();
  for (const it of ctx.interact.items) it.object?.traverse((c) => interactMeshes.add(c));
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
  root.updateWorldMatrix(true, true);
  // Exclude the mesh that moved and its own subtree, but NOT its ancestors. Excluding the parent
  // cascaded to every sibling -- one swinging door leaf kept the whole cabinet dynamic. A group that
  // moves is detected anyway, because moving it changes the world matrix of every mesh under it.
  let animated = 0;
  for (const m of meshes) {
    if (before.get(m) !== key(m)) { animated++; markTree(m); }
  }

  // Then find what moves when the player USES something. Excluding an interactable's whole object
  // tree kept 529 meshes dynamic, but almost none of them move: a cabinet's carcass, counter and
  // handle are as static as the wall behind them, and only the door swings. So rather than trust
  // the grouping, operate each interactable and watch. Anything that does not budge is static, and
  // stops costing a draw call in the main pass and in every shadow map.
  const step = (n: number) => {
    for (let i = 0; i < n; i++) {
      t += dt;
      for (const u of updaters) { try { u(dt, t); } catch { /* ignore during probing */ } }
      try { ctx.interact.update(dt, t); } catch { /* ignore */ }
    }
    root.updateWorldMatrix(true, true);
  };
  const noteMovers = () => {
    for (const m of meshes) {
      if (excluded.has(m)) continue;
      if (before.get(m) !== key(m)) markTree(m);
    }
  };
  const arg = { playerPos: new THREE.Vector3(), cameraDir: new THREE.Vector3(0, 0, 1), cameraPos: new THREE.Vector3() };
  for (const it of ctx.interact.items) {
    // Picking something up hands it to the carry system rather than toggling it, and its mesh is
    // already excluded as a physics body, so leave those alone.
    if ((it as { kind?: string }).kind === 'pickup') { markTree(it.object); continue; }
    try {
      it.interact(arg);
      step(18);          // long enough for a swing or slide to have visibly started
      noteMovers();
      it.interact(arg);  // put it back the way it was
      step(18);
      noteMovers();
    } catch {
      // If operating it throws we cannot tell what it would have moved, so keep it all.
      markTree(it.object);
    }
  }
  // Whatever ended up displaced by the probing is excluded anyway by the comparisons above.
  root.updateWorldMatrix(true, true);
  noteMovers();

  let frozen = 0, kept = 0;
  const reasons: Record<string, number> = {};
  const keep = (why: string) => { kept++; reasons[why] = (reasons[why] ?? 0) + 1; };
  const toFreeze: THREE.Mesh[] = [];
  for (const m of meshes) {
    if (excluded.has(m)) { keep(interactMeshes.has(m) ? 'moves when used' : 'moves or is driven'); continue; }
    if ((m as any).isInstancedMesh || (m as any).isSkinnedMesh || !m.visible) { keep('instanced/skinned/hidden'); continue; }
    if (m.userData.keepSeparate || m.userData.animated || m.userData.pickup || m.userData.dynamic) { keep('flagged by its builder'); continue; }
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const bad = mats.some((mat) => !(mat as any).isMeshStandardMaterial || mat.transparent || mat.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile);
    if (bad || mats.length !== 1) { keep(mats.length !== 1 ? 'multi-material' : 'transparent or custom shader'); continue; }
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
  return { frozen, kept, animated, reasons };
}
